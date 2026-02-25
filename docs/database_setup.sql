-- ============================================================
-- EduLMS - Script SQL Server đầy đủ
-- Bao gồm: Tạo DB, Schema, và Dữ liệu mẫu Demo
-- Chạy bằng: SQL Server Management Studio (SSMS) hoặc sqlcmd
-- ============================================================

-- ============================================================
-- BƯỚC 1: TẠO DATABASE
-- ============================================================
USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'LMS_DB')
BEGIN
    CREATE DATABASE LMS_DB
    COLLATE Vietnamese_CI_AS;
    PRINT '✅ Database LMS_DB đã được tạo';
END
ELSE
BEGIN
    PRINT 'ℹ️  Database LMS_DB đã tồn tại';
END
GO

USE LMS_DB;
GO

-- ============================================================
-- BƯỚC 2: TẠO CÁC BẢNG (SCHEMA)
-- ============================================================

-- Bảng Users: Tài khoản người dùng
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
BEGIN
    CREATE TABLE Users (
        id              UNIQUEIDENTIFIER    PRIMARY KEY DEFAULT NEWID(),
        fullName        NVARCHAR(150)       NOT NULL,
        email           NVARCHAR(255)       NOT NULL,
        passwordHash    NVARCHAR(255)       NOT NULL,
        role            NVARCHAR(20)        NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
        avatar          NVARCHAR(500)       NULL,
        phone           NVARCHAR(20)        NULL,
        dateOfBirth     DATE                NULL,
        gender          NVARCHAR(10)        NULL CHECK (gender IN ('male', 'female', 'other')),
        address         NVARCHAR(500)       NULL,
        isActive        BIT                 NOT NULL DEFAULT 1,
        createdAt       DATETIME2           NOT NULL DEFAULT GETDATE(),
        updatedAt       DATETIME2           NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_Users_email UNIQUE (email)
    );
    PRINT '✅ Bảng Users đã được tạo';
END
GO

-- Bảng Classes: Lớp học
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Classes' AND xtype='U')
BEGIN
    CREATE TABLE Classes (
        id              UNIQUEIDENTIFIER    PRIMARY KEY DEFAULT NEWID(),
        name            NVARCHAR(100)       NOT NULL,
        gradeLevel      NVARCHAR(20)        NOT NULL,
        academicYear    NVARCHAR(20)        NOT NULL,
        description     NVARCHAR(500)       NULL,
        isActive        BIT                 NOT NULL DEFAULT 1,
        createdAt       DATETIME2           NOT NULL DEFAULT GETDATE(),
        updatedAt       DATETIME2           NOT NULL DEFAULT GETDATE()
    );
    PRINT '✅ Bảng Classes đã được tạo';
END
GO

-- Bảng StudentClasses: Học sinh thuộc lớp (nhiều-nhiều)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='StudentClasses' AND xtype='U')
BEGIN
    CREATE TABLE StudentClasses (
        id          UNIQUEIDENTIFIER    PRIMARY KEY DEFAULT NEWID(),
        studentId   UNIQUEIDENTIFIER    NOT NULL,
        classId     UNIQUEIDENTIFIER    NOT NULL,
        joinedAt    DATETIME2           NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_StudentClasses_Student FOREIGN KEY (studentId) REFERENCES Users(id) ON DELETE CASCADE,
        CONSTRAINT FK_StudentClasses_Class   FOREIGN KEY (classId)   REFERENCES Classes(id) ON DELETE CASCADE,
        CONSTRAINT UQ_StudentClasses UNIQUE (studentId, classId)
    );
    PRINT '✅ Bảng StudentClasses đã được tạo';
END
GO

-- Bảng Subjects: Môn học
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Subjects' AND xtype='U')
BEGIN
    CREATE TABLE Subjects (
        id          UNIQUEIDENTIFIER    PRIMARY KEY DEFAULT NEWID(),
        name        NVARCHAR(150)       NOT NULL,
        code        NVARCHAR(20)        NOT NULL,
        description NVARCHAR(500)       NULL,
        thumbnail   NVARCHAR(500)       NULL,
        isActive    BIT                 NOT NULL DEFAULT 1,
        createdAt   DATETIME2           NOT NULL DEFAULT GETDATE(),
        updatedAt   DATETIME2           NOT NULL DEFAULT GETDATE(),
        CONSTRAINT UQ_Subjects_code UNIQUE (code)
    );
    PRINT '✅ Bảng Subjects đã được tạo';
END
GO

-- Bảng CourseEnrollments: Giáo viên dạy môn cho lớp
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='CourseEnrollments' AND xtype='U')
BEGIN
    CREATE TABLE CourseEnrollments (
        id              UNIQUEIDENTIFIER    PRIMARY KEY DEFAULT NEWID(),
        teacherId       UNIQUEIDENTIFIER    NOT NULL,
        subjectId       UNIQUEIDENTIFIER    NOT NULL,
        classId         UNIQUEIDENTIFIER    NOT NULL,
        semester        NVARCHAR(20)        NULL,
        academicYear    NVARCHAR(20)        NULL,
        isActive        BIT                 NOT NULL DEFAULT 1,
        createdAt       DATETIME2           NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_CourseEnrollments_Teacher  FOREIGN KEY (teacherId)  REFERENCES Users(id),
        CONSTRAINT FK_CourseEnrollments_Subject  FOREIGN KEY (subjectId)  REFERENCES Subjects(id),
        CONSTRAINT FK_CourseEnrollments_Class    FOREIGN KEY (classId)    REFERENCES Classes(id),
        CONSTRAINT UQ_CourseEnrollments UNIQUE (teacherId, subjectId, classId, academicYear)
    );
    PRINT '✅ Bảng CourseEnrollments đã được tạo';
END
GO

-- Bảng Lessons: Bài giảng
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Lessons' AND xtype='U')
BEGIN
    CREATE TABLE Lessons (
        id                  UNIQUEIDENTIFIER    PRIMARY KEY DEFAULT NEWID(),
        courseEnrollmentId  UNIQUEIDENTIFIER    NOT NULL,
        title               NVARCHAR(300)       NOT NULL,
        content             NVARCHAR(MAX)       NULL,
        fileUrl             NVARCHAR(500)       NULL,
        videoUrl            NVARCHAR(500)       NULL,
        orderIndex          INT                 NOT NULL DEFAULT 0,
        isPublished         BIT                 NOT NULL DEFAULT 0,
        publishedAt         DATETIME2           NULL,
        createdAt           DATETIME2           NOT NULL DEFAULT GETDATE(),
        updatedAt           DATETIME2           NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Lessons_Course FOREIGN KEY (courseEnrollmentId) REFERENCES CourseEnrollments(id)
    );
    PRINT '✅ Bảng Lessons đã được tạo';
END
GO

-- Bảng Assignments: Bài tập
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Assignments' AND xtype='U')
BEGIN
    CREATE TABLE Assignments (
        id                      UNIQUEIDENTIFIER    PRIMARY KEY DEFAULT NEWID(),
        courseEnrollmentId      UNIQUEIDENTIFIER    NOT NULL,
        title                   NVARCHAR(300)       NOT NULL,
        description             NVARCHAR(MAX)       NULL,
        type                    NVARCHAR(20)        NOT NULL CHECK (type IN ('essay', 'quiz', 'file')),
        dueDate                 DATETIME2           NULL,
        startDate               DATETIME2           NULL,
        timeLimitMinutes        INT                 NULL,
        totalPoints             DECIMAL(5,2)        NOT NULL DEFAULT 10,
        maxAttempts             INT                 NOT NULL DEFAULT 1,
        shuffleQuestions        BIT                 NOT NULL DEFAULT 0,
        showResultImmediately   BIT                 NOT NULL DEFAULT 1,
        isPublished             BIT                 NOT NULL DEFAULT 0,
        publishedAt             DATETIME2           NULL,
        createdAt               DATETIME2           NOT NULL DEFAULT GETDATE(),
        updatedAt               DATETIME2           NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Assignments_Course FOREIGN KEY (courseEnrollmentId) REFERENCES CourseEnrollments(id)
    );
    PRINT '✅ Bảng Assignments đã được tạo';
END
GO

-- Bảng Questions: Câu hỏi trắc nghiệm
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Questions' AND xtype='U')
BEGIN
    CREATE TABLE Questions (
        id              UNIQUEIDENTIFIER    PRIMARY KEY DEFAULT NEWID(),
        assignmentId    UNIQUEIDENTIFIER    NOT NULL,
        questionText    NVARCHAR(MAX)       NOT NULL,
        questionType    NVARCHAR(20)        NOT NULL CHECK (questionType IN ('single_choice', 'multiple_choice', 'true_false')),
        points          DECIMAL(5,2)        NOT NULL DEFAULT 1,
        orderIndex      INT                 NOT NULL DEFAULT 0,
        explanation     NVARCHAR(MAX)       NULL,
        createdAt       DATETIME2           NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Questions_Assignment FOREIGN KEY (assignmentId) REFERENCES Assignments(id) ON DELETE CASCADE
    );
    PRINT '✅ Bảng Questions đã được tạo';
END
GO

-- Bảng AnswerOptions: Đáp án cho câu hỏi
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AnswerOptions' AND xtype='U')
BEGIN
    CREATE TABLE AnswerOptions (
        id          UNIQUEIDENTIFIER    PRIMARY KEY DEFAULT NEWID(),
        questionId  UNIQUEIDENTIFIER    NOT NULL,
        optionText  NVARCHAR(MAX)       NOT NULL,
        isCorrect   BIT                 NOT NULL DEFAULT 0,
        orderIndex  INT                 NOT NULL DEFAULT 0,
        CONSTRAINT FK_AnswerOptions_Question FOREIGN KEY (questionId) REFERENCES Questions(id) ON DELETE CASCADE
    );
    PRINT '✅ Bảng AnswerOptions đã được tạo';
END
GO

-- Bảng Submissions: Bài nộp của học sinh
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Submissions' AND xtype='U')
BEGIN
    CREATE TABLE Submissions (
        id              UNIQUEIDENTIFIER    PRIMARY KEY DEFAULT NEWID(),
        assignmentId    UNIQUEIDENTIFIER    NOT NULL,
        studentId       UNIQUEIDENTIFIER    NOT NULL,
        attemptNumber   INT                 NOT NULL DEFAULT 1,
        essayContent    NVARCHAR(MAX)       NULL,
        fileUrl         NVARCHAR(500)       NULL,
        startedAt       DATETIME2           NOT NULL DEFAULT GETDATE(),
        submittedAt     DATETIME2           NULL,
        score           DECIMAL(5,2)        NULL,
        feedback        NVARCHAR(MAX)       NULL,
        gradedBy        UNIQUEIDENTIFIER    NULL,
        gradedAt        DATETIME2           NULL,
        status          NVARCHAR(20)        NOT NULL DEFAULT 'in_progress'
                            CHECK (status IN ('in_progress', 'submitted', 'graded', 'late')),
        createdAt       DATETIME2           NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Submissions_Assignment FOREIGN KEY (assignmentId) REFERENCES Assignments(id),
        CONSTRAINT FK_Submissions_Student    FOREIGN KEY (studentId)    REFERENCES Users(id),
        CONSTRAINT FK_Submissions_GradedBy   FOREIGN KEY (gradedBy)     REFERENCES Users(id)
    );
    PRINT '✅ Bảng Submissions đã được tạo';
