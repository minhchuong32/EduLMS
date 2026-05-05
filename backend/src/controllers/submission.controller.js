const { query, withTransaction } = require("../config/database");
const { ensureNotificationSchema } = require("../utils/notification");

const ensureTeacherOwnsAssignment = async (assignmentId, teacherId) => {
  const check = await query(
    `
      SELECT 1
      FROM Assignments a
      JOIN CourseEnrollments ce ON a.courseEnrollmentId = ce.id
      WHERE a.id = @assignmentId AND ce.teacherId = @teacherId
      LIMIT 1
    `,
    { assignmentId, teacherId },
  );

  return check.recordset.length > 0;
};

// POST /api/submissions/start
const startSubmission = async (req, res) => {
  try {
    const { assignmentId } = req.body;
    const studentId = req.user.id;

    const result = await withTransaction(async (client) => {
      const assignmentResult = await query(
        `
          SELECT a.*
          FROM Assignments a
          JOIN CourseEnrollments ce ON a.courseEnrollmentId = ce.id
          JOIN StudentClasses sc ON sc.classId = ce.classId
          WHERE a.id = @id
            AND a.isPublished = true
            AND sc.studentId = @studentId
            AND (a.startDate IS NULL OR a.startDate <= NOW())
        `,
        { id: assignmentId, studentId },
        client,
      );
      if (!assignmentResult.recordset.length) {
        const error = new Error("Assignment not found or not published");
        error.status = 404;
        throw error;
      }

      const assignment = assignmentResult.recordset[0];

      if (assignment.type === "file") {
        const completedFileSubmissionResult = await query(
          "SELECT 1 FROM Submissions WHERE assignmentId = @aid AND studentId = @sid AND status != 'in_progress' LIMIT 1",
          { aid: assignmentId, sid: studentId },
          client,
        );

        if (completedFileSubmissionResult.recordset.length) {
          const error = new Error("File assignment has already been submitted");
          error.status = 409;
          throw error;
        }
      }

      const attemptResult = await query(
        "SELECT COUNT(*) AS cnt FROM Submissions WHERE assignmentId = @aid AND studentId = @sid AND status != @s",
        { aid: assignmentId, sid: studentId, s: "in_progress" },
        client,
      );
      const attempts = attemptResult.recordset[0].cnt;

      if (attempts >= assignment.maxAttempts) {
        const error = new Error(
          `Maximum attempts (${assignment.maxAttempts}) reached`,
        );
        error.status = 400;
        throw error;
      }

      const existing = await query(
        "SELECT * FROM Submissions WHERE assignmentId = @aid AND studentId = @sid AND status = 'in_progress'",
        { aid: assignmentId, sid: studentId },
        client,
      );
      if (existing.recordset.length) {
        return existing.recordset[0];
      }

      const inserted = await query(
        `
        INSERT INTO Submissions (assignmentId, studentId, attemptNumber, status, startedAt)
        VALUES (@assignmentId, @studentId, @attempt, 'in_progress', NOW())
        RETURNING *
      `,
        { assignmentId, studentId, attempt: attempts + 1 },
        client,
      );

      return inserted.recordset[0];
    });

    res.status(201).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/submissions/:id/submit-quiz
const submitQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body; // [{ questionId, selectedOptionIds: [...] }]
    const studentId = req.user.id;

    const submissionResult = await query(
      "SELECT s.*, a.totalPoints, a.showResultImmediately FROM Submissions s JOIN Assignments a ON s.assignmentId = a.id WHERE s.id = @id AND s.studentId = @sid AND s.status = 'in_progress'",
      { id, sid: studentId },
    );

    if (!submissionResult.recordset.length) {
      return res
        .status(404)
        .json({ error: "Submission not found or already submitted" });
    }

    const submission = submissionResult.recordset[0];

    // Get all questions with correct answers
    const questionsResult = await query(
      `
      SELECT
        q.id, q.questionType, q.points,
        COALESCE(
          json_agg(
            json_build_object('id', ao.id, 'isCorrect', ao.iscorrect)
            ORDER BY ao.orderindex
          ) FILTER (WHERE ao.id IS NOT NULL),
          '[]'::json
        ) AS options
      FROM Questions q
      LEFT JOIN AnswerOptions ao ON ao.questionid = q.id
      WHERE q.assignmentid = @aid
      GROUP BY q.id
    `,
      { aid: submission.assignmentId },
    );

    const questions = questionsResult.recordset.map((q) => ({
      ...q,
      options: q.options || [],
    }));

    const out = await withTransaction(async (client) => {
      let totalScore = 0;
      let maxScore = 0;

      for (const question of questions) {
        const questionPoints = Number(question.points) || 0;
        maxScore += questionPoints;

        const answer = answers.find(
          (a) => String(a.questionId) === String(question.id),
        );
        const selectedIds = Array.isArray(answer?.selectedOptionIds)
          ? answer.selectedOptionIds.map((id) => String(id))
          : [];
        const correctOptionIds = question.options
          .filter((o) => o.isCorrect)
          .map((o) => String(o.id));

        let isCorrect = false;
        let pointsEarned = 0;

        if (
          question.questionType === "single_choice" ||
          question.questionType === "true_false"
        ) {
          isCorrect =
            selectedIds.length === 1 &&
            correctOptionIds.includes(selectedIds[0]);
          pointsEarned = isCorrect ? questionPoints : 0;
        } else if (question.questionType === "multiple_choice") {
          const correctSet = new Set(correctOptionIds);
          const selectedSet = new Set(selectedIds);
          const allCorrect = [...correctSet].every((id) => selectedSet.has(id));
          const noWrong = [...selectedSet].every((id) => correctSet.has(id));
          isCorrect = allCorrect && noWrong && selectedIds.length > 0;
          pointsEarned = isCorrect ? questionPoints : 0;
        }

        totalScore += pointsEarned;

        await query(
          `
            INSERT INTO StudentAnswers (submissionId, questionId, selectedOptionIds, isCorrect, pointsEarned)
            VALUES (@submissionId, @questionId, @selectedOptionIds, @isCorrect, @pointsEarned)
          `,
          {
            submissionId: id,
            questionId: question.id,
            selectedOptionIds: JSON.stringify(selectedIds),
            isCorrect,
            pointsEarned,
          },
          client,
        );
      }

      const finalScore =
        maxScore > 0
          ? (totalScore / maxScore) * (Number(submission.totalPoints) || 0)
          : 0;
      const roundedScore = Math.round(finalScore * 100) / 100;

      await query(
        `
          UPDATE Submissions SET
            submittedAt = NOW(),
            score = @score,
            status = 'graded',
            gradedAt = NOW()
          WHERE id = @id
        `,
        { id, score: roundedScore },
        client,
      );

      return { roundedScore };
    });

    if (submission.showResultImmediately) {
      res.json({
        message: "Quiz submitted",
        score: out.roundedScore,
        totalPoints: submission.totalPoints,
      });
    } else {
      res.json({ message: "Quiz submitted successfully" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/submissions/:id/submit-essay
const submitEssay = async (req, res) => {
  try {
    const { id } = req.params;
    const { essayContent } = req.body;
    const studentId = req.user.id;
    const fileUrl = req.file
      ? `/uploads/submissions/${req.file.filename}`
      : null;

    const result = await query(
      "SELECT * FROM Submissions WHERE id = @id AND studentId = @sid AND status = 'in_progress'",
      { id, sid: studentId },
    );

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Submission not found" });
    }

    const existingSubmittedResult = await query(
      "SELECT 1 FROM Submissions WHERE assignmentId = @aid AND studentId = @sid AND status != 'in_progress' LIMIT 1",
      { aid: result.recordset[0].assignmentId, sid: studentId },
    );

    const submissionTypeResult = await query(
      "SELECT type FROM Assignments WHERE id = @id",
      { id: result.recordset[0].assignmentId },
    );
    const assignmentType = submissionTypeResult.recordset[0]?.type;

    if (assignmentType === "file" && existingSubmittedResult.recordset.length) {
      return res
        .status(409)
        .json({ error: "File assignment has already been submitted" });
    }

    const assignmentResult = await query(
      "SELECT dueDate FROM Assignments WHERE id = @id",
      { id: result.recordset[0].assignmentId },
    );
    const dueDate = assignmentResult.recordset[0].dueDate;
    const isLate = dueDate && new Date() > new Date(dueDate);

    await query(
      `
      UPDATE Submissions SET
        essayContent = @content,
        fileUrl = COALESCE(@fileUrl, fileUrl),
        submittedAt = NOW(),
        status = @status
      WHERE id = @id
    `,
      {
        id,
        content: essayContent || null,
        fileUrl,
        status: isLate ? "late" : "submitted",
      },
    );

    res.json({ message: "Essay submitted successfully", isLate });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// PUT /api/submissions/:id/grade
const gradeSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { score, feedback } = req.body;
    const teacherId = req.user.id;

    const submissionOwnerCheck = await query(
      `
        SELECT s.assignmentId
        FROM Submissions s
        WHERE s.id = @id
      `,
      { id },
    );

    if (!submissionOwnerCheck.recordset.length) {
      return res.status(404).json({ error: "Submission not found" });
    }

    if (req.user.role === "teacher") {
      const hasAccess = await ensureTeacherOwnsAssignment(
        submissionOwnerCheck.recordset[0].assignmentId,
        teacherId,
      );
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    await withTransaction(async (client) => {
      await ensureNotificationSchema();
      await query(
        `
        UPDATE Submissions SET
          score = @score,
          feedback = @feedback,
          gradedBy = @gradedBy,
          gradedAt = NOW(),
          status = 'graded'
        WHERE id = @id
      `,
        { id, score, feedback, gradedBy: teacherId },
        client,
      );

      const subResult = await query(
        "SELECT studentId, assignmentId FROM Submissions WHERE id = @id",
        { id },
        client,
      );
      if (subResult.recordset.length) {
        const { studentId, assignmentId } = subResult.recordset[0];
        await query(
          `
          INSERT INTO Notifications (userId, title, message, type, referenceId, senderRole)
          VALUES (@userId, 'Bài tập đã được chấm', 'Giáo viên đã chấm bài tập của bạn', 'grade', @refId::uuid, @senderRole)
        `,
          { userId: studentId, refId: assignmentId, senderRole: "teacher" },
          client,
        );
      }
    });

    res.json({ message: "Graded successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/submissions/assignment/:assignmentId
const getSubmissionsByAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    if (req.user.role === "teacher") {
      const hasAccess = await ensureTeacherOwnsAssignment(
        assignmentId,
        req.user.id,
      );
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const result = await query(
      `
      SELECT s.*, u.fullName AS studentName, u.avatar AS studentAvatar
      FROM Submissions s
      JOIN Users u ON s.studentId = u.id
      WHERE s.assignmentId = @assignmentId
      ORDER BY s.submittedAt DESC
    `,
      { assignmentId },
    );

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/submissions/:id/detail
const getSubmissionDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: currentUserId, role } = req.user;

    const result = await query(
      `
      SELECT s.*, u.fullName AS studentName,
             a.title AS assignmentTitle, a.type AS assignmentType,
             a.totalPoints,
             ce.teacherId
      FROM Submissions s
      JOIN Users u ON s.studentId = u.id
      JOIN Assignments a ON s.assignmentId = a.id
      JOIN CourseEnrollments ce ON a.courseEnrollmentId = ce.id
      WHERE s.id = @id
    `,
      { id },
    );

    if (!result.recordset.length) {
      return res.status(404).json({ error: "Submission not found" });
    }

    const submission = result.recordset[0];

    if (
      role === "student" &&
      String(submission.studentId) !== String(currentUserId)
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (
      role === "teacher" &&
      String(submission.teacherId) !== String(currentUserId)
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (role === "student") {
      if (submission.assignmentType === "file") {
        delete submission.fileUrl;
      }
    }

    if (submission.assignmentType === "quiz") {
      const answers = await query(
        `
        SELECT sa.*, q.questionText, q.questionType, q.points AS questionPoints, q.explanation,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', ao.id,
                     'optionText', ao.optiontext,
                     'isCorrect', ao.iscorrect,
                     'orderIndex', ao.orderindex
                   )
                   ORDER BY ao.orderindex
                 ) FILTER (WHERE ao.id IS NOT NULL),
                 '[]'::json
               ) AS options
        FROM StudentAnswers sa
        JOIN Questions q ON sa.questionId = q.id
        LEFT JOIN AnswerOptions ao ON ao.questionid = q.id
        WHERE sa.submissionid = @id
        GROUP BY sa.id, q.id
      `,
        { id },
      );

      submission.answers = answers.recordset.map((a) => ({
        ...a,
        options: a.options || [],
        selectedOptionIds: a.selectedOptionIds
          ? JSON.parse(a.selectedOptionIds)
          : [],
      }));
    }

    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// GET /api/submissions/my/:assignmentId
const getMySubmission = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const studentId = req.user.id;

    const result = await query(
      "SELECT * FROM Submissions WHERE assignmentId = @aid AND studentId = @sid ORDER BY attemptNumber DESC",
      { aid: assignmentId, sid: studentId },
    );

    const assignmentResult = await query(
      "SELECT type FROM Assignments WHERE id = @id",
      { id: assignmentId },
    );
    const assignmentType = assignmentResult.recordset[0]?.type;

    const submissions = result.recordset.map((submission) => {
      const item = { ...submission };
      if (assignmentType === "file") {
        delete item.fileUrl;
      }
      return item;
    });

    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  startSubmission,
  submitQuiz,
  submitEssay,
  gradeSubmission,
  getSubmissionsByAssignment,
  getSubmissionDetail,
  getMySubmission,
};
