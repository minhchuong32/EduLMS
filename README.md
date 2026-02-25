# 🎓 EduLMS - Hệ thống Quản lý Học tập Trường THPT

Hệ thống LMS (Learning Management System) toàn diện cho trường trung học, hỗ trợ ba vai trò: **Quản trị viên**, **Giáo viên** và **Học sinh**.

---

## 📐 Kiến trúc hệ thống

```
lms-project/
├── backend/                    # Node.js + Express API
│   └── src/
│       ├── config/
│       │   ├── database.js     # Kết nối SQL Server
│       │   ├── migrate.js      # Tạo bảng CSDL
│       │   └── seed.js         # Dữ liệu mẫu
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── assignment.controller.js
│       │   ├── lesson.controller.js
│       │   ├── submission.controller.js
│       │   └── index.controller.js   # User, Class, Subject, Course, Announcement...
│       ├── middleware/
│       │   ├── auth.middleware.js    # JWT authentication
│       │   └── upload.middleware.js  # File upload (multer)
│       ├── routes/                   # Express routes
│       └── server.js                 # Entry point
├── frontend/                   # React 18 + Tailwind CSS
│   └── src/
│       ├── components/
│       │   ├── common/Layout.jsx     # Sidebar navigation
│       │   └── teacher/              # Teacher-specific modals
│       ├── context/AuthContext.jsx   # Global auth state
│       ├── pages/                    # Route pages
│       └── services/api.js           # Axios API calls
└── docs/
    ├── class-diagram.mermaid
    └── usecase-diagram.mermaid
```

---

## 🗃️ Database Schema (SQL Server)

| Bảng | Mô tả |
|------|-------|
| `Users` | Tài khoản admin, giáo viên, học sinh |
| `Classes` | Lớp học (10A1, 11B2, ...) |
| `StudentClasses` | Quan hệ nhiều-nhiều HS ↔ Lớp |
| `Subjects` | Môn học (Toán, Văn, Anh, ...) |
| `CourseEnrollments` | GV dạy Môn cho Lớp trong năm học |
| `Lessons` | Bài giảng (nội dung, file, video) |
| `Assignments` | Bài tập (quiz/essay/file) |
| `Questions` | Câu hỏi trắc nghiệm |
| `AnswerOptions` | Đáp án cho câu hỏi |
| `Submissions` | Bài nộp của học sinh |
| `StudentAnswers` | Câu trả lời trong quiz |
| `Announcements` | Thông báo (lớp học / toàn trường) |
| `Comments` | Bình luận bài giảng |
| `Notifications` | Thông báo hệ thống |
| `RefreshTokens` | JWT refresh token rotation |

---

## 🚀 Hướng dẫn cài đặt

### Yêu cầu
- Node.js >= 18.x
- SQL Server 2019+ (hoặc SQL Server Express)
- npm >= 9.x

---

### 1️⃣ Clone & cài đặt dependencies

```bash
# Backend
cd backend
npm install

# Frontend  
cd ../frontend
npm install
```

---

### 2️⃣ Cấu hình Backend

```bash
cd backend
cp .env.example .env
```

Chỉnh sửa file `.env`:

```env
PORT=5000
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=LMS_DB
DB_USER=sa
DB_PASSWORD=YourStrongPassword123!
DB_TRUST_CERT=true

JWT_SECRET=change_this_to_random_secret_key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=change_this_refresh_secret
JWT_REFRESH_EXPIRES_IN=30d

FRONTEND_URL=http://localhost:3000
```

---

### 3️⃣ Khởi tạo Database

```bash
cd backend

# Tạo tất cả bảng
npm run migrate

# Thêm dữ liệu mẫu
npm run seed
```

---

### 4️⃣ Chạy ứng dụng

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

- **Backend API:** http://localhost:5000
- **Frontend:** http://localhost:3000

---

## 🔑 Tài khoản Demo

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Quản trị viên | admin@school.edu.vn | Admin@123 |
| Giáo viên | teacher.toan@school.edu.vn | Teacher@123 |
| Học sinh | student1@school.edu.vn | Student@123 |

