/**
 * Seed Script - Đồng bộ mật khẩu và thêm dữ liệu còn thiếu
 * Chạy: npm run seed
 * Script này AN TOÀN để chạy nhiều lần - không xóa dữ liệu có sẵn
 */
const bcrypt = require("bcryptjs");
const { query } = require("./database");
require("dotenv").config();

const seed = async () => {
  console.log("🌱 Đang chạy seed script...\n");
  console.log("🔐 Đang tạo bcrypt hash (cost=12, mất ~3 giây)...");

  const [adminHash, teacherHash, studentHash] = await Promise.all([
    bcrypt.hash("Admin@123", 12),
    bcrypt.hash("Teacher@123", 12),
    bcrypt.hash("Student@123", 12),
  ]);
  console.log("   ✅ Hash đã tạo xong\n");

  const users = [
    {
      name: "Nguyễn Quản Trị",
      email: "admin@school.edu.vn",
      hash: adminHash,
      role: "admin",
      phone: "0901000001",
    },
    {
      name: "Nguyễn Văn An",
      email: "teacher.toan@school.edu.vn",
      hash: teacherHash,
      role: "teacher",
      phone: "0901111111",
    },
    {
      name: "Trần Thị Bình",
      email: "teacher.van@school.edu.vn",
      hash: teacherHash,
      role: "teacher",
      phone: "0901222222",
    },
    {
      name: "Lê Minh Chính",
      email: "teacher.anh@school.edu.vn",
      hash: teacherHash,
      role: "teacher",
      phone: "0901333333",
    },
    {
      name: "Phạm Thị Dung",
      email: "teacher.ly@school.edu.vn",
      hash: teacherHash,
      role: "teacher",
      phone: "0901444444",
    },
    {
      name: "Hoàng Văn Em",
      email: "teacher.hoa@school.edu.vn",
      hash: teacherHash,
      role: "teacher",
      phone: "0901555555",
    },
    {
      name: "Nguyễn Minh Tuấn",
      email: "student1@school.edu.vn",
      hash: studentHash,
      role: "student",
      phone: "0902111111",
    },
    {
      name: "Trần Thị Hoa",
      email: "student2@school.edu.vn",
      hash: studentHash,
      role: "student",
      phone: "0902222222",
    },
    {
      name: "Lê Quốc Hùng",
      email: "student3@school.edu.vn",
      hash: studentHash,
      role: "student",
      phone: "0902333333",
    },
    {
      name: "Phạm Thị Lan",
      email: "student4@school.edu.vn",
      hash: studentHash,
      role: "student",
      phone: "0902444444",
    },
    {
      name: "Hoàng Văn Minh",
      email: "student5@school.edu.vn",
      hash: studentHash,
      role: "student",
      phone: "0902555555",
    },
    {
      name: "Đỗ Thị Ngọc",
      email: "student6@school.edu.vn",
      hash: studentHash,
      role: "student",
      phone: "0902666666",
    },
    {
      name: "Vũ Văn Phong",
      email: "student7@school.edu.vn",
      hash: studentHash,
      role: "student",
      phone: "0902777777",
    },
    {
      name: "Bùi Thị Quỳnh",
      email: "student8@school.edu.vn",
      hash: studentHash,
      role: "student",
      phone: "0902888888",
    },
    {
      name: "Ngô Thanh Sơn",
      email: "student9@school.edu.vn",
      hash: studentHash,
      role: "student",
      phone: "0902999999",
    },
    {
      name: "Dương Thị Sương",
      email: "student10@school.edu.vn",
      hash: studentHash,
      role: "student",
      phone: "0903000010",
    },
    {
      name: "Trịnh Công Sơn",
      email: "student11@school.edu.vn",
      hash: studentHash,
      role: "student",
      phone: "0903000011",
    },
    {
      name: "Mai Thị Thúy",
      email: "student12@school.edu.vn",
      hash: studentHash,
      role: "student",
      phone: "0903000012",
    },
  ];

  console.log("👤 Đang đồng bộ người dùng...");
  let created = 0,
    updated = 0;
  for (const u of users) {
    const exists = await query("SELECT id FROM Users WHERE email = @email", {
      email: u.email,
    });
    if (exists.recordset.length > 0) {
      await query(
        "UPDATE Users SET passwordHash = @hash, updatedAt = NOW() WHERE email = @email",
        { hash: u.hash, email: u.email },
      );
      updated++;
    } else {
      await query(
        `INSERT INTO Users (fullName, email, passwordHash, role, phone, isActive) VALUES (@name, @email, @hash, @role, @phone, true)`,
        {
          name: u.name,
          email: u.email,
          hash: u.hash,
          role: u.role,
          phone: u.phone,
        },
      );
      created++;
    }
  }
  console.log(`   ✅ ${created} tạo mới, ${updated} cập nhật hash\n`);

  // Sync Subjects
  console.log("📚 Đang đồng bộ môn học...");
  const subjects = [
    { name: "Toán học", code: "MATH" },
    { name: "Ngữ văn", code: "LIT" },
    { name: "Tiếng Anh", code: "ENG" },
    { name: "Vật lý", code: "PHY" },
    { name: "Hóa học", code: "CHEM" },
    { name: "Sinh học", code: "BIO" },
    { name: "Lịch sử", code: "HIST" },
    { name: "Địa lý", code: "GEO" },
  ];
  for (const s of subjects) {
    await query(
      `INSERT INTO Subjects (name, code)
       VALUES (@name, @code)
       ON CONFLICT (code) DO NOTHING`,
      s,
    );
  }
  console.log("   ✅ Môn học đã đồng bộ\n");

  // Sync Classes
  console.log("🏫 Đang đồng bộ lớp học...");
  const classes = [
    { name: "10A1", grade: "10", year: "2024-2025" },
    { name: "10A2", grade: "10", year: "2024-2025" },
    { name: "11B1", grade: "11", year: "2024-2025" },
    { name: "12C1", grade: "12", year: "2024-2025" },
  ];
  for (const c of classes) {
    await query(
      `INSERT INTO Classes (name, gradeLevel, academicYear)
       VALUES (@name, @grade, @year)
       ON CONFLICT DO NOTHING`,
      c,
    );
  }
  console.log("   ✅ Lớp học đã đồng bộ\n");

  console.log("============================================================");
  console.log("✅ SEED HOÀN THÀNH!\n");
  console.log("📋 Tài khoản đăng nhập:");
  console.log("  Admin      : admin@school.edu.vn         / Admin@123");
  console.log("  GV Toán    : teacher.toan@school.edu.vn  / Teacher@123");
  console.log("  Học sinh 1 : student1@school.edu.vn      / Student@123\n");
  process.exit(0);
};

seed().catch((err) => {
  console.error("❌ Seed thất bại:", err.message);
  process.exit(1);
});
