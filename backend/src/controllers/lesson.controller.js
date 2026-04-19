const { query } = require("../config/database");
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

// GET /api/lessons/course/:courseId
const getLessonsByCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { role } = req.user;
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

  const lesson = result.recordset[0];
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

module.exports = {
  getLessonsByCourse,
  getLesson,
  createLesson,
  updateLesson,
  publishLesson,
  deleteLesson,
  addComment,
};
