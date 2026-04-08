# Deployment Checklist - EduLMS

Phương án khuyến nghị cho đồ án/tốt nghiệp:

- Frontend: Vercel
- Backend: VPS chạy Docker
- Database: SQL Server chạy trong Docker trên cùng VPS, hoặc dịch vụ SQL Server riêng nếu cần scale sau này
- File upload: volume Docker trên VPS, không lưu trên Vercel

## 1) Chuẩn bị trước khi deploy

- [ ] Chạy project local ổn định ở cả frontend và backend.
- [ ] Kiểm tra đăng nhập, refresh token, tạo bài giảng, tạo bài tập, nộp bài và upload file.
- [ ] Có tài khoản GitHub để đẩy source code.
- [ ] Có tài khoản Vercel.
- [ ] Có một VPS Ubuntu/Debian với public IP và quyền root/sudo.
- [ ] Có domain riêng nếu muốn demo đẹp hơn, ví dụ `lms.yourdomain.com`.

## 2) Chuẩn bị backend để chạy trên VPS bằng Docker

- [ ] SSH vào VPS.
- [ ] Cài Docker và Docker Compose.
- [ ] Tạo thư mục deploy, ví dụ `/opt/lms-project`.
- [ ] Clone source code từ GitHub vào VPS.
- [ ] Tạo file môi trường production cho backend theo mẫu `backend/.env.example`.
- [ ] Đặt mật khẩu SQL Server đủ mạnh.
- [ ] Đặt `NODE_ENV=production`.
- [ ] Đặt `FRONTEND_URLS` là domain Vercel sau khi frontend deploy xong.

### Chạy backend + SQL Server

Sử dụng `docker-compose.yml` ở root project để chạy:

- [ ] SQL Server container.
- [ ] Backend container.
- [ ] Volume cho thư mục upload.

Lưu ý:

- `DB_SERVER` trong backend nên là `sqlserver` nếu backend và SQL Server chạy chung trong `docker-compose`.
- Không nên expose SQL Server ra Internet nếu không bắt buộc.
- Nên chỉ mở port `5000` cho backend và dùng reverse proxy nếu cần HTTPS riêng trên VPS.

### Kiểm tra backend

- [ ] Gọi `GET /api/health` để xác nhận backend sống.
- [ ] Đăng nhập thử để kiểm tra JWT.
- [ ] Kiểm tra upload file vào thư mục volume.
- [ ] Kiểm tra CORS với domain frontend.

## 3) Deploy frontend lên Vercel

- [ ] Push code lên GitHub.
- [ ] Import repository vào Vercel.
- [ ] Chọn thư mục gốc là `frontend`.
- [ ] Build command: `npm run build`.
- [ ] Output directory: `build`.
- [ ] Thêm biến môi trường `REACT_APP_API_URL` trỏ tới backend production, ví dụ `https://api.yourdomain.com/api`.
- [ ] Deploy.

### Cấu hình SPA route

Frontend đã có file `frontend/vercel.json` với rewrite về `index.html`, nên route như `/login`, `/courses/123` sẽ hoạt động đúng.

## 4) Đồng bộ domain giữa frontend và backend

- [ ] Lấy domain Vercel của frontend.
- [ ] Cập nhật `FRONTEND_URLS` trong backend để cho phép origin đó.
- [ ] Redeploy backend sau khi đổi env.

Ví dụ:

- `FRONTEND_URLS=https://edu-lms.vercel.app`
- Nếu có preview deployment, thêm cả domain preview nếu cần test.

## 5) Kiểm tra sau khi deploy

- [ ] Mở frontend trên Vercel.
- [ ] Đăng nhập bằng tài khoản thật.
- [ ] Xem dashboard, lớp học, môn học, bài giảng, bài tập.
- [ ] Thử tạo dữ liệu mới nếu role cho phép.
- [ ] Thử upload file bài giảng hoặc bài nộp.
- [ ] Kiểm tra logout và refresh token.
- [ ] Mở DevTools để xác nhận request API không bị lỗi CORS hoặc 401 bất thường.

## 6) Checklist nộp bài và bảo vệ

- [ ] Chuẩn bị link frontend public.
- [ ] Chuẩn bị link API health để demo.
- [ ] Chuẩn bị tài khoản demo cho từng vai trò: admin, teacher, student.
- [ ] Có dữ liệu mẫu trong database.
- [ ] Có sẵn ảnh chụp kiến trúc deployment để đưa vào báo cáo.

## 7) Cấu hình tối thiểu cần điền

### Frontend

- `REACT_APP_API_URL=https://your-backend-domain/api`

### Backend

- `PORT=5000`
- `NODE_ENV=production`
- `DB_SERVER=sqlserver`
- `DB_PORT=1433`
- `DB_NAME=LMS_DB`
- `DB_USER=sa`
- `DB_PASSWORD=your_strong_password`
- `DB_ENCRYPT=false`
- `DB_TRUST_CERT=true`
- `JWT_SECRET=your_secret`
- `JWT_REFRESH_SECRET=your_refresh_secret`
- `FRONTEND_URLS=https://your-frontend.vercel.app`

## 8) Nếu bạn muốn triển khai an toàn hơn

- [ ] Thêm reverse proxy Nginx trên VPS.
- [ ] Bật HTTPS bằng Let’s Encrypt.
- [ ] Chuyển upload file sang object storage nếu dung lượng lớn.
- [ ] Sao lưu database SQL Server định kỳ.
