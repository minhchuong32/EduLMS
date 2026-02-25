const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

// ==================== USER CONTROLLER ====================
const getUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = { offset: parseInt(offset), limit: parseInt(limit) };
    if (role) { where += ' AND role = @role'; params.role = role; }
    if (search) { where += ' AND (fullName LIKE @search OR email LIKE @search)'; params.search = `%${search}%`; }

    const result = await query(`
      SELECT id, fullName, email, role, avatar, phone, isActive, createdAt
      FROM Users ${where}
      ORDER BY createdAt DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `, params);

    const count = await query(`SELECT COUNT(*) AS total FROM Users ${where}`, params);
    res.json({ data: result.recordset, total: count.recordset[0].total });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const getUserById = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, fullName, email, role, avatar, phone, dateOfBirth, gender, address, isActive, createdAt FROM Users WHERE id = @id',
      { id: req.params.id }
    );
    if (!result.recordset.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const createUser = async (req, res) => {
  try {
    const { fullName, email, password, role, phone, dateOfBirth, gender } = req.body;
    const hash = await bcrypt.hash(password || 'School@123', 12);
    const result = await query(`
      INSERT INTO Users (fullName, email, passwordHash, role, phone, dateOfBirth, gender)
      OUTPUT INSERTED.id, INSERTED.fullName, INSERTED.email, INSERTED.role
      VALUES (@fullName, @email, @hash, @role, @phone, @dateOfBirth, @gender)
    `, { fullName, email: email.toLowerCase(), hash, role, phone: phone || null, dateOfBirth: dateOfBirth || null, gender: gender || null });
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Server error' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, dateOfBirth, gender, address, isActive } = req.body;
    const avatar = req.file ? `/uploads/avatars/${req.file.filename}` : undefined;

    await query(`
      UPDATE Users SET
        fullName = COALESCE(@fullName, fullName),
        phone = COALESCE(@phone, phone),
        dateOfBirth = COALESCE(@dateOfBirth, dateOfBirth),
        gender = COALESCE(@gender, gender),
        address = COALESCE(@address, address),
        ${avatar !== undefined ? 'avatar = @avatar,' : ''}
        ${isActive !== undefined ? 'isActive = @isActive,' : ''}
        updatedAt = GETDATE()
      WHERE id = @id
    `, { id, fullName, phone, dateOfBirth, gender, address, avatar: avatar || null, isActive: isActive !== undefined ? (isActive ? 1 : 0) : null });

    const result = await query('SELECT id, fullName, email, role, avatar FROM Users WHERE id = @id', { id });
    res.json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const updateProfile = async (req, res) => {
  req.params.id = req.user.id;
  return updateUser(req, res);
};

// ==================== CLASS CONTROLLER ====================
const getClasses = async (req, res) => {
  try {
    const { academicYear } = req.query;
    const params = {};
    let where = 'WHERE 1=1';
    if (academicYear) { where += ' AND academicYear = @academicYear'; params.academicYear = academicYear; }

    const result = await query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM StudentClasses WHERE classId = c.id) AS studentCount
      FROM Classes c ${where} ORDER BY c.gradeLevel, c.name
    `, params);
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    const classResult = await query(`
      SELECT c.*, (SELECT COUNT(*) FROM StudentClasses WHERE classId = c.id) AS studentCount
      FROM Classes c WHERE c.id = @id
    `, { id });
    if (!classResult.recordset.length) return res.status(404).json({ error: 'Class not found' });

    const students = await query(`
      SELECT u.id, u.fullName, u.email, u.avatar, sc.joinedAt
      FROM StudentClasses sc JOIN Users u ON sc.studentId = u.id
      WHERE sc.classId = @id ORDER BY u.fullName
    `, { id });

    const courses = await query(`
      SELECT ce.*, s.name AS subjectName, u.fullName AS teacherName
      FROM CourseEnrollments ce
      JOIN Subjects s ON ce.subjectId = s.id
      JOIN Users u ON ce.teacherId = u.id
      WHERE ce.classId = @id AND ce.isActive = 1
    `, { id });

    res.json({ ...classResult.recordset[0], students: students.recordset, courses: courses.recordset });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const createClass = async (req, res) => {
  try {
    const { name, gradeLevel, academicYear, description } = req.body;
    const result = await query(`
      INSERT INTO Classes (name, gradeLevel, academicYear, description)
      OUTPUT INSERTED.* VALUES (@name, @gradeLevel, @academicYear, @description)
    `, { name, gradeLevel, academicYear, description: description || null });
    res.status(201).json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, gradeLevel, academicYear, description, isActive } = req.body;
    await query(`
      UPDATE Classes SET name = COALESCE(@name, name), gradeLevel = COALESCE(@gradeLevel, gradeLevel),
        academicYear = COALESCE(@academicYear, academicYear), description = COALESCE(@description, description),
        isActive = COALESCE(@isActive, isActive), updatedAt = GETDATE() WHERE id = @id
    `, { id, name, gradeLevel, academicYear, description, isActive: isActive !== undefined ? (isActive ? 1 : 0) : null });
    res.json({ message: 'Class updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const addStudentToClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;
    await query(`
      IF NOT EXISTS (SELECT * FROM StudentClasses WHERE studentId = @sid AND classId = @cid)
      INSERT INTO StudentClasses (studentId, classId) VALUES (@sid, @cid)
    `, { sid: studentId, cid: id });
    res.json({ message: 'Student added to class' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const removeStudentFromClass = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    await query('DELETE FROM StudentClasses WHERE classId = @cid AND studentId = @sid', { cid: id, sid: studentId });
    res.json({ message: 'Student removed from class' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// ==================== SUBJECT CONTROLLER ====================
const getSubjects = async (req, res) => {
  try {
    const result = await query('SELECT * FROM Subjects WHERE isActive = 1 ORDER BY name');
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const createSubject = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    const result = await query(`
      INSERT INTO Subjects (name, code, description) OUTPUT INSERTED.*
      VALUES (@name, @code, @description)
    `, { name, code, description: description || null });
    res.status(201).json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;
    await query(`
      UPDATE Subjects SET name = COALESCE(@name, name), description = COALESCE(@description, description),
        isActive = COALESCE(@isActive, isActive), updatedAt = GETDATE() WHERE id = @id
    `, { id, name, description, isActive: isActive !== undefined ? (isActive ? 1 : 0) : null });
    res.json({ message: 'Subject updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// ==================== COURSE CONTROLLER ====================
const getCourses = async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    const { classId } = req.query;
    let where = 'WHERE ce.isActive = 1';
    const params = {};

    if (role === 'teacher') { where += ' AND ce.teacherId = @userId'; params.userId = userId; }
    else if (role === 'student') {
      where += ' AND ce.classId IN (SELECT classId FROM StudentClasses WHERE studentId = @userId)';
      params.userId = userId;
    }
    if (classId) { where += ' AND ce.classId = @classId'; params.classId = classId; }

    const result = await query(`
      SELECT ce.*, s.name AS subjectName, s.code AS subjectCode, s.thumbnail,
             u.fullName AS teacherName, u.avatar AS teacherAvatar,
             c.name AS className, c.gradeLevel,
             (SELECT COUNT(*) FROM Lessons WHERE courseEnrollmentId = ce.id AND isPublished = 1) AS lessonCount,
             (SELECT COUNT(*) FROM Assignments WHERE courseEnrollmentId = ce.id AND isPublished = 1) AS assignmentCount
      FROM CourseEnrollments ce
      JOIN Subjects s ON ce.subjectId = s.id
      JOIN Users u ON ce.teacherId = u.id
      JOIN Classes c ON ce.classId = c.id
      ${where} ORDER BY s.name
    `, params);

    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT ce.*, s.name AS subjectName, s.code AS subjectCode, s.thumbnail, s.description AS subjectDescription,
             u.fullName AS teacherName, u.avatar AS teacherAvatar, u.email AS teacherEmail,
             c.name AS className, c.gradeLevel
      FROM CourseEnrollments ce
      JOIN Subjects s ON ce.subjectId = s.id
      JOIN Users u ON ce.teacherId = u.id
      JOIN Classes c ON ce.classId = c.id
      WHERE ce.id = @id
    `, { id });
    if (!result.recordset.length) return res.status(404).json({ error: 'Course not found' });
    res.json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const createCourse = async (req, res) => {
  try {
    const { teacherId, subjectId, classId, semester, academicYear } = req.body;
    const result = await query(`
      INSERT INTO CourseEnrollments (teacherId, subjectId, classId, semester, academicYear)
      OUTPUT INSERTED.* VALUES (@teacherId, @subjectId, @classId, @semester, @academicYear)
    `, { teacherId, subjectId, classId, semester, academicYear });
    res.status(201).json(result.recordset[0]);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Course already exists' });
    res.status(500).json({ error: 'Server error' });
  }
};

// ==================== ANNOUNCEMENT CONTROLLER ====================
const getAnnouncements = async (req, res) => {
  try {
    const { courseId } = req.query;
    const { role, id: userId } = req.user;
    const params = {};
    let where = 'WHERE (a.isGlobal = 1';

    if (role === 'student') {
      where += ` OR a.courseEnrollmentId IN (
        SELECT ce.id FROM CourseEnrollments ce
        JOIN StudentClasses sc ON ce.classId = sc.classId
        WHERE sc.studentId = @userId)`;
      params.userId = userId;
    } else if (role === 'teacher') {
      where += ` OR a.courseEnrollmentId IN (SELECT id FROM CourseEnrollments WHERE teacherId = @userId)`;
      params.userId = userId;
    }
    where += ')';

    if (courseId) { where += ' AND a.courseEnrollmentId = @courseId'; params.courseId = courseId; }

    const result = await query(`
      SELECT a.*, u.fullName AS authorName, u.avatar AS authorAvatar, u.role AS authorRole
      FROM Announcements a JOIN Users u ON a.authorId = u.id
      ${where} ORDER BY a.createdAt DESC
    `, params);

    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const createAnnouncement = async (req, res) => {
  try {
    const { courseEnrollmentId, title, content, isGlobal } = req.body;
    const result = await query(`
      INSERT INTO Announcements (courseEnrollmentId, authorId, title, content, isGlobal)
      OUTPUT INSERTED.* VALUES (@courseId, @authorId, @title, @content, @isGlobal)
    `, {
      courseId: courseEnrollmentId || null,
      authorId: req.user.id, title, content,
      isGlobal: isGlobal && req.user.role === 'admin' ? 1 : 0,
    });
    res.status(201).json(result.recordset[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await query('SELECT authorId FROM Announcements WHERE id = @id', { id });
    if (!check.recordset.length) return res.status(404).json({ error: 'Not found' });
    if (check.recordset[0].authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    await query('DELETE FROM Announcements WHERE id = @id', { id });
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// ==================== NOTIFICATION CONTROLLER ====================
const getNotifications = async (req, res) => {
  try {
    const result = await query(`
      SELECT TOP 50 * FROM Notifications WHERE userId = @userId ORDER BY createdAt DESC
    `, { userId: req.user.id });
    res.json(result.recordset);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

const markRead = async (req, res) => {
  try {
    await query('UPDATE Notifications SET isRead = 1 WHERE userId = @userId', { userId: req.user.id });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

// ==================== DASHBOARD CONTROLLER ====================
const getDashboard = async (req, res) => {
  try {
    const { role, id: userId } = req.user;

    if (role === 'admin') {
      const [users, classes, subjects, courses] = await Promise.all([
        query('SELECT role, COUNT(*) AS cnt FROM Users WHERE isActive = 1 GROUP BY role'),
        query('SELECT COUNT(*) AS cnt FROM Classes WHERE isActive = 1'),
        query('SELECT COUNT(*) AS cnt FROM Subjects WHERE isActive = 1'),
        query('SELECT COUNT(*) AS cnt FROM CourseEnrollments WHERE isActive = 1'),
      ]);
      res.json({
        usersByRole: users.recordset,
        totalClasses: classes.recordset[0].cnt,
        totalSubjects: subjects.recordset[0].cnt,
        totalCourses: courses.recordset[0].cnt,
      });
    } else if (role === 'teacher') {
      const [courses, lessons, assignments, pendingGrade] = await Promise.all([
        query('SELECT COUNT(*) AS cnt FROM CourseEnrollments WHERE teacherId = @id AND isActive = 1', { id: userId }),
        query(`SELECT COUNT(*) AS cnt FROM Lessons l JOIN CourseEnrollments ce ON l.courseEnrollmentId = ce.id WHERE ce.teacherId = @id`, { id: userId }),
        query(`SELECT COUNT(*) AS cnt FROM Assignments a JOIN CourseEnrollments ce ON a.courseEnrollmentId = ce.id WHERE ce.teacherId = @id`, { id: userId }),
        query(`SELECT COUNT(*) AS cnt FROM Submissions s JOIN Assignments a ON s.assignmentId = a.id JOIN CourseEnrollments ce ON a.courseEnrollmentId = ce.id WHERE ce.teacherId = @id AND s.status = 'submitted'`, { id: userId }),
      ]);
      res.json({
        totalCourses: courses.recordset[0].cnt,
        totalLessons: lessons.recordset[0].cnt,
        totalAssignments: assignments.recordset[0].cnt,
        pendingGrading: pendingGrade.recordset[0].cnt,
      });
    } else {
      const [courses, assignments, completed] = await Promise.all([
        query(`SELECT COUNT(*) AS cnt FROM CourseEnrollments ce JOIN StudentClasses sc ON ce.classId = sc.classId WHERE sc.studentId = @id AND ce.isActive = 1`, { id: userId }),
        query(`SELECT COUNT(*) AS cnt FROM Assignments a JOIN CourseEnrollments ce ON a.courseEnrollmentId = ce.id JOIN StudentClasses sc ON ce.classId = sc.classId WHERE sc.studentId = @id AND a.isPublished = 1`, { id: userId }),
        query(`SELECT COUNT(*) AS cnt FROM Submissions WHERE studentId = @id AND status IN ('submitted','graded')`, { id: userId }),
      ]);
      res.json({
        totalCourses: courses.recordset[0].cnt,
        totalAssignments: assignments.recordset[0].cnt,
        completedAssignments: completed.recordset[0].cnt,
      });
    }
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
};

module.exports = {
  // Users
  getUsers, getUserById, createUser, updateUser, updateProfile,
  // Classes
  getClasses, getClassById, createClass, updateClass, addStudentToClass, removeStudentFromClass,
  // Subjects
  getSubjects, createSubject, updateSubject,
  // Courses
  getCourses, getCourseById, createCourse,
  // Announcements
  getAnnouncements, createAnnouncement, deleteAnnouncement,
  // Notifications
  getNotifications, markRead,
  // Dashboard
  getDashboard,
};
