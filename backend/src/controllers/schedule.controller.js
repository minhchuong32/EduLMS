const { query, withTransaction } = require("../config/database");
const { asyncHandler } = require("../utils/asyncHandler");
const { createHttpError } = require("../utils/httpError");

const dayLabels = [
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
];

const normalizeSessionDate = (value) => {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
};

const ensureClassAccess = async (classId, user, write = false) => {
  if (user.role === "admin") return true;

  if (user.role === "teacher") {
    const result = await query(
      `
        SELECT 1
        FROM CourseEnrollments
        WHERE classId = @classId
          AND teacherId = @teacherId
          AND isActive = true
        LIMIT 1
      `,
      { classId, teacherId: user.id },
    );
    return result.recordset.length > 0;
  }

  if (!write && user.role === "student") {
    const result = await query(
      `
        SELECT 1
        FROM StudentClasses
        WHERE classId = @classId
          AND studentId = @studentId
        LIMIT 1
      `,
      { classId, studentId: user.id },
    );
    return result.recordset.length > 0;
  }

  return false;
};

const getClassStudents = async (classId, client = null) => {
  const result = await query(
    `
      SELECT u.id, u.fullName, u.email, u.avatar, sc.joinedAt
      FROM StudentClasses sc
      JOIN Users u ON sc.studentId = u.id
      WHERE sc.classId = @classId
      ORDER BY u.fullName
    `,
    { classId },
    client,
  );

  return result.recordset;
};

const getScheduleById = async (scheduleId, classId, client = null) => {
  const result = await query(
    `
      SELECT ts.*, ce.subjectId, s.name AS subjectName, s.code AS subjectCode,
             u.fullName AS teacherName, c.name AS className
      FROM TimetableSessions ts
      JOIN CourseEnrollments ce ON ts.courseEnrollmentId = ce.id
      JOIN Subjects s ON ce.subjectId = s.id
      JOIN Users u ON ce.teacherId = u.id
      JOIN Classes c ON ts.classId = c.id
      WHERE ts.id = @scheduleId
        AND ts.classId = @classId
        AND ts.isActive = true
    `,
    { scheduleId, classId },
    client,
  );

  return result.recordset[0] || null;
};

const verifyScheduleOwnership = async (
  classId,
  scheduleId,
  user,
  client = null,
) => {
  if (user.role === "admin") return true;

  if (user.role !== "teacher") return false;

  const result = await query(
    `
      SELECT 1
      FROM TimetableSessions ts
      JOIN CourseEnrollments ce ON ts.courseEnrollmentId = ce.id
      WHERE ts.id = @scheduleId
        AND ts.classId = @classId
        AND ce.teacherId = @teacherId
        AND ce.isActive = true
        AND ts.isActive = true
      LIMIT 1
    `,
    { scheduleId, classId, teacherId: user.id },
    client,
  );

  return result.recordset.length > 0;
};

const buildAttendanceRows = (students, existingRecords) => {
  const recordMap = new Map(
    existingRecords.map((record) => [String(record.studentId), record]),
  );

  return students.map((student) => {
    const record = recordMap.get(String(student.id));
    return {
      studentId: student.id,
      fullName: student.fullName,
      email: student.email,
      avatar: student.avatar,
      status: record?.status || "present",
      absenceType:
        record?.absenceType ||
        (record?.status === "absent" ? "unexcused" : null),
      note: record?.note || "",
      checkedBy: record?.checkedBy || null,
      checkedAt: record?.checkedAt || null,
    };
  });
};

const enrichAttendanceSession = async (
  classId,
  scheduleSessionId,
  sessionDate,
  client = null,
) => {
  const students = await getClassStudents(classId, client);

  const sessionResult = await query(
    `
      SELECT *
      FROM AttendanceSessions
      WHERE classId = @classId
        AND timetableSessionId = @scheduleSessionId
        AND sessionDate = @sessionDate
      LIMIT 1
    `,
    {
      classId,
      scheduleSessionId,
      sessionDate: normalizeSessionDate(sessionDate),
    },
    client,
  );

  const session = sessionResult.recordset[0] || null;
  const recordsResult = session
    ? await query(
        `
          SELECT ar.*, u.fullName AS studentName, u.avatar AS studentAvatar
          FROM AttendanceRecords ar
          JOIN Users u ON ar.studentId = u.id
          WHERE ar.attendanceSessionId = @attendanceSessionId
          ORDER BY u.fullName
        `,
        { attendanceSessionId: session.id },
        client,
      )
    : { recordset: [] };

  return {
    attendanceSession: session,
    records: buildAttendanceRows(students, recordsResult.recordset),
    students,
  };
};

