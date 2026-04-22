# 🎓 EduLMS – Learning Management System for High Schools

**EduLMS** là hệ thống quản lý học tập (LMS) toàn diện dành cho trường THPT, giúp số hóa quy trình giảng dạy – học tập – đánh giá trên một nền tảng thống nhất.

Hệ thống được thiết kế theo mô hình **role-based**, phục vụ ba nhóm người dùng chính: **Quản trị viên**, **Giáo viên** và **Học sinh**, đảm bảo trải nghiệm mượt mà, dễ sử dụng và có khả năng mở rộng.

---

## 🚀 Tổng quan sản phẩm

EduLMS cung cấp một môi trường học tập trực tuyến hiện đại, nơi:

- 📚 Giáo viên tạo và quản lý nội dung giảng dạy
- 🧑‍🎓 Học sinh học tập, làm bài và theo dõi tiến độ
- 🏫 Nhà trường quản lý toàn bộ hoạt động học tập tập trung

Hệ thống hỗ trợ đầy đủ các nghiệp vụ cốt lõi:

- Quản lý lớp học & môn học
- Tổ chức bài giảng và tài liệu
- Tạo và chấm bài tập (quiz & tự luận)
- Theo dõi tiến độ học tập
- Giao tiếp và thông báo trong hệ thống

---

## 🎯 Điểm nổi bật

- 📌 **Phân quyền rõ ràng (RBAC)**
- 📊 **Theo dõi tiến độ học tập theo từng học sinh**
- 📝 **Hệ thống bài tập linh hoạt** (trắc nghiệm + tự luận + upload file)
- 💬 **Tương tác trực tiếp** qua bình luận bài giảng
- 🔔 **Thông báo tự động theo sự kiện**
- 📁 **Quản lý tài liệu tập trung**
- ⚡ **UI hiện đại** với React + Tailwind

---

## 👥 Vai trò người dùng

### 🏫 Quản trị viên (Admin)

- Quản lý người dùng (giáo viên, học sinh)
- Tổ chức lớp học và môn học
- Phân công giảng dạy
- Theo dõi tổng quan hệ thống
- Gửi thông báo toàn trường

---

### 👨‍🏫 Giáo viên (Teacher)

- Quản lý lớp và môn phụ trách
- Tạo & quản lý **bài giảng** (file, video)
- Tạo **bài tập trắc nghiệm** với nhiều loại câu hỏi
- Tạo **bài tập tự luận** (text hoặc upload file)
- Chấm điểm và phản hồi học sinh
- Theo dõi tiến độ học tập
- Giao tiếp với học sinh qua thông báo & bình luận

---

### 👨‍🎓 Học sinh (Student)

- Truy cập nội dung học tập theo lớp/môn
- Xem bài giảng, tài liệu, video
- Làm bài tập với giao diện trực quan
- Nộp bài và theo dõi kết quả
- Nhận phản hồi từ giáo viên
- Tương tác qua bình luận

---

## 🧩 Kiến trúc hệ thống

EduLMS được xây dựng theo mô hình **Client–Server**, tách biệt frontend và backend:

- **Frontend**: React 18 (SPA)
- **Backend**: Node.js + Express (RESTful API)
- **Database**: Microsoft SQL Server

### Kiến trúc chính:

- JWT Authentication + Refresh Token
- Middleware (Auth, Upload)
- Modular Controller theo domain
- Context API quản lý state
- Axios cho API layer

---

## 🗃️ Mô hình dữ liệu

Hệ thống được thiết kế theo chuẩn quan hệ, bao gồm các thực thể chính:

- Users, Classes, Subjects
- Courses (giảng dạy)
- Lessons, Assignments
- Submissions, StudentAnswers
- Notifications, Announcements

Hỗ trợ:

- Quan hệ nhiều–nhiều (Student ↔ Class)
- Quản lý bài tập và bài nộp chi tiết
- Theo dõi lịch sử và trạng thái học tập

---

## 🔐 Phân quyền hệ thống (RBAC)

| Chức năng          | Admin | Teacher | Student |
| ------------------ | ----- | ------- | ------- |
| Quản lý người dùng | ✅    | ❌      | ❌      |
| Quản lý lớp & môn  | ✅    | ❌      | ❌      |
| Tạo bài giảng      | ✅    | ✅      | ❌      |
| Tạo bài tập        | ✅    | ✅      | ❌      |
| Chấm điểm          | ✅    | ✅      | ❌      |
| Làm bài            | ❌    | ❌      | ✅      |
| Xem nội dung       | ✅    | ✅      | ✅      |

---

## 📡 API Design

Hệ thống cung cấp RESTful API rõ ràng, bao gồm:

- Authentication (JWT)
- User Management
- Class & Course Management
- Lesson & Assignment
- Submission & Grading

Nguyên tắc thiết kế:

- Resource-based URL
- Stateless authentication
- Role-based authorization

---

## 🛠️ Công nghệ sử dụng

| Layer    | Technology                   |
| -------- | ---------------------------- |
| Backend  | Node.js, Express             |
| Database | PostgreSQL                   |
| Auth     | JWT (Access + Refresh Token) |
| Frontend | React 18                     |
| Styling  | Tailwind CSS                 |
| State    | Context API                  |
| HTTP     | Axios                        |
| Upload   | Multer                       |

---

## 📈 Định hướng phát triển

- Real-time notification (WebSocket)
- Dashboard & analytics nâng cao
- Export báo cáo (PDF/Excel)
- Tích hợp lịch học
- Mobile app (React Native)
- Video learning / live class

---

## 📌 Kết luận

EduLMS không chỉ là một hệ thống quản lý học tập, mà còn là nền tảng giúp **chuyển đổi số giáo dục**, tối ưu hóa quy trình giảng dạy và nâng cao trải nghiệm học tập cho học sinh.