---

## 🎯 Tính năng

### 👤 Quản trị viên (Admin)
- Quản lý toàn bộ người dùng (tạo, sửa, khóa tài khoản)
- Tạo và quản lý lớp học
- Thêm/xóa học sinh vào lớp
- Quản lý danh sách môn học
- Phân công giáo viên dạy môn cho lớp
- Xem thống kê tổng quan hệ thống
- Đăng thông báo toàn trường

### 👨‍🏫 Giáo viên (Teacher)
- Xem danh sách lớp và môn học phụ trách
- **Bài giảng:** Tạo, chỉnh sửa, đăng/ẩn bài giảng; đính kèm file, video YouTube/Vimeo
- **Bài tập trắc nghiệm:** Tạo quiz với nhiều loại câu hỏi (một đáp án, nhiều đáp án, đúng/sai); cài đặt thời gian làm bài, số lần được làm, có/không xáo trộn câu hỏi
- **Bài tập tự luận:** Học sinh nhập câu trả lời hoặc tải file lên
- Xem bài nộp và chấm điểm, viết nhận xét cho học sinh
- Đăng thông báo cho lớp học
- Theo dõi tiến độ học tập

### 👨‍🎓 Học sinh (Student)
- Xem tất cả môn học đang học
- Xem bài giảng, tải tài liệu, xem video
- Bình luận và thảo luận dưới bài giảng
- Làm bài trắc nghiệm với đồng hồ đếm ngược, navigator câu hỏi
- Nộp bài tự luận hoặc tải file bài làm
- Xem điểm số và nhận xét của giáo viên
- Nhận thông báo tự động khi bài được chấm

---

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/login              Đăng nhập
POST   /api/auth/logout             Đăng xuất
POST   /api/auth/refresh            Refresh access token
GET    /api/auth/me                 Thông tin user hiện tại
PUT    /api/auth/change-password    Đổi mật khẩu
```

### Users
```
GET    /api/users                   Danh sách users (Admin)
POST   /api/users                   Tạo user (Admin)
GET    /api/users/:id               Chi tiết user
PUT    /api/users/:id               Cập nhật user (Admin)
PUT    /api/users/profile           Cập nhật hồ sơ cá nhân
```

### Classes
```
GET    /api/classes                 Danh sách lớp học
POST   /api/classes                 Tạo lớp (Admin)
GET    /api/classes/:id             Chi tiết lớp
PUT    /api/classes/:id             Cập nhật lớp (Admin)
POST   /api/classes/:id/students    Thêm học sinh
DELETE /api/classes/:id/students/:studentId  Xóa học sinh
```

### Subjects
```
GET    /api/subjects                Danh sách môn học
POST   /api/subjects                Tạo môn (Admin)
PUT    /api/subjects/:id            Cập nhật môn (Admin)
```

### Courses
```
GET    /api/courses                 Khóa học (lọc theo role)
POST   /api/courses                 Tạo khóa học (Admin)
GET    /api/courses/:id             Chi tiết khóa học
```

### Lessons
```
GET    /api/lessons/course/:id      Bài giảng của khóa học
GET    /api/lessons/:id             Chi tiết bài giảng
POST   /api/lessons                 Tạo bài giảng (Teacher)
PUT    /api/lessons/:id             Cập nhật bài giảng
PATCH  /api/lessons/:id/publish     Đăng/ẩn bài giảng
DELETE /api/lessons/:id             Xóa bài giảng
POST   /api/lessons/:id/comments    Thêm bình luận
```

### Assignments
```
GET    /api/assignments/course/:id  Bài tập của khóa học
GET    /api/assignments/:id         Chi tiết bài tập
POST   /api/assignments             Tạo bài tập (Teacher)
PUT    /api/assignments/:id         Cập nhật bài tập
PATCH  /api/assignments/:id/publish Đăng/ẩn bài tập
DELETE /api/assignments/:id         Xóa bài tập
```

### Submissions
```
POST   /api/submissions/start           Bắt đầu làm bài
POST   /api/submissions/:id/submit-quiz Nộp bài trắc nghiệm
POST   /api/submissions/:id/submit-essay Nộp bài tự luận
PUT    /api/submissions/:id/grade       Chấm điểm (Teacher)
GET    /api/submissions/assignment/:id  Bài nộp của bài tập (Teacher)
GET    /api/submissions/my/:id          Bài nộp của tôi (Student)
GET    /api/submissions/:id/detail      Chi tiết bài nộp
```

---

## 🔒 Phân quyền (RBAC)

```
                Admin   Teacher   Student
