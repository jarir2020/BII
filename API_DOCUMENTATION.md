# BII API Documentation — Bengali Islamic Institute

> Live backend: `https://bengaliislamicinstitute.com/api`
> Status: deployed & verified (2026-08-03). `/api/health` → `200 {"status":"ok","version":"1.0.0"}`
> This doc is the developer reference for building the frontend / Android app against the deployed backend.

---

## 1. Conventions

### Base URL
```
https://bengaliislamicinstitute.com/api
```

### Response format
- All responses are **JSON**.
- **Successful** endpoints return either a bare object/array, or `{"ok": true, ...}` for mutations (varies by controller — see each endpoint).
- **Errors** use FastAPI style:
  ```json
  { "detail": "message" }
  ```
  with the appropriate HTTP status (`400` bad request, `401` unauthenticated, `403` forbidden, `404` not found, `429` rate-limited).

### Authentication (JWT)
- **Login** returns `{ "user": {...}, "token": "<JWT>" }`.
- For authenticated requests, send:
  ```
  Authorization: Bearer <token>
  ```
- The backend also sets an `httpOnly` cookie named `access_token` on login (SameSite=None, Secure). Either the `Bearer` header or the cookie works.
- **Roles:** `super_admin`, `admin`, `teacher`, `student` (typical). `requireAdmin()` = `super_admin` or `admin`; `requireSuperAdmin()` = `super_admin` only.

### CORS
- Allowed origins (production `.env`): `https://bengaliislamicinstitute.com`, `http://localhost:3000`, `http://localhost:8000`, `http://127.0.0.1:3000`, `http://127.0.0.1:8000`.
- The backend echoes the matching `Access-Control-Allow-Origin` and sets `Access-Control-Allow-Credentials: true`, methods `GET, POST, PUT, PATCH, DELETE, OPTIONS`, headers `Authorization, Content-Type, X-Requested-With`.
- Preflight (`OPTIONS`) is handled automatically.

### IDs & timestamps
- All `id` fields are UUID strings (36 chars).
- `created_at` / `updated_at` / `expires_at` are ISO-8601 strings (e.g. `2026-08-03T18:07:01Z`).
- `price` / amounts are decimal (string) values in BDT (৳).

---

## 2. Health & meta

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | no | `{"status":"ok","version":"1.0.0","timestamp":...}` |
| GET | `/` (`api/`) | no | API index/default |

---

## 3. Auth & Users

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | no | Create account. Body: `{name, email, phone, password, ...}` |
| POST | `/auth/login` | no | Body: `{email, password}` → `{user, token}` |
| POST | `/auth/logout` | yes | Clears auth cookie. |
| POST | `/auth/forgot-password` | no | Body: `{email}` → sends 6-digit OTP by email (record in `password_resets`, 15-min expiry). Always returns `{"ok":true,"message":"..."}` regardless of whether the email exists. |
| POST | `/auth/reset-password` | no | Body: `{email, otp, new_password}` (≥6 chars). Verifies the `password_resets` row. |
| GET | `/auth/me` | yes | Current user. |
| POST | `/auth/change-password` | yes | Body: `{old_password, new_password}`. |
| GET | `/users/me` | yes | Current user (same as `/auth/me`). |

`user` object keys: `id, name, email, phone, role, student_id, profile_photo, address, bio, specialization, permissions, created_at, updated_at`.

---

## 4. Courses & Content

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/courses` | no | List courses (public). |
| GET | `/courses/<id>` | no | Single course. |
| GET | `/courses/<cid>/content` | yes | Course content (lessons). |
| GET | `/courses/<cid>/enroll` | — | Enroll (see controller for method). |
| GET | `/my-courses` | yes | Current user's courses. |
| GET | `/videos` | no | List videos. |
| GET | `/posts` | no | List posts. |
| GET | `/posts/<id>` | no | Single post. |
| GET | `/live-classes` | no | List live classes. |
| GET | `/my-live-classes` | yes | Current user's live classes. |

`course` object keys: `id, title_bn, title_en, description_bn, description_en, price, is_free, cover_image, instructor, duration, created_at, updated_at`.

---

## 5. Quizzes & Monthly Quizzes

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/quizzes` | no | List quizzes. |
| GET | `/quizzes/<id>` | no | Single quiz. |
| GET | `/monthly-quizzes` | no | List monthly quizzes. |
| GET | `/monthly-quizzes/<id>` | no | Single monthly quiz. |
| GET | `/monthly-quizzes/<mid>/start` | yes | Start a session (creates `quiz_sessions`). |
| GET | `/monthly-quizzes/<mid>/submit` | yes | Submit answers (creates `monthly_quiz_submissions`). |
| GET | `/monthly-quizzes/<mid>/leaderboard` | no | Leaderboard. |
| GET | `/monthly-quizzes/<mid>/my-result` | yes | Current user's result. |
| GET | `/monthly-quizzes/<mid>/results` | no | All results. |
| GET | `/monthly-quizzes/<mid>/winners` | no | Winners. |
| GET | `/monthly-quizzes/<mid>/participants/<uid>/shipping` | yes | Shipping info for a participant. |
| GET | `/my-quiz-results` | yes | Current user's quiz results. |