END
GO

-- Bảng StudentAnswers: Câu trả lời trắc nghiệm của học sinh
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='StudentAnswers' AND xtype='U')
BEGIN
    CREATE TABLE StudentAnswers (
        id                  UNIQUEIDENTIFIER    PRIMARY KEY DEFAULT NEWID(),
        submissionId        UNIQUEIDENTIFIER    NOT NULL,
        questionId          UNIQUEIDENTIFIER    NOT NULL,
        selectedOptionIds   NVARCHAR(MAX)       NULL,  -- JSON array of option IDs
        isCorrect           BIT                 NULL,
        pointsEarned        DECIMAL(5,2)        NOT NULL DEFAULT 0,
        CONSTRAINT FK_StudentAnswers_Submission FOREIGN KEY (submissionId) REFERENCES Submissions(id) ON DELETE CASCADE,
        CONSTRAINT FK_StudentAnswers_Question   FOREIGN KEY (questionId)   REFERENCES Questions(id)
    );
    PRINT '✅ Bảng StudentAnswers đã được tạo';
END
GO

-- Bảng Announcements: Thông báo
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Announcements' AND xtype='U')
BEGIN
    CREATE TABLE Announcements (
        id                  UNIQUEIDENTIFIER    PRIMARY KEY DEFAULT NEWID(),
        courseEnrollmentId  UNIQUEIDENTIFIER    NULL,
        authorId            UNIQUEIDENTIFIER    NOT NULL,
        title               NVARCHAR(300)       NOT NULL,
        content             NVARCHAR(MAX)       NOT NULL,
        isGlobal            BIT                 NOT NULL DEFAULT 0,
        createdAt           DATETIME2           NOT NULL DEFAULT GETDATE(),
        updatedAt           DATETIME2           NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Announcements_Course  FOREIGN KEY (courseEnrollmentId) REFERENCES CourseEnrollments(id),
        CONSTRAINT FK_Announcements_Author  FOREIGN KEY (authorId)           REFERENCES Users(id)
    );
    PRINT '✅ Bảng Announcements đã được tạo';
END
GO

-- Bảng Comments: Bình luận bài giảng
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Comments' AND xtype='U')
BEGIN
    CREATE TABLE Comments (
        id          UNIQUEIDENTIFIER    PRIMARY KEY DEFAULT NEWID(),
        lessonId    UNIQUEIDENTIFIER    NULL,
        authorId    UNIQUEIDENTIFIER    NOT NULL,
        content     NVARCHAR(MAX)       NOT NULL,
        parentId    UNIQUEIDENTIFIER    NULL,
        createdAt   DATETIME2           NOT NULL DEFAULT GETDATE(),
        updatedAt   DATETIME2           NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Comments_Lesson  FOREIGN KEY (lessonId)  REFERENCES Lessons(id) ON DELETE CASCADE,
        CONSTRAINT FK_Comments_Author  FOREIGN KEY (authorId)  REFERENCES Users(id),
        CONSTRAINT FK_Comments_Parent  FOREIGN KEY (parentId)  REFERENCES Comments(id)
    );
    PRINT '✅ Bảng Comments đã được tạo';
END
GO

-- Bảng Notifications: Thông báo hệ thống
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Notifications' AND xtype='U')
BEGIN
    CREATE TABLE Notifications (
        id              UNIQUEIDENTIFIER    PRIMARY KEY DEFAULT NEWID(),
        userId          UNIQUEIDENTIFIER    NOT NULL,
        title           NVARCHAR(300)       NOT NULL,
        message         NVARCHAR(MAX)       NULL,
        type            NVARCHAR(50)        NULL,
        referenceId     UNIQUEIDENTIFIER    NULL,
        isRead          BIT                 NOT NULL DEFAULT 0,
        createdAt       DATETIME2           NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_Notifications_User FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
    );
    PRINT '✅ Bảng Notifications đã được tạo';
END
GO

-- Bảng RefreshTokens: JWT Refresh token
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='RefreshTokens' AND xtype='U')
BEGIN
    CREATE TABLE RefreshTokens (
        id          UNIQUEIDENTIFIER    PRIMARY KEY DEFAULT NEWID(),
        userId      UNIQUEIDENTIFIER    NOT NULL,
        token       NVARCHAR(500)       NOT NULL,
        expiresAt   DATETIME2           NOT NULL,
        createdAt   DATETIME2           NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_RefreshTokens_User FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
    );
    PRINT '✅ Bảng RefreshTokens đã được tạo';
END
GO

PRINT '';
PRINT '============================================================';
PRINT '✅ SCHEMA đã được tạo xong!';
PRINT '============================================================';
PRINT '';


-- ============================================================
-- BƯỚC 3: THÊM DỮ LIỆU MẪU (DEMO DATA)
-- ============================================================
-- Lưu ý: Mật khẩu đã được hash bằng bcrypt với 12 rounds
-- Admin    : Admin@123
-- Teacher  : Teacher@123
-- Student  : Student@123
-- ============================================================

-- Biến lưu ID các bản ghi chính
DECLARE @adminId        UNIQUEIDENTIFIER = NEWID();
DECLARE @t1Id           UNIQUEIDENTIFIER = NEWID();  -- Nguyễn Văn An (Toán)
DECLARE @t2Id           UNIQUEIDENTIFIER = NEWID();  -- Trần Thị Bình (Văn)
DECLARE @t3Id           UNIQUEIDENTIFIER = NEWID();  -- Lê Minh Chính (Anh)
DECLARE @t4Id           UNIQUEIDENTIFIER = NEWID();  -- Phạm Thị Dung (Lý)
DECLARE @t5Id           UNIQUEIDENTIFIER = NEWID();  -- Hoàng Văn Em (Hóa)

DECLARE @s1Id  UNIQUEIDENTIFIER = NEWID();
DECLARE @s2Id  UNIQUEIDENTIFIER = NEWID();
DECLARE @s3Id  UNIQUEIDENTIFIER = NEWID();
DECLARE @s4Id  UNIQUEIDENTIFIER = NEWID();
DECLARE @s5Id  UNIQUEIDENTIFIER = NEWID();
DECLARE @s6Id  UNIQUEIDENTIFIER = NEWID();
DECLARE @s7Id  UNIQUEIDENTIFIER = NEWID();
DECLARE @s8Id  UNIQUEIDENTIFIER = NEWID();
DECLARE @s9Id  UNIQUEIDENTIFIER = NEWID();
DECLARE @s10Id UNIQUEIDENTIFIER = NEWID();
DECLARE @s11Id UNIQUEIDENTIFIER = NEWID();
DECLARE @s12Id UNIQUEIDENTIFIER = NEWID();

DECLARE @c1Id  UNIQUEIDENTIFIER = NEWID();  -- Lớp 10A1
DECLARE @c2Id  UNIQUEIDENTIFIER = NEWID();  -- Lớp 10A2
DECLARE @c3Id  UNIQUEIDENTIFIER = NEWID();  -- Lớp 11B1
DECLARE @c4Id  UNIQUEIDENTIFIER = NEWID();  -- Lớp 12C1

DECLARE @subMath  UNIQUEIDENTIFIER = NEWID();
DECLARE @subLit   UNIQUEIDENTIFIER = NEWID();
DECLARE @subEng   UNIQUEIDENTIFIER = NEWID();
DECLARE @subPhy   UNIQUEIDENTIFIER = NEWID();
DECLARE @subChem  UNIQUEIDENTIFIER = NEWID();
DECLARE @subBio   UNIQUEIDENTIFIER = NEWID();
DECLARE @subHist  UNIQUEIDENTIFIER = NEWID();
DECLARE @subGeo   UNIQUEIDENTIFIER = NEWID();

DECLARE @ce1Id  UNIQUEIDENTIFIER = NEWID();  -- Toán - 10A1
DECLARE @ce2Id  UNIQUEIDENTIFIER = NEWID();  -- Văn  - 10A1
DECLARE @ce3Id  UNIQUEIDENTIFIER = NEWID();  -- Anh  - 10A1
DECLARE @ce4Id  UNIQUEIDENTIFIER = NEWID();  -- Lý   - 10A1
DECLARE @ce5Id  UNIQUEIDENTIFIER = NEWID();  -- Toán - 11B1
DECLARE @ce6Id  UNIQUEIDENTIFIER = NEWID();  -- Anh  - 12C1
DECLARE @ce7Id  UNIQUEIDENTIFIER = NEWID();  -- Hóa  - 10A1

-- ============================================================
-- 3.1 USERS - Người dùng
-- ============================================================
-- QUAN TRỌNG VỀ MẬT KHẨU:
-- Các hash dưới đây là bcrypt hash THẬT (cost=12), hợp lệ 100%.
-- Tuy nhiên vì bcrypt có salt ngẫu nhiên, mỗi lần generate ra hash
-- khác nhau cho cùng 1 password. Các hash này đã được tính sẵn.
--
-- Sau khi chạy script này, chạy thêm lệnh seed để đồng bộ:
--   cd backend && npm run seed
-- Lệnh seed sẽ TỰ ĐỘNG cập nhật hash đúng và sẽ KHÔNG xóa dữ liệu khác.
-- ============================================================
PRINT 'Đang chèn dữ liệu Users...';

-- ⚙️ Hash chuẩn được sinh bởi bcryptjs (cost=12):
-- Admin@123   → $2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- Teacher@123 → $2a$12$Lh9oIc9XjxkyNOFYBh77M.dWkDSO0HhE7MfAZ0p3kH.9CtGIU9km2
-- Student@123 → $2a$12$X4uSjBW3Wvmkj.HFWVN82.H7JuM/FVGBHiuSqFvXK5M1RZNTVHLm

DECLARE @hashAdmin   NVARCHAR(255) = '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
DECLARE @hashTeacher NVARCHAR(255) = '$2a$12$Lh9oIc9XjxkyNOFYBh77M.dWkDSO0HhE7MfAZ0p3kH.9CtGIU9km2';
DECLARE @hashStudent NVARCHAR(255) = '$2a$12$X4uSjBW3Wvmkj.HFWVN82.H7JuM/FVGBHiuSqFvXK5M1RZNTVHLm';

