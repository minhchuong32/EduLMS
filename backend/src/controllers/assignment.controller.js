const { query, sql, getPool } = require("../config/database");

// GET /api/assignments/course/:courseId
const getAssignmentsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { role, id: userId } = req.user;

    let whereClause = "WHERE a.courseEnrollmentId = @courseId";
    if (role === "student") {
      whereClause +=
        " AND a.isPublished = 1 AND (a.startDate IS NULL OR a.startDate <= GETDATE())";
    }

    const result = await query(
      `
      SELECT 
        a.*,
        ce.subjectId,
        s.name AS subjectName,
        u.fullName AS teacherName,
        (SELECT COUNT(*) FROM Questions WHERE assignmentId = a.id) AS questionCount,
        (SELECT COUNT(*) FROM Submissions WHERE assignmentId = a.id AND studentId = @userId) AS mySubmissions,
        (SELECT TOP 1 score FROM Submissions WHERE assignmentId = a.id AND studentId = @userId AND status = 'graded' ORDER BY submittedAt DESC) AS myScore
      FROM Assignments a
      JOIN CourseEnrollments ce ON a.courseEnrollmentId = ce.id
      JOIN Subjects s ON ce.subjectId = s.id
      JOIN Users u ON ce.teacherId = u.id
      ${whereClause}
      ORDER BY a.createdAt DESC
    `,
      { courseId, userId },
    );

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/assignments/:id
const getAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.user;

    const result = await query(
      `
      SELECT a.*, ce.teacherId, ce.classId, ce.subjectId,
             s.name AS subjectName, u.fullName AS teacherName
      FROM Assignments a
      JOIN CourseEnrollments ce ON a.courseEnrollmentId = ce.id
      JOIN Subjects s ON ce.subjectId = s.id
      JOIN Users u ON ce.teacherId = u.id
      WHERE a.id = @id
    `,
      { id },
    );

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const assignment = result.recordset[0];

    // Get questions (hide correct answers for students during quiz)
    if (assignment.type === "quiz") {
      const questionsResult = await query(
        `
  SELECT q.*, 
    (
      SELECT 
        ao.id,
        ao.optionText,
        ao.orderIndex
        ${role === "teacher" ? ", ao.isCorrect" : ""}
      FROM AnswerOptions ao
      WHERE ao.questionId = q.id
      ORDER BY ao.orderIndex
      FOR JSON PATH
    ) AS options
  FROM Questions q
  WHERE q.assignmentId = @id
  ORDER BY q.orderIndex
`,
        { id },
      );

      assignment.questions = questionsResult.recordset.map((q) => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : [],
      }));
    }

    res.json(assignment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/assignments
const createAssignment = async (req, res) => {
  try {
    const {
      courseEnrollmentId,
      title,
      description,
      type,
      dueDate,
      startDate,
      timeLimitMinutes,
      totalPoints,
      maxAttempts,
      shuffleQuestions,
      showResultImmediately,
      questions,
    } = req.body;

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Verify teacher owns this course
      const courseCheck = await new sql.Request(transaction)
        .input("courseId", courseEnrollmentId)
        .input("teacherId", req.user.id)
        .query(
          "SELECT id FROM CourseEnrollments WHERE id = @courseId AND teacherId = @teacherId",
        );

      if (!courseCheck.recordset.length) {
        await transaction.rollback();
        return res
          .status(403)
          .json({ error: "You do not have access to this course" });
      }

      // Create assignment
      const assignmentResult = await new sql.Request(transaction)
        .input("courseEnrollmentId", courseEnrollmentId)
        .input("title", title)
        .input("description", description || null)
        .input("type", type)
        .input("dueDate", dueDate ? new Date(dueDate) : null)
        .input("startDate", startDate ? new Date(startDate) : null)
        .input("timeLimitMinutes", timeLimitMinutes || null)
        .input("totalPoints", totalPoints || 10)
        .input("maxAttempts", maxAttempts || 1)
        .input("shuffleQuestions", shuffleQuestions ? 1 : 0)
        .input("showResultImmediately", showResultImmediately !== false ? 1 : 0)
        .query(`
          INSERT INTO Assignments (courseEnrollmentId, title, description, type, dueDate, startDate,
            timeLimitMinutes, totalPoints, maxAttempts, shuffleQuestions, showResultImmediately)
          OUTPUT INSERTED.*
          VALUES (@courseEnrollmentId, @title, @description, @type, @dueDate, @startDate,
            @timeLimitMinutes, @totalPoints, @maxAttempts, @shuffleQuestions, @showResultImmediately)
        `);

      const assignment = assignmentResult.recordset[0];

      // Create questions if quiz
      if (type === "quiz" && questions && questions.length > 0) {
        for (let qi = 0; qi < questions.length; qi++) {
          const q = questions[qi];
          const questionResult = await new sql.Request(transaction)
            .input("assignmentId", assignment.id)
            .input("questionText", q.questionText)
            .input("questionType", q.questionType)
            .input("points", q.points || 1)
            .input("orderIndex", qi)
            .input("explanation", q.explanation || null).query(`
              INSERT INTO Questions (assignmentId, questionText, questionType, points, orderIndex, explanation)
              OUTPUT INSERTED.id
              VALUES (@assignmentId, @questionText, @questionType, @points, @orderIndex, @explanation)
            `);

          const questionId = questionResult.recordset[0].id;

          if (q.options && q.options.length > 0) {
            for (let oi = 0; oi < q.options.length; oi++) {
              const opt = q.options[oi];
              await new sql.Request(transaction)
                .input("questionId", questionId)
                .input("optionText", opt.optionText)
                .input("isCorrect", opt.isCorrect ? 1 : 0)
                .input("orderIndex", oi).query(`
                  INSERT INTO AnswerOptions (questionId, optionText, isCorrect, orderIndex)
                  VALUES (@questionId, @optionText, @isCorrect, @orderIndex)
                `);
            }
          }
        }
      }

      await transaction.commit();
      res.status(201).json(assignment);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// PUT /api/assignments/:id
const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      dueDate,
      startDate,
      timeLimitMinutes,
      totalPoints,
      maxAttempts,
      shuffleQuestions,
      showResultImmediately,
    } = req.body;

    // Verify ownership
    const check = await query(
      `
      SELECT a.id FROM Assignments a
      JOIN CourseEnrollments ce ON a.courseEnrollmentId = ce.id
      WHERE a.id = @id AND ce.teacherId = @teacherId
    `,
      { id, teacherId: req.user.id },
    );

    if (!check.recordset.length) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await query(
      `
      UPDATE Assignments SET
        title = COALESCE(@title, title),
        description = COALESCE(@description, description),
        dueDate = @dueDate,
        startDate = @startDate,
        timeLimitMinutes = @timeLimitMinutes,
        totalPoints = COALESCE(@totalPoints, totalPoints),
        maxAttempts = COALESCE(@maxAttempts, maxAttempts),
        shuffleQuestions = COALESCE(@shuffleQuestions, shuffleQuestions),
        showResultImmediately = COALESCE(@showResultImmediately, showResultImmediately),
        updatedAt = GETDATE()
      OUTPUT INSERTED.*
      WHERE id = @id
    `,
      {
        id,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        startDate: startDate ? new Date(startDate) : null,
        timeLimitMinutes,
        totalPoints,
        maxAttempts,
        shuffleQuestions:
          shuffleQuestions !== undefined ? (shuffleQuestions ? 1 : 0) : null,
        showResultImmediately:
          showResultImmediately !== undefined
            ? showResultImmediately
              ? 1
              : 0
            : null,
      },
    );

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PATCH /api/assignments/:id/publish
const publishAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { publish } = req.body;

    const check = await query(
      `
      SELECT a.id FROM Assignments a
      JOIN CourseEnrollments ce ON a.courseEnrollmentId = ce.id
      WHERE a.id = @id AND ce.teacherId = @teacherId
    `,
      { id, teacherId: req.user.id },
    );

    if (!check.recordset.length) {
      return res.status(403).json({ error: "Access denied" });
    }

    await query(
      `
      UPDATE Assignments SET 
        isPublished = @published,
        publishedAt = CASE WHEN @published = 1 THEN GETDATE() ELSE NULL END,
        updatedAt = GETDATE()
      WHERE id = @id
    `,
      { id, published: publish ? 1 : 0 },
    );

    res.json({
      message: `Assignment ${publish ? "published" : "unpublished"} successfully`,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// DELETE /api/assignments/:id
const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const check = await query(
      `
      SELECT a.id FROM Assignments a
      JOIN CourseEnrollments ce ON a.courseEnrollmentId = ce.id
      WHERE a.id = @id AND ce.teacherId = @teacherId
    `,
      { id, teacherId: req.user.id },
    );

    if (!check.recordset.length) {
      return res.status(403).json({ error: "Access denied" });
    }

    await query("DELETE FROM Assignments WHERE id = @id", { id });
    res.json({ message: "Assignment deleted" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getAssignmentsByCourse,
  getAssignment,
  createAssignment,
  updateAssignment,
  publishAssignment,
  deleteAssignment,
};
