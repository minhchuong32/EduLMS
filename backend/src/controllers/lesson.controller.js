const { query } = require("../config/database");

// GET /api/lessons/course/:courseId
const getLessonsByCourse = async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/lessons/:id
const getLesson = async (req, res) => {
  try {
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

    if (!result.recordset.length)
      return res.status(404).json({ error: "Lesson not found" });

    // Get comments
    const comments = await query(
      `
      SELECT c.*, u.fullName AS authorName, u.avatar AS authorAvatar, u.role AS authorRole
      FROM Comments c
      JOIN Users u ON c.authorId = u.id
      WHERE c.lessonId = @id AND c.parentId IS NULL
      ORDER BY c.createdAt ASC
    `,
      { id },
    );

    const lesson = result.recordset[0];
    lesson.comments = comments.recordset;

    res.json(lesson);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/lessons
const createLesson = async (req, res) => {
  try {
    const { courseEnrollmentId, title, content, videoUrl, orderIndex } =
      req.body;
    const fileUrl = req.file ? `/uploads/lessons/${req.file.filename}` : null;
    console.log("userId:", req.user.id);
    console.log("courseEnrollmentId:", courseEnrollmentId);

    // Verify teacher
    const check = await query(
      "SELECT id FROM CourseEnrollments WHERE id = @id AND teacherId = @teacherId",
      { id: courseEnrollmentId, teacherId: req.user.id },
    );
    if (!check.recordset.length)
      return res.status(403).json({ error: "Access denied" });

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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// PUT /api/lessons/:id
const updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, videoUrl, orderIndex } = req.body;
    const fileUrl = req.file
      ? `/uploads/lessons/${req.file.filename}`
      : undefined;

    const check = await query(
      `
      SELECT l.id FROM Lessons l
      JOIN CourseEnrollments ce ON l.courseEnrollmentId = ce.id
      WHERE l.id = @id AND ce.teacherId = @teacherId
    `,
      { id, teacherId: req.user.id },
    );
    if (!check.recordset.length)
      return res.status(403).json({ error: "Access denied" });

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

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PATCH /api/lessons/:id/publish
const publishLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { publish } = req.body;

    const check = await query(
      `
      SELECT l.id FROM Lessons l
      JOIN CourseEnrollments ce ON l.courseEnrollmentId = ce.id
      WHERE l.id = @id AND ce.teacherId = @teacherId
    `,
      { id, teacherId: req.user.id },
    );
    if (!check.recordset.length)
      return res.status(403).json({ error: "Access denied" });

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
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// DELETE /api/lessons/:id
const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await query(
      `
      SELECT l.id FROM Lessons l
      JOIN CourseEnrollments ce ON l.courseEnrollmentId = ce.id
      WHERE l.id = @id AND ce.teacherId = @teacherId
    `,
      { id, teacherId: req.user.id },
    );
    if (!check.recordset.length)
      return res.status(403).json({ error: "Access denied" });

    await query("DELETE FROM Lessons WHERE id = @id", { id });
    res.json({ message: "Lesson deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/lessons/:id/comments
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parentId } = req.body;

    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: "Comment content is required" });
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
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getLessonsByCourse,
  getLesson,
  createLesson,
  updateLesson,
  publishLesson,
  deleteLesson,
  addComment,
};