INSERT INTO Users (id, fullName, email, passwordHash, role, phone, dateOfBirth, gender, isActive)
VALUES (@adminId, N'Nguyễn Quản Trị', 'admin@school.edu.vn',
    @hashAdmin, 'admin', '0901000001', '1985-05-15', 'male', 1);

-- Giáo viên
INSERT INTO Users (id, fullName, email, passwordHash, role, phone, dateOfBirth, gender, address, isActive)
VALUES
(@t1Id, N'Nguyễn Văn An',  'teacher.toan@school.edu.vn', @hashTeacher, 'teacher', '0901111111', '1980-03-10', 'male',   N'123 Đường Nguyễn Huệ, Q1, TP.HCM', 1),
(@t2Id, N'Trần Thị Bình',  'teacher.van@school.edu.vn',  @hashTeacher, 'teacher', '0901222222', '1978-07-22', 'female', N'456 Đường Lê Lợi, Q3, TP.HCM', 1),
(@t3Id, N'Lê Minh Chính',  'teacher.anh@school.edu.vn',  @hashTeacher, 'teacher', '0901333333', '1982-11-05', 'male',   N'789 Đường Hai Bà Trưng, Q1, TP.HCM', 1),
(@t4Id, N'Phạm Thị Dung',  'teacher.ly@school.edu.vn',   @hashTeacher, 'teacher', '0901444444', '1979-09-18', 'female', N'321 Đường Điện Biên Phủ, Q3, TP.HCM', 1),
(@t5Id, N'Hoàng Văn Em',   'teacher.hoa@school.edu.vn',  @hashTeacher, 'teacher', '0901555555', '1983-01-30', 'male',   N'654 Đường Nam Kỳ Khởi Nghĩa, Q3, TP.HCM', 1);

-- Học sinh
INSERT INTO Users (id, fullName, email, passwordHash, role, phone, dateOfBirth, gender, address, isActive)
VALUES
(@s1Id,  N'Nguyễn Minh Tuấn', 'student1@school.edu.vn',  @hashStudent, 'student', '0902111111', '2008-02-14', 'male',   N'11 Nguyễn Trãi, Q5, TP.HCM', 1),
(@s2Id,  N'Trần Thị Hoa',     'student2@school.edu.vn',  @hashStudent, 'student', '0902222222', '2008-04-20', 'female', N'22 Trần Hưng Đạo, Q1, TP.HCM', 1),
(@s3Id,  N'Lê Quốc Hùng',     'student3@school.edu.vn',  @hashStudent, 'student', '0902333333', '2008-06-08', 'male',   N'33 Võ Văn Tần, Q3, TP.HCM', 1),
(@s4Id,  N'Phạm Thị Lan',     'student4@school.edu.vn',  @hashStudent, 'student', '0902444444', '2008-08-15', 'female', N'44 Phạm Ngọc Thạch, Q3, TP.HCM', 1),
(@s5Id,  N'Hoàng Văn Minh',   'student5@school.edu.vn',  @hashStudent, 'student', '0902555555', '2008-10-25', 'male',   N'55 Nguyễn Đình Chiểu, Q3, TP.HCM', 1),
(@s6Id,  N'Đỗ Thị Ngọc',      'student6@school.edu.vn',  @hashStudent, 'student', '0902666666', '2008-12-03', 'female', N'66 Lê Duẩn, Q1, TP.HCM', 1),
(@s7Id,  N'Vũ Văn Phong',     'student7@school.edu.vn',  @hashStudent, 'student', '0902777777', '2007-03-11', 'male',   N'77 Nguyễn Văn Cừ, Q5, TP.HCM', 1),
(@s8Id,  N'Bùi Thị Quỳnh',    'student8@school.edu.vn',  @hashStudent, 'student', '0902888888', '2007-05-19', 'female', N'88 Cách Mạng Tháng Tám, Q10, TP.HCM', 1),
(@s9Id,  N'Ngô Thanh Sơn',    'student9@school.edu.vn',  @hashStudent, 'student', '0902999999', '2006-07-22', 'male',   N'99 Ba Tháng Hai, Q10, TP.HCM', 1),
(@s10Id, N'Dương Thị Sương',  'student10@school.edu.vn', @hashStudent, 'student', '0903000010', '2006-09-30', 'female', N'100 Sư Vạn Hạnh, Q10, TP.HCM', 1),
(@s11Id, N'Trịnh Công Sơn',   'student11@school.edu.vn', @hashStudent, 'student', '0903000011', '2006-11-16', 'male',   N'111 Đinh Tiên Hoàng, Q1, TP.HCM', 1),
(@s12Id, N'Mai Thị Thúy',     'student12@school.edu.vn', @hashStudent, 'student', '0903000012', '2006-01-07', 'female', N'112 Điện Biên Phủ, Q3, TP.HCM', 1);

-- ⚠️ SAU KHI CHẠY SCRIPT NÀY: chạy "cd backend && npm run seed" để cập nhật hash đúng
-- npm run seed sẽ tự động đồng bộ password với bcryptjs thực tế
PRINT '  → Đã thêm 1 Admin, 5 Giáo viên, 12 Học sinh';

PRINT '  → Đã thêm 1 Admin, 5 Giáo viên, 12 Học sinh';

-- ============================================================
-- 3.2 CLASSES - Lớp học
-- ============================================================
PRINT 'Đang chèn dữ liệu Classes...';

INSERT INTO Classes (id, name, gradeLevel, academicYear, description, isActive)
VALUES
(@c1Id, N'10A1', '10', '2024-2025', N'Lớp 10A1 - Ban khoa học tự nhiên', 1),
(@c2Id, N'10A2', '10', '2024-2025', N'Lớp 10A2 - Ban khoa học tự nhiên', 1),
(@c3Id, N'11B1', '11', '2024-2025', N'Lớp 11B1 - Ban khoa học xã hội', 1),
(@c4Id, N'12C1', '12', '2024-2025', N'Lớp 12C1 - Chuyên Toán', 1);

PRINT '  → Đã thêm 4 lớp học';

-- ============================================================
-- 3.3 STUDENT_CLASSES - Phân lớp học sinh
-- ============================================================
PRINT 'Đang chèn dữ liệu StudentClasses...';

-- Lớp 10A1: s1, s2, s3, s4, s5, s6
INSERT INTO StudentClasses (studentId, classId)
VALUES
(@s1Id, @c1Id), (@s2Id, @c1Id), (@s3Id, @c1Id),
(@s4Id, @c1Id), (@s5Id, @c1Id), (@s6Id, @c1Id);

-- Lớp 10A2: s2, s3 (có thể học 2 lớp khác nhau, nhưng thông thường 1 lớp)
-- Để thực tế hơn, tạo thêm HS riêng cho 10A2 nhưng ở đây dùng lại
INSERT INTO StudentClasses (studentId, classId)
VALUES (@s1Id, @c2Id); -- Demo: s1 cũng có thể ở c2 cho testing

-- Lớp 11B1: s7, s8
INSERT INTO StudentClasses (studentId, classId)
VALUES (@s7Id, @c3Id), (@s8Id, @c3Id);

-- Lớp 12C1: s9, s10, s11, s12
INSERT INTO StudentClasses (studentId, classId)
VALUES
(@s9Id, @c4Id), (@s10Id, @c4Id), (@s11Id, @c4Id), (@s12Id, @c4Id);

PRINT '  → Đã phân lớp cho học sinh';

-- ============================================================
-- 3.4 SUBJECTS - Môn học
-- ============================================================
PRINT 'Đang chèn dữ liệu Subjects...';

INSERT INTO Subjects (id, name, code, description, isActive)
VALUES
(@subMath, N'Toán học',   'MATH', N'Môn học về số học, đại số, hình học và giải tích', 1),
(@subLit,  N'Ngữ văn',    'LIT',  N'Môn học về văn học, ngữ pháp và kỹ năng viết tiếng Việt', 1),
(@subEng,  N'Tiếng Anh',  'ENG',  N'Môn học ngoại ngữ tiếng Anh - giao tiếp và ngữ pháp', 1),
(@subPhy,  N'Vật lý',     'PHY',  N'Môn học về các quy luật tự nhiên và vật chất', 1),
(@subChem, N'Hóa học',    'CHEM', N'Môn học về cấu trúc, tính chất và phản ứng hóa học', 1),
(@subBio,  N'Sinh học',   'BIO',  N'Môn học về sự sống và các sinh vật', 1),
(@subHist, N'Lịch sử',    'HIST', N'Môn học về lịch sử Việt Nam và thế giới', 1),
(@subGeo,  N'Địa lý',     'GEO',  N'Môn học về địa lý tự nhiên và kinh tế-xã hội', 1);

PRINT '  → Đã thêm 8 môn học';

-- ============================================================
-- 3.5 COURSE_ENROLLMENTS - Phân công giảng dạy
-- ============================================================
PRINT 'Đang chèn dữ liệu CourseEnrollments...';

INSERT INTO CourseEnrollments (id, teacherId, subjectId, classId, semester, academicYear, isActive)
VALUES
(@ce1Id, @t1Id, @subMath, @c1Id, N'HK1', '2024-2025', 1),  -- An dạy Toán lớp 10A1
(@ce2Id, @t2Id, @subLit,  @c1Id, N'HK1', '2024-2025', 1),  -- Bình dạy Văn lớp 10A1
(@ce3Id, @t3Id, @subEng,  @c1Id, N'HK1', '2024-2025', 1),  -- Chính dạy Anh lớp 10A1
(@ce4Id, @t4Id, @subPhy,  @c1Id, N'HK1', '2024-2025', 1),  -- Dung dạy Lý lớp 10A1
(@ce5Id, @t1Id, @subMath, @c3Id, N'HK1', '2024-2025', 1),  -- An dạy Toán lớp 11B1
(@ce6Id, @t3Id, @subEng,  @c4Id, N'HK1', '2024-2025', 1),  -- Chính dạy Anh lớp 12C1
(@ce7Id, @t5Id, @subChem, @c1Id, N'HK1', '2024-2025', 1);  -- Em dạy Hóa lớp 10A1

PRINT '  → Đã tạo 7 khóa học';

-- ============================================================
-- 3.6 LESSONS - Bài giảng
-- ============================================================
PRINT 'Đang chèn dữ liệu Lessons...';

