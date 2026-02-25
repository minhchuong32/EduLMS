-- ============================================================
-- LMS - Reset Password Script
-- Chạy file này SAU KHI đã chạy database_setup.sql
-- để cập nhật mật khẩu thật (bcrypt hash đúng)
-- ============================================================
-- Cách lấy hash:
--   1. Dùng Node.js: node -e "const b=require('bcryptjs');b.hash('Admin@123',12).then(h=>console.log(h))"
--   2. Dùng online: https://bcrypt.online/
--   3. Chạy script Node: cd backend && node src/config/generate_hashes.js
-- ============================================================

USE LMS_DB;
GO

-- ⚠️ THAY THẾ các giá trị hash bên dưới bằng hash thực từ bcrypt
-- Sau khi có hash thật, uncomment và chạy các lệnh UPDATE:

/*
-- Hash của Admin@123:
EXEC sp_ResetUserPassword 'admin@school.edu.vn', '$2a$12$HASH_THAY_THE_O_DAY';

-- Hash của Teacher@123:
DECLARE @teacherHash NVARCHAR(255) = '$2a$12$HASH_THAY_THE_O_DAY';
UPDATE Users SET passwordHash = @teacherHash WHERE role = 'teacher';

-- Hash của Student@123:
DECLARE @studentHash NVARCHAR(255) = '$2a$12$HASH_THAY_THE_O_DAY';
UPDATE Users SET passwordHash = @studentHash WHERE role = 'student';
*/

-- ============================================================
-- HOẶC: Sử dụng script Node.js tự động cập nhật password
-- File: backend/src/config/seed.js đã có sẵn chức năng này
-- Chạy: npm run seed  (trong thư mục backend)
-- ============================================================
PRINT 'Xem hướng dẫn trong file để cập nhật password hash.';
PRINT 'Cách đơn giản nhất: cd backend && npm run seed';
GO