const listSchedules = asyncHandler(async (req, res) => {
  const { classId } = req.params;

  if (!(await ensureClassAccess(classId, req.user, false))) {
    throw createHttpError(403, "Access denied");
  }

  const result = await query(
    `
      SELECT ts.*, ce.subjectId, s.name AS subjectName, s.code AS subjectCode,
             u.fullName AS teacherName
      FROM TimetableSessions ts
      JOIN CourseEnrollments ce ON ts.courseEnrollmentId = ce.id
      JOIN Subjects s ON ce.subjectId = s.id
      JOIN Users u ON ce.teacherId = u.id
      WHERE ts.classId = @classId
        AND ts.isActive = true
      ORDER BY ts.dayOfWeek ASC, ts.startTime ASC, ts.roomName ASC
    `,
    { classId },
  );

  res.json(
    result.recordset.map((item) => ({
      ...item,
      dayLabel: dayLabels[item.dayOfWeek] || `Thứ ${item.dayOfWeek + 1}`,
    })),
  );
});

const createSchedule = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const { courseEnrollmentId, dayOfWeek, startTime, endTime, roomName, note } =
    req.body;

  if (!(await ensureClassAccess(classId, req.user, true))) {
    throw createHttpError(403, "Access denied");
  }

  const courseCheck = await query(
    `
      SELECT ce.id
      FROM CourseEnrollments ce
      WHERE ce.id = @courseEnrollmentId
        AND ce.classId = @classId
        AND ce.isActive = true
    `,
    { courseEnrollmentId, classId },
  );

  if (!courseCheck.recordset.length) {
    throw createHttpError(
      400,
      "Course enrollment does not belong to this class",
    );
  }

  const result = await query(
    `
      INSERT INTO TimetableSessions (
        classId, courseEnrollmentId, dayOfWeek, startTime, endTime, roomName, note, createdBy, updatedBy
      )
      VALUES (
        @classId, @courseEnrollmentId, @dayOfWeek, @startTime, @endTime, @roomName, @note, @userId, @userId
      )
      RETURNING id
    `,
    {
      classId,
      courseEnrollmentId,
      dayOfWeek,
      startTime,
      endTime,
      roomName: roomName || null,
      note: note || null,
      userId: req.user.id,
    },
  );

  const schedule = await getScheduleById(result.recordset[0].id, classId);
  res.status(201).json({
    ...schedule,
    dayLabel: dayLabels[schedule.dayOfWeek] || `Thứ ${schedule.dayOfWeek + 1}`,
  });
});

const updateSchedule = asyncHandler(async (req, res) => {
  const { classId, scheduleId } = req.params;
  const { courseEnrollmentId, dayOfWeek, startTime, endTime, roomName, note } =
    req.body;

  if (!(await verifyScheduleOwnership(classId, scheduleId, req.user))) {
    throw createHttpError(403, "Access denied");
  }

  if (courseEnrollmentId) {
    const courseCheck = await query(
      `
        SELECT ce.id
        FROM CourseEnrollments ce
        WHERE ce.id = @courseEnrollmentId
          AND ce.classId = @classId
          AND ce.isActive = true
      `,
      { courseEnrollmentId, classId },
    );

    if (!courseCheck.recordset.length) {
      throw createHttpError(
        400,
        "Course enrollment does not belong to this class",
      );
    }
  }

  await query(
    `
      UPDATE TimetableSessions SET
        courseEnrollmentId = COALESCE(@courseEnrollmentId, courseEnrollmentId),
        dayOfWeek = COALESCE(@dayOfWeek, dayOfWeek),
        startTime = COALESCE(@startTime, startTime),
        endTime = COALESCE(@endTime, endTime),
        roomName = COALESCE(@roomName, roomName),
        note = COALESCE(@note, note),
        updatedBy = @updatedBy,
        updatedAt = NOW()
      WHERE id = @scheduleId
        AND classId = @classId
        AND isActive = true
    `,
    {
      classId,
      scheduleId,
      courseEnrollmentId: courseEnrollmentId || null,
      dayOfWeek: dayOfWeek ?? null,
      startTime: startTime || null,
      endTime: endTime || null,
      roomName: roomName ?? null,
      note: note ?? null,
      updatedBy: req.user.id,
    },
  );

  const schedule = await getScheduleById(scheduleId, classId);
  if (!schedule) {
    throw createHttpError(404, "Schedule session not found");
  }

  res.json({
    ...schedule,
    dayLabel: dayLabels[schedule.dayOfWeek] || `Thứ ${schedule.dayOfWeek + 1}`,
  });
});

const deleteSchedule = asyncHandler(async (req, res) => {
  const { classId, scheduleId } = req.params;

  if (!(await verifyScheduleOwnership(classId, scheduleId, req.user))) {
    throw createHttpError(403, "Access denied");
  }

  await query(
    `
      UPDATE TimetableSessions
      SET isActive = false,
          updatedBy = @updatedBy,
          updatedAt = NOW()
      WHERE id = @scheduleId
        AND classId = @classId
    `,
    { classId, scheduleId, updatedBy: req.user.id },
  );

  res.json({ message: "Schedule deleted" });
});

