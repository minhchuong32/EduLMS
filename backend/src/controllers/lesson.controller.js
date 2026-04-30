const { query, withTransaction } = require("../config/database");
const { asyncHandler } = require("../utils/asyncHandler");
const { createHttpError } = require("../utils/httpError");

const ensureTeacherOwnsCourse = async (courseEnrollmentId, teacherId) => {
  const check = await query(
    "SELECT id FROM CourseEnrollments WHERE id = @id AND teacherId = @teacherId",
    { id: courseEnrollmentId, teacherId },
  );

  if (!check.recordset.length) {
    throw createHttpError(403, "Access denied");
  }
};

const ensureTeacherOwnsLesson = async (lessonId, teacherId) => {
  const check = await query(
    `
      SELECT l.id FROM Lessons l
      JOIN CourseEnrollments ce ON l.courseEnrollmentId = ce.id
      WHERE l.id = @id AND ce.teacherId = @teacherId
    `,
    { id: lessonId, teacherId },
  );

  if (!check.recordset.length) {
    throw createHttpError(403, "Access denied");
  }
};

const studentHasClassAccess = async (classId, studentId) => {
  const result = await query(
    `
      SELECT 1
      FROM StudentClasses
      WHERE classId = @classId AND studentId = @studentId
      LIMIT 1
    `,
    { classId, studentId },
  );

  return result.recordset.length > 0;
};

const ensureCourseAccess = async (courseEnrollmentId, user) => {
  const result = await query(
    `
      SELECT id, teacherId, classId, isActive
      FROM CourseEnrollments
      WHERE id = @id AND isActive = true
      LIMIT 1
    `,
    { id: courseEnrollmentId },
  );

  if (!result.recordset.length) {
    throw createHttpError(404, "Course not found");
  }

  const course = result.recordset[0];
  if (user.role === "admin") {
    return course;
  }

  if (
    user.role === "teacher" &&
    String(course.teacherId) !== String(user.id)
  ) {
    throw createHttpError(403, "Access denied");
  }

  if (
    user.role === "student" &&
    !(await studentHasClassAccess(course.classId, user.id))
  ) {
    throw createHttpError(403, "Access denied");
  }

  throw createHttpError(403, "Access denied");
};

// GET /api/lessons/course/:courseId
const getLessonsByCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { role } = req.user;
  await ensureCourseAccess(courseId, req.user);
  let whereClause = "WHERE l.courseEnrollmentId = @courseId";
  if (role === "student") whereClause += " AND l.isPublished = true";

  const result = await query(
    `
      SELECT l.*, u.fullName AS teacherName
      FROM Lessons l
      JOIN CourseEnrollments ce ON l.courseEnrollmentId = ce.id
      JOIN Users u ON ce.teacherId = u.id
      ${whereClause}
      ORDER BY l.orderIndex ASC, l.createdAt ASC
    `,
    { courseId },
  );

  res.json(result.recordset);
});

// GET /api/lessons/:id
const getLesson = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    `
      SELECT l.*, ce.teacherId, ce.classId, ce.subjectId,
             s.name AS subjectName, u.fullName AS teacherName
      FROM Lessons l
      JOIN CourseEnrollments ce ON l.courseEnrollmentId = ce.id
      JOIN Subjects s ON ce.subjectId = s.id
      JOIN Users u ON ce.teacherId = u.id
      WHERE l.id = @id
    `,
    { id },
  );

  if (!result.recordset.length) {
    throw createHttpError(404, "Lesson not found");
  }

  const lesson = result.recordset[0];
  await ensureCourseAccess(lesson.courseEnrollmentId, req.user);

  if (req.user.role === "student" && !lesson.isPublished) {
    throw createHttpError(404, "Lesson not found");
  }

  const comments = await query(
    `
      SELECT c.*, u.fullName AS authorName, u.avatar AS authorAvatar, u.role AS authorRole
      FROM Comments c
      JOIN Users u ON c.authorId = u.id
      WHERE c.lessonId = @id
      ORDER BY c.createdAt ASC
    `,
    { id },
  );

  lesson.comments = comments.recordset;

  res.json(lesson);
});

// POST /api/lessons
const createLesson = asyncHandler(async (req, res) => {
  const { courseEnrollmentId, title, content, videoUrl, orderIndex } = req.body;
  const fileUrl = req.file ? `/uploads/lessons/${req.file.filename}` : null;

  await ensureTeacherOwnsCourse(courseEnrollmentId, req.user.id);

  const result = await query(
    `
      INSERT INTO Lessons (courseEnrollmentId, title, content, fileUrl, videoUrl, orderIndex)
      VALUES (@courseEnrollmentId, @title, @content, @fileUrl, @videoUrl, @orderIndex)
      RETURNING *
    `,
    {
      courseEnrollmentId,
      title,
      content: content || null,
      fileUrl,
      videoUrl: videoUrl || null,
      orderIndex: orderIndex || 0,
    },
  );

  res.status(201).json(result.recordset[0]);
});