---

## 6. Duas & Library

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/dua-categories` | no | List dua categories. |
| GET | `/dua-categories/<id>` | no | Single dua category. |
| GET | `/duas/<did>/view` | no | View a dua. |
| GET | `/duas/<did>/favorite` | yes | Toggle favorite. |
| GET | `/duas/<did>/is-favorite` | yes | Check favorite. |
| GET | `/library/categories` | no | Library categories. |

---

## 7. Commerce / Shop / Payments

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/shop/place-order` | yes | Create an order. Body: `{product_id / items, amount, payment_method, ...}`. |
| GET | `/shop/my-orders` | yes | Current user's orders. |
| GET | `/my-payment-requests` | yes | Current user's payment requests. |
| POST | `/payments/submit` | yes | Submit a payment request (bank/bKash/… with transaction id). |
| GET | `/payments/requests` | **admin** | List all payment requests. |
| GET | `/payments/requests/<pid>/approve` | **admin** | Approve a request (enrolls user). |
| GET | `/payments/requests/<pid>/reject` | **admin** | Reject a request. |
| GET | `/payments/requests/<pid>/quick-approve` | no (HMAC link) | One-click approve (HTML page) via `?token=` HMAC. |
| GET | `/payments/requests/<pid>/quick-reject` | no (HMAC link) | One-click reject (HTML page) via `?token=`. |
| GET/POST | `/payments/sslcommerz/<action>` | — | SSLCommerz: `init`, `ipn`, `success`, `fail`, `cancel`. |
| GET | `/promo-codes` | no | List promo codes. |
| PUT | `/admin/promo-codes/<id>` | **admin** | Update a promo code. |
| GET/POST | `/admin/promo-codes` | **admin** | List / create promo codes. |

**Payment flow:** student submits a payment request → admin gets a **Telegram** alert (with Approve/Reject buttons) → admin approves in-app or via Telegram → student is enrolled and notified.

---

## 8. Rewards / Watch-Ad

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/rewards/balance` | yes | `{"coins": N}` — current coin balance. |
| GET | `/rewards/daily-stats` | yes | Today's earned/limit stats. |
| GET | `/rewards/watch-ad` | yes | Credit coins for watching an ad (rate-limited). |
| GET | `/rewards/redeem` | yes | Redeem coins. |
| GET | `/rewards/cashout` | yes | Request a cashout. |
| GET | `/rewards/cashout-history` | yes | Cashout history. |
| GET | `/rewards/history` | yes | Rewards history. |
| GET | `/rewards/leaderboard` | no | Leaderboard. |
| GET | `/rewards/my-promo-codes` | yes | User's promo codes. |
| GET | `/rewards/ads` | no | Reward ads (custom uploaded ads). |

**Admin rewards:**
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/reward-settings` | **admin** | Reward settings. |
| GET | `/admin/reward-ads` | **admin** | List reward ads. |
| GET | `/admin/reward-ads/<id>` | **admin** | Update a reward ad. |
| GET | `/admin/reward-zone/give-promo` | **admin** | Give promo code to a user. |
| GET | `/admin/cashout-requests` | **admin** | List cashout requests. |
| GET | `/admin/cashout-requests/<id>/approve` | **admin** | Approve cashout. |
| GET | `/admin/cashout-requests/<id>/reject` | **admin** | Reject cashout. |

---

