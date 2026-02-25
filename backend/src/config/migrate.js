const { sql, getPool } = require('./database');
require('dotenv').config();

const migrate = async () => {
  const pool = await getPool();

  console.log('🔄 Running migrations...');

  // Create Database if not exists (run against master)
  const createDB = `
    IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = '${process.env.DB_NAME}')
    BEGIN
      CREATE DATABASE [${process.env.DB_NAME}]
    END
  `;

  const tables = `
    USE [${process.env.DB_NAME}];

    -- USERS TABLE
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
    CREATE TABLE Users (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      fullName NVARCHAR(150) NOT NULL,
      email NVARCHAR(255) UNIQUE NOT NULL,
      passwordHash NVARCHAR(255) NOT NULL,
      role NVARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
      avatar NVARCHAR(500),
      phone NVARCHAR(20),
      dateOfBirth DATE,
      gender NVARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
      address NVARCHAR(500),
      isActive BIT DEFAULT 1,
      createdAt DATETIME2 DEFAULT GETDATE(),
      updatedAt DATETIME2 DEFAULT GETDATE()
    );

    -- CLASSES TABLE
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Classes' AND xtype='U')
    CREATE TABLE Classes (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      name NVARCHAR(100) NOT NULL,
      gradeLevel NVARCHAR(20) NOT NULL,
      academicYear NVARCHAR(20) NOT NULL,
      description NVARCHAR(500),
      isActive BIT DEFAULT 1,
      createdAt DATETIME2 DEFAULT GETDATE(),
      updatedAt DATETIME2 DEFAULT GETDATE()
    );

    -- STUDENT_CLASSES TABLE (nhiều-nhiều)
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='StudentClasses' AND xtype='U')
    CREATE TABLE StudentClasses (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      studentId UNIQUEIDENTIFIER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
      classId UNIQUEIDENTIFIER NOT NULL REFERENCES Classes(id) ON DELETE CASCADE,
      joinedAt DATETIME2 DEFAULT GETDATE(),
      UNIQUE(studentId, classId)
    );

    -- SUBJECTS TABLE
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Subjects' AND xtype='U')
    CREATE TABLE Subjects (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      name NVARCHAR(150) NOT NULL,
      code NVARCHAR(20) UNIQUE NOT NULL,
      description NVARCHAR(500),
      thumbnail NVARCHAR(500),
      isActive BIT DEFAULT 1,
      createdAt DATETIME2 DEFAULT GETDATE(),
      updatedAt DATETIME2 DEFAULT GETDATE()
    );

    -- COURSE_ENROLLMENTS: Teacher teaches Subject to Class
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CourseEnrollments' AND xtype='U')
    CREATE TABLE CourseEnrollments (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      teacherId UNIQUEIDENTIFIER NOT NULL REFERENCES Users(id),
      subjectId UNIQUEIDENTIFIER NOT NULL REFERENCES Subjects(id),
      classId UNIQUEIDENTIFIER NOT NULL REFERENCES Classes(id),
      semester NVARCHAR(20),
      academicYear NVARCHAR(20),
      isActive BIT DEFAULT 1,
      createdAt DATETIME2 DEFAULT GETDATE(),
      UNIQUE(teacherId, subjectId, classId, academicYear)
    );

    -- LESSONS TABLE (Bài giảng)
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Lessons' AND xtype='U')
    CREATE TABLE Lessons (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      courseEnrollmentId UNIQUEIDENTIFIER NOT NULL REFERENCES CourseEnrollments(id),
      title NVARCHAR(300) NOT NULL,
      content NVARCHAR(MAX),
      fileUrl NVARCHAR(500),
      videoUrl NVARCHAR(500),
      orderIndex INT DEFAULT 0,
      isPublished BIT DEFAULT 0,
      publishedAt DATETIME2,
      createdAt DATETIME2 DEFAULT GETDATE(),
      updatedAt DATETIME2 DEFAULT GETDATE()
    );

    -- ASSIGNMENTS TABLE (Bài tập)
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Assignments' AND xtype='U')
    CREATE TABLE Assignments (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      courseEnrollmentId UNIQUEIDENTIFIER NOT NULL REFERENCES CourseEnrollments(id),
      title NVARCHAR(300) NOT NULL,
      description NVARCHAR(MAX),
      type NVARCHAR(20) NOT NULL CHECK (type IN ('essay', 'quiz', 'file')),
      dueDate DATETIME2,
      startDate DATETIME2,
      timeLimitMinutes INT,
      totalPoints DECIMAL(5,2) DEFAULT 10,
      maxAttempts INT DEFAULT 1,
      shuffleQuestions BIT DEFAULT 0,
      showResultImmediately BIT DEFAULT 1,
      isPublished BIT DEFAULT 0,
      publishedAt DATETIME2,
      createdAt DATETIME2 DEFAULT GETDATE(),
      updatedAt DATETIME2 DEFAULT GETDATE()
    );

    -- QUESTIONS TABLE (Câu hỏi trắc nghiệm)
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Questions' AND xtype='U')
    CREATE TABLE Questions (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      assignmentId UNIQUEIDENTIFIER NOT NULL REFERENCES Assignments(id) ON DELETE CASCADE,
      questionText NVARCHAR(MAX) NOT NULL,
      questionType NVARCHAR(20) NOT NULL CHECK (questionType IN ('single_choice', 'multiple_choice', 'true_false')),
      points DECIMAL(5,2) DEFAULT 1,
      orderIndex INT DEFAULT 0,
      explanation NVARCHAR(MAX),
      createdAt DATETIME2 DEFAULT GETDATE()
    );

    -- ANSWER_OPTIONS TABLE (Đáp án)
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AnswerOptions' AND xtype='U')
    CREATE TABLE AnswerOptions (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      questionId UNIQUEIDENTIFIER NOT NULL REFERENCES Questions(id) ON DELETE CASCADE,
      optionText NVARCHAR(MAX) NOT NULL,
      isCorrect BIT DEFAULT 0,
      orderIndex INT DEFAULT 0
    );

    -- SUBMISSIONS TABLE (Bài nộp)
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Submissions' AND xtype='U')
    CREATE TABLE Submissions (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      assignmentId UNIQUEIDENTIFIER NOT NULL REFERENCES Assignments(id),
      studentId UNIQUEIDENTIFIER NOT NULL REFERENCES Users(id),
      attemptNumber INT DEFAULT 1,
      essayContent NVARCHAR(MAX),
      fileUrl NVARCHAR(500),
      startedAt DATETIME2 DEFAULT GETDATE(),
      submittedAt DATETIME2,
      score DECIMAL(5,2),
      feedback NVARCHAR(MAX),
      gradedBy UNIQUEIDENTIFIER REFERENCES Users(id),
      gradedAt DATETIME2,
      status NVARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded', 'late')),
      createdAt DATETIME2 DEFAULT GETDATE()
    );

    -- STUDENT_ANSWERS TABLE (Câu trả lời của học sinh)
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='StudentAnswers' AND xtype='U')
    CREATE TABLE StudentAnswers (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      submissionId UNIQUEIDENTIFIER NOT NULL REFERENCES Submissions(id) ON DELETE CASCADE,
      questionId UNIQUEIDENTIFIER NOT NULL REFERENCES Questions(id),
      selectedOptionIds NVARCHAR(MAX),
      isCorrect BIT,
      pointsEarned DECIMAL(5,2) DEFAULT 0
    );

    -- ANNOUNCEMENTS TABLE (Thông báo)
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Announcements' AND xtype='U')
    CREATE TABLE Announcements (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      courseEnrollmentId UNIQUEIDENTIFIER REFERENCES CourseEnrollments(id),
      authorId UNIQUEIDENTIFIER NOT NULL REFERENCES Users(id),
      title NVARCHAR(300) NOT NULL,
      content NVARCHAR(MAX) NOT NULL,
      isGlobal BIT DEFAULT 0,
      createdAt DATETIME2 DEFAULT GETDATE(),
      updatedAt DATETIME2 DEFAULT GETDATE()
    );

    -- COMMENTS TABLE (Bình luận bài giảng)
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Comments' AND xtype='U')
    CREATE TABLE Comments (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      lessonId UNIQUEIDENTIFIER REFERENCES Lessons(id) ON DELETE CASCADE,
      authorId UNIQUEIDENTIFIER NOT NULL REFERENCES Users(id),
      content NVARCHAR(MAX) NOT NULL,
      parentId UNIQUEIDENTIFIER REFERENCES Comments(id),
      createdAt DATETIME2 DEFAULT GETDATE(),
      updatedAt DATETIME2 DEFAULT GETDATE()
    );

    -- NOTIFICATIONS TABLE
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Notifications' AND xtype='U')
    CREATE TABLE Notifications (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      userId UNIQUEIDENTIFIER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
      title NVARCHAR(300) NOT NULL,
      message NVARCHAR(MAX),
      type NVARCHAR(50),
      referenceId UNIQUEIDENTIFIER,
      isRead BIT DEFAULT 0,
      createdAt DATETIME2 DEFAULT GETDATE()
    );

    -- REFRESH_TOKENS TABLE
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='RefreshTokens' AND xtype='U')
    CREATE TABLE RefreshTokens (
      id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
      userId UNIQUEIDENTIFIER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
      token NVARCHAR(500) NOT NULL,
      expiresAt DATETIME2 NOT NULL,
      createdAt DATETIME2 DEFAULT GETDATE()
    );
  `;

  try {
    await pool.request().query(createDB);
    await pool.request().query(tables);
    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    process.exit(0);
  }
};

migrate();