// PUT /api/lessons/:id
const updateLesson = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, content, videoUrl, orderIndex } = req.body;
  const fileUrl = req.file
    ? `/uploads/lessons/${req.file.filename}`
    : undefined;

  await ensureTeacherOwnsLesson(id, req.user.id);

  const result = await query(
    `
      UPDATE Lessons SET
        title = COALESCE(@title, title),
        content = COALESCE(@content, content),
        ${fileUrl !== undefined ? "fileUrl = @fileUrl," : ""}
        videoUrl = COALESCE(@videoUrl, videoUrl),
        orderIndex = COALESCE(@orderIndex, orderIndex),
        updatedAt = NOW()
      WHERE id = @id
      RETURNING *
    `,
    { id, title, content, fileUrl: fileUrl || null, videoUrl, orderIndex },
  );

  if (!result.recordset.length) {
    throw createHttpError(404, "Lesson not found");
  }

  res.json(result.recordset[0]);
});

// PATCH /api/lessons/:id/publish
const publishLesson = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { publish } = req.body;

  await ensureTeacherOwnsLesson(id, req.user.id);

  await query(
    `
      UPDATE Lessons SET
        isPublished = @pub,
        publishedAt = CASE WHEN @pub THEN NOW() ELSE NULL END,
        updatedAt = NOW()
      WHERE id = @id
    `,
    { id, pub: !!publish },
  );

  res.json({ message: `Lesson ${publish ? "published" : "unpublished"}` });
});

// DELETE /api/lessons/:id
const deleteLesson = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await ensureTeacherOwnsLesson(id, req.user.id);

  await query("DELETE FROM Lessons WHERE id = @id", { id });
  res.json({ message: "Lesson deleted" });
});

// POST /api/lessons/:id/comments
const addComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content, parentId } = req.body;

  if (!content || !String(content).trim()) {
    throw createHttpError(400, "Comment content is required");
  }

  const result = await query(
    `
      INSERT INTO Comments (lessonId, authorId, content, parentId)
      VALUES (@lessonId, @authorId, @content, @parentId)
      RETURNING *
    `,
    {
      lessonId: id,
      authorId: req.user.id,
      content: String(content).trim(),
      parentId: parentId || null,
    },
  );

  res.status(201).json(result.recordset[0]);
});

// PUT /api/lessons/:id/comments/:commentId
const updateComment = asyncHandler(async (req, res) => {
  const { id, commentId } = req.params;
  const { content } = req.body;

  if (!content || !String(content).trim()) {
    throw createHttpError(400, "Comment content is required");
  }

  const ownership = await query(
    `
      SELECT c.authorId, ce.teacherId
      FROM Comments c
      JOIN Lessons l ON c.lessonId = l.id
      JOIN CourseEnrollments ce ON l.courseEnrollmentId = ce.id
      WHERE c.id = @commentId AND c.lessonId = @lessonId
      LIMIT 1
    `,
    { lessonId: id, commentId },
  );

  if (!ownership.recordset.length) {
    throw createHttpError(404, "Comment not found");
  }

  const comment = ownership.recordset[0];
  if (
    req.user.role === "teacher" &&
    String(comment.authorId) !== String(req.user.id) &&
    String(comment.teacherId) !== String(req.user.id)
  ) {
    throw createHttpError(403, "Access denied");
  }

  const result = await query(
    `
      UPDATE Comments
      SET content = @content,
          updatedAt = NOW()
      WHERE id = @commentId AND lessonId = @lessonId
      RETURNING *
    `,
    {
      lessonId: id,
      commentId,
      content: String(content).trim(),
    },
  );

  if (!result.recordset.length) {
    throw createHttpError(404, "Comment not found");
  }

  res.json(result.recordset[0]);
});

// DELETE /api/lessons/:id/comments/:commentId
const deleteComment = asyncHandler(async (req, res) => {
  const { id, commentId } = req.params;

  const ownership = await query(
    `
      SELECT c.authorId, ce.teacherId
      FROM Comments c
      JOIN Lessons l ON c.lessonId = l.id
      JOIN CourseEnrollments ce ON l.courseEnrollmentId = ce.id
      WHERE c.id = @commentId AND c.lessonId = @lessonId
      LIMIT 1
    `,
    { lessonId: id, commentId },
  );

  if (!ownership.recordset.length) {
    throw createHttpError(404, "Comment not found");
  }

  const comment = ownership.recordset[0];
  if (
    req.user.role === "teacher" &&
    String(comment.authorId) !== String(req.user.id) &&
    String(comment.teacherId) !== String(req.user.id)
  ) {
    throw createHttpError(403, "Access denied");
  }

  const result = await withTransaction(async (client) =>
    query(
      `
        WITH RECURSIVE descendants AS (
          SELECT id
          FROM Comments
          WHERE id = @commentId AND lessonId = @lessonId
          UNION ALL
          SELECT c.id
          FROM Comments c
          INNER JOIN descendants d ON c.parentId = d.id
        )
        DELETE FROM Comments
        WHERE id IN (SELECT id FROM descendants)
        RETURNING id
      `,
      {
        lessonId: id,
        commentId,
      },
      client,
    ),
  );

  if (!result.recordset.length) {
    throw createHttpError(404, "Comment not found");
  }

  res.json({ message: "Comment deleted" });
});

module.exports = {
  getLessonsByCourse,
  getLesson,
  createLesson,
  updateLesson,
  publishLesson,
  deleteLesson,
  addComment,
  updateComment,
  deleteComment,
};