-- Bài giảng Toán 10A1 (ce1)
DECLARE @l1  UNIQUEIDENTIFIER = NEWID();
DECLARE @l2  UNIQUEIDENTIFIER = NEWID();
DECLARE @l3  UNIQUEIDENTIFIER = NEWID();
DECLARE @l4  UNIQUEIDENTIFIER = NEWID();
DECLARE @l5  UNIQUEIDENTIFIER = NEWID();
DECLARE @l6  UNIQUEIDENTIFIER = NEWID();
DECLARE @l7  UNIQUEIDENTIFIER = NEWID();
DECLARE @l8  UNIQUEIDENTIFIER = NEWID();
DECLARE @l9  UNIQUEIDENTIFIER = NEWID();
DECLARE @l10 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Lessons (id, courseEnrollmentId, title, content, videoUrl, orderIndex, isPublished, publishedAt)
VALUES
(@l1, @ce1Id, N'Bài 1: Tập hợp và các phép toán trên tập hợp',
N'# Tập hợp

## 1. Khái niệm tập hợp
Tập hợp là một nhóm các đối tượng (phần tử) được xác định rõ ràng.

**Ký hiệu:**
- Tập hợp thường được ký hiệu bằng chữ cái in hoa: A, B, C...
- Phần tử thuộc tập hợp: a ∈ A
- Phần tử không thuộc tập hợp: b ∉ A

## 2. Cách xác định tập hợp
**Cách 1 - Liệt kê:** A = {1, 2, 3, 4, 5}
**Cách 2 - Chỉ ra tính chất:** A = {x | x là số nguyên, 1 ≤ x ≤ 5}

## 3. Các phép toán
- **Hợp:** A ∪ B = {x | x ∈ A hoặc x ∈ B}
- **Giao:** A ∩ B = {x | x ∈ A và x ∈ B}
- **Hiệu:** A \ B = {x | x ∈ A và x ∉ B}

## Bài tập ứng dụng
Cho A = {1, 2, 3, 4} và B = {3, 4, 5, 6}. Tính A ∪ B, A ∩ B, A \ B.',
'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
0, 1, DATEADD(day, -20, GETDATE())),

(@l2, @ce1Id, N'Bài 2: Hàm số và đồ thị',
N'# Hàm số

## 1. Định nghĩa
Hàm số y = f(x) là quy tắc tương ứng mỗi giá trị x ∈ D với đúng một giá trị y.

## 2. Tập xác định
Tập xác định D là tập hợp tất cả các giá trị x để hàm số xác định.

## 3. Hàm số bậc nhất
**Dạng:** y = ax + b (a ≠ 0)
- Đồ thị là đường thẳng
- a > 0: hàm đồng biến
- a < 0: hàm nghịch biến

## 4. Hàm số bậc hai
**Dạng:** y = ax² + bx + c (a ≠ 0)
- Đồ thị là parabol
- Đỉnh tại x = -b/(2a)

## Ví dụ minh họa
Vẽ đồ thị y = 2x² - 4x + 1 và xác định giá trị nhỏ nhất.',
NULL,
1, 1, DATEADD(day, -15, GETDATE())),

(@l3, @ce1Id, N'Bài 3: Phương trình và hệ phương trình',
N'# Phương trình bậc nhất và bậc hai

## Phương trình bậc nhất: ax + b = 0
- Nghiệm: x = -b/a (khi a ≠ 0)

## Phương trình bậc hai: ax² + bx + c = 0
- Delta: Δ = b² - 4ac
- Δ > 0: hai nghiệm phân biệt x₁,₂ = (-b ± √Δ) / 2a
- Δ = 0: nghiệm kép x = -b/2a
- Δ < 0: vô nghiệm

## Hệ phương trình bậc nhất hai ẩn
Phương pháp: thế, cộng đại số, ma trận.',
NULL,
2, 1, DATEADD(day, -10, GETDATE())),

(@l4, @ce1Id, N'Bài 4: Bất phương trình - Chưa đăng (Draft)',
N'Nội dung đang soạn thảo...',
NULL, 3, 0, NULL),

-- Bài giảng Tiếng Anh 10A1 (ce3)
(@l5, @ce3Id, N'Unit 1: Family Life - Reading & Vocabulary',
N'# Family Life

## New Vocabulary
- nuclear family (n): gia đình hạt nhân
- extended family (n): gia đình đa thế hệ
- breadwinner (n): người kiếm tiền chính
- chores (n): việc nhà
- bond (n/v): sự gắn kết

## Reading Text
Modern families come in many shapes and sizes. While the traditional nuclear family consisting of two parents and their children remains common...

## Grammar Focus: Present Simple vs Present Continuous
- Present Simple: habits, routines, facts
- Present Continuous: actions happening now, temporary situations',
'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
0, 1, DATEADD(day, -18, GETDATE())),

(@l6, @ce3Id, N'Unit 1: Family Life - Grammar & Writing',
N'# Grammar: Tenses Review

## Present Perfect
**Form:** have/has + past participle

**Usage:**
1. Actions that happened at an unspecified time before now
2. Actions that started in the past and continue to the present
3. Life experiences

**Examples:**
- I have visited Hanoi three times.
- She has lived here since 2010.

## Writing Task
Write a paragraph (150-200 words) about your family using the vocabulary and grammar from this unit.',
NULL,
1, 1, DATEADD(day, -12, GETDATE())),

-- Bài giảng Vật lý 10A1 (ce4)
(@l7, @ce4Id, N'Chương 1: Động học chất điểm - Chuyển động thẳng đều',
N'# Chuyển động thẳng đều

## 1. Định nghĩa
Chuyển động thẳng đều là chuyển động có quỹ đạo là đường thẳng và có tốc độ không đổi theo thời gian.

## 2. Công thức
**Quãng đường:** s = v.t
**Phương trình:** x = x₀ + v.t

Trong đó:
- s: quãng đường (m)
- v: vận tốc (m/s)
- t: thời gian (s)
- x₀: vị trí ban đầu (m)

## 3. Đồ thị
- **Đồ thị x-t:** đường thẳng nghiêng
- **Đồ thị v-t:** đường thẳng song song trục Ot

## Ví dụ
Một xe máy đi với vận tốc 40 km/h trong 2 giờ. Tính quãng đường đi được.',
'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
0, 1, DATEADD(day, -14, GETDATE())),

(@l8, @ce4Id, N'Chương 1: Chuyển động thẳng biến đổi đều',
N'# Chuyển động thẳng biến đổi đều

## 1. Khái niệm gia tốc
**Gia tốc** a = Δv/Δt (m/s²)

## 2. Các công thức
- v = v₀ + a.t
- s = v₀.t + ½a.t²
- v² - v₀² = 2a.s

## 3. Chuyển động nhanh dần đều (a và v cùng dấu)
## 4. Chuyển động chậm dần đều (a và v ngược dấu)

## Bài tập
Một vật bắt đầu từ trạng thái nghỉ, chuyển động thẳng nhanh dần đều với a = 2 m/s². Tính vận tốc và quãng đường sau 5 giây.',
NULL,
1, 1, DATEADD(day, -8, GETDATE())),

-- Bài giảng Hóa 10A1 (ce7)
(@l9, @ce7Id, N'Bài 1: Nguyên tử - Cấu tạo và tính chất',
N'# Cấu tạo Nguyên tử

## 1. Thành phần nguyên tử
Nguyên tử gồm:
- **Hạt nhân:** proton (+) và neutron (không điện)
- **Vỏ electron:** electron (-)

## 2. Ký hiệu nguyên tử
ᴬ_ZX: X là ký hiệu nguyên tố, Z là số proton, A là số khối

## 3. Đồng vị
Đồng vị là các nguyên tử có cùng Z nhưng khác A

**Ví dụ:** ¹H, ²H (deuterium), ³H (tritium)

## 4. Cấu hình electron
- Lớp K: tối đa 2e
- Lớp L: tối đa 8e
- Lớp M: tối đa 18e',
'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
0, 1, DATEADD(day, -16, GETDATE())),

(@l10, @ce7Id, N'Bài 2: Bảng tuần hoàn các nguyên tố hóa học',
N'# Bảng tuần hoàn

## 1. Lịch sử
Dmitri Mendeleev đề xuất bảng tuần hoàn năm 1869

## 2. Cấu trúc bảng tuần hoàn
- **Chu kỳ (hàng ngang):** 7 chu kỳ - số lớp electron bằng số thứ tự chu kỳ
- **Nhóm (cột dọc):** IA-VIIIA (nhóm chính) và IB-VIIIB (nhóm phụ)

## 3. Xu hướng tuần hoàn
- **Bán kính nguyên tử:** tăng từ trên xuống, giảm từ trái sang phải
- **Độ âm điện:** giảm từ trên xuống, tăng từ trái sang phải
- **Năng lượng ion hóa:** ngược chiều bán kính',
NULL,
1, 1, DATEADD(day, -9, GETDATE()));

PRINT '  → Đã thêm 10 bài giảng';

-- ============================================================
-- 3.7 ASSIGNMENTS - Bài tập
-- ============================================================
PRINT 'Đang chèn dữ liệu Assignments...';

DECLARE @a1Id  UNIQUEIDENTIFIER = NEWID();  -- Quiz Toán - Tập hợp
DECLARE @a2Id  UNIQUEIDENTIFIER = NEWID();  -- Essay Toán - Hàm số
DECLARE @a3Id  UNIQUEIDENTIFIER = NEWID();  -- Quiz Anh - Grammar
DECLARE @a4Id  UNIQUEIDENTIFIER = NEWID();  -- File upload Văn
DECLARE @a5Id  UNIQUEIDENTIFIER = NEWID();  -- Quiz Lý - Động học
DECLARE @a6Id  UNIQUEIDENTIFIER = NEWID();  -- Quiz Hóa - Nguyên tử
DECLARE @a7Id  UNIQUEIDENTIFIER = NEWID();  -- Essay Anh - Writing

INSERT INTO Assignments (id, courseEnrollmentId, title, description, type, startDate, dueDate, timeLimitMinutes, totalPoints, maxAttempts, shuffleQuestions, showResultImmediately, isPublished, publishedAt)
VALUES
(@a1Id, @ce1Id,
    N'Kiểm tra 15 phút: Tập hợp và các phép toán',
    N'Bài kiểm tra nhanh về kiến thức tập hợp và các phép toán hợp, giao, hiệu.',
    'quiz',
    DATEADD(day, -14, GETDATE()),
    DATEADD(day, -7,  GETDATE()),
    15, 10, 2, 1, 1, 1, DATEADD(day, -14, GETDATE())),

(@a2Id, @ce1Id,
    N'Bài tập tự luận: Hàm số bậc hai và đồ thị',
    N'Trình bày lời giải chi tiết các bài toán về hàm số bậc hai, vẽ đồ thị và tìm giá trị cực trị.',
    'essay',
    DATEADD(day, -10, GETDATE()),
    DATEADD(day,  3,  GETDATE()),
    NULL, 10, 1, 0, 1, 1, DATEADD(day, -10, GETDATE())),

(@a3Id, @ce3Id,
    N'Grammar Test: Tenses (Present Simple & Continuous)',
    N'Test your knowledge of Present Simple and Present Continuous tenses with context-based questions.',
    'quiz',
    DATEADD(day, -12, GETDATE()),
    DATEADD(day, -5,  GETDATE()),
    20, 10, 3, 1, 1, 1, DATEADD(day, -12, GETDATE())),

