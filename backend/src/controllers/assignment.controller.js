const { query, withTransaction } = require("../config/database");

// GET /api/assignments/course/:courseId
const getAssignmentsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { role, id: userId } = req.user;

    let whereClause = "WHERE a.courseEnrollmentId = @courseId";
    if (role === "student") {
      whereClause +=
        " AND a.isPublished = true AND (a.startDate IS NULL OR a.startDate <= NOW())";
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
        (SELECT score FROM Submissions WHERE assignmentId = a.id AND studentId = @userId AND status = 'graded' ORDER BY submittedAt DESC LIMIT 1) AS myScore
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
  SELECT
    q.*,
    COALESCE(
      json_agg(
        json_build_object(
          'id', ao.id,
          'optionText', ao.optiontext,
          'orderIndex', ao.orderindex
          ${role === "teacher" ? ", 'isCorrect', ao.iscorrect" : ""}
        )
        ORDER BY ao.orderindex
      ) FILTER (WHERE ao.id IS NOT NULL),
      '[]'::json
    ) AS options
  FROM Questions q
  LEFT JOIN AnswerOptions ao ON ao.questionid = q.id
  WHERE q.assignmentid = @id
  GROUP BY q.id
  ORDER BY q.orderindex
`,
        { id },
      );

      assignment.questions = questionsResult.recordset.map((q) => ({
        ...q,
        options: q.options || [],
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

    const assignment = await withTransaction(async (client) => {
      const courseCheck = await query(
        `SELECT id FROM CourseEnrollments WHERE id = @courseId AND teacherId = @teacherId`,
        { courseId: courseEnrollmentId, teacherId: req.user.id },
        client,
      );

      if (!courseCheck.recordset.length) {
        const e = new Error("Access denied");
        e.status = 403;
        throw e;
      }

      const assignmentResult = await query(
        `
          INSERT INTO Assignments (courseEnrollmentId, title, description, type, dueDate, startDate,
            timeLimitMinutes, totalPoints, maxAttempts, shuffleQuestions, showResultImmediately)
          VALUES (@courseEnrollmentId, @title, @description, @type, @dueDate, @startDate,
            @timeLimitMinutes, @totalPoints, @maxAttempts, @shuffleQuestions, @showResultImmediately)
          RETURNING *
        `,
        {
          courseEnrollmentId,
          title,
          description: description || null,
          type,
          dueDate: dueDate ? new Date(dueDate) : null,
          startDate: startDate ? new Date(startDate) : null,
          timeLimitMinutes: timeLimitMinutes || null,
          totalPoints: totalPoints || 10,
          maxAttempts: maxAttempts || 1,
          shuffleQuestions: !!shuffleQuestions,
          showResultImmediately: showResultImmediately !== false,
        },
        client,
      );

      const createdAssignment = assignmentResult.recordset[0];

      if (type === "quiz" && questions && questions.length > 0) {
        for (let qi = 0; qi < questions.length; qi++) {
          const q = questions[qi];
          const questionResult = await query(
            `
              INSERT INTO Questions (assignmentId, questionText, questionType, points, orderIndex, explanation)
              VALUES (@assignmentId, @questionText, @questionType, @points, @orderIndex, @explanation)
              RETURNING id
            `,
            {
              assignmentId: createdAssignment.id,
              questionText: q.questionText,
              questionType: q.questionType,
              points: q.points || 1,
              orderIndex: qi,
              explanation: q.explanation || null,
            },
            client,
          );

          const questionId = questionResult.recordset[0].id;

          if (q.options && q.options.length > 0) {
            for (let oi = 0; oi < q.options.length; oi++) {
              const opt = q.options[oi];
              await query(
                `
                  INSERT INTO AnswerOptions (questionId, optionText, isCorrect, orderIndex)
                  VALUES (@questionId, @optionText, @isCorrect, @orderIndex)
                `,
                {
                  questionId,
                  optionText: opt.optionText,
                  isCorrect: !!opt.isCorrect,
                  orderIndex: oi,
                },
                client,
              );
            }
          }
        }
      }

      return createdAssignment;
    });

    res.status(201).json(assignment);
  } catch (err) {
    console.error(err);
    if (err.status === 403) {
      return res
        .status(403)
        .json({ error: "You do not have access to this course" });
    }
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
        updatedAt = NOW()
      WHERE id = @id
      RETURNING *
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
          shuffleQuestions !== undefined ? !!shuffleQuestions : null,
        showResultImmediately:
          showResultImmediately !== undefined ? !!showResultImmediately : null,
      },
    );

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Assignment not found" });
    }

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
        publishedAt = CASE WHEN @published THEN NOW() ELSE NULL END,
        updatedAt = NOW()
      WHERE id = @id
    `,
      { id, published: !!publish },
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

    await withTransaction(async (client) => {
      await query(
        `
        DELETE FROM StudentAnswers
        WHERE submissionId IN (SELECT id FROM Submissions WHERE assignmentId = @id)
      `,
        { id },
        client,
      );

      await query(
        `
        DELETE FROM Submissions
        WHERE assignmentId = @id
      `,
        { id },
        client,
      );

      await query(
        `
        DELETE FROM Assignments
        WHERE id = @id
      `,
        { id },
        client,
      );
    });
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