const listAttendanceSessions = asyncHandler(async (req, res) => {
  const { classId } = req.params;

  if (!(await ensureClassAccess(classId, req.user, false))) {
    throw createHttpError(403, "Access denied");
  }

  const result = await query(
    `
      SELECT
        asess.*,
        ts.dayOfWeek,
        ts.startTime,
        ts.endTime,
        ts.roomName,
        s.name AS subjectName,
        s.code AS subjectCode,
        COUNT(ar.id)::int AS recordCount,
        COUNT(*) FILTER (WHERE ar.status = 'present')::int AS presentCount,
        COUNT(*) FILTER (WHERE ar.status = 'absent')::int AS absentCount,
        COUNT(*) FILTER (WHERE ar.status = 'late')::int AS lateCount,
        COUNT(*) FILTER (WHERE ar.status = 'absent' AND ar.absenceType = 'excused')::int AS excusedCount,
        COUNT(*) FILTER (WHERE ar.status = 'absent' AND COALESCE(ar.absenceType, 'unexcused') = 'unexcused')::int AS unexcusedCount
      FROM AttendanceSessions asess
      JOIN TimetableSessions ts ON asess.timetableSessionId = ts.id
      JOIN CourseEnrollments ce ON ts.courseEnrollmentId = ce.id
      JOIN Subjects s ON ce.subjectId = s.id
      LEFT JOIN AttendanceRecords ar ON ar.attendanceSessionId = asess.id
      WHERE asess.classId = @classId
      GROUP BY asess.id, ts.id, s.id
      ORDER BY asess.sessionDate DESC, ts.startTime ASC
    `,
    { classId },
  );

  res.json(result.recordset);
});

const getAttendanceSession = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const { scheduleSessionId, sessionDate } = req.query;

  if (!(await ensureClassAccess(classId, req.user, false))) {
    throw createHttpError(403, "Access denied");
  }

  if (!scheduleSessionId || !sessionDate) {
    throw createHttpError(
      400,
      "scheduleSessionId and sessionDate are required",
    );
  }

  const schedule = await getScheduleById(scheduleSessionId, classId);
  if (!schedule) {
    throw createHttpError(404, "Schedule session not found");
  }

  const { attendanceSession, records, students } =
    await enrichAttendanceSession(classId, scheduleSessionId, sessionDate);

  res.json({
    schedule: {
      ...schedule,
      dayLabel:
        dayLabels[schedule.dayOfWeek] || `Thứ ${schedule.dayOfWeek + 1}`,
    },
    attendanceSession,
    students,
    records,
  });
});

const saveAttendanceSession = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const { scheduleSessionId, sessionDate, note, records } = req.body;

  if (!(await ensureClassAccess(classId, req.user, true))) {
    throw createHttpError(403, "Access denied");
  }

  const schedule = await getScheduleById(scheduleSessionId, classId);
  if (!schedule) {
    throw createHttpError(404, "Schedule session not found");
  }

  const students = await getClassStudents(classId);
  const studentIds = new Set(students.map((student) => String(student.id)));
  const normalizedSessionDate = normalizeSessionDate(sessionDate);

  const saved = await withTransaction(async (client) => {
    const sessionResult = await query(
      `
        INSERT INTO AttendanceSessions (
          classId, timetableSessionId, sessionDate, note, createdBy, updatedBy
        )
        VALUES (
          @classId, @scheduleSessionId, @sessionDate, @note, @userId, @userId
        )
        ON CONFLICT (timetableSessionId, sessionDate)
        DO UPDATE SET
          note = EXCLUDED.note,
          updatedBy = EXCLUDED.updatedBy,
          updatedAt = NOW()
        RETURNING *
      `,
      {
        classId,
        scheduleSessionId,
        sessionDate: normalizedSessionDate,
        note: note || null,
        userId: req.user.id,
      },
      client,
    );

    const attendanceSession = sessionResult.recordset[0];

    await query(
      `DELETE FROM AttendanceRecords WHERE attendanceSessionId = @attendanceSessionId`,
      { attendanceSessionId: attendanceSession.id },
      client,
    );

    const recordList =
      Array.isArray(records) && records.length > 0
        ? records
        : students.map((student) => ({
            studentId: student.id,
            status: "present",
            absenceType: null,
            note: "",
          }));

    for (const record of recordList) {
      if (!studentIds.has(String(record.studentId))) {
        continue;
      }

      const status = ["present", "absent", "late"].includes(record.status)
        ? record.status
        : "present";
      const absenceType =
        status === "absent"
          ? record.absenceType === "excused"
            ? "excused"
            : "unexcused"
          : null;

      await query(
        `
          INSERT INTO AttendanceRecords (
            attendanceSessionId, studentId, status, absenceType, note, checkedBy
          )
          VALUES (
            @attendanceSessionId, @studentId, @status, @absenceType, @note, @checkedBy
          )
        `,
        {
          attendanceSessionId: attendanceSession.id,
          studentId: record.studentId,
          status,
          absenceType,
          note: record.note || null,
          checkedBy: req.user.id,
        },
        client,
      );
    }

    return attendanceSession;
  });

  const data = await enrichAttendanceSession(
    classId,
    scheduleSessionId,
    saved.sessionDate,
  );

  res.status(201).json({
    ...data,
    schedule: {
      ...schedule,
      dayLabel:
        dayLabels[schedule.dayOfWeek] || `Thứ ${schedule.dayOfWeek + 1}`,
    },
    attendanceSession: saved,
  });
});

module.exports = {
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  listAttendanceSessions,
  getAttendanceSession,
  saveAttendanceSession,
};