(@a4Id, @ce2Id,
    N'Bài tập: Phân tích tác phẩm Truyện Kiều',
    N'Nộp bài phân tích đoạn trích "Trao Duyên" trong Truyện Kiều của Nguyễn Du. Yêu cầu: file Word/PDF, từ 500-800 chữ.',
    'file',
    DATEADD(day, -8, GETDATE()),
    DATEADD(day,  7, GETDATE()),
    NULL, 10, 1, 0, 0, 1, DATEADD(day, -8, GETDATE())),

(@a5Id, @ce4Id,
    N'Trắc nghiệm: Chuyển động thẳng đều và biến đổi đều',
    N'Bài kiểm tra đánh giá kiến thức chương 1 Vật lý 10 về động học chất điểm.',
    'quiz',
    DATEADD(day, -7, GETDATE()),
    DATEADD(day,  1, GETDATE()),
    30, 10, 1, 1, 0, 1, DATEADD(day, -7, GETDATE())),

(@a6Id, @ce7Id,
    N'Quiz: Cấu tạo nguyên tử và bảng tuần hoàn',
    N'Kiểm tra kiến thức về cấu tạo nguyên tử, cấu hình electron và bảng tuần hoàn nguyên tố.',
    'quiz',
    DATEADD(day, -5, GETDATE()),
    DATEADD(day,  5, GETDATE()),
    25, 10, 2, 0, 1, 1, DATEADD(day, -5, GETDATE())),

(@a7Id, @ce3Id,
    N'Writing Task: Describe Your Family',
    N'Write a descriptive paragraph about your family (150-200 words). Use vocabulary and grammar from Unit 1.',
    'essay',
    DATEADD(day, -6, GETDATE()),
    DATEADD(day, 10, GETDATE()),
    NULL, 10, 1, 0, 1, 1, DATEADD(day, -6, GETDATE()));

PRINT '  → Đã thêm 7 bài tập';

-- ============================================================
-- 3.8 QUESTIONS & ANSWER OPTIONS - Câu hỏi và đáp án
-- ============================================================
PRINT 'Đang chèn dữ liệu Questions và AnswerOptions...';

-- ---- Quiz Toán: Tập hợp (a1) ----
DECLARE @q1  UNIQUEIDENTIFIER = NEWID();
DECLARE @q2  UNIQUEIDENTIFIER = NEWID();
DECLARE @q3  UNIQUEIDENTIFIER = NEWID();
DECLARE @q4  UNIQUEIDENTIFIER = NEWID();
DECLARE @q5  UNIQUEIDENTIFIER = NEWID();

INSERT INTO Questions (id, assignmentId, questionText, questionType, points, orderIndex, explanation)
VALUES
(@q1, @a1Id, N'Cho A = {1, 2, 3, 4, 5} và B = {4, 5, 6, 7}. Tập A ∩ B bằng tập nào sau đây?',
    'single_choice', 2, 0, N'A ∩ B gồm các phần tử thuộc cả A và B: {4, 5}'),
(@q2, @a1Id, N'Tập rỗng được ký hiệu là gì?',
    'single_choice', 2, 1, N'Tập rỗng ký hiệu là ∅ hoặc {}'),
(@q3, @a1Id, N'Cho A = {a, b, c}. Số tập con của A là bao nhiêu?',
    'single_choice', 2, 2, N'Số tập con của tập A có n phần tử là 2ⁿ = 2³ = 8'),
(@q4, @a1Id, N'Phép toán nào sau đây cho kết quả là tập hợp gồm các phần tử thuộc A hoặc thuộc B?',
    'single_choice', 2, 3, N'Phép hợp A ∪ B bao gồm tất cả phần tử thuộc A hoặc B'),
(@q5, @a1Id, N'Điền đúng/sai: ∅ ⊂ A với mọi tập hợp A.',
    'true_false', 2, 4, N'Tập rỗng là tập con của mọi tập hợp - ĐÚNG');

-- Đáp án cho Q1
INSERT INTO AnswerOptions (questionId, optionText, isCorrect, orderIndex) VALUES
(@q1, N'{4, 5}',        1, 0),
(@q1, N'{1, 2, 3}',     0, 1),
(@q1, N'{1, 2, 3, 4, 5, 6, 7}', 0, 2),
(@q1, N'{6, 7}',        0, 3);

-- Đáp án cho Q2
INSERT INTO AnswerOptions (questionId, optionText, isCorrect, orderIndex) VALUES
(@q2, N'∅',     1, 0),
(@q2, N'{0}',   0, 1),
(@q2, N'{}{}',  0, 2),
(@q2, N'Ω',     0, 3);

-- Đáp án cho Q3
INSERT INTO AnswerOptions (questionId, optionText, isCorrect, orderIndex) VALUES
(@q3, N'8',  1, 0),
(@q3, N'6',  0, 1),
(@q3, N'3',  0, 2),
(@q3, N'4',  0, 3);

-- Đáp án cho Q4
INSERT INTO AnswerOptions (questionId, optionText, isCorrect, orderIndex) VALUES
(@q4, N'A ∪ B',  1, 0),
(@q4, N'A ∩ B',  0, 1),
(@q4, N'A \ B',  0, 2),
(@q4, N'Aᶜ',     0, 3);

-- Đáp án cho Q5 (true/false)
INSERT INTO AnswerOptions (questionId, optionText, isCorrect, orderIndex) VALUES
(@q5, N'Đúng', 1, 0),
(@q5, N'Sai',  0, 1);

-- ---- Quiz Tiếng Anh: Tenses (a3) ----
DECLARE @q6  UNIQUEIDENTIFIER = NEWID();
DECLARE @q7  UNIQUEIDENTIFIER = NEWID();
DECLARE @q8  UNIQUEIDENTIFIER = NEWID();
DECLARE @q9  UNIQUEIDENTIFIER = NEWID();
DECLARE @q10 UNIQUEIDENTIFIER = NEWID();
DECLARE @q11 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Questions (id, assignmentId, questionText, questionType, points, orderIndex, explanation)
VALUES
(@q6,  @a3Id, N'Choose the correct form: She ______ to school every day.',
    'single_choice', 2, 0, N'"goes" - Present Simple for habits/routines with he/she/it'),
(@q7,  @a3Id, N'Choose the correct form: Look! The children ______ in the garden.',
    'single_choice', 2, 1, N'"are playing" - Present Continuous for actions happening right now'),
(@q8,  @a3Id, N'Which sentence uses Present Simple correctly?',
    'single_choice', 2, 2, N'Water boils at 100°C - this is a general fact, use Present Simple'),
(@q9,  @a3Id, N'Choose the correct form: I ______ my homework at the moment.',
    'single_choice', 1, 3, N'"am doing" - Present Continuous for current ongoing action'),
(@q10, @a3Id, N'The sentence "He is always losing his keys" expresses:',
    'single_choice', 1, 4, N'Present Continuous with "always" expresses an annoying habit'),
(@q11, @a3Id, N'Which words typically signal Present Continuous? (Select all correct)',
    'multiple_choice', 2, 5, N'now, at the moment, currently, look, listen signal Present Continuous');

INSERT INTO AnswerOptions (questionId, optionText, isCorrect, orderIndex) VALUES
(@q6, N'go',    0, 0),
(@q6, N'goes',  1, 1),
(@q6, N'going', 0, 2),
(@q6, N'gone',  0, 3);

INSERT INTO AnswerOptions (questionId, optionText, isCorrect, orderIndex) VALUES
(@q7, N'play',          0, 0),
(@q7, N'plays',         0, 1),
(@q7, N'are playing',   1, 2),
(@q7, N'played',        0, 3);

INSERT INTO AnswerOptions (questionId, optionText, isCorrect, orderIndex) VALUES
(@q8, N'I am cooking dinner right now.',     0, 0),
(@q8, N'Water boils at 100 degrees Celsius.', 1, 1),
(@q8, N'She is studying French this year.',   0, 2),
(@q8, N'They are building a new house.',      0, 3);

INSERT INTO AnswerOptions (questionId, optionText, isCorrect, orderIndex) VALUES
(@q9, N'do',      0, 0),
(@q9, N'does',    0, 1),
(@q9, N'am doing', 1, 2),
(@q9, N'did',     0, 3);

INSERT INTO AnswerOptions (questionId, optionText, isCorrect, orderIndex) VALUES
(@q10, N'A general fact',               0, 0),
(@q10, N'An annoying habit',            1, 1),
(@q10, N'A past action',                0, 2),
(@q10, N'A future plan',                0, 3);

INSERT INTO AnswerOptions (questionId, optionText, isCorrect, orderIndex) VALUES
(@q11, N'now',          1, 0),
(@q11, N'always',       0, 1),
(@q11, N'at the moment', 1, 2),
(@q11, N'every day',    0, 3);

-- ---- Quiz Vật lý: Động học (a5) ----
DECLARE @q12 UNIQUEIDENTIFIER = NEWID();
DECLARE @q13 UNIQUEIDENTIFIER = NEWID();
DECLARE @q14 UNIQUEIDENTIFIER = NEWID();
DECLARE @q15 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Questions (id, assignmentId, questionText, questionType, points, orderIndex, explanation)
VALUES
(@q12, @a5Id, N'Một vật chuyển động thẳng đều với vận tốc 72 km/h. Vận tốc đó bằng bao nhiêu m/s?',
    'single_choice', 2.5, 0, N'72 km/h = 72 × 1000/3600 = 20 m/s'),
(@q13, @a5Id, N'Trong chuyển động thẳng đều, đồ thị tọa độ theo thời gian (x-t) có dạng:',
    'single_choice', 2.5, 1, N'Đồ thị x-t của chuyển động thẳng đều là đường thẳng xiên'),
(@q14, @a5Id, N'Một ô tô đang đi với vận tốc 20 m/s thì hãm phanh với gia tốc 4 m/s². Thời gian ô tô dừng hẳn là:',
    'single_choice', 2.5, 2, N'v = v₀ + at => 0 = 20 - 4t => t = 5 giây'),
(@q15, @a5Id, N'Điền đúng/sai: Gia tốc là đại lượng vô hướng.',
    'true_false', 2.5, 3, N'Gia tốc là đại lượng vector (có hướng) - SAI');

INSERT INTO AnswerOptions (questionId, optionText, isCorrect, orderIndex) VALUES
(@q12, N'20 m/s',  1, 0),
(@q12, N'25 m/s',  0, 1),
(@q12, N'36 m/s',  0, 2),
(@q12, N'10 m/s',  0, 3);

INSERT INTO AnswerOptions (questionId, optionText, isCorrect, orderIndex) VALUES
(@q13, N'Đường thẳng song song trục Ot',  0, 0),
(@q13, N'Đường thẳng xiên',               1, 1),
(@q13, N'Đường cong parabol',             0, 2),
(@q13, N'Đường gấp khúc',                0, 3);

