# Attendance Calculator — Backend

Express + MongoDB backend for the Attendance Calculator web app.

## What it does
- Email/password register & login (JWT-based sessions)
- Per-user data sync (schedule, records, extras, start date) to MongoDB
- Forgot-password flow via email (Gmail SMTP)
- `/api/health` route for UptimeRobot or any uptime monitor


## 1. Install dependencies
```bash
cd backend
npm install
```

## 2. Set up MongoDB
1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user (username + password) under **Database Access**.
3. Under **Network Access**, allow access from anywhere (`0.0.0.0/0`) — or
   your specific hosting provider's IPs.
4. Copy the connection string from **Connect > Drivers**.

## 3. Set up Gmail for password-reset emails
1. Turn on 2-Step Verification on the Gmail account you'll send from:
   https://myaccount.google.com/security
2. Create an App Password: https://myaccount.google.com/apppasswords
   (choose "Mail" / "Other", and copy the 16-character password it gives you)
3. You'll use the Gmail address as `EMAIL_USER` and the app password as
   `EMAIL_PASS` — **not** your normal Gmail login password.

## 4. Configure environment variables
```bash
cp .env.example .env
```
Fill in `.env` with:
- `MONGO_URI` — your MongoDB Atlas connection string
- `JWT_SECRET` — any long random string (generate with the command in the file)
- `EMAIL_USER` / `EMAIL_PASS` / `EMAIL_FROM` — your Gmail + app password
- `FRONTEND_URL` — where your frontend is hosted (used to build reset links)
- `ALLOWED_ORIGINS` — your frontend's URL(s), comma-separated

## 5. Run locally
```bash
npm run dev     # with nodemon (auto-restart)
# or
npm start
```
Server runs on `http://localhost:5000` by default.

## 6. Deploy
Any Node host works (Render, Railway, Fly.io, a VPS, etc.). General steps:
1. Push this folder to a Git repo (or deploy directly).
2. Set the same environment variables from `.env` in your host's dashboard.
3. Set the start command to `npm start`.
4. Once deployed, note your backend's public URL — you'll need it for the
   frontend (`API_BASE_URL` in `auth.js` and `reset-password.html`).

## 7. Point UptimeRobot at the health check
Add a new HTTP(s) monitor in UptimeRobot pointing at:
```
https://your-backend-url.com/api/health
```
It returns `200 OK` with a small JSON payload as long as the server is running
(this does **not** check the MongoDB connection — it just confirms the process
is alive and responding).

## API summary
| Method | Route                          | Auth | Description |
|--------|--------------------------------|------|--------------|
| POST   | `/api/auth/register`           | No   | Create account, returns JWT |
| POST   | `/api/auth/login`               | No   | Log in, returns JWT |
| POST   | `/api/auth/forgot-password`     | No   | Emails a reset link (valid 1 hour) |
| POST   | `/api/auth/reset-password/:token` | No | Sets a new password |
| GET    | `/api/auth/me`                  | Yes  | Returns the logged-in user |
| GET    | `/api/data`                     | Yes  | Returns the user's saved attendance data |
| PUT    | `/api/data`                     | Yes  | Overwrites the user's saved attendance data |
| GET    | `/api/health`                   | No   | Health check for uptime monitors |

Authenticated routes expect `Authorization: Bearer <token>`.
