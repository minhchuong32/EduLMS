const { query } = require("../config/database");
const bcrypt = require("bcryptjs");

// ==================== USER CONTROLLER ====================
const getUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10),
    );
    const offset = (page - 1) * limit;
    let where = "WHERE 1=1";
    const filterParams = {};
    const paginationParams = {
      offset,
      limit,
    };
    if (role) {
      where += " AND role = @role";
      filterParams.role = role;
    }
    if (search) {
      where += " AND (fullName LIKE @search OR email LIKE @search)";
      filterParams.search = `%${search}%`;
    }

    const result = await query(
      `
      SELECT id, fullName, email, role, avatar, phone, isActive, createdAt
      FROM Users ${where}
      ORDER BY createdAt DESC   
      LIMIT @limit OFFSET @offset
    `,
      { ...filterParams, ...paginationParams },
    );

    const count = await query(
      `SELECT COUNT(*) AS total FROM Users ${where}`,
      filterParams,
    );
    res.json({ data: result.recordset, total: count.recordset[0].total });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const getUserById = async (req, res) => {
  try {
    const result = await query(
      "SELECT id, fullName, email, role, avatar, phone, dateOfBirth, gender, address, isActive, createdAt FROM Users WHERE id = @id",
      { id: req.params.id },
    );
    if (!result.recordset.length)
      return res.status(404).json({ error: "User not found" });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const getProfile = async (req, res) => {
  try {
    const result = await query(
      "SELECT id, fullName, email, role, avatar, phone, dateOfBirth, gender, address, isActive, createdAt FROM Users WHERE id = @id",
      { id: req.user.id },
    );

    if (!result.recordset.length) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const createUser = async (req, res) => {
  try {
    const { fullName, email, password, role, phone, dateOfBirth, gender } =
      req.body;
    const hash = await bcrypt.hash(password || "School@123", 12);
    const result = await query(
      `
      INSERT INTO Users (fullName, email, passwordHash, role, phone, dateOfBirth, gender)
      VALUES (@fullName, @email, @hash, @role, @phone, @dateOfBirth, @gender)
      RETURNING id, fullName, email, role
    `,
      {
        fullName,
        email: email.toLowerCase(),
        hash,
        role,
        phone: phone || null,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
      },
    );
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    if (err.message.includes("UNIQUE"))
      return res.status(400).json({ error: "Email already exists" });
    res.status(500).json({ error: "Server error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === "admin";
    const { fullName, phone, dateOfBirth, gender, address } = req.body;

    const isActive =
      isAdmin && req.body.isActive !== undefined
        ? !!req.body.isActive
        : undefined;
    const email = isAdmin ? req.body.email : undefined;
    const role = isAdmin ? req.body.role : undefined;

    let passwordHash = null;
    if (isAdmin && req.body.password && String(req.body.password).trim()) {
      passwordHash = await bcrypt.hash(String(req.body.password).trim(), 12);
    }

    if (role !== undefined && role !== null && role !== "") {
      if (!["admin", "teacher", "student"].includes(role)) {
        return res.status(400).json({ error: "Vai trò không hợp lệ" });
      }
    }

    const avatar = req.file
      ? `/uploads/avatars/${req.file.filename}`
      : undefined;

    const sets = [
      "fullName = COALESCE(@fullName, fullName)",
      "phone = COALESCE(@phone, phone)",
      "dateOfBirth = COALESCE(@dateOfBirth, dateOfBirth)",
      "gender = COALESCE(@gender, gender)",
      "address = COALESCE(@address, address)",
    ];
    if (avatar !== undefined) sets.push("avatar = @avatar");
    if (isAdmin && email !== undefined)
      sets.push("email = COALESCE(@email, email)");
    if (isAdmin && role !== undefined && role !== null && role !== "")
      sets.push("role = COALESCE(@role, role)");
    if (passwordHash) sets.push("passwordHash = @passwordHash");
    if (isActive !== undefined) sets.push("isActive = @isActive");
    sets.push("updatedAt = NOW()");

    const params = {
      id,
      fullName: fullName ?? null,
      phone: phone ?? null,
      dateOfBirth: dateOfBirth ?? null,
      gender: gender ?? null,
      address: address ?? null,
    };
    if (avatar !== undefined) params.avatar = avatar;
    if (isAdmin && email !== undefined) {
      const em = String(email).toLowerCase().trim();
      if (!em) return res.status(400).json({ error: "Email không hợp lệ" });
      params.email = em;
    }
    if (isAdmin && role !== undefined && role !== null && role !== "")
      params.role = role;
    if (passwordHash) params.passwordHash = passwordHash;
    if (isActive !== undefined) params.isActive = isActive;

    await query(`UPDATE Users SET ${sets.join(", ")} WHERE id = @id`, params);

    const result = await query(
      "SELECT id, fullName, email, role, avatar, phone, isActive FROM Users WHERE id = @id",
      { id },
    );
    res.json(result.recordset[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email đã được sử dụng" });
    }
    res.status(500).json({ error: "Server error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id === id) {
      return res
        .status(400)
        .json({ error: "Không thể xóa tài khoản của chính bạn" });
    }

    const target = await query("SELECT role FROM Users WHERE id = @id", { id });
    if (!target.recordset.length)
      return res.status(404).json({ error: "Không tìm thấy người dùng" });

    if (target.recordset[0].role === "admin") {
      const admins = await query(
        "SELECT COUNT(*)::int AS c FROM Users WHERE role = @role",
        { role: "admin" },
      );
      if (admins.recordset[0].c <= 1) {
        return res.status(400).json({
          error: "Không thể xóa quản trị viên cuối cùng",
        });
      }
    }

    const del = await query("DELETE FROM Users WHERE id = @id RETURNING id", {
      id,
    });
    if (!del.recordset.length)
      return res.status(404).json({ error: "Không tìm thấy người dùng" });
    res.json({ message: "Đã xóa tài khoản" });
  } catch (err) {
    if (err.code === "23503") {
      return res.status(409).json({
        error:
          "Không thể xóa: còn dữ liệu liên quan (khóa học, bài nộp…). Có thể khóa tài khoản thay vì xóa.",
      });
    }
    res.status(500).json({ error: "Server error" });
  }
};

const updateProfile = async (req, res) => {
  req.params.id = req.user.id;
  return updateUser(req, res);
};

const teacherHasClassAccess = async (classId, teacherId) => {
  const result = await query(
    `
    SELECT 1
    FROM CourseEnrollments
    WHERE classId = @classId AND teacherId = @teacherId AND isActive = true
    LIMIT 1
  `,
    { classId, teacherId },
  );

  return result.recordset.length > 0;
};

// ==================== CLASS CONTROLLER ====================
const getClasses = async (req, res) => {
  try {
    const { academicYear } = req.query;
    const params = {};
    let where = "WHERE 1=1";
    if (academicYear) {
      where += " AND academicYear = @academicYear";
      params.academicYear = academicYear;
    }

    if (req.user.role === "teacher") {
      where +=
        " AND EXISTS (SELECT 1 FROM CourseEnrollments ce WHERE ce.classId = c.id AND ce.teacherId = @teacherId AND ce.isActive = true)";
      params.teacherId = req.user.id;
    }

    const result = await query(
      `
      SELECT c.*, 
        (SELECT COUNT(*) FROM StudentClasses WHERE classId = c.id) AS studentCount
      FROM Classes c
      ${where} ORDER BY c.gradeLevel, c.name
    `,
      params,
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    const classResult = await query(
      `
      SELECT c.*, (SELECT COUNT(*) FROM StudentClasses WHERE classId = c.id) AS studentCount
      FROM Classes c WHERE c.id = @id
    `,
      { id },
    );
    if (!classResult.recordset.length)
      return res.status(404).json({ error: "Class not found" });

    if (
      req.user.role === "teacher" &&
      !(await teacherHasClassAccess(id, req.user.id))
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    const students = await query(
      `
      SELECT u.id, u.fullName, u.email, u.avatar, sc.joinedAt
      FROM StudentClasses sc JOIN Users u ON sc.studentId = u.id
      WHERE sc.classId = @id ORDER BY u.fullName
    `,
      { id },
    );

    const courses = await query(
      `
      SELECT ce.*, s.name AS subjectName, u.fullName AS teacherName
      FROM CourseEnrollments ce
      JOIN Subjects s ON ce.subjectId = s.id
      JOIN Users u ON ce.teacherId = u.id
      WHERE ce.classId = @id AND ce.isActive = true
    `,
      { id },
    );

    res.json({
      ...classResult.recordset[0],
      students: students.recordset,
      courses: courses.recordset,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const createClass = async (req, res) => {
  try {
    const { name, gradeLevel, academicYear, description } = req.body;

    const result = await query(
      `
      INSERT INTO Classes (name, gradeLevel, academicYear, description)
      VALUES (@name, @gradeLevel, @academicYear, @description)
      RETURNING *
    `,
      {
        name,
        gradeLevel,
        academicYear,
        description: description || null,
      },
    );
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        error: "Đã tồn tại lớp cùng tên, khối và năm học",
      });
    }
    res.status(500).json({ error: "Server error" });
  }
};

const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, gradeLevel, academicYear, description, isActive } = req.body;
    await query(
      `
      UPDATE Classes SET name = COALESCE(@name, name), gradeLevel = COALESCE(@gradeLevel, gradeLevel),
        academicYear = COALESCE(@academicYear, academicYear), description = COALESCE(@description, description),
        isActive = COALESCE(@isActive, isActive), updatedAt = NOW() WHERE id = @id
    `,
      {
        id,
        name,
        gradeLevel,
        academicYear,
        description,
        isActive: isActive !== undefined ? !!isActive : null,
      },
    );
    res.json({ message: "Class updated" });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        error: "Đã tồn tại lớp cùng tên, khối và năm học",
      });
    }
    res.status(500).json({ error: "Server error" });
  }
};

const addStudentToClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;

    if (
      req.user.role === "teacher" &&
      !(await teacherHasClassAccess(id, req.user.id))
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    await query(
      `
      INSERT INTO StudentClasses (studentId, classId)
      VALUES (@sid, @cid)
      ON CONFLICT (studentId, classId) DO NOTHING
    `,
      { sid: studentId, cid: id },
    );
    res.json({ message: "Student added to class" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const removeStudentFromClass = async (req, res) => {
  try {
    const { id, studentId } = req.params;

    if (
      req.user.role === "teacher" &&
      !(await teacherHasClassAccess(id, req.user.id))
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    await query(
      "DELETE FROM StudentClasses WHERE classId = @cid AND studentId = @sid",
      { cid: id, sid: studentId },
    );
    res.json({ message: "Student removed from class" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// ==================== SUBJECT CONTROLLER ====================
const getSubjects = async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM Subjects WHERE isActive = true ORDER BY name",
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const createSubject = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    const result = await query(
      `
      INSERT INTO Subjects (name, code, description)
      VALUES (@name, @code, @description)
      RETURNING *
    `,
      { name, code, description: description || null },
    );
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;
    await query(
      `
      UPDATE Subjects SET name = COALESCE(@name, name), description = COALESCE(@description, description),
        isActive = COALESCE(@isActive, isActive), updatedAt = NOW() WHERE id = @id
    `,
      {
        id,
        name,
        description,
        isActive: isActive !== undefined ? !!isActive : null,
      },
    );
    res.json({ message: "Subject updated" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// ==================== COURSE CONTROLLER ====================
const getCourses = async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    const { classId } = req.query;
    let where = "WHERE ce.isActive = true";
    const params = {};

    if (role === "teacher") {
      where += " AND ce.teacherId = @userId";
      params.userId = userId;
    } else if (role === "student") {
      where +=
        " AND ce.classId IN (SELECT classId FROM StudentClasses WHERE studentId = @userId)";
      params.userId = userId;
    }
    if (classId) {
      where += " AND ce.classId = @classId";
      params.classId = classId;
    }

    const result = await query(
      `
      SELECT ce.*, s.name AS subjectName, s.code AS subjectCode, s.thumbnail,
             u.fullName AS teacherName, u.avatar AS teacherAvatar,
             c.name AS className, c.gradeLevel,
             (SELECT COUNT(*) FROM Lessons WHERE courseEnrollmentId = ce.id AND isPublished = true) AS lessonCount,
             (SELECT COUNT(*) FROM Assignments WHERE courseEnrollmentId = ce.id AND isPublished = true) AS assignmentCount
      FROM CourseEnrollments ce
      JOIN Subjects s ON ce.subjectId = s.id
      JOIN Users u ON ce.teacherId = u.id
      JOIN Classes c ON ce.classId = c.id
      ${where} ORDER BY s.name
    `,
      params,
    );

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `
      SELECT ce.*, s.name AS subjectName, s.code AS subjectCode, s.thumbnail, s.description AS subjectDescription,
             u.fullName AS teacherName, u.avatar AS teacherAvatar, u.email AS teacherEmail,
             c.name AS className, c.gradeLevel
      FROM CourseEnrollments ce
      JOIN Subjects s ON ce.subjectId = s.id
      JOIN Users u ON ce.teacherId = u.id
      JOIN Classes c ON ce.classId = c.id
      WHERE ce.id = @id AND ce.isActive = true
    `,
      { id },
    );
    if (!result.recordset.length)
      return res.status(404).json({ error: "Course not found" });
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const createCourse = async (req, res) => {
  try {
    const { teacherId, subjectId, classId, semester, academicYear } = req.body;
    if (!teacherId || !subjectId || !classId || !academicYear) {
      return res.status(400).json({ error: "Thiếu thông tin khóa học" });
    }
    const result = await query(
      `
      INSERT INTO CourseEnrollments (teacherId, subjectId, classId, semester, academicYear)
      VALUES (@teacherId, @subjectId, @classId, @semester, @academicYear)
      RETURNING *
    `,
      { teacherId, subjectId, classId, semester, academicYear },
    );
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    if (err.message.includes("UNIQUE"))
      return res.status(400).json({ error: "Course already exists" });
    res.status(500).json({ error: "Server error" });
  }
};

const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId, subjectId, classId, semester, academicYear } = req.body;

    if (!teacherId || !subjectId || !classId || !academicYear) {
      return res.status(400).json({ error: "Thiếu thông tin khóa học" });
    }

    const result = await query(
      `
      UPDATE CourseEnrollments
      SET teacherId = @teacherId,
          subjectId = @subjectId,
          classId = @classId,
          semester = @semester,
          academicYear = @academicYear,
          updatedAt = NOW()
      WHERE id = @id AND isActive = true
      RETURNING *
    `,
      {
        id,
        teacherId,
        subjectId,
        classId,
        semester: semester || null,
        academicYear,
      },
    );

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Course already exists" });
    }
    res.status(500).json({ error: "Server error" });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `
      UPDATE CourseEnrollments
      SET isActive = false,
          updatedAt = NOW()
      WHERE id = @id AND isActive = true
      RETURNING id
    `,
      { id },
    );

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json({ message: "Course deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// ==================== ANNOUNCEMENT CONTROLLER ====================
const getAnnouncements = async (req, res) => {
  try {
    const { courseId, classId } = req.query;
    const { role, id: userId } = req.user;
    const params = {};
    const classColumnExists = await query(
      `
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'announcements' AND column_name = 'classid'
      LIMIT 1
    `,
    );
    const supportsClassId = classColumnExists.recordset.length > 0;

    if (classId && !supportsClassId) {
      return res.json([]);
    }

    let where = "WHERE 1=1";

    if (courseId) {
      where += " AND a.courseEnrollmentId = @courseId";
      params.courseId = courseId;

      if (role === "teacher") {
        where +=
          " AND a.courseEnrollmentId IN (SELECT id FROM CourseEnrollments WHERE teacherId = @userId AND isActive = true)";
        params.userId = userId;
      } else if (role === "student") {
        where +=
          " AND a.courseEnrollmentId IN (SELECT ce.id FROM CourseEnrollments ce JOIN StudentClasses sc ON ce.classId = sc.classId WHERE sc.studentId = @userId AND ce.isActive = true)";
        params.userId = userId;
      }
    } else if (classId) {
      where += " AND a.classId = @classId";
      params.classId = classId;

      if (role === "teacher") {
        where +=
          " AND a.classId IN (SELECT classId FROM CourseEnrollments WHERE teacherId = @userId AND isActive = true)";
        params.userId = userId;
      } else if (role === "student") {
        where +=
          " AND a.classId IN (SELECT classId FROM StudentClasses WHERE studentId = @userId)";
        params.userId = userId;
      }
    } else {
      where += " AND a.isGlobal = true";
    }

    const result = await query(
      `
      SELECT a.*, u.fullName AS authorName, u.avatar AS authorAvatar, u.role AS authorRole
      FROM Announcements a JOIN Users u ON a.authorId = u.id
      ${where}
      ORDER BY a.createdAt DESC
    `,
      params,
    );

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const createAnnouncement = async (req, res) => {
  try {
    const { title, content, courseEnrollmentId, classId, isGlobal } = req.body;
    const classColumnExists = await query(
      `
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'announcements' AND column_name = 'classid'
      LIMIT 1
    `,
    );
    const supportsClassId = classColumnExists.recordset.length > 0;

    if (req.user.role === "admin") {
      const result = supportsClassId
        ? await query(
            `
            INSERT INTO Announcements (courseEnrollmentId, classId, authorId, title, content, isGlobal)
            VALUES (NULL, NULL, @authorId, @title, @content, true)
            RETURNING *
          `,
            {
              authorId: req.user.id,
              title,
              content,
            },
          )
        : await query(
            `
            INSERT INTO Announcements (courseEnrollmentId, authorId, title, content, isGlobal)
            VALUES (NULL, @authorId, @title, @content, true)
            RETURNING *
          `,
            {
              authorId: req.user.id,
              title,
              content,
            },
          );
      return res.status(201).json(result.recordset[0]);
    }

    if (req.user.role !== "teacher") {
      return res.status(403).json({ error: "Access denied" });
    }

    if (isGlobal) {
      return res.status(400).json({
        error: "Giáo viên không thể đăng thông báo hệ thống",
      });
    }

    const hasCourseTarget = !!courseEnrollmentId;
    const hasClassTarget = !!classId;

    if (hasCourseTarget === hasClassTarget) {
      return res.status(400).json({
        error: "Chỉ chọn một đích: môn học hoặc lớp học",
      });
    }

    if (hasCourseTarget) {
      const hasAccess = await query(
        `
        SELECT 1
        FROM CourseEnrollments
        WHERE id = @courseId AND teacherId = @teacherId AND isActive = true
        LIMIT 1
      `,
        { courseId: courseEnrollmentId, teacherId: req.user.id },
      );

      if (!hasAccess.recordset.length) {
        return res.status(403).json({ error: "Access denied" });
      }

      const result = supportsClassId
        ? await query(
            `
            INSERT INTO Announcements (courseEnrollmentId, classId, authorId, title, content, isGlobal)
            VALUES (@courseId, NULL, @authorId, @title, @content, false)
            RETURNING *
          `,
            {
              courseId: courseEnrollmentId,
              authorId: req.user.id,
              title,
              content,
            },
          )
        : await query(
            `
            INSERT INTO Announcements (courseEnrollmentId, authorId, title, content, isGlobal)
            VALUES (@courseId, @authorId, @title, @content, false)
            RETURNING *
          `,
            {
              courseId: courseEnrollmentId,
              authorId: req.user.id,
              title,
              content,
            },
          );
      return res.status(201).json(result.recordset[0]);
    }

    const classAccess = await query(
      `
      SELECT 1
      FROM CourseEnrollments
      WHERE classId = @classId AND teacherId = @teacherId AND isActive = true
      LIMIT 1
    `,
      { classId, teacherId: req.user.id },
    );

    if (!classAccess.recordset.length) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = supportsClassId
      ? await query(
          `
          INSERT INTO Announcements (courseEnrollmentId, classId, authorId, title, content, isGlobal)
          VALUES (NULL, @classId, @authorId, @title, @content, false)
          RETURNING *
        `,
          {
            classId,
            authorId: req.user.id,
            title,
            content,
          },
        )
      : await query(
          `
          INSERT INTO Announcements (courseEnrollmentId, authorId, title, content, isGlobal)
          VALUES (NULL, @authorId, @title, @content, false)
          RETURNING *
        `,
          {
            authorId: req.user.id,
            title,
            content,
          },
        );
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const result = await query(
      `
      UPDATE Announcements
      SET title = COALESCE(@title, title),
          content = COALESCE(@content, content)
      WHERE id = @id AND isGlobal = true
      RETURNING *
    `,
      { id, title, content },
    );

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await query(
      "SELECT authorId, courseEnrollmentId, isGlobal FROM Announcements WHERE id = @id",
      { id },
    );
    if (!check.recordset.length)
      return res.status(404).json({ error: "Not found" });

    const announcement = check.recordset[0];
    const classColumnExists = await query(
      `
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'announcements' AND column_name = 'classid'
      LIMIT 1
    `,
    );

    let announcementClassId = null;
    if (classColumnExists.recordset.length) {
      const classResult = await query(
        "SELECT classId FROM Announcements WHERE id = @id",
        { id },
      );
      announcementClassId = classResult.recordset[0]?.classId || null;
    }

    if (req.user.role === "admin") {
      const deleted = await query(
        "DELETE FROM Announcements WHERE id = @id RETURNING id",
        { id },
      );

      if (!deleted.recordset.length) {
        return res.status(404).json({ error: "Not found" });
      }

      return res.json({ message: "Deleted" });
    }

    if (req.user.role !== "teacher") {
      return res.status(403).json({ error: "Access denied" });
    }

    const ownsCourse = announcement.courseEnrollmentId
      ? await query(
          `
        SELECT 1 FROM CourseEnrollments
        WHERE id = @courseId AND teacherId = @teacherId AND isActive = true
        LIMIT 1
      `,
          { courseId: announcement.courseEnrollmentId, teacherId: req.user.id },
        )
      : { recordset: [] };

    const ownsClass = announcementClassId
      ? await query(
          `
        SELECT 1 FROM CourseEnrollments
        WHERE classId = @classId AND teacherId = @teacherId AND isActive = true
        LIMIT 1
      `,
          { classId: announcementClassId, teacherId: req.user.id },
        )
      : { recordset: [] };

    if (!ownsCourse.recordset.length && !ownsClass.recordset.length) {
      return res.status(403).json({ error: "Access denied" });
    }

    const deleted = await query(
      "DELETE FROM Announcements WHERE id = @id RETURNING id",
      { id },
    );

    if (!deleted.recordset.length) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("deleteAnnouncement failed:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ==================== NOTIFICATION CONTROLLER ====================
const getNotifications = async (req, res) => {
  try {
    const result = await query(
      `
      SELECT * FROM Notifications WHERE userId = @userId ORDER BY createdAt DESC LIMIT 50
    `,
      { userId: req.user.id },
    );
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

const markRead = async (req, res) => {
  try {
    await query("UPDATE Notifications SET isRead = 1 WHERE userId = @userId", {
      userId: req.user.id,
    });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// ==================== DASHBOARD CONTROLLER ====================
const getDashboard = async (req, res) => {
  try {
    const { role, id: userId } = req.user;

    if (role === "admin") {
      const [users, classes, subjects, courses] = await Promise.all([
        query(
          "SELECT role, COUNT(*) AS cnt FROM Users WHERE isActive = true GROUP BY role",
        ),
        query("SELECT COUNT(*) AS cnt FROM Classes WHERE isActive = true"),
        query("SELECT COUNT(*) AS cnt FROM Subjects WHERE isActive = true"),
        query(
          "SELECT COUNT(*) AS cnt FROM CourseEnrollments WHERE isActive = true",
        ),
      ]);
      res.json({
        usersByRole: users.recordset,
        totalClasses: classes.recordset[0].cnt,
        totalSubjects: subjects.recordset[0].cnt,
        totalCourses: courses.recordset[0].cnt,
      });
    } else if (role === "teacher") {
      const [courses, lessons, assignments, pendingGrade] = await Promise.all([
        query(
          "SELECT COUNT(*) AS cnt FROM CourseEnrollments WHERE teacherId = @id AND isActive = true",
          { id: userId },
        ),
        query(
          `SELECT COUNT(*) AS cnt FROM Lessons l JOIN CourseEnrollments ce ON l.courseEnrollmentId = ce.id WHERE ce.teacherId = @id`,
          { id: userId },
        ),
        query(
          `SELECT COUNT(*) AS cnt FROM Assignments a JOIN CourseEnrollments ce ON a.courseEnrollmentId = ce.id WHERE ce.teacherId = @id`,
          { id: userId },
        ),
        query(
          `SELECT COUNT(*) AS cnt FROM Submissions s JOIN Assignments a ON s.assignmentId = a.id JOIN CourseEnrollments ce ON a.courseEnrollmentId = ce.id WHERE ce.teacherId = @id AND s.status = 'submitted'`,
          { id: userId },
        ),
      ]);
      res.json({
        totalCourses: courses.recordset[0].cnt,
        totalLessons: lessons.recordset[0].cnt,
        totalAssignments: assignments.recordset[0].cnt,
        pendingGrading: pendingGrade.recordset[0].cnt,
      });
    } else {
      const [courses, assignments, completed] = await Promise.all([
        query(
          `SELECT COUNT(*) AS cnt FROM CourseEnrollments ce JOIN StudentClasses sc ON ce.classId = sc.classId WHERE sc.studentId = @id AND ce.isActive = true`,
          { id: userId },
        ),
        query(
          `SELECT COUNT(*) AS cnt FROM Assignments a JOIN CourseEnrollments ce ON a.courseEnrollmentId = ce.id JOIN StudentClasses sc ON ce.classId = sc.classId WHERE sc.studentId = @id AND a.isPublished = true`,
          { id: userId },
        ),
        query(
          `SELECT COUNT(*) AS cnt FROM Submissions WHERE studentId = @id AND status IN ('submitted','graded')`,
          { id: userId },
        ),
      ]);
      res.json({
        totalCourses: courses.recordset[0].cnt,
        totalAssignments: assignments.recordset[0].cnt,
        completedAssignments: completed.recordset[0].cnt,
      });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  // Users
  getUsers,
  getUserById,
  getProfile,
  createUser,
  updateUser,
  deleteUser,
  updateProfile,
  // Classes
  getClasses,
  getClassById,
  createClass,
  updateClass,
  addStudentToClass,
  removeStudentFromClass,
  // Subjects
  getSubjects,
  createSubject,
  updateSubject,
  // Courses
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  // Announcements
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  // Notifications
  getNotifications,
  markRead,
  // Dashboard
  getDashboard,
};