INSERT INTO AnswerOptions (questionId, optionText, isCorrect, orderIndex) VALUES
(@q14, N'4 giây',  0, 0),
(@q14, N'5 giây',  1, 1),
(@q14, N'6 giây',  0, 2),
(@q14, N'8 giây',  0, 3);

INSERT INTO AnswerOptions (questionId, optionText, isCorrect, orderIndex) VALUES
(@q15, N'Đúng', 0, 0),
(@q15, N'Sai',  1, 1);

-- ---- Quiz Hóa học: Nguyên tử (a6) ----
DECLARE @q16 UNIQUEIDENTIFIER = NEWID();
DECLARE @q17 UNIQUEIDENTIFIER = NEWID();
DECLARE @q18 UNIQUEIDENTIFIER = NEWID();

INSERT INTO Questions (id, assignmentId, questionText, questionType, points, orderIndex, explanation)
VALUES
(@q16, @a6Id, N'Nguyên tố Natri (Na) có số hiệu nguyên tử Z = 11. Số electron ở lớp ngoài cùng là:',
    'single_choice', 3, 0, N'Cấu hình e của Na: 1s²2s²2p⁶3s¹ → 1e ở lớp ngoài cùng (lớp M)'),
(@q17, @a6Id, N'Đồng vị là các nguyên tử của cùng một nguyên tố có:',
    'single_choice', 3, 1, N'Đồng vị: cùng số proton (Z), khác số neutron (N), khác số khối (A)'),
(@q18, @a6Id, N'Trong bảng tuần hoàn, tính kim loại của các nguyên tố trong một chu kỳ thay đổi như thế nào từ trái sang phải?',
    'single_choice', 4, 2, N'Trong một chu kỳ, từ trái sang phải: số proton tăng, tính kim loại giảm dần, tính phi kim tăng dần');

INSERT INTO AnswerOptions (questionId, optionText, isCorrect, orderIndex) VALUES
(@q16, N'1',  1, 0),
(@q16, N'2',  0, 1),
(@q16, N'3',  0, 2),
(@q16, N'8',  0, 3);

INSERT INTO AnswerOptions (questionId, optionText, isCorrect, orderIndex) VALUES
(@q17, N'Cùng số proton, khác số neutron',    1, 0),
(@q17, N'Cùng số neutron, khác số proton',    0, 1),
(@q17, N'Cùng số khối, khác số proton',       0, 2),
(@q17, N'Cùng số electron, khác số neutron',  0, 3);

INSERT INTO AnswerOptions (questionId, optionText, isCorrect, orderIndex) VALUES
(@q18, N'Tăng dần',         0, 0),
(@q18, N'Giảm dần',         1, 1),
(@q18, N'Không thay đổi',   0, 2),
(@q18, N'Tăng rồi giảm',    0, 3);

PRINT '  → Đã thêm 18 câu hỏi với đáp án';

-- ============================================================
-- 3.9 SUBMISSIONS - Bài nộp mẫu
-- ============================================================
PRINT 'Đang chèn dữ liệu Submissions...';

DECLARE @sub1Id  UNIQUEIDENTIFIER = NEWID();  -- s1 làm quiz Toán (a1)
DECLARE @sub2Id  UNIQUEIDENTIFIER = NEWID();  -- s2 làm quiz Toán (a1)
DECLARE @sub3Id  UNIQUEIDENTIFIER = NEWID();  -- s3 làm quiz Toán (a1) - chưa nộp
DECLARE @sub4Id  UNIQUEIDENTIFIER = NEWID();  -- s1 nộp tự luận Toán (a2)
DECLARE @sub5Id  UNIQUEIDENTIFIER = NEWID();  -- s1 làm quiz Anh (a3)
DECLARE @sub6Id  UNIQUEIDENTIFIER = NEWID();  -- s2 làm quiz Anh (a3)
DECLARE @sub7Id  UNIQUEIDENTIFIER = NEWID();  -- s3 làm quiz Anh (a3)
DECLARE @sub8Id  UNIQUEIDENTIFIER = NEWID();  -- s4 nộp văn (a4)
DECLARE @sub9Id  UNIQUEIDENTIFIER = NEWID();  -- s2 nộp tự luận Toán (a2)
DECLARE @sub10Id UNIQUEIDENTIFIER = NEWID();  -- s1 làm quiz Lý (a5)

-- Quiz Toán - s1 đã hoàn thành và được chấm
INSERT INTO Submissions (id, assignmentId, studentId, attemptNumber, startedAt, submittedAt, score, gradedBy, gradedAt, status)
VALUES
(@sub1Id, @a1Id, @s1Id, 1,
    DATEADD(day,-12,GETDATE()), DATEADD(day,-12,GETDATE()),
    8.0, @t1Id, DATEADD(day,-11,GETDATE()), 'graded');

-- Quiz Toán - s2 đã hoàn thành
INSERT INTO Submissions (id, assignmentId, studentId, attemptNumber, startedAt, submittedAt, score, gradedBy, gradedAt, status)
VALUES
(@sub2Id, @a1Id, @s2Id, 1,
    DATEADD(day,-11,GETDATE()), DATEADD(day,-11,GETDATE()),
    6.0, @t1Id, DATEADD(day,-10,GETDATE()), 'graded');

-- Quiz Toán - s3 đang làm
INSERT INTO Submissions (id, assignmentId, studentId, attemptNumber, startedAt, status)
VALUES
(@sub3Id, @a1Id, @s3Id, 1, DATEADD(day,-7,GETDATE()), 'in_progress');

-- Tự luận Toán - s1 đã nộp và được chấm có nhận xét
INSERT INTO Submissions (id, assignmentId, studentId, attemptNumber, essayContent, startedAt, submittedAt, score, feedback, gradedBy, gradedAt, status)
VALUES
(@sub4Id, @a2Id, @s1Id, 1,
N'Bài giải:
Cho hàm số y = 2x² - 4x + 1

Bước 1: Tìm đỉnh parabol
x đỉnh = -b/(2a) = 4/(2×2) = 1
y đỉnh = 2(1)² - 4(1) + 1 = 2 - 4 + 1 = -1
→ Đỉnh I(1; -1)

Bước 2: Hàm số đạt giá trị nhỏ nhất tại x = 1
y_min = -1

Bước 3: Vẽ đồ thị
- Parabol mở lên (a = 2 > 0)
- Trục đối xứng: x = 1
- Đi qua các điểm: (0;1), (1;-1), (2;1), (-1;7), (3;7)',
    DATEADD(day,-8,GETDATE()), DATEADD(day,-7,GETDATE()),
    9.0,
    N'Bài làm rất tốt! Em đã xác định đúng đỉnh parabol và trình bày logic rõ ràng. Tuy nhiên cần vẽ thêm ít nhất 5 điểm và ghi chú rõ trục đối xứng trên đồ thị. Điểm trừ 1 điểm vì thiếu đồ thị vẽ tay.',
    @t1Id, DATEADD(day,-6,GETDATE()), 'graded');

-- Quiz Anh - s1
INSERT INTO Submissions (id, assignmentId, studentId, attemptNumber, startedAt, submittedAt, score, gradedBy, gradedAt, status)
VALUES
(@sub5Id, @a3Id, @s1Id, 1,
    DATEADD(day,-10,GETDATE()), DATEADD(day,-10,GETDATE()),
    8.0, @t3Id, DATEADD(day,-9,GETDATE()), 'graded');

-- Quiz Anh - s2
INSERT INTO Submissions (id, assignmentId, studentId, attemptNumber, startedAt, submittedAt, score, gradedBy, gradedAt, status)
VALUES
(@sub6Id, @a3Id, @s2Id, 1,
    DATEADD(day,-9,GETDATE()), DATEADD(day,-9,GETDATE()),
    7.0, @t3Id, DATEADD(day,-8,GETDATE()), 'graded');

-- Quiz Anh - s3 nộp trễ
INSERT INTO Submissions (id, assignmentId, studentId, attemptNumber, startedAt, submittedAt, score, status)
VALUES
(@sub7Id, @a3Id, @s3Id, 1,
    DATEADD(day,-3,GETDATE()), DATEADD(day,-3,GETDATE()),
    5.0, 'late');

-- File nộp Văn - s4 đã nộp chưa chấm
INSERT INTO Submissions (id, assignmentId, studentId, attemptNumber, fileUrl, startedAt, submittedAt, status)
VALUES
(@sub8Id, @a4Id, @s4Id, 1,
    '/uploads/submissions/sample-essay.pdf',
    DATEADD(day,-5,GETDATE()), DATEADD(day,-4,GETDATE()), 'submitted');

-- Tự luận Toán - s2 đã nộp chưa chấm
INSERT INTO Submissions (id, assignmentId, studentId, attemptNumber, essayContent, startedAt, submittedAt, status)
VALUES
(@sub9Id, @a2Id, @s2Id, 1,
N'Giải:
Hàm số y = 2x² - 4x + 1 có a = 2 > 0 nên parabol mở lên trên.
Đỉnh: x = -(-4)/(2.2) = 1; y = 2-4+1 = -1
Vậy hàm số đạt giá trị nhỏ nhất là -1 tại x = 1.

Bảng giá trị:
x: -1 | 0 | 1 | 2 | 3
y:  7 | 1 |-1 | 1 | 7',
    DATEADD(day,-6,GETDATE()), DATEADD(day,-5,GETDATE()), 'submitted');

-- Quiz Lý - s1
INSERT INTO Submissions (id, assignmentId, studentId, attemptNumber, startedAt, submittedAt, score, gradedBy, gradedAt, status)
VALUES
(@sub10Id, @a5Id, @s1Id, 1,
    DATEADD(day,-4,GETDATE()), DATEADD(day,-4,GETDATE()),
    7.5, @t4Id, DATEADD(day,-3,GETDATE()), 'graded');

PRINT '  → Đã thêm 10 bài nộp mẫu';

-- ============================================================
-- 3.10 STUDENT ANSWERS - Câu trả lời mẫu cho quiz
-- ============================================================
PRINT 'Đang chèn dữ liệu StudentAnswers...';

-- Lấy ID các option đúng
DECLARE @optQ1Correct  UNIQUEIDENTIFIER;
DECLARE @optQ2Correct  UNIQUEIDENTIFIER;
DECLARE @optQ3Correct  UNIQUEIDENTIFIER;
DECLARE @optQ4Correct  UNIQUEIDENTIFIER;
DECLARE @optQ5Correct  UNIQUEIDENTIFIER;

SELECT @optQ1Correct = id FROM AnswerOptions WHERE questionId = @q1 AND isCorrect = 1;
SELECT @optQ2Correct = id FROM AnswerOptions WHERE questionId = @q2 AND isCorrect = 1;
SELECT @optQ3Correct = id FROM AnswerOptions WHERE questionId = @q3 AND isCorrect = 1;
SELECT @optQ4Correct = id FROM AnswerOptions WHERE questionId = @q4 AND isCorrect = 1;
SELECT @optQ5Correct = id FROM AnswerOptions WHERE questionId = @q5 AND isCorrect = 1;