## 9. Subscriptions

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/subscription-plans` | no | List plans. |
| GET | `/subscription-plans/<id>` | no | Single plan. |
| GET | `/my-subscription` | yes | Current user's subscription. |
| GET | `/admin/subscription-plans` | **admin** | List / create plans. |
| GET | `/admin/subscriptions` | **admin** | List all subscriptions. |
| GET | `/admin/revenue-stats` | **admin** | Revenue stats. |

---

## 10. Notifications / Push / Contact

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | yes | List current user's notifications. |
| GET | `/notifications/<id>` | yes | Delete a notification. |
| POST | `/notifications/register-device` | yes | Body: `{token, platform}` → stores FCM token in `device_tokens`. |
| POST | `/notifications/unregister-device` | yes | Body: `{token}` → removes the device. |
| GET | `/contact` | no | Contact form (or POST). |
| GET/POST | `/push-notifications` | **admin** | List / create push notification. Sends via FCM. |
| GET | `/push-notifications/<id>` | **admin** | Delete a push notification. |

> ⚠️ **FCM note:** the backend's FCM send uses the legacy `server_key` field. The current Firebase config in the DB holds a `service_account_json` (no `server_key`), so pushes won't deliver until a `server_key` is added to the `firebase` config **or** the send is upgraded to FCM v1. See Android plan §Phase 2.

---

## 11. Admin / Teachers / Misc

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/teachers` | no | List teachers. |
| GET | `/teachers/<id>` | no | Single teacher. |
| GET | `/admins/<id>` | **super_admin** | Delete an admin. |
| GET | `/admin/maintenance` | **admin** | App-lock / maintenance toggle. |
| GET | `/complaints/<id>/resolve` | **admin** | Resolve a complaint. |
| GET | `/admin/analytics` | **admin** | Analytics (AnalyticsController). |
| GET | `/admin/activity-logs` | **admin** | Activity logs. |
| GET | `/admin/upload` | **admin** | File upload (UploadController). |
| GET | `/admin/backup/export` | **admin** | Backup/export data. |
| GET | `/configs/<name>` | varies | Read a config doc. Sensitive (`firebase`, `security`, `payment_gateways`) require admin. |
| PUT | `/configs/<name>` | **admin** | Write a config doc. |
| GET | `/settings` | no | Public site settings (contact, bKash numbers, SMTP, etc.). |

---

## 12. Generic CRUD resources

These follow `GET /api/<resource>` (list) and `GET /api/<resource>/<id>` (single). Auth required for most.

```
course_categories  chapters   lessons      pdfs        assignments
exams              results    certificates  recorded_classes
hadiths            islamic_content  blogs    banners    sliders
gallery            downloads  winner_reviews
```

(Products may be exposed via this generic layer — a dedicated public product listing route does not currently exist; ordering goes through `/shop/place-order`.)

---

## 13. Telegram Webhook

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/telegram/webhook` | secret token | Receives Telegram update. Responds to `/start` and Approve/Reject button callbacks. Registered on `@BangaliIslamicInstituteBot`. |

---

## 14. Error codes

| Code | Meaning | Typical cause |
|---|---|---|
| 400 | Bad request | Missing/invalid field (`{"detail": "..."}`) |
| 401 | Unauthenticated | Missing/invalid JWT |
| 403 | Forbidden | Non-admin calling admin endpoint |
| 404 | Not found | Unknown resource/ID |
| 429 | Too many requests | Rate limit (e.g. payments, watch-ad, login attempts) |

---

## 15. Verified smoke test (post-deploy, 2026-08-03)

All returned `200`:
- Public: `/health`, `/courses`, `/subscription-plans`, `/dua-categories`, `/library/categories`, `/videos`
- Authenticated (admin token): `/auth/me`, `/users/me`, `/my-courses`, `/payments/requests`, `/subscriptions/my`, `/notifications`, `/teachers`, `/rewards/balance`, `/rewards/leaderboard`, `/rewards/ads`, `/payments/my-requests`, `/shop/my-orders`, `/my-live-classes`, `/my-quiz-results`, `/dua-categories`

> Note: `/api/live-classes` requires auth; `/api/rewards/me` and `/api/shop/products` do **not** exist (correct paths are listed above).

---

## 16. Build / deploy workflow (backend-first)

1. Backend lives in `zip-repl-1zip/Backend` (Yii2, PHP 8.1, `composer`).
2. Deploy is manual via GitHub Actions: `gh workflow run deploy.yml` (or the Actions tab) → builds backend + frontend → FTP uploads merged `public_html`.
3. After deploy, verify: `curl https://bengaliislamicinstitute.com/api/health`.
4. Then build the frontend/Android against the live backend (`REACT_APP_BACKEND_URL=https://bengaliislamicinstitute.com`).
