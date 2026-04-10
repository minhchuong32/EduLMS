const { query, closePool } = require("./database");
require("dotenv").config();

const migrate = async () => {
  console.log("🔄 Running PostgreSQL migrations...");

  try {
    // For gen_random_uuid()
    await query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    // Use unquoted identifiers so app queries like `FROM Users` work (Postgres folds to lowercase).
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        fullName varchar(150) NOT NULL,
        email varchar(255) UNIQUE NOT NULL,
        passwordHash varchar(255) NOT NULL,
        role varchar(20) NOT NULL CHECK (role IN ('admin','teacher','student')),
        avatar varchar(500),
        phone varchar(20),
        dateOfBirth date,
        gender varchar(10) CHECK (gender IN ('male','female','other')),
        address varchar(500),
        isActive boolean NOT NULL DEFAULT true,
        createdAt timestamptz NOT NULL DEFAULT now(),
        updatedAt timestamptz NOT NULL DEFAULT now()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS classes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(100) NOT NULL,
        gradeLevel varchar(20) NOT NULL,
        academicYear varchar(20) NOT NULL,
        description varchar(500),
        isActive boolean NOT NULL DEFAULT true,
        createdAt timestamptz NOT NULL DEFAULT now(),
        updatedAt timestamptz NOT NULL DEFAULT now()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS studentclasses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        studentId uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        classId uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        joinedAt timestamptz NOT NULL DEFAULT now(),
        UNIQUE (studentId, classId)
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(150) NOT NULL,
        code varchar(20) UNIQUE NOT NULL,
        description varchar(500),
        thumbnail varchar(500),
        isActive boolean NOT NULL DEFAULT true,
        createdAt timestamptz NOT NULL DEFAULT now(),
        updatedAt timestamptz NOT NULL DEFAULT now()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS courseenrollments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        teacherId uuid NOT NULL REFERENCES users(id),
        subjectId uuid NOT NULL REFERENCES subjects(id),
        classId uuid NOT NULL REFERENCES classes(id),
        semester varchar(20),
        academicYear varchar(20),
        isActive boolean NOT NULL DEFAULT true,
        createdAt timestamptz NOT NULL DEFAULT now(),
        UNIQUE (teacherId, subjectId, classId, academicYear)
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        courseEnrollmentId uuid NOT NULL REFERENCES courseenrollments(id),
        title varchar(300) NOT NULL,
        content text,
        fileUrl varchar(500),
        videoUrl varchar(500),
        orderIndex int NOT NULL DEFAULT 0,
        isPublished boolean NOT NULL DEFAULT false,
        publishedAt timestamptz,
        createdAt timestamptz NOT NULL DEFAULT now(),
        updatedAt timestamptz NOT NULL DEFAULT now()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        courseEnrollmentId uuid NOT NULL REFERENCES courseenrollments(id),
        title varchar(300) NOT NULL,
        description text,
        type varchar(20) NOT NULL CHECK (type IN ('essay','quiz','file')),
        dueDate timestamptz,
        startDate timestamptz,
        timeLimitMinutes int,
        totalPoints numeric(5,2) NOT NULL DEFAULT 10,
        maxAttempts int NOT NULL DEFAULT 1,
        shuffleQuestions boolean NOT NULL DEFAULT false,
        showResultImmediately boolean NOT NULL DEFAULT true,
        isPublished boolean NOT NULL DEFAULT false,
        publishedAt timestamptz,
        createdAt timestamptz NOT NULL DEFAULT now(),
        updatedAt timestamptz NOT NULL DEFAULT now()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS questions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        assignmentId uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
        questionText text NOT NULL,
        questionType varchar(20) NOT NULL CHECK (questionType IN ('single_choice','multiple_choice','true_false')),
        points numeric(5,2) NOT NULL DEFAULT 1,
        orderIndex int NOT NULL DEFAULT 0,
        explanation text,
        createdAt timestamptz NOT NULL DEFAULT now()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS answeroptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        questionId uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        optionText text NOT NULL,
        isCorrect boolean NOT NULL DEFAULT false,
        orderIndex int NOT NULL DEFAULT 0
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        assignmentId uuid NOT NULL REFERENCES assignments(id),
        studentId uuid NOT NULL REFERENCES users(id),
        attemptNumber int NOT NULL DEFAULT 1,
        essayContent text,
        fileUrl varchar(500),
        startedAt timestamptz NOT NULL DEFAULT now(),
        submittedAt timestamptz,
        score numeric(5,2),
        feedback text,
        gradedBy uuid REFERENCES users(id),
        gradedAt timestamptz,
        status varchar(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','graded','late')),
        createdAt timestamptz NOT NULL DEFAULT now()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS studentanswers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        submissionId uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
        questionId uuid NOT NULL REFERENCES questions(id),
        selectedOptionIds text,
        isCorrect boolean,
        pointsEarned numeric(5,2) NOT NULL DEFAULT 0
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        courseEnrollmentId uuid REFERENCES courseenrollments(id),
        authorId uuid NOT NULL REFERENCES users(id),
        title varchar(300) NOT NULL,
        content text NOT NULL,
        isGlobal boolean NOT NULL DEFAULT false,
        createdAt timestamptz NOT NULL DEFAULT now(),
        updatedAt timestamptz NOT NULL DEFAULT now()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS comments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        lessonId uuid REFERENCES lessons(id) ON DELETE CASCADE,
        authorId uuid NOT NULL REFERENCES users(id),
        content text NOT NULL,
        parentId uuid REFERENCES comments(id),
        createdAt timestamptz NOT NULL DEFAULT now(),
        updatedAt timestamptz NOT NULL DEFAULT now()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        userId uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title varchar(300) NOT NULL,
        message text,
        type varchar(50),
        referenceId uuid,
        isRead boolean NOT NULL DEFAULT false,
        createdAt timestamptz NOT NULL DEFAULT now()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS refreshtokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        userId uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token varchar(500) NOT NULL,
        expiresAt timestamptz NOT NULL,
        createdAt timestamptz NOT NULL DEFAULT now()
      );
    `);

    console.log("✅ Migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    throw err;
  } finally {
    await closePool();
    process.exit(0);
  }
};

migrate();