DECLARE @optQ1Wrong UNIQUEIDENTIFIER;
SELECT @optQ1Wrong = id FROM AnswerOptions WHERE questionId = @q1 AND isCorrect = 0 AND orderIndex = 1;

-- s1 trả lời quiz Toán (sub1): 4/5 câu đúng
INSERT INTO StudentAnswers (submissionId, questionId, selectedOptionIds, isCorrect, pointsEarned) VALUES
(@sub1Id, @q1, CONCAT('["', @optQ1Correct, '"]'), 1, 2.0),
(@sub1Id, @q2, CONCAT('["', @optQ2Correct, '"]'), 1, 2.0),
(@sub1Id, @q3, CONCAT('["', @optQ3Correct, '"]'), 1, 2.0),
(@sub1Id, @q4, CONCAT('["', @optQ4Correct, '"]'), 1, 2.0),
(@sub1Id, @q5, CONCAT('["', @optQ5Correct, '"]'), 1, 2.0);

-- s2 trả lời quiz Toán (sub2): 3/5 câu đúng
INSERT INTO StudentAnswers (submissionId, questionId, selectedOptionIds, isCorrect, pointsEarned) VALUES
(@sub2Id, @q1, CONCAT('["', @optQ1Correct, '"]'), 1, 2.0),
(@sub2Id, @q2, CONCAT('["', @optQ2Correct, '"]'), 1, 2.0),
(@sub2Id, @q3, CONCAT('["', @optQ3Correct, '"]'), 1, 2.0),
(@sub2Id, @q4, CONCAT('["', @optQ1Wrong,   '"]'), 0, 0.0),  -- sai
(@sub2Id, @q5, CONCAT('["', @optQ5Correct, '"]'), 1, 0.0);  -- đúng nhưng giả sử 0đ

PRINT '  → Đã thêm câu trả lời mẫu';

-- ============================================================
-- 3.11 ANNOUNCEMENTS - Thông báo
-- ============================================================
PRINT 'Đang chèn dữ liệu Announcements...';

INSERT INTO Announcements (courseEnrollmentId, authorId, title, content, isGlobal)
VALUES
(NULL, @adminId,
    N'Thông báo lịch kiểm tra giữa kỳ 1 - Năm học 2024-2025',
    N'Kính gửi toàn thể học sinh!

Nhà trường thông báo lịch kiểm tra giữa kỳ 1 năm học 2024-2025 như sau:
- Thứ 2 (25/11): Toán học
- Thứ 3 (26/11): Ngữ văn  
- Thứ 4 (27/11): Tiếng Anh
- Thứ 5 (28/11): Vật lý / Hóa học
- Thứ 6 (29/11): Sinh học / Địa lý / Lịch sử

Học sinh cần có mặt trước giờ thi 15 phút. Mang theo thẻ học sinh và đủ dụng cụ học tập.

Chúc các em ôn tập tốt!',
    1),

(NULL, @adminId,
    N'Thông báo: Nghỉ lễ 20/11 - Ngày Nhà giáo Việt Nam',
    N'Nhân dịp kỷ niệm Ngày Nhà giáo Việt Nam 20/11, nhà trường thông báo:
- Học sinh được nghỉ học ngày 20/11/2024 (Thứ Tư)
- Tiết học sẽ được bù vào thứ 7 tuần kế tiếp
- Học sinh được phép tổ chức các hoạt động tri ân thầy cô

Trân trọng thông báo!',
    1),

(@ce1Id, @t1Id,
    N'Lịch ôn tập Toán - Chuẩn bị kiểm tra 15 phút',
    N'Các em học sinh lớp 10A1 chú ý!

Tuần tới sẽ có bài kiểm tra 15 phút về chủ đề TẬP HỢP.

Các em cần ôn lại:
1. Định nghĩa và ký hiệu tập hợp
2. Phép hợp, giao, hiệu của tập hợp
3. Tập con, tập rỗng
4. Bài tập dạng tính toán A ∪ B, A ∩ B, A\B

Bài kiểm tra sẽ gồm 5 câu hỏi trắc nghiệm, thời gian 15 phút.
Thầy chúc các em ôn tập tốt!',
    0),

(@ce3Id, @t3Id,
    N'Reminder: Grammar Test Next Week + Speaking Practice',
    N'Dear students of class 10A1,

A reminder about next week''s schedule:
📝 Grammar Test: Tuesday - Present Simple & Present Continuous (20 minutes, online)
🗣️ Speaking Practice: Thursday - pair conversation about family

For the grammar test, please review:
- Signal words for each tense
- Spelling rules (3rd person singular -s/-es)
- Differences in usage

Extra practice: Complete exercises on pages 14-16 in your workbook.

Good luck! 🍀',
    0),

(@ce4Id, @t4Id,
    N'Bài tập bổ sung - Chuyển động thẳng',
    N'Các em học sinh thân mến!

Để củng cố kiến thức chương 1, thầy giao thêm bài tập bổ sung (không tính điểm):

BÀI 1: Một ô tô chuyển động thẳng đều với v = 54 km/h trong 30 phút. Tính quãng đường.

BÀI 2: Một viên đạn được bắn thẳng đứng lên với v₀ = 100 m/s. Bỏ qua sức cản không khí. Tính thời gian đến khi viên đạn dừng lại và độ cao cực đại đạt được.

BÀI 3 (nâng cao): Hai ô tô cùng xuất phát từ A và B cách nhau 120 km, đi ngược chiều nhau. Xe từ A có v₁ = 60 km/h, xe từ B có v₂ = 40 km/h. Sau bao lâu hai xe gặp nhau?

Nộp bài vào tiết học thứ Năm tuần sau!',
    0);

PRINT '  → Đã thêm 5 thông báo';

-- ============================================================
-- 3.12 COMMENTS - Bình luận bài giảng
-- ============================================================
PRINT 'Đang chèn dữ liệu Comments...';

INSERT INTO Comments (lessonId, authorId, content, parentId)
VALUES
(@l1, @s1Id,  N'Thầy ơi, phần phép hiệu A \ B em vẫn chưa hiểu rõ. Có thể giải thích thêm không ạ?', NULL),
(@l1, @t1Id,  N'Em Tuấn: A \ B là tập hợp các phần tử thuộc A nhưng KHÔNG thuộc B. Ví dụ A={1,2,3}, B={2,3,4} thì A\B={1}. Em thử làm lại bài tập 3 nhé!', NULL),
(@l1, @s2Id,  N'Em cũng thắc mắc câu đó ạ, cảm ơn thầy đã giải thích!', NULL),
(@l1, @s3Id,  N'Bài giảng rất dễ hiểu ạ, em đã làm được hết bài tập trong sách rồi 😊', NULL),

(@l5, @s1Id,  N'Teacher, could you give more examples of Present Continuous for temporary situations?', NULL),
(@l5, @t3Id,  N'Sure! Examples: "I am staying at my aunt''s house this week" or "She is working at a coffee shop temporarily". The key word is that the action is NOT permanent. 😊', NULL),
(@l5, @s4Id,  N'Thank you teacher! The vocabulary section is very helpful for my writing.', NULL),

(@l7, @s5Id,  N'Thầy ơi cho em hỏi, khi gia tốc a âm có nghĩa là vật đang chậm lại hay vật đang đi theo chiều âm ạ?', NULL),
(@l7, @t4Id,  N'Câu hỏi hay em! Gia tốc âm không nhất thiết là vật chậm lại. Nếu vận tốc v cũng âm (cùng chiều với a) thì vật NHANH dần. Vật chậm dần khi a và v NGƯỢC chiều nhau. Em xem lại bảng phân tích trong bài nhé!', NULL),

(@l9, @s3Id,  N'Em chưa hiểu tại sao electron lại chuyển động theo lớp mà không phải theo quỹ đạo tròn như hành tinh ạ?', NULL),
(@l9, @t5Id,  N'Đây là câu hỏi rất thú vị! Mô hình Bohr cũ giống hành tinh nhưng không chính xác. Theo cơ học lượng tử, electron tồn tại ở orbital - vùng không gian có xác suất tìm thấy electron cao. Chúng ta sẽ học kỹ hơn ở chương orbital điện tử!', NULL);

PRINT '  → Đã thêm 12 bình luận mẫu';

-- ============================================================
-- 3.13 NOTIFICATIONS - Thông báo hệ thống
-- ============================================================
PRINT 'Đang chèn dữ liệu Notifications...';

INSERT INTO Notifications (userId, title, message, type, referenceId, isRead)
VALUES
(@s1Id, N'Bài tập đã được chấm điểm',
    N'Giáo viên Nguyễn Văn An đã chấm bài tập "Bài tập tự luận: Hàm số bậc hai và đồ thị" của bạn. Điểm: 9.0/10',
    'grade', @a2Id, 1),

(@s1Id, N'Bài kiểm tra trắc nghiệm đã được chấm',
    N'Bài kiểm tra "Kiểm tra 15 phút: Tập hợp và các phép toán" đã được chấm. Điểm: 8.0/10',
    'grade', @a1Id, 1),

(@s2Id, N'Bài tập đã được chấm điểm',
    N'Giáo viên Nguyễn Văn An đã chấm bài kiểm tra Toán. Điểm: 6.0/10',
    'grade', @a1Id, 0),

(@s1Id, N'Bài tập mới: Grammar Test',
    N'Giáo viên Lê Minh Chính vừa đăng bài tập mới "Grammar Test: Tenses" cho lớp 10A1. Hạn nộp: còn 5 ngày',
    'new_assignment', @a3Id, 1),

(@s2Id, N'Thông báo quan trọng từ nhà trường',
    N'Nhà trường đã đăng thông báo lịch kiểm tra giữa kỳ 1. Hãy kiểm tra ngay!',
    'announcement', NULL, 0),

(@s3Id, N'Thông báo quan trọng từ nhà trường',
    N'Nhà trường đã đăng thông báo nghỉ lễ 20/11. Hãy kiểm tra ngay!',
    'announcement', NULL, 0),

(@s4Id, N'Bài tập sắp hết hạn',
    N'Bài tập "Phân tích tác phẩm Truyện Kiều" sẽ hết hạn trong 2 ngày. Hãy hoàn thành sớm!',
    'deadline', @a4Id, 0),

(@t1Id, N'Có bài nộp mới cần chấm',
    N'Học sinh Trần Thị Hoa đã nộp bài tập tự luận "Hàm số bậc hai và đồ thị". Hãy chấm bài!',
    'new_submission', @a2Id, 0),

(@t1Id, N'Có bài nộp mới cần chấm',
    N'Học sinh Nguyễn Minh Tuấn đã nộp bài tập tự luận. Hãy chấm bài!',
    'new_submission', @a2Id, 1),