─────────────────────────────────────────
Quản lý Users    ✅       ❌        ❌
Quản lý Lớp      ✅       ❌        ❌
Quản lý Môn      ✅       ❌        ❌
Tạo Khóa học     ✅       ❌        ❌
Tạo Bài giảng    ✅       ✅        ❌
Tạo Bài tập      ✅       ✅        ❌
Chấm điểm        ✅       ✅        ❌
Làm bài tập      ❌       ❌        ✅
Xem bài giảng    ✅       ✅        ✅
Bình luận        ✅       ✅        ✅
```

---

## 🗂️ Diagrams

### Class Diagram
Xem file: `docs/class-diagram.mermaid`

Render online tại: https://mermaid.live

### Use Case Diagram
Xem file: `docs/usecase-diagram.mermaid`

---

## 🛠️ Tech Stack

| Lớp | Công nghệ |
|-----|-----------|
| Backend | Node.js 18 + Express 4 |
| Database | Microsoft SQL Server 2019 |
| ORM/Driver | mssql (node-mssql) |
| Authentication | JWT (access + refresh token rotation) |
| File Upload | Multer |
| Security | Helmet, express-rate-limit, bcryptjs |
| Frontend | React 18 + React Router 6 |
| Styling | Tailwind CSS 3 |
| Icons | Heroicons v2 |
| HTTP Client | Axios |
| Notifications | React Toastify |
| Charts | Recharts |
| Date utils | date-fns |

---

## 📂 Uploads

Files được lưu tại `backend/uploads/`:
- `uploads/lessons/` - Tài liệu bài giảng
- `uploads/assignments/` - File đề bài
- `uploads/submissions/` - Bài nộp của học sinh
- `uploads/avatars/` - Ảnh đại diện

**Giới hạn file:** 50MB mỗi file

**Định dạng hỗ trợ:** PDF, Word, Excel, PowerPoint, MP4, MP3, ZIP, RAR, hình ảnh

---

## 🔧 Cấu hình nâng cao

### Biến môi trường Backend
```env
MAX_FILE_SIZE=52428800    # 50MB (bytes)
NODE_ENV=production
```

### Kết nối SQL Server với Windows Auth
```env
DB_USER=                  # Để trống
DB_PASSWORD=              # Để trống
DB_ENCRYPT=false
DB_TRUST_CERT=true
# Thêm trong database.js:
# options: { trustedConnection: true }
```

---

## 📝 Phát triển thêm (Roadmap)

- [ ] WebSocket cho thông báo real-time
- [ ] Tính năng kéo thả sắp xếp bài giảng
- [ ] Export báo cáo điểm Excel/PDF
- [ ] Thống kê biểu đồ chi tiết
- [ ] Email thông báo
- [ ] Calendar tích hợp lịch học
- [ ] Mobile app (React Native)
- [ ] Tích hợp video call (Jitsi/Zoom)

---

## 👥 Đóng góp

1. Fork repository
2. Tạo feature branch: `git checkout -b feature/ten-tinh-nang`
3. Commit: `git commit -m 'feat: thêm tính năng X'`
4. Push: `git push origin feature/ten-tinh-nang`
5. Tạo Pull Request

---

## 📄 License

MIT License - Xem file LICENSE để biết thêm chi tiết.
