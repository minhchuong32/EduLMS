# LMS Deploy Guide (Frontend Vercel + Backend Vercel + Supabase Postgres)

Tai lieu nay tong hop toan bo cac buoc da lam de deploy project LMS.

## 1) Tong quan kien truc

- Frontend: Vercel (React)
- Backend: Vercel (Node/Express serverless)
- Database: Supabase PostgreSQL

## 2) Cac thay doi code quan trong da refactor

### Backend DB SQL Server -> PostgreSQL

- `backend/package.json`
  - bo `mssql`
  - them `pg`
- `backend/src/config/database.js`
  - dung `Pool` cua `pg`
  - ket noi qua `DATABASE_URL`
  - ho tro query tham so kieu `@param`
  - giu return shape `recordset` de khong vo controller
  - them mapping key lowercase cua Postgres -> camelCase cu (`passwordHash`, `fullName`, ...)
- `backend/src/config/migrate.js`
  - migrate schema cho PostgreSQL (`uuid`, `boolean`, `timestamptz`)
- `backend/src/config/seed.js`
  - bo cu phap SQL Server (`GETDATE`, `IF NOT EXISTS`)
  - dung `NOW()` va `ON CONFLICT`

### Controller da sua cu phap SQL Server

- bo: `OUTPUT INSERTED`, `TOP`, `GETDATE()`, `FOR JSON PATH`, `N'...'`
- doi sang Postgres: `RETURNING`, `LIMIT`, `NOW()`, `json_agg/json_build_object`
- transaction cua `mssql` da doi sang helper `withTransaction()`

### Chay duoc tren Vercel serverless

- tao `backend/src/app.js` (Express app)
- `backend/src/server.js` chi dung cho local/docker
- tao `backend/api/index.js` cho Vercel entrypoint
- tao `backend/vercel.json` de route vao `api/index.js`
- sua upload middleware:
  - local: luu `backend/uploads`
  - Vercel: luu tam vao `/tmp/uploads` (ephemeral)

## 3) Deploy Supabase PostgreSQL

1. Vao Supabase -> New project
2. Vao **Connect** -> copy connection string
3. Khuyen dung **Connection Pooling (port 6543)** cho Vercel serverless
4. URL nen co `?sslmode=require`

Vi du:

`postgresql://postgres.<project-ref>:<password>@<pooler-host>:6543/postgres?sslmode=require`

## 4) Deploy Backend len Vercel

1. Import repo vao Vercel
2. Chon **Root Directory = `backend`**
3. Framework: Other
4. Deploy

### Environment Variables cho Backend Vercel

- `DATABASE_URL` = Supabase URL (pooler)
- `PG_SSL` = `true`
- `PG_POOL_MAX` = `1`
- `JWT_SECRET` = chuoi bi mat dai
- `JWT_REFRESH_SECRET` = chuoi bi mat dai
- `FRONTEND_URLS` = `https://edu-lms-sable.vercel.app`
- (optional) `NODE_ENV` = `production`

Sau khi set env -> Redeploy backend.

## 5) Chay migrate + seed vao Supabase

Chay local (PowerShell):

```powershell
Set-Location "G:\code\TLCN\lms-project\backend"
$env:DATABASE_URL="PASTE_SUPABASE_DATABASE_URL"
$env:PG_SSL="true"
node src/config/migrate.js
node src/config/seed.js
```

## 6) Frontend Vercel tro vao backend moi

Trong project frontend (Vercel), set:

- `REACT_APP_API_URL=https://edulms-backend-self.vercel.app/api`

Sau do redeploy frontend.

## 7) Kiem tra sau deploy

- Backend health:
  - `https://edulms-backend-self.vercel.app/api/health`
- Login API:
  - `POST /api/auth/login`
- Frontend login:
  - truy cap site Vercel frontend va dang nhap

Luu y:

- `GET /` hoac `GET /api` -> co the 404 la binh thuong
- route API chinh nam o `/api/...`

## 8) Loi thuong gap va cach xu ly

### A. `FUNCTION_INVOCATION_FAILED` / crash

- thuong do thieu env (`DATABASE_URL`, JWT secrets)
- vao Vercel logs de xem stack trace

### B. `ENOENT ... mkdir`

- do Vercel filesystem khong phai o dia thuong
- da sua middleware de dung `/tmp/uploads`

### C. `getaddrinfo ENOTFOUND db....supabase.co`

- sai host trong `DATABASE_URL`
- copy lai dung tu Supabase Connect (uu tien pooler)

### D. `Illegal arguments: string, undefined` trong bcrypt

- do key Postgres lowercase (`passwordhash`) khong khop key cu (`passwordHash`)
- da them key mapping o `database.js`

### E. `relation "users" does not exist`

- do khac biet quoted/unquoted table names
- migrate da duoc cap nhat de tao bang theo identifier khong quote, tuong thich query hien tai

## 9) Gioi han hien tai

- Upload file tren Vercel hien luu tam `/tmp` (khong ben vung)
- de production tot hon, can chuyen upload sang **Supabase Storage** (hoac S3)

## 10) Lenh nhanh tham khao

### Local docker

```powershell
Set-Location "G:\code\TLCN\lms-project"
docker compose up -d --build postgres backend
docker compose exec backend node src/config/migrate.js
docker compose exec backend node src/config/seed.js
```

### Test health local

```powershell
curl http://localhost:5000/api/health
```

