/**
 * Script tạo bcrypt hash và in ra câu lệnh SQL UPDATE hoàn chỉnh
 * Chạy: node docs/generate_sql_with_hashes.js
 * Copy output vào SQL Server để cập nhật mật khẩu
 */

const bcrypt = require('bcryptjs');

const PASSWORDS = {
  admin:   'Admin@123',
  teacher: 'Teacher@123',
  student: 'Student@123',
};

const EMAILS = {
  admin: ['admin@school.edu.vn'],
  teacher: [
    'teacher.toan@school.edu.vn',
    'teacher.van@school.edu.vn',
    'teacher.anh@school.edu.vn',
    'teacher.ly@school.edu.vn',
    'teacher.hoa@school.edu.vn',
  ],
  student: Array.from({ length: 12 }, (_, i) => `student${i + 1}@school.edu.vn`),
};

async function main() {
  console.log('-- ============================================================');
  console.log('-- SQL UPDATE - Mật khẩu thật cho LMS_DB');
  console.log('-- Tạo bởi: node docs/generate_sql_with_hashes.js');
  console.log('-- ============================================================');
  console.log('USE LMS_DB;');
  console.log('GO');
  console.log('');

  for (const [role, password] of Object.entries(PASSWORDS)) {
    const hash = await bcrypt.hash(password, 12);
    console.log(`-- ${role.toUpperCase()} password: ${password}`);
    console.log(`DECLARE @${role}Hash NVARCHAR(255) = '${hash}';`);
    
    for (const email of EMAILS[role]) {
      console.log(`UPDATE Users SET passwordHash = @${role}Hash, updatedAt = GETDATE() WHERE email = '${email}';`);
    }
    console.log('');
  }

  console.log("PRINT '✅ Đã cập nhật mật khẩu thành công!';");
  console.log('GO');
  console.log('');
  console.log('-- Kiểm tra:');
  console.log("SELECT email, role, LEFT(passwordHash,20)+'...' AS hashPreview FROM Users ORDER BY role, email;");
  console.log('GO');
}

main().catch(console.error);