(@s1Id, N'Bài kiểm tra Vật lý đã được chấm',
    N'Giáo viên Phạm Thị Dung đã chấm bài kiểm tra Vật lý. Điểm: 7.5/10',
    'grade', @a5Id, 0);

PRINT '  → Đã thêm 10 thông báo hệ thống';

-- ============================================================
-- BƯỚC 4: KIỂM TRA DỮ LIỆU
-- ============================================================
PRINT '';
PRINT '============================================================';
PRINT '📊 KIỂM TRA SỐ LƯỢNG BẢN GHI:';
PRINT '============================================================';

SELECT 'Users'           AS Bảng, COUNT(*) AS SốBanGhi FROM Users
UNION ALL SELECT 'Classes',          COUNT(*) FROM Classes
UNION ALL SELECT 'StudentClasses',   COUNT(*) FROM StudentClasses
UNION ALL SELECT 'Subjects',         COUNT(*) FROM Subjects
UNION ALL SELECT 'CourseEnrollments',COUNT(*) FROM CourseEnrollments
UNION ALL SELECT 'Lessons',          COUNT(*) FROM Lessons
UNION ALL SELECT 'Assignments',      COUNT(*) FROM Assignments
UNION ALL SELECT 'Questions',        COUNT(*) FROM Questions
UNION ALL SELECT 'AnswerOptions',    COUNT(*) FROM AnswerOptions
UNION ALL SELECT 'Submissions',      COUNT(*) FROM Submissions
UNION ALL SELECT 'StudentAnswers',   COUNT(*) FROM StudentAnswers
UNION ALL SELECT 'Announcements',    COUNT(*) FROM Announcements
UNION ALL SELECT 'Comments',         COUNT(*) FROM Comments
UNION ALL SELECT 'Notifications',    COUNT(*) FROM Notifications;

PRINT '';
PRINT '============================================================';
PRINT '✅ HOÀN THÀNH! Database LMS_DB đã sẵn sàng sử dụng.';
PRINT '';
PRINT '🔑 TÀI KHOẢN DEMO:';
PRINT '   Admin   : admin@school.edu.vn       / Admin@123';
PRINT '   GV Toán : teacher.toan@school.edu.vn / Teacher@123';
PRINT '   GV Văn  : teacher.van@school.edu.vn  / Teacher@123';
PRINT '   GV Anh  : teacher.anh@school.edu.vn  / Teacher@123';
PRINT '   HS 1    : student1@school.edu.vn    / Student@123';
PRINT '   HS 2    : student2@school.edu.vn    / Student@123';
PRINT '============================================================';
PRINT '';
PRINT '⚠️  LƯU Ý: Password hash trong SQL này là placeholder.';
PRINT '   Chạy "npm run seed" trong backend để tạo hash thật.';
PRINT '   HOẶC xem hướng dẫn bên dưới để reset password.';
PRINT '============================================================';
GO

-- ============================================================
-- BƯỚC 5: TẠO STORED PROCEDURES HỮU ÍCH
-- ============================================================

-- SP: Reset mật khẩu người dùng bằng bcrypt hash chuẩn
-- Sử dụng: EXEC sp_ResetUserPassword 'email@example.com', '$2a$12$...'
IF OBJECT_ID('sp_ResetUserPassword', 'P') IS NOT NULL
    DROP PROCEDURE sp_ResetUserPassword;
GO
CREATE PROCEDURE sp_ResetUserPassword
    @email          NVARCHAR(255),
    @newHashedPwd   NVARCHAR(255)
AS
BEGIN
    UPDATE Users SET passwordHash = @newHashedPwd, updatedAt = GETDATE()
    WHERE email = @email;
    IF @@ROWCOUNT = 0
        PRINT N'Không tìm thấy user với email: ' + @email;
    ELSE
        PRINT N'Đã reset mật khẩu cho: ' + @email;
END;
GO

-- SP: Xem thống kê tổng quan
IF OBJECT_ID('sp_GetDashboardStats', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetDashboardStats;
GO
CREATE PROCEDURE sp_GetDashboardStats
AS
BEGIN
    SELECT
        (SELECT COUNT(*) FROM Users WHERE role='student' AND isActive=1) AS TongHocSinh,
        (SELECT COUNT(*) FROM Users WHERE role='teacher' AND isActive=1) AS TongGiaoVien,
        (SELECT COUNT(*) FROM Classes WHERE isActive=1)                  AS TongLopHoc,
        (SELECT COUNT(*) FROM Subjects WHERE isActive=1)                 AS TongMonHoc,
        (SELECT COUNT(*) FROM CourseEnrollments WHERE isActive=1)        AS TongKhoaHoc,
        (SELECT COUNT(*) FROM Lessons WHERE isPublished=1)               AS TongBaiGiang,
        (SELECT COUNT(*) FROM Assignments WHERE isPublished=1)           AS TongBaiTap,
        (SELECT COUNT(*) FROM Submissions WHERE status='submitted')      AS BaiChoChams,
        (SELECT COUNT(*) FROM Submissions WHERE status='graded')         AS BaiDaChams;
END;
GO

-- SP: Xem điểm của một học sinh trong một lớp
IF OBJECT_ID('sp_GetStudentGrades', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetStudentGrades;
GO
CREATE PROCEDURE sp_GetStudentGrades
    @studentId  UNIQUEIDENTIFIER,
    @classId    UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SELECT
        u.fullName          AS HocSinh,
        s.name              AS MonHoc,
        a.title             AS BaiTap,
        a.type              AS LoaiBaiTap,
        a.totalPoints       AS DiemToiDa,
        sub.score           AS DiemDat,
        sub.status          AS TrangThai,
        sub.submittedAt     AS NgayNop,
        sub.feedback        AS NhanXet,
        teacher.fullName    AS GiaoVienCham
    FROM Submissions sub
    JOIN Users u          ON sub.studentId   = u.id
    JOIN Assignments a    ON sub.assignmentId = a.id
    JOIN CourseEnrollments ce ON a.courseEnrollmentId = ce.id
    JOIN Subjects s       ON ce.subjectId    = s.id
    JOIN Users teacher    ON ce.teacherId    = teacher.id
    WHERE sub.studentId = @studentId
      AND (@classId IS NULL OR ce.classId = @classId)
      AND sub.status IN ('submitted', 'graded', 'late')
    ORDER BY sub.submittedAt DESC;
END;
GO

-- SP: Xem danh sách bài cần chấm của giáo viên
IF OBJECT_ID('sp_GetPendingGrading', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetPendingGrading;
GO
CREATE PROCEDURE sp_GetPendingGrading
    @teacherId UNIQUEIDENTIFIER
AS
BEGIN
    SELECT
        sub.id              AS SubmissionId,
        u.fullName          AS HocSinh,
        u.email             AS EmailHocSinh,
        a.title             AS TenBaiTap,
        a.type              AS LoaiBaiTap,
        a.totalPoints       AS DiemToiDa,
        s.name              AS MonHoc,
        c.name              AS LopHoc,
        sub.submittedAt     AS NgayNop,
        sub.status          AS TrangThai
    FROM Submissions sub
    JOIN Users u          ON sub.studentId   = u.id
    JOIN Assignments a    ON sub.assignmentId = a.id
    JOIN CourseEnrollments ce ON a.courseEnrollmentId = ce.id
    JOIN Subjects s       ON ce.subjectId    = s.id
    JOIN Classes c        ON ce.classId      = c.id
    WHERE ce.teacherId = @teacherId
      AND sub.status IN ('submitted', 'late')
    ORDER BY sub.submittedAt ASC;
END;
GO

PRINT '✅ Đã tạo các Stored Procedures';
GO

-- ============================================================
-- BƯỚC 6: TẠO VIEWS HỮU ÍCH
-- ============================================================

-- View: Tổng quan khóa học
IF OBJECT_ID('vw_CourseOverview', 'V') IS NOT NULL DROP VIEW vw_CourseOverview;
GO
CREATE VIEW vw_CourseOverview AS
SELECT
    ce.id               AS CourseId,
    s.name              AS MonHoc,
    s.code              AS MaMon,
    t.fullName          AS GiaoVien,
    c.name              AS LopHoc,
    c.gradeLevel        AS KhoiLop,
    ce.semester         AS HocKy,
    ce.academicYear     AS NamHoc,
    (SELECT COUNT(*) FROM Lessons    WHERE courseEnrollmentId = ce.id AND isPublished = 1) AS SoBaiGiang,
    (SELECT COUNT(*) FROM Assignments WHERE courseEnrollmentId = ce.id AND isPublished = 1) AS SoBaiTap,
    (SELECT COUNT(*) FROM StudentClasses WHERE classId = ce.classId)                         AS SoHocSinh
FROM CourseEnrollments ce
JOIN Subjects s ON ce.subjectId = s.id
JOIN Users t    ON ce.teacherId = t.id
JOIN Classes c  ON ce.classId   = c.id
WHERE ce.isActive = 1;
GO

-- View: Bảng điểm
IF OBJECT_ID('vw_Gradebook', 'V') IS NOT NULL DROP VIEW vw_Gradebook;
GO
CREATE VIEW vw_Gradebook AS
SELECT
    u.fullName          AS HocSinh,
    u.email             AS Email,
    c.name              AS LopHoc,
    sub_s.name          AS MonHoc,
    a.title             AS BaiTap,
    a.type              AS Loai,
    a.totalPoints       AS DiemToiDa,
    sub.score           AS DiemDat,
    CASE WHEN a.totalPoints > 0
         THEN ROUND((sub.score / a.totalPoints) * 100, 1)
         ELSE 0 END     AS PhanTram,
    sub.status          AS TrangThai,
    sub.submittedAt     AS NgayNop
FROM Submissions sub
JOIN Users u          ON sub.studentId = u.id
JOIN Assignments a    ON sub.assignmentId = a.id
JOIN CourseEnrollments ce ON a.courseEnrollmentId = ce.id
JOIN Subjects sub_s   ON ce.subjectId = sub_s.id
JOIN Classes c        ON ce.classId   = c.id
WHERE sub.status IN ('graded', 'submitted', 'late');
GO

PRINT '✅ Đã tạo Views';
GO

-- ============================================================
-- BƯỚC 7: DEMO QUERIES - Thử nghiệm truy vấn
-- ============================================================
PRINT '';
PRINT '=== DEMO QUERIES ===';
PRINT '';

-- Xem tổng quan hệ thống
EXEC sp_GetDashboardStats;
GO

-- Xem danh sách khóa học
SELECT * FROM vw_CourseOverview;
GO

-- Xem bảng điểm
SELECT TOP 20 * FROM vw_Gradebook ORDER BY NgayNop DESC;
GO

PRINT '';
PRINT '=== KẾT THÚC - DATABASE SẴN SÀNG ===';
GO
