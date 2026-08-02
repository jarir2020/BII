# বাঙালি ইসলামিক ইনস্টিটিউট (Bengali Islamic Institute — BII)

A full-stack web application for the Bengali Islamic Institute offering Islamic education, course enrollment, e-commerce (shop), and community features in Bengali.

## Stack

- **Frontend**: React 19 (CRA + CRACO), Tailwind CSS, Radix UI, React Router v7, port **5000**
- **Backend**: FastAPI (Python 3.12), Motor (async MongoDB), JWT auth, port **8000**
- **Database**: MongoDB Atlas (via `MONGODB_URL` secret)

## How to run

Both workflows are pre-configured:

| Workflow | Command |
|---|---|
| `Backend` | `cd backend && pip install -r requirements.txt -q && uvicorn server:app --host 0.0.0.0 --port 8000 --reload` |
| `Start application` | `cd frontend && yarn install --frozen-lockfile && PORT=5000 BROWSER=none yarn start` |

## Required secrets

| Secret | Description |
|---|---|
| `MONGODB_URL` | MongoDB Atlas connection string |
| `JWT_SECRET` | Long random string for JWT signing |

## Optional secrets / env vars (set in backend/.env or as Replit secrets)

- `DB_NAME` — MongoDB database name (default: `bii_db`)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` — seeded on first startup
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` — email/OTP delivery
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — Telegram notifications
- `APP_MIN_VERSION`, `APP_FORCE_UPDATE`, `APP_UPDATE_URL` — mobile app versioning

## Project structure

```
backend/
  server.py          # FastAPI app — all routes, models, auth
  requirements.txt
  uploads/           # User-uploaded images (served statically)
  tests/

frontend/
  src/
    pages/           # Route-level page components
    components/      # Shared UI components
    contexts/        # React context providers (Auth, Ads, Theme…)
    constants/       # API base URL, config
  craco.config.js    # Proxies /api → http://localhost:8000 in dev
```

## User preferences

- Keep the existing project structure and stack — do not migrate or restructure unless explicitly asked.
