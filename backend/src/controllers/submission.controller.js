const { query, sql, getPool } = require('../config/database');

// POST /api/submissions/start
const startSubmission = async (req, res) => {
  try {
    const { assignmentId } = req.body;
    const studentId = req.user.id;

    // Check assignment
    const assignmentResult = await query(
      'SELECT * FROM Assignments WHERE id = @id AND isPublished = 1',
      { id: assignmentId }
    );
    if (!assignmentResult.recordset.length) {
      return res.status(404).json({ error: 'Assignment not found or not published' });
    }

    const assignment = assignmentResult.recordset[0];

    // Check attempt count
    const attemptResult = await query(
      'SELECT COUNT(*) AS cnt FROM Submissions WHERE assignmentId = @aid AND studentId = @sid AND status != @s',
      { aid: assignmentId, sid: studentId, s: 'in_progress' }
    );
    const attempts = attemptResult.recordset[0].cnt;

    if (attempts >= assignment.maxAttempts) {
      return res.status(400).json({ error: `Maximum attempts (${assignment.maxAttempts}) reached` });
    }

    // Check if in_progress submission exists
    const existing = await query(
      "SELECT * FROM Submissions WHERE assignmentId = @aid AND studentId = @sid AND status = 'in_progress'",
      { aid: assignmentId, sid: studentId }
    );
    if (existing.recordset.length) {
      return res.json(existing.recordset[0]);
    }

    const result = await query(`
      INSERT INTO Submissions (assignmentId, studentId, attemptNumber, status, startedAt)
      OUTPUT INSERTED.*
      VALUES (@assignmentId, @studentId, @attempt, 'in_progress', GETDATE())
    `, { assignmentId, studentId, attempt: attempts + 1 });

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
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
      { id, sid: studentId }
    );

    if (!submissionResult.recordset.length) {
      return res.status(404).json({ error: 'Submission not found or already submitted' });
    }

    const submission = submissionResult.recordset[0];

    // Get all questions with correct answers
    const questionsResult = await query(`
      SELECT q.id, q.questionType, q.points,
             (SELECT ao.id, ao.isCorrect FROM AnswerOptions ao WHERE ao.questionId = q.id FOR JSON PATH) AS options
      FROM Questions q WHERE q.assignmentId = @aid
    `, { aid: submission.assignmentId });

    const questions = questionsResult.recordset.map(q => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : [],
    }));

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      let totalScore = 0;
      let maxScore = 0;

      for (const question of questions) {
        maxScore += question.points;
        const answer = answers.find(a => a.questionId === question.id);
        const selectedIds = answer ? answer.selectedOptionIds : [];
        const correctOptionIds = question.options.filter(o => o.isCorrect).map(o => o.id);

        let isCorrect = false;
        let pointsEarned = 0;

        if (question.questionType === 'single_choice' || question.questionType === 'true_false') {
          isCorrect = selectedIds.length === 1 && correctOptionIds.includes(selectedIds[0]);
          pointsEarned = isCorrect ? question.points : 0;
        } else if (question.questionType === 'multiple_choice') {
          const correctSet = new Set(correctOptionIds);
          const selectedSet = new Set(selectedIds);
          const allCorrect = [...correctSet].every(id => selectedSet.has(id));
          const noWrong = [...selectedSet].every(id => correctSet.has(id));
          isCorrect = allCorrect && noWrong && selectedIds.length > 0;
          pointsEarned = isCorrect ? question.points : 0;
        }

        totalScore += pointsEarned;

        await new sql.Request(transaction)
          .input('submissionId', id)
          .input('questionId', question.id)
          .input('selectedOptionIds', JSON.stringify(selectedIds))
          .input('isCorrect', isCorrect ? 1 : 0)
          .input('pointsEarned', pointsEarned)
          .query(`
            INSERT INTO StudentAnswers (submissionId, questionId, selectedOptionIds, isCorrect, pointsEarned)
            VALUES (@submissionId, @questionId, @selectedOptionIds, @isCorrect, @pointsEarned)
          `);
      }

      const finalScore = maxScore > 0 ? (totalScore / maxScore) * submission.totalPoints : 0;
      const roundedScore = Math.round(finalScore * 100) / 100;

      await new sql.Request(transaction)
        .input('id', id)
        .input('score', roundedScore)
        .query(`
          UPDATE Submissions SET
            submittedAt = GETDATE(),
            score = @score,
            status = 'graded',
            gradedAt = GETDATE()
          WHERE id = @id
        `);

      await transaction.commit();

      if (submission.showResultImmediately) {
        res.json({ message: 'Quiz submitted', score: roundedScore, totalPoints: submission.totalPoints });
      } else {
        res.json({ message: 'Quiz submitted successfully' });
      }
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/submissions/:id/submit-essay
const submitEssay = async (req, res) => {
  try {
    const { id } = req.params;
    const { essayContent } = req.body;
    const studentId = req.user.id;
    const fileUrl = req.file ? `/uploads/submissions/${req.file.filename}` : null;

    const result = await query(
      "SELECT * FROM Submissions WHERE id = @id AND studentId = @sid AND status = 'in_progress'",
      { id, sid: studentId }
    );

    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const assignmentResult = await query('SELECT dueDate FROM Assignments WHERE id = @id', { id: result.recordset[0].assignmentId });
    const dueDate = assignmentResult.recordset[0].dueDate;
    const isLate = dueDate && new Date() > new Date(dueDate);

    await query(`
      UPDATE Submissions SET
        essayContent = @content,
        fileUrl = COALESCE(@fileUrl, fileUrl),
        submittedAt = GETDATE(),
        status = @status
      WHERE id = @id
    `, { id, content: essayContent || null, fileUrl, status: isLate ? 'late' : 'submitted' });

    res.json({ message: 'Essay submitted successfully', isLate });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /api/submissions/:id/grade
const gradeSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { score, feedback } = req.body;
    const teacherId = req.user.id;

    await query(`
      UPDATE Submissions SET
        score = @score,
        feedback = @feedback,
        gradedBy = @gradedBy,
        gradedAt = GETDATE(),
        status = 'graded'
      WHERE id = @id
    `, { id, score, feedback, gradedBy: teacherId });

    // Send notification to student
    const subResult = await query('SELECT studentId, assignmentId FROM Submissions WHERE id = @id', { id });
    if (subResult.recordset.length) {
      const { studentId, assignmentId } = subResult.recordset[0];
      await query(`
        INSERT INTO Notifications (userId, title, message, type, referenceId)
        VALUES (@userId, N'Bài tập đã được chấm', N'Giáo viên đã chấm bài tập của bạn', 'grade', @refId)
      `, { userId: studentId, refId: assignmentId });
    }

    res.json({ message: 'Graded successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/submissions/assignment/:assignmentId
const getSubmissionsByAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const result = await query(`
      SELECT s.*, u.fullName AS studentName, u.avatar AS studentAvatar
      FROM Submissions s
      JOIN Users u ON s.studentId = u.id
      WHERE s.assignmentId = @assignmentId
      ORDER BY s.submittedAt DESC
    `, { assignmentId });

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/submissions/:id/detail
const getSubmissionDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT s.*, u.fullName AS studentName,
             a.title AS assignmentTitle, a.type AS assignmentType,
             a.totalPoints
      FROM Submissions s
      JOIN Users u ON s.studentId = u.id
      JOIN Assignments a ON s.assignmentId = a.id
      WHERE s.id = @id
    `, { id });

    if (!result.recordset.length) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = result.recordset[0];

    if (submission.assignmentType === 'quiz') {
      const answers = await query(`
        SELECT sa.*, q.questionText, q.questionType, q.points AS questionPoints, q.explanation,
               (SELECT ao.id, ao.optionText, ao.isCorrect, ao.orderIndex 
                FROM AnswerOptions ao WHERE ao.questionId = q.id ORDER BY ao.orderIndex FOR JSON PATH) AS options
        FROM StudentAnswers sa
        JOIN Questions q ON sa.questionId = q.id
        WHERE sa.submissionId = @id
      `, { id });

      submission.answers = answers.recordset.map(a => ({
        ...a,
        options: a.options ? JSON.parse(a.options) : [],
        selectedOptionIds: a.selectedOptionIds ? JSON.parse(a.selectedOptionIds) : [],
      }));
    }

    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/submissions/my/:assignmentId
const getMySubmission = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const studentId = req.user.id;

    const result = await query(
      'SELECT * FROM Submissions WHERE assignmentId = @aid AND studentId = @sid ORDER BY attemptNumber DESC',
      { aid: assignmentId, sid: studentId }
    );

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
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
