# Attendance Calculator — Web Version

A personal attendance tracker, originally an Android app, now with a web
frontend and a Node.js/Express + MongoDB backend for account login and
cross-device syncing.

## Project structure

```
attendance-cal/
├── attendance-backend/     Node.js + Express + MongoDB API
│   ├── server.js
│   ├── routes/              auth.js, data.js, health.js
│   ├── models/               User.js, AttendanceData.js
│   ├── middleware/auth.js   JWT verification
│   ├── utils/mailer.js      Sends password-reset emails
│   ├── .env.example         Copy to .env and fill in your own values
│   └── README.md            Full backend setup instructions
│
└── attendance-frontend/    The web app itself (no build step)
    ├── index.html
    ├── style.css
    ├── script.js             Original app logic (2 small sync hooks added)
    ├── auth.js               Talks to the backend (login/register/sync)
    ├── account-ui.js         Wires the Account section in Settings
    ├── reset-password.html  Page opened from the password-reset email
    └── README-BACKEND-SETUP.md
```

Only the **backend** has dependencies to install. The **frontend** is plain
HTML/CSS/JS — no `npm install`, no build step.

## Quick start

### 1. Backend
```bash
cd attendance-backend
npm install
cp .env.example .env
# fill in .env — see checklist below
npm run dev
```
Runs on `http://localhost:5000` by default.

### 2. Frontend
```bash
cd attendance-frontend
npx serve .
```
Open the URL it gives you. Before it can talk to the backend, set the API
URL in **`auth.js`** and **`reset-password.html`**:
```js
var API_BASE_URL = "http://localhost:5000/api"; // change once deployed
```

## `.env` checklist (backend)

| Variable | What it is | Where to get it |
|---|---|---|
| `PORT` | Port the server listens on | Default `5000` is fine |
| `NODE_ENV` | `development` locally, `production` when deployed | — |
| `MONGO_URI` | MongoDB connection string | [MongoDB Atlas](https://www.mongodb.com/atlas) → Connect → Drivers |
| `JWT_SECRET` | Long random string used to sign login sessions | Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | How long a login session lasts | Default `30d` is fine |
| `EMAIL_USER` | Your Gmail address | The Gmail account sending reset emails |
| `EMAIL_PASS` | A 16-character **App Password** (not your real Gmail password) | [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) — requires 2-Step Verification. Remove the spaces when pasting it in. |
| `EMAIL_FROM` | Display name + your Gmail address | e.g. `"Attendance Calculator <youraddress@gmail.com>"` |
| `FRONTEND_URL` | Where the frontend is hosted | Used to build the link inside reset emails |
| `ALLOWED_ORIGINS` | Frontend URL(s) allowed to call this API (CORS) | Comma-separated, no spaces, no trailing slash — e.g. `http://localhost:3000,https://your-frontend.vercel.app` |

## Deployment

1. **Backend** → any Node host (Render, Railway, Fly.io, a VPS). Set the same
   env vars there as in your local `.env`, start command `npm start`.
2. **Frontend** → any static host (Vercel, Netlify, GitHub Pages) or served
   from the same VPS.
3. Once both are live, update:
   - `API_BASE_URL` in `auth.js` and `reset-password.html` → your live backend URL
   - `FRONTEND_URL` and `ALLOWED_ORIGINS` in the backend's `.env` → your live frontend URL

## Health check / uptime monitoring

The backend exposes a public, no-auth health route:
```
GET /api/health
```
Add this URL as an HTTP(s) monitor in [UptimeRobot](https://uptimerobot.com)
(or any uptime service):
```
https://your-backend-url.com/api/health
```
This is also useful for free hosts (like Render's free tier) that spin down
after inactivity — regular pings keep the server awake.

## How login + sync works

- **Not logged in:** app works exactly as before, data stays in `localStorage` only.
- **Register:** creates an account and pushes the device's current data to the server.
- **Login:** pulls the account's saved data from the server, overwriting what's on this device.
- **While logged in:** every change auto-saves to the server ~1 second after you stop editing.
- **Logout:** just clears the local session — data isn't deleted anywhere.
- **Forgot password:** emails a reset link (from your Gmail) valid for 1 hour, linking to `reset-password.html`.

## API reference

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create account, returns a JWT |
| POST | `/api/auth/login` | No | Log in, returns a JWT |
| POST | `/api/auth/forgot-password` | No | Emails a password-reset link |
| POST | `/api/auth/reset-password/:token` | No | Sets a new password |
| GET | `/api/auth/me` | Yes | Returns the logged-in user |
| GET | `/api/data` | Yes | Fetch this user's saved attendance data |
| PUT | `/api/data` | Yes | Overwrite this user's saved attendance data |
| GET | `/api/health` | No | Health check for uptime monitors |

Authenticated routes require `Authorization: Bearer <token>`.


## Common gotchas

- `npm install` only applies inside **`attendance-backend/`** — the frontend
  has no `package.json` and needs no install step.
- If login/sync silently doesn't work, double-check `API_BASE_URL` in
  `auth.js` matches your backend's actual URL, and that the frontend's
  origin is listed in the backend's `ALLOWED_ORIGINS`.
- The Gmail App Password is shown with spaces (`abcd efgh ijkl mnop`) —
  strip the spaces before pasting into `.env`.
