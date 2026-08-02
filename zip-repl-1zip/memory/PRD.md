# বাঙালি ইসলামিক ইনস্টিটিউট — PRD

## Original Problem Statement
ইসলামিক শিক্ষা প্রতিষ্ঠানের ওয়েবসাইট — হোম পেজে প্রতিষ্ঠানের নাম, ছাত্রের প্রোফাইল ছবি ও Student ID, এবং আইকনসহ মেনু (আমাদের কোর্সসমূহ, আমার কোর্স, লাইভ ক্লাস, ক্লাসের ভিডিও, মাসিক কুইজ, অনলাইন শপ, নোটিফিকেশন, যোগাযোগ, অভিযোগ/প্রশ্ন)। তিন-দাগ সাইডবার (হোম, প্রোফাইল, সেটিংস, পাসওয়ার্ড পরিবর্তন, রেজিস্ট্রেশন, লগইন, লগআউট)। প্রোফাইল পেজে ছবি/নাম/Student ID/মোবাইল/ইমেইল/ঠিকানা/কোর্স এডিট। হোমপেজে পোস্ট ক্লিক → কোর্স ডিটেলস → পেমেন্ট → success → অটো-এনরোলড "আমার কোর্স"-এ। লাইভ ক্লাস Zoom। অনলাইন শপ পরবর্তীতে। বাংলা + ইংরেজি টগল। লোগো ও ইসলামিক ডিজাইন।

## User Choices
- Auth: Email/Password JWT
- Admin Panel: full CMS (courses with free/paid price, videos via YouTube URL, posts, live class Zoom, notifications, settings, users)
- Payments: bKash/Nagad — placeholder for now (simulated success)
- Language: Bengali primary + English toggle
- Design: Islamic luxury — Deep Emerald (#0A422B) + Antique Gold (#D4AF37) on Cream (#F9F6F0); Tiro Bangla + Hind Siliguri fonts

## Architecture
- **Backend**: FastAPI + MongoDB (motor). JWT via PyJWT (HS256), bcrypt password hashing, httpOnly cookie + Bearer fallback. All routes under `/api`. Admin seeded on startup; sample courses/posts/notification seeded if empty. Sequential `student_id` (YYYY+4 digits) via counters collection.
- **Frontend**: React 19 + react-router-dom v7 + axios + framer-motion + @phosphor-icons/react + Tailwind + shadcn/ui. AuthContext + LangContext. Layout w/ animated sidebar drawer. Mobile-first.

## Implemented (June 26, 2026)
### Backend
- Auth: register, login, logout, me, change-password, profile update
- Auto Student ID generation (e.g. 20260001)
- Admin seed + role enforcement (403 for non-admins)
- Full CRUD: courses (with is_free + price), videos, posts, live-classes, notifications, quizzes
- Enrollment: `/api/courses/{id}/enroll` (mock payment success → auto-add)
- Public: settings (with defaults merge), contact submission
- Authenticated: complaints, file upload (`POST /api/upload`) + retrieval (`GET /api/files/{id}`) via Emergent object storage
- Admin: users list, settings update, contact/complaints viewing
- Settings now include: contact_phone, contact_mobile, whatsapp, contact_email, address, facebook, youtube
- Mongo indexes on email + id fields

### Frontend
- **Welcome / Landing page** (`/`): hero with mosque background, institute name, About section with 6 feature cards (Quran, Arabic, Fiqh, Live Class, Quiz, Akhlaq), "How to begin" 3-step section, CTA strip, contact info preview. Auto-redirects logged-in users to `/home`.
- **Layout**: emerald header w/ custom SVG BrandLogo, hamburger sidebar drawer, language toggle, notification icon
- **Home (`/home`)**: protected dashboard with emerald profile banner (avatar + Student ID), 9-card grid menu, recent posts feed
- **Auth**: Login + Register pages (auto-creates Student ID, lands on `/home`)
- **Profile**: editable info card with profile photo upload, change password
- **Courses**: list, details, free vs paid enrollment
- **Payment**: bKash/Nagad simulated → success → auto-enroll
- **Videos**: YouTube auto-embed modal player
- **Live Classes**: Zoom link launcher
- **Contact**: clickable mobile / WhatsApp (wa.me) / email / phone / address cards
- **Quiz / Notifications / Shop / Complaint**: dedicated pages
- **Admin panel**: dashboard, courses CRUD (free/paid toggle + image upload), videos CRUD (YouTube URL + thumbnail upload), posts CRUD (linked to course + CTA + image upload), live-classes, notifications, users list, institute settings (name, tagline, mobile, WhatsApp, phone, email, address, FB, YouTube)
- **ImageUpload component**: reusable widget — admin/student can upload images directly (no URL typing). Files stored via Emergent object storage and served via `/api/files/{id}`.
- Bengali + English full i18n dictionary

### Testing
- Iteration 1: 18/18 backend + 11/11 frontend e2e passed
- Iteration 2: 26/26 backend + all frontend critical flows passed (Welcome + image upload)
- Mocked: payment (clearly labeled DEMO)

## Test Credentials
See `/app/memory/test_credentials.md` — `admin@bii.edu / Admin@123`

## P0 Backlog (next iterations)
- Real bKash + Nagad payment integration (when keys provided)
- Direct video file upload (object storage)
- Online Shop products + checkout

## P1 Backlog
- Quiz taking + scoring + monthly leaderboard
- Push notifications (web/FCM)
- Course progress tracking + certificates
- Admin: view complaints inline, mark resolved

## P2 / Polish
- Brute-force lockout on login (5 attempts → 15 min)
- Split server.py into routers/models/services
- Posts/videos/etc. delete should return 404 on missing id
- Email verification on register, password reset email
