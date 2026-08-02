from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import asyncio
import logging
import uuid
import hmac
import hashlib
import bcrypt
import jwt
import random
import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated

import re
from fastapi import FastAPI, APIRouter, BackgroundTasks, HTTPException, Depends, Request, Response, status, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ──────────────────────────────────────────────────────────────
# MongoDB
# ──────────────────────────────────────────────────────────────
mongo_url = os.environ.get("MONGODB_URL") or os.environ.get("MONGO_URL") or ""
if not mongo_url:
    raise RuntimeError("MONGODB_URL (or MONGO_URL) environment variable is not set")
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get("DB_NAME", "bii_db")]

JWT_ALGO = "HS256"


def get_jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        raise RuntimeError(
            "JWT_SECRET environment variable is not set. "
            "Set it to a long random string before starting the server."
        )
    return secret


# ──────────────────────────────────────────────────────────────
# Local File Storage
# ──────────────────────────────────────────────────────────────
APP_NAME    = os.environ.get("APP_NAME", "bii")
APP_VERSION = os.environ.get("APP_VERSION", "1.0.0")
UPLOAD_DIR  = ROOT_DIR / "uploads"

# ── Payment submit rate limiting (in-memory, resets on restart) ───────────────
_payment_rate: dict[str, list] = {}

def _check_payment_rate(user_id: str) -> None:
    """Allow max 5 payment submissions per user per hour."""
    now = datetime.now(timezone.utc).timestamp()
    hist = _payment_rate.get(user_id, [])
    hist = [t for t in hist if now - t < 3600]
    if len(hist) >= 5:
        raise HTTPException(
            status_code=429,
            detail="অনেক বেশি পেমেন্ট রিকোয়েস্ট করা হয়েছে। ১ ঘণ্টা পরে আবার চেষ্টা করুন।",
        )
    hist.append(now)
    _payment_rate[user_id] = hist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MIME = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "svg": "image/svg+xml",
    "pdf": "application/pdf",
}


def init_storage():
    """No-op — kept for startup compatibility."""
    pass


def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Save file to local uploads directory as cache. Primary storage is MongoDB."""
    filename = Path(path).name
    dest = UPLOAD_DIR / filename
    try:
        dest.write_bytes(data)
    except Exception:
        pass  # local cache failure is non-fatal; MongoDB is the source of truth
    return {"path": path, "size": len(data)}


def get_object(path: str):
    """Read file — try local disk first (fast), fall back handled by caller."""
    filename = Path(path).name
    dest = UPLOAD_DIR / filename
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    content_type = MIME.get(ext, "application/octet-stream")
    if dest.exists():
        return dest.read_bytes(), content_type
    return None, content_type  # caller must try MongoDB


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGO)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


async def next_student_id() -> str:
    """Generate sequential student id: YYYY0001 (year + 4 digits)."""
    year = datetime.now(timezone.utc).year
    counter = await db.counters.find_one_and_update(
        {"_id": f"student_id_{year}"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = counter["seq"] if counter else 1
    return f"{year}{seq:04d}"


# ──────────────────────────────────────────────────────────────
# Pydantic Models
# ──────────────────────────────────────────────────────────────
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = ""
    address: Optional[str] = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: EmailStr
    role: str
    student_id: Optional[str] = None
    phone: Optional[str] = ""
    address: Optional[str] = ""
    profile_photo: Optional[str] = ""
    created_at: Optional[str] = None


class ProfileUpdateIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_photo: Optional[str] = None


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


class CourseIn(BaseModel):
    title_bn: str
    title_en: Optional[str] = ""
    description_bn: str = ""
    description_en: str = ""
    price: float = 0
    is_free: bool = False
    cover_image: Optional[str] = ""
    instructor: Optional[str] = ""
    duration: Optional[str] = ""


class VideoIn(BaseModel):
    title_bn: str
    title_en: Optional[str] = ""
    description: Optional[str] = ""
    video_url: str  # YouTube link / direct URL / uploaded file URL
    thumbnail: Optional[str] = ""
    course_id: Optional[str] = ""


class PostIn(BaseModel):
    title_bn: str
    title_en: Optional[str] = ""
    body_bn: str = ""
    body_en: str = ""
    cover_image: Optional[str] = ""
    course_id: Optional[str] = ""  # link to course
    cta_label_bn: Optional[str] = "বিস্তারিত দেখুন"


class LiveClassIn(BaseModel):
    title_bn: str
    title_en: Optional[str] = ""
    join_url: str  # Zoom link (admin pastes)
    scheduled_at: str  # ISO datetime string
    description: Optional[str] = ""
    course_id: Optional[str] = ""
    is_free: bool = False  # Free classes visible to ALL logged-in users


class NotificationIn(BaseModel):
    title_bn: str
    title_en: Optional[str] = ""
    body_bn: str = ""
    body_en: str = ""


class ContactIn(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = ""
    message: str


class ComplaintIn(BaseModel):
    subject: str
    message: str


class QuizIn(BaseModel):
    title_bn: str
    title_en: Optional[str] = ""
    description: Optional[str] = ""
    month: Optional[str] = ""
    questions: list = []  # [{q, options[], correct_index}]
    starts_at: Optional[str] = ""
    ends_at: Optional[str] = ""


class MonthlyQuizQuestionIn(BaseModel):
    q: str
    options: List[str]
    correct_index: int
    marks: Optional[int] = 1


class MonthlyQuizIn(BaseModel):
    title_bn: str
    title_en: Optional[str] = ""
    exam_date: str          # "YYYY-MM-DD" (Bangladesh local date)
    start_time: str         # "HH:MM" 24h, Bangladesh local time
    end_time: str           # "HH:MM" 24h, Bangladesh local time
    duration_minutes: int = 30   # per-student time limit
    pass_marks: int = 0
    rules: List[str] = []        # list of rule strings
    prize_title: Optional[str] = ""
    prize_description: Optional[str] = ""
    prize_image: Optional[str] = ""
    is_active: bool = True
    questions: List[MonthlyQuizQuestionIn] = []


class MonthlyQuizSubmitIn(BaseModel):
    answers: List[Optional[int]] = []
    # If frontend shuffled questions, it must send original-order answers
    # (frontend remaps before submit)


class QuizWinnerIn(BaseModel):
    winners: List[dict] = []  # [{user_id, rank, name, email, address, shipping_status}]


class ShippingStatusIn(BaseModel):
    shipping_status: str  # "pending" | "shipped" | "delivered"
    tracking_number: Optional[str] = ""


class DuaCategoryIn(BaseModel):
    name_bn: str
    icon: Optional[str] = "🤲"
    description: Optional[str] = ""
    sort_order: int = 0
    color: Optional[str] = ""


class DuaIn(BaseModel):
    title_bn: str
    category_id: str
    arabic_text: Optional[str] = ""
    transliteration: Optional[str] = ""
    meaning_bn: Optional[str] = ""
    when_to_read: Optional[str] = ""
    fazilat: Optional[str] = ""
    source: Optional[str] = ""
    is_today_dua: bool = False
    is_featured: bool = False
    sort_order: int = 0


# ──────────────────────────────────────────────────────────────
# App + Router
# ──────────────────────────────────────────────────────────────
app = FastAPI(title="Bengali Islamic Institute API")
api = APIRouter(prefix="/api")


# ──────────────────────────────────────────────────────────────
# Auth dependency
# ──────────────────────────────────────────────────────────────
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        h = request.headers.get("Authorization", "")
        if h.startswith("Bearer "):
            token = h[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGO])
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return clean(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_super_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return user


CurrentUser = Annotated[dict, Depends(get_current_user)]
AdminUser = Annotated[dict, Depends(require_admin)]


def set_auth_cookie(resp: Response, token: str):
    resp.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=60 * 60 * 24 * 7,
        path="/",
    )


# ──────────────────────────────────────────────────────────────
# Auth endpoints
# ──────────────────────────────────────────────────────────────
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="এই ইমেইল ইতিমধ্যে নিবন্ধিত")
    sid = await next_student_id()
    user = {
        "id": str(uuid.uuid4()),
        "name": body.name.strip(),
        "email": email,
        "password_hash": hash_password(body.password),
        "role": "student",
        "student_id": sid,
        "phone": body.phone or "",
        "address": body.address or "",
        "profile_photo": "",
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], user["email"], user["role"])
    set_auth_cookie(response, token)
    return {"user": clean(user), "token": token}


@api.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower().strip()

    # ── Brute-force lockout: 5 failed attempts within 15 minutes → 429 ──
    LOCKOUT_MINUTES = 15
    LOCKOUT_MAX = 5
    window_start = (datetime.now(timezone.utc) - timedelta(minutes=LOCKOUT_MINUTES)).isoformat()
    recent_fails = await db.login_logs.count_documents({
        "email": email,
        "success": False,
        "created_at": {"$gte": window_start},
    })
    if recent_fails >= LOCKOUT_MAX:
        raise HTTPException(
            status_code=429,
            detail=f"অনেকবার ভুল পাসওয়ার্ড দেওয়া হয়েছে। {LOCKOUT_MINUTES} মিনিট পর আবার চেষ্টা করুন।"
        )

    user = await db.users.find_one({"email": email})
    ok = bool(user) and verify_password(body.password, user["password_hash"])
    # log every attempt
    await db.login_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": (user or {}).get("id"),
        "email": email,
        "name": (user or {}).get("name"),
        "student_id": (user or {}).get("student_id"),
        "role": (user or {}).get("role"),
        "ip": request.client.host if request.client else "",
        "user_agent": request.headers.get("user-agent", "")[:255],
        "success": ok,
        "created_at": now_iso(),
    })
    if not ok:
        raise HTTPException(status_code=401, detail="ইমেইল বা পাসওয়ার্ড ভুল")
    token = create_access_token(user["id"], user["email"], user["role"])
    set_auth_cookie(response, token)
    return {"user": clean(user), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


# ── Forgot / Reset Password ─────────────────────────────────────
class ForgotPasswordIn(BaseModel):
    email: EmailStr

class ResetPasswordIn(BaseModel):
    email: EmailStr
    otp: str
    new_password: str


async def _send_otp_email(to_email: str, otp: str, name: str):
    """Send OTP email using SMTP settings from DB. Raises on failure."""
    s = await db.settings.find_one({"id": "main"}, {"_id": 0}) or {}
    smtp_host = s.get("smtp_host", "").strip()
    smtp_port = int(s.get("smtp_port", 587) or 587)
    smtp_user = s.get("smtp_user", "").strip()
    smtp_pass = s.get("smtp_pass", "").strip()
    smtp_from = s.get("smtp_from", smtp_user).strip() or smtp_user

    if not smtp_host or not smtp_user or not smtp_pass:
        raise HTTPException(
            status_code=503,
            detail="ইমেইল সার্ভিস কনফিগার করা হয়নি। অ্যাডমিনকে জানান।"
        )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "পাসওয়ার্ড রিসেট OTP — বাঙালি ইসলামিক ইনস্টিটিউট"
    msg["From"]    = smtp_from
    msg["To"]      = to_email

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #ddd;border-radius:12px;overflow:hidden">
      <div style="background:#0A422B;padding:24px;text-align:center">
        <h2 style="color:#fff;margin:0;font-size:20px">বাঙালি ইসলামিক ইনস্টিটিউট</h2>
        <p style="color:#D4AF37;margin:4px 0 0;font-size:13px">পাসওয়ার্ড রিসেট</p>
      </div>
      <div style="padding:28px 24px">
        <p style="margin:0 0 12px">আস-সালামু আলাইকুম <strong>{name}</strong>,</p>
        <p style="margin:0 0 20px;color:#555">আপনার পাসওয়ার্ড রিসেট করতে নিচের OTP কোডটি ব্যবহার করুন।</p>
        <div style="background:#f5f5f5;border-radius:10px;text-align:center;padding:20px">
          <div style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#0A422B">{otp}</div>
          <p style="margin:8px 0 0;color:#888;font-size:12px">এই কোডটি ১৫ মিনিট পর্যন্ত কার্যকর</p>
        </div>
        <p style="margin:20px 0 0;color:#888;font-size:12px">আপনি যদি পাসওয়ার্ড রিসেটের অনুরোধ না করে থাকেন, তাহলে এই ইমেইলটি উপেক্ষা করুন।</p>
      </div>
    </div>
    """
    msg.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_from, to_email, msg.as_string())


@api.post("/auth/forgot-password")
async def forgot_password(body: ForgotPasswordIn, background_tasks: BackgroundTasks):
    email = body.email.lower().strip()
    user  = await db.users.find_one({"email": email})
    # Always return success (don't reveal if email exists)
    if not user:
        return {"ok": True, "message": "যদি এই ইমেইল নিবন্ধিত থাকে, OTP পাঠানো হবে।"}

    otp     = str(random.randint(100000, 999999))
    expires = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()

    await db.password_resets.insert_one({
        "id":         str(uuid.uuid4()),
        "email":      email,
        "otp":        otp,
        "expires_at": expires,
        "used":       False,
        "created_at": now_iso(),
    })

    async def send_in_bg():
        try:
            await _send_otp_email(email, otp, user.get("name", ""))
        except Exception as ex:
            logging.warning(f"OTP email failed: {ex}")

    background_tasks.add_task(send_in_bg)
    return {"ok": True, "message": "যদি এই ইমেইল নিবন্ধিত থাকে, OTP পাঠানো হবে।"}


@api.post("/auth/reset-password")
async def reset_password(body: ResetPasswordIn):
    email = body.email.lower().strip()
    now   = datetime.now(timezone.utc).isoformat()

    record = await db.password_resets.find_one(
        {"email": email, "otp": body.otp, "used": False, "expires_at": {"$gte": now}},
        sort=[("created_at", -1)],
    )
    if not record:
        raise HTTPException(status_code=400, detail="OTP ভুল অথবা মেয়াদ শেষ হয়ে গেছে।")

    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।")

    new_hash = hash_password(body.new_password)
    await db.users.update_one({"email": email}, {"$set": {"password_hash": new_hash}})
    await db.password_resets.update_one({"_id": record["_id"]}, {"$set": {"used": True}})

    return {"ok": True, "message": "পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে।"}


@api.get("/auth/me")
async def me(user: CurrentUser):
    return user


@api.post("/auth/change-password")
async def change_password(body: ChangePasswordIn, user: CurrentUser):
    doc = await db.users.find_one({"id": user["id"]})
    if not verify_password(body.current_password, doc["password_hash"]):
        raise HTTPException(status_code=400, detail="বর্তমান পাসওয়ার্ড ভুল")
    await db.users.update_one(
        {"id": user["id"]}, {"$set": {"password_hash": hash_password(body.new_password)}}
    )
    return {"ok": True}


@api.put("/users/me")
async def update_me(body: ProfileUpdateIn, user: CurrentUser):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    doc = await db.users.find_one({"id": user["id"]})
    return clean(doc)


# ──────────────────────────────────────────────────────────────
# Courses
# ──────────────────────────────────────────────────────────────
@api.get("/courses")
async def list_courses():
    # No hard cap — returns all courses sorted newest-first
    cs = await db.courses.find({}, {"_id": 0}).sort("created_at", -1).to_list(None)
    return cs


@api.get("/courses/{cid}")
async def get_course(cid: str):
    c = await db.courses.find_one({"id": cid}, {"_id": 0})
    if not c:
        raise HTTPException(404, "কোর্স পাওয়া যায়নি")
    return c


@api.post("/courses")
async def create_course(body: CourseIn, admin: AdminUser):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    if doc["is_free"]:
        doc["price"] = 0
    await db.courses.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/courses/{cid}")
async def update_course(cid: str, body: CourseIn, admin: AdminUser):
    upd = body.model_dump()
    if upd["is_free"]:
        upd["price"] = 0
    res = await db.courses.update_one({"id": cid}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(404, "কোর্স পাওয়া যায়নি")
    return await db.courses.find_one({"id": cid}, {"_id": 0})


@api.delete("/courses/{cid}")
async def delete_course(cid: str, admin: AdminUser):
    await db.courses.delete_one({"id": cid})
    await db.enrollments.delete_many({"course_id": cid})
    return {"ok": True}


# Enrollment (mock payment success → auto add)
@api.post("/courses/{cid}/enroll")
async def enroll(cid: str, user: CurrentUser):
    course = await db.courses.find_one({"id": cid}, {"_id": 0})
    if not course:
        raise HTTPException(404, "কোর্স পাওয়া যায়নি")
    existing = await db.enrollments.find_one(
        {"user_id": user["id"], "course_id": cid}
    )
    if existing:
        return {"ok": True, "already_enrolled": True}
    await db.enrollments.insert_one(
        {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "course_id": cid,
            "enrolled_at": now_iso(),
            "payment_status": "success" if not course.get("is_free") else "free",
            "amount": 0 if course.get("is_free") else course.get("price", 0),
        }
    )
    return {"ok": True}


@api.get("/my-courses")
async def my_courses(user: CurrentUser):
    enrolls = await db.enrollments.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    ids = [e["course_id"] for e in enrolls]
    courses = await db.courses.find({"id": {"$in": ids}}, {"_id": 0}).to_list(500)
    return courses


@api.get("/my-payment-requests")
async def my_payment_requests(user: CurrentUser):
    """Return the logged-in student's own payment requests (all statuses)."""
    reqs = await db.payment_requests.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("submitted_at", -1).to_list(200)
    return reqs


# ──────────────────────────────────────────────────────────────
# Videos
# ──────────────────────────────────────────────────────────────
@api.get("/videos")
async def list_videos():
    return await db.videos.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/videos")
async def create_video(body: VideoIn, admin: AdminUser):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.videos.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/videos/{vid}")
async def update_video(vid: str, body: VideoIn, admin: AdminUser):
    res = await db.videos.update_one({"id": vid}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "ভিডিও পাওয়া যায়নি")
    return await db.videos.find_one({"id": vid}, {"_id": 0})


@api.delete("/videos/{vid}")
async def delete_video(vid: str, admin: AdminUser):
    await db.videos.delete_one({"id": vid})
    return {"ok": True}


# ──────────────────────────────────────────────────────────────
# Posts (home page feed)
# ──────────────────────────────────────────────────────────────
@api.get("/posts")
async def list_posts():
    return await db.posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.get("/posts/{pid}")
async def get_post(pid: str):
    p = await db.posts.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "পোস্ট পাওয়া যায়নি")
    return p


@api.post("/posts")
async def create_post(body: PostIn, admin: AdminUser):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.posts.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/posts/{pid}")
async def update_post(pid: str, body: PostIn, admin: AdminUser):
    res = await db.posts.update_one({"id": pid}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "পোস্ট পাওয়া যায়নি")
    return await db.posts.find_one({"id": pid}, {"_id": 0})


@api.delete("/posts/{pid}")
async def delete_post(pid: str, admin: AdminUser):
    await db.posts.delete_one({"id": pid})
    return {"ok": True}


# ──────────────────────────────────────────────────────────────
# Live classes
# ──────────────────────────────────────────────────────────────
@api.get("/courses/{cid}/content")
async def course_content(cid: str, user: CurrentUser):
    """Return live classes, videos and pdfs for an enrolled student's course."""
    enrolled = await db.enrollments.find_one({"user_id": user["id"], "course_id": cid})
    if not enrolled:
        raise HTTPException(403, "এই কোর্সে আপনি ভর্তি নন")
    # Strict: only return content explicitly linked to THIS course.
    live = await db.live_classes.find(
        {"course_id": cid}, {"_id": 0}
    ).sort("scheduled_at", 1).to_list(100)
    videos = await db.videos.find(
        {"course_id": cid}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    pdfs = await db.pdfs.find(
        {"course_id": cid}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return {"live_classes": live, "videos": videos, "pdfs": pdfs}


@api.get("/live-classes")
async def list_live(admin: AdminUser):
    """Admin-only: list all live classes — no cap."""
    return await db.live_classes.find({}, {"_id": 0}).sort("scheduled_at", -1).to_list(None)


@api.get("/my-live-classes")
async def my_live_classes(user: CurrentUser):
    """Return live classes only for courses the logged-in user is enrolled in.
    Also includes general classes (no course_id) if the user has any enrollment.
    Join URLs are never exposed to non-enrolled users."""
    enrollments = await db.enrollments.find(
        {"user_id": user["id"], "payment_status": {"$in": ["success", "free", "approved"]}},
        {"_id": 0, "course_id": 1},
    ).to_list(500)
    enrolled_ids = [e["course_id"] for e in enrollments]

    # Build query: enrolled course classes OR free classes (visible to all logged-in users)
    query = {
        "$or": [
            {"course_id": {"$in": enrolled_ids}},  # enrolled course classes
            {"is_free": True},                       # free classes for everyone
        ]
    } if enrolled_ids else {"is_free": True}

    classes = await db.live_classes.find(query, {"_id": 0}).sort("scheduled_at", 1).to_list(None)
    return classes


@api.post("/live-classes")
async def create_live(body: LiveClassIn, admin: AdminUser):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.live_classes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/live-classes/{lid}")
async def update_live(lid: str, body: LiveClassIn, admin: AdminUser):
    res = await db.live_classes.update_one({"id": lid}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "লাইভ ক্লাস পাওয়া যায়নি")
    return await db.live_classes.find_one({"id": lid}, {"_id": 0})


@api.delete("/live-classes/{lid}")
async def delete_live(lid: str, admin: AdminUser):
    await db.live_classes.delete_one({"id": lid})
    return {"ok": True}


# ──────────────────────────────────────────────────────────────
# Quizzes
# ──────────────────────────────────────────────────────────────
@api.get("/quizzes")
async def list_quizzes():
    return await db.quizzes.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.post("/quizzes")
async def create_quiz(body: QuizIn, admin: AdminUser):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.quizzes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/quizzes/{qid}")
async def delete_quiz(qid: str, admin: AdminUser):
    await db.quizzes.delete_one({"id": qid})
    return {"ok": True}


# ──────────────────────────────────────────────────────────────
# Monthly Quiz
# ──────────────────────────────────────────────────────────────
@api.get("/monthly-quizzes")
async def list_monthly_quizzes(user: CurrentUser):
    """Requires login — returns quiz list without correct answers."""
    return await db.monthly_quizzes.find({}, {"_id": 0}).sort("exam_date", -1).to_list(100)


@api.get("/monthly-quizzes/{mid}")
async def get_monthly_quiz(mid: str, user: CurrentUser):
    """Requires login — returns quiz detail without correct answers."""
    q = await db.monthly_quizzes.find_one({"id": mid}, {"_id": 0})
    if not q:
        raise HTTPException(404, "কুইজ পাওয়া যায়নি")
    # Hide correct answers for students
    safe = {k: v for k, v in q.items() if k != "questions"}
    safe["questions"] = [
        {k2: v2 for k2, v2 in qu.items() if k2 != "correct_index"}
        for qu in (q.get("questions") or [])
    ]
    return safe


@api.post("/monthly-quizzes")
async def create_monthly_quiz(body: MonthlyQuizIn, admin: AdminUser):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    doc["submissions"] = []
    await db.monthly_quizzes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/monthly-quizzes/{mid}")
async def update_monthly_quiz(mid: str, body: MonthlyQuizIn, admin: AdminUser):
    upd = body.model_dump()
    res = await db.monthly_quizzes.update_one({"id": mid}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(404, "কুইজ পাওয়া যায়নি")
    return await db.monthly_quizzes.find_one({"id": mid}, {"_id": 0})


@api.delete("/monthly-quizzes/{mid}")
async def delete_monthly_quiz(mid: str, admin: AdminUser):
    await db.monthly_quizzes.delete_one({"id": mid})
    return {"ok": True}


@api.post("/monthly-quizzes/{mid}/start")
async def start_quiz_session(mid: str, user: CurrentUser):
    """Record start time for timer enforcement; return session info."""
    quiz = await db.monthly_quizzes.find_one({"id": mid}, {"_id": 0})
    if not quiz:
        raise HTTPException(404, "কুইজ পাওয়া যায়নি")
    already = await db.monthly_quiz_submissions.find_one({"quiz_id": mid, "user_id": user["id"]})
    if already:
        raise HTTPException(400, "আপনি ইতিমধ্যে এই কুইজে অংশ নিয়েছেন")
    session = await db.quiz_sessions.find_one({"quiz_id": mid, "user_id": user["id"]})
    if session:
        started_at = session["started_at"]
    else:
        started_at = now_iso()
        await db.quiz_sessions.insert_one({
            "quiz_id": mid, "user_id": user["id"], "started_at": started_at,
        })
    duration = quiz.get("duration_minutes", 30)
    started_dt = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
    deadline = (started_dt + timedelta(minutes=duration)).isoformat()
    return {"started_at": started_at, "deadline": deadline, "duration_minutes": duration}


@api.post("/monthly-quizzes/{mid}/submit")
async def submit_monthly_quiz(mid: str, body: MonthlyQuizSubmitIn, user: CurrentUser):
    quiz = await db.monthly_quizzes.find_one({"id": mid}, {"_id": 0})
    if not quiz:
        raise HTTPException(404, "কুইজ পাওয়া যায়নি")
    already = await db.monthly_quiz_submissions.find_one({"quiz_id": mid, "user_id": user["id"]})
    if already:
        raise HTTPException(400, "আপনি ইতিমধ্যে এই কুইজে অংশ নিয়েছেন")
    # Check time limit
    session = await db.quiz_sessions.find_one({"quiz_id": mid, "user_id": user["id"]})
    time_taken_seconds = 0
    if session:
        started_dt = datetime.fromisoformat(session["started_at"].replace("Z", "+00:00"))
        now_dt = datetime.now(timezone.utc)
        time_taken_seconds = int((now_dt - started_dt).total_seconds())
        duration = quiz.get("duration_minutes", 30)
        # Allow 2-minute grace for network delay
        if time_taken_seconds > (duration * 60) + 120:
            raise HTTPException(400, "সময় শেষ হয়ে গেছে")
    questions = quiz.get("questions") or []
    answers = body.answers or []
    score = 0
    detail = []
    for i, q in enumerate(questions):
        given = answers[i] if i < len(answers) else None
        correct = q.get("correct_index")
        marks = q.get("marks", 1)
        is_correct = given is not None and given == correct
        if is_correct:
            score += marks
        detail.append({
            "q": q.get("q"),
            "options": q.get("options", []),
            "given": given,
            "correct": correct,
            "is_correct": is_correct,
            "marks": marks,
        })
    total_marks = sum(q.get("marks", 1) for q in questions)
    passed = score >= quiz.get("pass_marks", 0)
    # Fetch full user doc to capture address & phone for winner contact
    full_user = await db.users.find_one({"id": user["id"]}, {"_id": 0}) or {}
    sub = {
        "id": str(uuid.uuid4()),
        "quiz_id": mid,
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "user_email": user.get("email", ""),
        "user_phone": full_user.get("phone", ""),
        "user_address": full_user.get("address", ""),
        "student_id": full_user.get("student_id", ""),
        "score": score,
        "total_marks": total_marks,
        "passed": passed,
        "detail": detail,
        "time_taken_seconds": time_taken_seconds,
        "submitted_at": now_iso(),
    }
    await db.monthly_quiz_submissions.insert_one(sub)
    sub.pop("_id", None)
    # Rank: count submissions with higher score, or same score but faster
    better = await db.monthly_quiz_submissions.count_documents({
        "quiz_id": mid,
        "$or": [
            {"score": {"$gt": score}},
            {"score": score, "time_taken_seconds": {"$lt": time_taken_seconds}},
        ]
    })
    sub["rank"] = better + 1
    # Clean up session
    await db.quiz_sessions.delete_one({"quiz_id": mid, "user_id": user["id"]})
    return sub


@api.get("/monthly-quizzes/{mid}/leaderboard")
async def quiz_leaderboard(mid: str, user: CurrentUser):
    """Public leaderboard for logged-in users (no answer details)."""
    subs = await db.monthly_quiz_submissions.find(
        {"quiz_id": mid},
        {"_id": 0, "detail": 0, "quiz_id": 0}
    ).sort([("score", -1), ("time_taken_seconds", 1), ("submitted_at", 1)]).to_list(100)
    for i, s in enumerate(subs):
        s["rank"] = i + 1
    return subs


@api.get("/monthly-quizzes/{mid}/my-result")
async def my_quiz_result_detail(mid: str, user: CurrentUser):
    """User's own result with detail + rank."""
    sub = await db.monthly_quiz_submissions.find_one(
        {"quiz_id": mid, "user_id": user["id"]}, {"_id": 0}
    )
    if not sub:
        raise HTTPException(404, "ফলাফল পাওয়া যায়নি")
    better = await db.monthly_quiz_submissions.count_documents({
        "quiz_id": mid,
        "$or": [
            {"score": {"$gt": sub["score"]}},
            {"score": sub["score"], "time_taken_seconds": {"$lt": sub.get("time_taken_seconds", 9999)}},
        ]
    })
    sub["rank"] = better + 1
    total = await db.monthly_quiz_submissions.count_documents({"quiz_id": mid})
    sub["total_participants"] = total
    return sub


@api.get("/monthly-quizzes/{mid}/results")
async def monthly_quiz_results(mid: str, admin: AdminUser):
    subs = await db.monthly_quiz_submissions.find(
        {"quiz_id": mid}, {"_id": 0}
    ).sort([("score", -1), ("time_taken_seconds", 1)]).to_list(500)
    for i, s in enumerate(subs):
        s["rank"] = i + 1
    return subs


@api.put("/monthly-quizzes/{mid}/winners")
async def set_quiz_winners(mid: str, body: QuizWinnerIn, admin: AdminUser):
    """Admin sets winners (top participants) for a quiz."""
    await db.monthly_quizzes.update_one(
        {"id": mid}, {"$set": {"winners": body.winners}}
    )
    return await db.monthly_quizzes.find_one({"id": mid}, {"_id": 0})


@api.patch("/monthly-quizzes/{mid}/participants/{uid}/shipping")
async def update_winner_shipping(mid: str, uid: str, body: ShippingStatusIn, admin: AdminUser):
    """Admin updates shipping status for a winner."""
    quiz = await db.monthly_quizzes.find_one({"id": mid})
    if not quiz:
        raise HTTPException(404, "কুইজ পাওয়া যায়নি")
    winners = quiz.get("winners") or []
    for w in winners:
        if w.get("user_id") == uid:
            w["shipping_status"] = body.shipping_status
            w["tracking_number"] = body.tracking_number or ""
            break
    await db.monthly_quizzes.update_one({"id": mid}, {"$set": {"winners": winners}})
    return {"ok": True}


@api.get("/my-quiz-results")
async def my_quiz_results(user: CurrentUser):
    subs = await db.monthly_quiz_submissions.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("submitted_at", -1).to_list(100)
    return subs


# ──────────────────────────────────────────────────────────────
# Notifications
# ──────────────────────────────────────────────────────────────
@api.get("/notifications")
async def list_notifs():
    return await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.post("/notifications")
async def create_notif(body: NotificationIn, admin: AdminUser):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.notifications.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/notifications/{nid}")
async def delete_notif(nid: str, admin: AdminUser):
    await db.notifications.delete_one({"id": nid})
    return {"ok": True}


# ──────────────────────────────────────────────────────────────
# Contact + Complaint
# ──────────────────────────────────────────────────────────────
@api.post("/contact")
async def submit_contact(body: ContactIn):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = now_iso()
    await db.contact_messages.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True}


@api.get("/contact")
async def list_contact(admin: AdminUser):
    return await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/complaints")
async def submit_complaint(body: ComplaintIn, user: CurrentUser):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["user_id"] = user["id"]
    doc["user_name"] = user["name"]
    doc["student_id"] = user.get("student_id", "")
    doc["created_at"] = now_iso()
    await db.complaints.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True}


@api.get("/complaints")
async def list_complaints(admin: AdminUser):
    return await db.complaints.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.patch("/complaints/{cid}/resolve")
async def resolve_complaint(cid: str, body: dict, admin: AdminUser):
    res = await db.complaints.update_one(
        {"id": cid},
        {"$set": {
            "resolved": True,
            "resolved_by": admin["id"],
            "resolved_by_name": admin.get("name", ""),
            "resolved_at": now_iso(),
            "resolution_note": body.get("note", ""),
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "অভিযোগ পাওয়া যায়নি")
    return {"ok": True}


# ──────────────────────────────────────────────────────────────
# Settings (institute info)
# ──────────────────────────────────────────────────────────────
@api.get("/settings")
async def get_settings():
    defaults = {
        "id": "main",
        "name_bn": os.environ.get("INSTITUTE_NAME_BN", "বাঙালি ইসলামিক ইনস্টিটিউট"),
        "name_en": os.environ.get("INSTITUTE_NAME_EN", "Bengali Islamic Institute"),
        "tagline_bn": "ইলম, ঈমান ও আদব",
        "tagline_en": "Knowledge, Faith & Manners",
        "contact_phone": "",
        "contact_mobile": "",
        "whatsapp": "",
        "contact_email": "",
        "address": "",
        "facebook": "",
        "youtube": "",
        "bkash_number":  "01974911990",
        "nagad_number":  "01974911990",
        "rocket_number": "01974911990",
        "whatsapp_notify": "01792784920",
        "whatsapp_api_key": "",
    }
    stored = await db.settings.find_one({"id": "main"}, {"_id": 0}) or {}
    # merge: stored overrides defaults; missing keys come from defaults
    return {**defaults, **stored}


@api.put("/settings")
async def update_settings(body: dict, admin: AdminUser):
    body["id"] = "main"
    await db.settings.update_one({"id": "main"}, {"$set": body}, upsert=True)
    return await db.settings.find_one({"id": "main"}, {"_id": 0})


# ──────────────────────────────────────────────────────────────
# Manual Payment Requests  (Bkash / Nagad send-money flow)
# ──────────────────────────────────────────────────────────────

class PaymentSubmit(BaseModel):
    course_id: str
    transaction_id: str
    payment_method: str   # "bkash" | "nagad"


def _quick_token(payment_id: str) -> str:
    """HMAC-SHA256 short token so the quick-approve URL cannot be guessed."""
    secret = os.environ.get("JWT_SECRET", "fallback-secret")
    return hmac.new(secret.encode(), payment_id.encode(), hashlib.sha256).hexdigest()[:40]


def _site_url() -> str:
    # Allow explicit override (needed for production deployments)
    explicit = os.environ.get("SITE_URL", "")
    if explicit:
        return explicit.rstrip("/")
    domain = os.environ.get("REPLIT_DEV_DOMAIN", "")
    if domain:
        return f"https://{domain}"
    return "http://localhost:5000"


async def _send_whatsapp(phone: str, api_key: str, message: str):
    """Send a WhatsApp message via CallMeBot (free personal API).
    Called in a background task — never blocks the main request."""
    if not phone or not api_key:
        return
    try:
        import urllib.parse
        url = (
            f"https://api.callmebot.com/whatsapp.php"
            f"?phone={phone}&text={urllib.parse.quote(message)}&apikey={api_key}"
        )
        requests.get(url, timeout=10)
    except Exception as e:
        logging.warning(f"WhatsApp notify failed: {e}")


# ── Telegram Bot helpers ───────────────────────────────────────────────────────

def _tg_api(method: str, payload: dict) -> dict:
    """Synchronous Telegram Bot API call (safe to use anywhere, including sync contexts)."""
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not token:
        return {}
    try:
        r = requests.post(
            f"https://api.telegram.org/bot{token}/{method}",
            json=payload, timeout=15,
        )
        return r.json()
    except Exception as e:
        logging.warning(f"Telegram API error ({method}): {e}")
        return {}


async def _tg_api_async(method: str, payload: dict) -> dict:
    """Async wrapper — runs _tg_api in a thread pool so it never blocks the event loop."""
    return await asyncio.to_thread(_tg_api, method, payload)


def _tg_webhook_secret() -> str:
    """Derive a Telegram-safe secret_token from the bot token (hex, ≤256 chars)."""
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "fallback")
    return hashlib.sha256(token.encode()).hexdigest()[:32]


def _tg_send_payment_alert(pay_req: dict) -> dict:
    """Send a payment notification to TELEGRAM_CHAT_ID with Approve/Reject buttons.
    Returns the sent message dict (contains message_id) or {}."""
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "")
    if not chat_id or not os.environ.get("TELEGRAM_BOT_TOKEN", ""):
        return {}

    pid = pay_req["id"]
    text = (
        f"🆕 *নতুন পেমেন্ট রিকোয়েস্ট!*\n\n"
        f"👤 *শিক্ষার্থী:* {pay_req.get('user_name','')}\n"
        f"📱 *মোবাইল:* {pay_req.get('user_phone','') or '—'}\n"
        f"📧 *ইমেইল:* {pay_req.get('user_email','')}\n"
        f"📚 *কোর্স:* {pay_req.get('course_title','')}\n"
        f"💰 *পরিমাণ:* ৳{pay_req.get('amount', 0)}\n"
        f"🏦 *মাধ্যম:* {pay_req.get('payment_method','').upper()}\n"
        f"🔖 *ট্রানজেকশন ID:* `{pay_req.get('transaction_id','')}`\n"
        f"🕐 *সময়:* {pay_req.get('submitted_at','')[:19].replace('T', ' ')}"
    )
    keyboard = {
        "inline_keyboard": [[
            {"text": "✅ অনুমোদন করুন", "callback_data": f"approve:{pid}"},
            {"text": "❌ বাতিল করুন",   "callback_data": f"reject:{pid}"},
        ]]
    }
    result = _tg_api("sendMessage", {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown",
        "reply_markup": keyboard,
    })
    return result.get("result", {})


async def _notify_new_payment(pay_req: dict) -> None:
    """
    Modular notification hook — called after a payment request is saved.
    Channels: Telegram (primary), WhatsApp via CallMeBot (optional).
    Add more channels (email, SMS, push) here without touching core logic.
    The payment system works even if ALL notifications fail.
    """
    pid = pay_req["id"]
    try:
        # ── Telegram (run blocking requests call in thread pool) ──────────────
        tg_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        tg_chat  = os.environ.get("TELEGRAM_CHAT_ID", "")
        if not tg_token or not tg_chat:
            logging.warning("Telegram notification skipped: token or chat_id not set")
        else:
            def _esc(v) -> str:
                """Escape HTML special chars for Telegram HTML parse_mode."""
                return str(v).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")

            tg_resp = await _tg_api_async("sendMessage", {
                "chat_id":    tg_chat,
                "parse_mode": "HTML",
                "text": (
                    f"🆕 <b>নতুন পেমেন্ট রিকোয়েস্ট!</b>\n\n"
                    f"👤 <b>শিক্ষার্থী:</b> {_esc(pay_req.get('user_name',''))}\n"
                    f"📱 <b>মোবাইল:</b> {_esc(pay_req.get('user_phone','') or '—')}\n"
                    f"📧 <b>ইমেইল:</b> {_esc(pay_req.get('user_email',''))}\n"
                    f"📚 <b>কোর্স:</b> {_esc(pay_req.get('course_title',''))}\n"
                    f"💰 <b>পরিমাণ:</b> ৳{_esc(pay_req.get('amount', 0))}\n"
                    f"🏦 <b>মাধ্যম:</b> {_esc(pay_req.get('payment_method','').upper())}\n"
                    f"🔖 <b>ট্রানজেকশন ID:</b> <code>{_esc(pay_req.get('transaction_id',''))}</code>\n"
                    f"🕐 <b>সময়:</b> {_esc(pay_req.get('submitted_at','')[:19].replace('T',' '))}"
                ),
                "reply_markup": {
                    "inline_keyboard": [[
                        {"text": "✅ অনুমোদন করুন", "callback_data": f"approve:{pid}"},
                        {"text": "❌ বাতিল করুন",   "callback_data": f"reject:{pid}"},
                    ]]
                },
            })
            logging.info(f"Telegram sendMessage response: ok={tg_resp.get('ok')} | desc={tg_resp.get('description','')}")
            inner = tg_resp.get("result", {})
            if inner.get("message_id"):
                await db.payment_requests.update_one(
                    {"id": pid},
                    {"$set": {
                        "tg_message_id": inner["message_id"],
                        "tg_chat_id": str(inner.get("chat", {}).get("id", tg_chat)),
                    }}
                )
                logging.info(f"Telegram alert saved: msg_id={inner['message_id']} for payment {pid}")
            else:
                logging.warning(f"Telegram sendMessage returned no message_id: {tg_resp}")
    except Exception as e:
        logging.warning(f"Telegram notification failed (non-critical): {e}")

    try:
        # ── WhatsApp (optional, only if configured) ───────────────────────────
        settings = await db.settings.find_one({"id": "main"}, {"_id": 0}) or {}
        wa_phone = settings.get("whatsapp_notify", "")
        wa_key   = settings.get("whatsapp_api_key", "")
        if wa_phone and wa_key:
            pid  = pay_req["id"]
            tok  = _quick_token(pid)
            base = _site_url()
            approve_url = f"{base}/api/payments/requests/{pid}/quick-approve?token={tok}"
            reject_url  = f"{base}/api/payments/requests/{pid}/quick-reject?token={tok}"
            msg = (
                f"🆕 নতুন পেমেন্ট রিকোয়েস্ট!\n"
                f"👤 শিক্ষার্থী: {pay_req.get('user_name','')} ({pay_req.get('user_email','')})\n"
                f"📱 মোবাইল: {pay_req.get('user_phone','') or '—'}\n"
                f"📚 কোর্স: {pay_req.get('course_title','')}\n"
                f"💰 পরিমাণ: ৳{pay_req.get('amount',0)}\n"
                f"🏦 মাধ্যম: {pay_req.get('payment_method','').upper()}\n"
                f"🔖 ট্রানজেকশন আইডি: {pay_req.get('transaction_id','')}\n\n"
                f"✅ অনুমোদন:\n{approve_url}\n\n"
                f"❌ বাতিল:\n{reject_url}"
            )
            await _send_whatsapp(wa_phone, wa_key, msg)
    except Exception as e:
        logging.warning(f"WhatsApp notification failed (non-critical): {e}")


@api.post("/payments/submit")
async def submit_payment(body: PaymentSubmit, user: CurrentUser, background_tasks: BackgroundTasks):
    # ── 1. Rate limiting ─────────────────────────────────────────────────────
    _check_payment_rate(user["id"])

    # ── 2. Transaction ID format validation ──────────────────────────────────
    tid = body.transaction_id.strip()
    if len(tid) < 6:
        raise HTTPException(400, "ট্রানজেকশন আইডি কমপক্ষে ৬ অক্ষরের হতে হবে")
    if not re.match(r"^[A-Za-z0-9\-_\.\s]+$", tid):
        raise HTTPException(400, "ট্রানজেকশন আইডিতে শুধুমাত্র অক্ষর, সংখ্যা ও ড্যাশ ব্যবহার করুন")

    # ── 3. Business logic validations ────────────────────────────────────────
    course = await db.courses.find_one({"id": body.course_id}, {"_id": 0})
    if not course:
        raise HTTPException(404, "কোর্স পাওয়া যায়নি")
    if await db.enrollments.find_one({"user_id": user["id"], "course_id": body.course_id}):
        raise HTTPException(400, "আপনি ইতিমধ্যে এই কোর্সে ভর্তি আছেন")
    if await db.payment_requests.find_one({
        "user_id": user["id"], "course_id": body.course_id,
        "status": {"$in": ["pending", "approved"]}
    }):
        raise HTTPException(400, "এই কোর্সের জন্য আপনার একটি রিকোয়েস্ট ইতিমধ্যে জমা আছে")
    if await db.payment_requests.find_one({"transaction_id": tid, "status": {"$ne": "rejected"}}):
        raise HTTPException(400, "এই ট্রানজেকশন আইডি আগে ব্যবহৃত হয়েছে")

    # ── 4. Validate payment method ───────────────────────────────────────────
    allowed_methods = {"bkash", "nagad", "rocket", "sslcommerz", "cash"}
    if body.payment_method not in allowed_methods:
        raise HTTPException(400, f"অবৈধ পেমেন্ট পদ্ধতি")

    pay_req = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "user_email": user.get("email", ""),
        "user_phone": user.get("phone", ""),
        "course_id": body.course_id,
        "course_title": course.get("title_bn") or course.get("title_en", ""),
        "amount": course.get("price", 0),
        "transaction_id": tid,
        "payment_method": body.payment_method,
        "status": "pending",
        "submitted_at": now_iso(),
        # Audit: store submitter IP for fraud detection
        "submitted_ip": "",  # set in middleware if needed
    }
    await db.payment_requests.insert_one(pay_req)

    # Fire-and-forget: notifications never block or fail the core response
    background_tasks.add_task(_notify_new_payment, pay_req)

    return {"ok": True, "id": pay_req["id"]}


@api.get("/payments/requests")
async def list_payment_requests(admin: AdminUser):
    reqs = await db.payment_requests.find({}, {"_id": 0}).sort("submitted_at", -1).to_list(2000)
    return reqs


@api.put("/payments/requests/{pid}/approve")
async def approve_payment_request(pid: str, admin: AdminUser):
    req = await db.payment_requests.find_one({"id": pid}, {"_id": 0})
    if not req:
        raise HTTPException(404, "রিকোয়েস্ট পাওয়া যায়নি")
    if req["status"] != "pending":
        raise HTTPException(400, "এই রিকোয়েস্ট ইতিমধ্যে প্রসেস হয়েছে")

    if not await db.enrollments.find_one({"user_id": req["user_id"], "course_id": req["course_id"]}):
        await db.enrollments.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": req["user_id"],
            "course_id": req["course_id"],
            "enrolled_at": now_iso(),
            "payment_status": "success",
            "amount": req.get("amount", 0),
            "transaction_id": req["transaction_id"],
            "payment_method": req["payment_method"],
        })

    await db.payment_requests.update_one(
        {"id": pid},
        {"$set": {"status": "approved", "processed_at": now_iso(), "processed_by": admin["email"]}}
    )

    # ── User notification + email receipt ────────────────────────────────────
    try:
        course_title = req.get("course_title", "")
        amount       = req.get("amount", 0)
        user_id      = req.get("user_id", "")
        user_email   = req.get("user_email", "")
        user_name    = req.get("user_name", "")

        # In-app notification
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id":  user_id,
            "title_bn": "✅ পেমেন্ট অনুমোদিত — কোর্সে ভর্তি সম্পন্ন!",
            "title_en": "✅ Payment Approved — Enrollment Complete!",
            "body_bn":  f"আপনার ৳{amount} পেমেন্ট যাচাই হয়েছে। '{course_title}' কোর্সে আপনাকে ভর্তি করা হয়েছে। এখনই শুরু করুন!",
            "body_en":  f"Your payment of ৳{amount} has been verified. You are enrolled in '{course_title}'. Start learning now!",
            "created_at": now_iso(),
        })

        # Email receipt (non-critical)
        smtp_host = os.environ.get("SMTP_HOST", "")
        smtp_user = os.environ.get("SMTP_USER", "")
        smtp_pass = os.environ.get("SMTP_PASS", "")
        if smtp_host and smtp_user and smtp_pass and user_email:
            def _send_receipt():
                msg = MIMEMultipart("alternative")
                msg["Subject"] = f"✅ পেমেন্ট রসিদ — {course_title}"
                msg["From"]    = smtp_user
                msg["To"]      = user_email
                html = f"""
<html><body style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px">
<h2 style="color:#0A422B">বাঙালি ইসলামিক ইনস্টিটিউট</h2>
<p>প্রিয় {user_name},</p>
<p>আপনার পেমেন্ট সফলভাবে অনুমোদিত হয়েছে।</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
  <tr><td style="padding:8px;border:1px solid #ddd">কোর্স</td>
      <td style="padding:8px;border:1px solid #ddd"><b>{course_title}</b></td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd">পরিমাণ</td>
      <td style="padding:8px;border:1px solid #ddd"><b>৳{amount}</b></td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd">ট্রানজেকশন ID</td>
      <td style="padding:8px;border:1px solid #ddd"><code>{req.get('transaction_id','')}</code></td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd">মাধ্যম</td>
      <td style="padding:8px;border:1px solid #ddd">{req.get('payment_method','').upper()}</td></tr>
  <tr><td style="padding:8px;border:1px solid #ddd">তারিখ</td>
      <td style="padding:8px;border:1px solid #ddd">{now_iso()[:10]}</td></tr>
</table>
<p>ধন্যবাদ! জাযাকাল্লাহু খাইরান।</p>
<p style="color:#888;font-size:12px">বাঙালি ইসলামিক ইনস্টিটিউট — ইলম, ঈমান ও আদব</p>
</body></html>"""
                msg.attach(MIMEText(html, "html"))
                with smtplib.SMTP_SSL(smtp_host, 465) as s:
                    s.login(smtp_user, smtp_pass)
                    s.sendmail(smtp_user, user_email, msg.as_string())
            await asyncio.to_thread(_send_receipt)
    except Exception as _notif_err:
        logging.warning(f"Post-approval notification failed (non-critical): {_notif_err}")

    return {"ok": True}


@api.put("/payments/requests/{pid}/reject")
async def reject_payment_request(pid: str, body: dict, admin: AdminUser):
    req = await db.payment_requests.find_one({"id": pid}, {"_id": 0})
    if not req:
        raise HTTPException(404, "রিকোয়েস্ট পাওয়া যায়নি")
    if req["status"] != "pending":
        raise HTTPException(400, "এই রিকোয়েস্ট ইতিমধ্যে প্রসেস হয়েছে")

    await db.payment_requests.update_one(
        {"id": pid},
        {"$set": {
            "status": "rejected",
            "reject_reason": body.get("reason", ""),
            "processed_at": now_iso(),
            "processed_by": admin["email"],
        }}
    )
    return {"ok": True}


# ── WhatsApp one-click approve / reject (public, HMAC-protected) ──────────────

async def _do_enroll(req: dict):
    """Create enrollment record from an approved payment request."""
    if not await db.enrollments.find_one({"user_id": req["user_id"], "course_id": req["course_id"]}):
        await db.enrollments.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": req["user_id"],
            "course_id": req["course_id"],
            "enrolled_at": now_iso(),
            "payment_status": "success",
            "amount": req.get("amount", 0),
            "transaction_id": req.get("transaction_id", ""),
            "payment_method": req.get("payment_method", ""),
        })


from starlette.responses import HTMLResponse

@api.get("/payments/requests/{pid}/quick-approve", response_class=HTMLResponse)
async def quick_approve(pid: str, token: str):
    expected = _quick_token(pid)
    if not hmac.compare_digest(token, expected):
        return HTMLResponse("<h2>❌ Invalid or expired link.</h2>", status_code=403)
    req = await db.payment_requests.find_one({"id": pid}, {"_id": 0})
    if not req:
        return HTMLResponse("<h2>❌ Payment request not found.</h2>", status_code=404)
    if req["status"] != "pending":
        status_label = "অনুমোদিত" if req["status"] == "approved" else "বাতিল"
        return HTMLResponse(
            f"<html><body style='font-family:sans-serif;padding:2rem'>"
            f"<h2>ℹ️ এই রিকোয়েস্ট ইতিমধ্যে <b>{status_label}</b> হয়েছে।</h2>"
            f"<p>কোর্স: {req.get('course_title','')}</p>"
            f"<p>শিক্ষার্থী: {req.get('user_name','')} ({req.get('user_email','')})</p>"
            f"</body></html>"
        )
    await _do_enroll(req)
    await db.payment_requests.update_one(
        {"id": pid},
        {"$set": {"status": "approved", "processed_at": now_iso(), "processed_by": "whatsapp-quick"}}
    )
    return HTMLResponse(
        f"<html><body style='font-family:sans-serif;padding:2rem;max-width:500px;margin:auto'>"
        f"<div style='background:#d1fae5;border:1px solid #6ee7b7;border-radius:12px;padding:1.5rem'>"
        f"<h2 style='color:#065f46;margin-top:0'>✅ অনুমোদন সফল!</h2>"
        f"<p><b>শিক্ষার্থী:</b> {req.get('user_name','')} ({req.get('user_email','')})</p>"
        f"<p><b>কোর্স:</b> {req.get('course_title','')}</p>"
        f"<p><b>পরিমাণ:</b> ৳{req.get('amount',0)}</p>"
        f"<p><b>ট্রানজেকশন আইডি:</b> {req.get('transaction_id','')}</p>"
        f"<p style='color:#065f46'>শিক্ষার্থীকে কোর্সে এনরোল করা হয়েছে।</p>"
        f"</div></body></html>"
    )


@api.get("/payments/requests/{pid}/quick-reject", response_class=HTMLResponse)
async def quick_reject(pid: str, token: str):
    expected = _quick_token(pid)
    if not hmac.compare_digest(token, expected):
        return HTMLResponse("<h2>❌ Invalid or expired link.</h2>", status_code=403)
    req = await db.payment_requests.find_one({"id": pid}, {"_id": 0})
    if not req:
        return HTMLResponse("<h2>❌ Payment request not found.</h2>", status_code=404)
    if req["status"] != "pending":
        status_label = "অনুমোদিত" if req["status"] == "approved" else "বাতিল"
        return HTMLResponse(
            f"<html><body style='font-family:sans-serif;padding:2rem'>"
            f"<h2>ℹ️ এই রিকোয়েস্ট ইতিমধ্যে <b>{status_label}</b> হয়েছে।</h2>"
            f"<p>কোর্স: {req.get('course_title','')}</p>"
            f"</body></html>"
        )
    await db.payment_requests.update_one(
        {"id": pid},
        {"$set": {"status": "rejected", "reject_reason": "WhatsApp থেকে বাতিল", "processed_at": now_iso(), "processed_by": "whatsapp-quick"}}
    )
    return HTMLResponse(
        f"<html><body style='font-family:sans-serif;padding:2rem;max-width:500px;margin:auto'>"
        f"<div style='background:#fee2e2;border:1px solid #fca5a5;border-radius:12px;padding:1.5rem'>"
        f"<h2 style='color:#991b1b;margin-top:0'>❌ বাতিল করা হয়েছে</h2>"
        f"<p><b>শিক্ষার্থী:</b> {req.get('user_name','')} ({req.get('user_email','')})</p>"
        f"<p><b>কোর্স:</b> {req.get('course_title','')}</p>"
        f"<p><b>ট্রানজেকশন আইডি:</b> {req.get('transaction_id','')}</p>"
        f"</div></body></html>"
    )


# ── Telegram Bot webhook (inline keyboard callbacks) ──────────────────────────

@api.post("/telegram/webhook")
async def telegram_webhook(request: Request):
    """Receives callback_query from Telegram when admin taps Approve / Reject buttons."""
    # Verify the request is genuinely from Telegram
    secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if secret != _tg_webhook_secret():
        return {"ok": False}

    body = await request.json()

    # We only handle callback_query (button presses)
    cb = body.get("callback_query")
    if not cb:
        return {"ok": True}

    callback_id = cb["id"]
    data        = cb.get("data", "")
    tg_msg      = cb.get("message", {})
    tg_chat_id  = tg_msg.get("chat", {}).get("id")
    tg_msg_id   = tg_msg.get("message_id")
    tg_user     = cb.get("from", {})

    if ":" not in data:
        _tg_api("answerCallbackQuery", {"callback_query_id": callback_id})
        return {"ok": True}

    action, pid = data.split(":", 1)
    req = await db.payment_requests.find_one({"id": pid}, {"_id": 0})

    if not req:
        _tg_api("answerCallbackQuery", {
            "callback_query_id": callback_id,
            "text": "❌ রিকোয়েস্ট পাওয়া যায়নি",
            "show_alert": True,
        })
        return {"ok": True}

    if req["status"] != "pending":
        label = "অনুমোদিত" if req["status"] == "approved" else "বাতিল"
        _tg_api("answerCallbackQuery", {
            "callback_query_id": callback_id,
            "text": f"ℹ️ ইতিমধ্যে {label} হয়েছে",
            "show_alert": True,
        })
        return {"ok": True}

    by = tg_user.get("username") or tg_user.get("first_name", "Telegram")

    def _h(v) -> str:
        return str(v).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")

    if action == "approve":
        await _do_enroll(req)
        await db.payment_requests.update_one(
            {"id": pid},
            {"$set": {"status": "approved", "processed_at": now_iso(), "processed_by": f"@{by} (Telegram)"}}
        )
        _tg_api("answerCallbackQuery", {"callback_query_id": callback_id, "text": "✅ অনুমোদন হয়েছে!"})
        new_text = (
            f"✅ <b>অনুমোদিত হয়েছে!</b>\n\n"
            f"👤 <b>শিক্ষার্থী:</b> {_h(req.get('user_name',''))}\n"
            f"📱 <b>মোবাইল:</b> {_h(req.get('user_phone','') or '—')}\n"
            f"📧 <b>ইমেইল:</b> {_h(req.get('user_email',''))}\n"
            f"📚 <b>কোর্স:</b> {_h(req.get('course_title',''))}\n"
            f"💰 <b>পরিমাণ:</b> ৳{_h(req.get('amount',0))}\n"
            f"🔖 <b>ট্রানজেকশন ID:</b> <code>{_h(req.get('transaction_id',''))}</code>\n\n"
            f"✅ @{_h(by)} কর্তৃক অনুমোদিত — শিক্ষার্থী কোর্সে যুক্ত হয়েছে।"
        )
    elif action == "reject":
        await db.payment_requests.update_one(
            {"id": pid},
            {"$set": {
                "status": "rejected",
                "reject_reason": "Telegram থেকে বাতিল",
                "processed_at": now_iso(),
                "processed_by": f"@{by} (Telegram)",
            }}
        )
        _tg_api("answerCallbackQuery", {"callback_query_id": callback_id, "text": "❌ বাতিল করা হয়েছে"})
        new_text = (
            f"❌ <b>বাতিল করা হয়েছে</b>\n\n"
            f"👤 <b>শিক্ষার্থী:</b> {_h(req.get('user_name',''))}\n"
            f"📚 <b>কোর্স:</b> {_h(req.get('course_title',''))}\n"
            f"🔖 <b>ট্রানজেকশন ID:</b> <code>{_h(req.get('transaction_id',''))}</code>\n\n"
            f"❌ @{_h(by)} কর্তৃক বাতিল করা হয়েছে।"
        )
    else:
        return {"ok": True}

    # Edit the original message to remove buttons and show final status
    if tg_chat_id and tg_msg_id:
        _tg_api("editMessageText", {
            "chat_id":    tg_chat_id,
            "message_id": tg_msg_id,
            "text":       new_text,
            "parse_mode": "HTML",
        })

    return {"ok": True}


# ── Telegram test (admin-only) ────────────────────────────────────────────────

@api.post("/admin/telegram-test")
async def telegram_test(admin: AdminUser):
    """Send a test payment alert to Telegram to verify the bot & webhook are working."""
    tg_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    tg_chat  = os.environ.get("TELEGRAM_CHAT_ID", "")
    if not tg_token or not tg_chat:
        raise HTTPException(400, "TELEGRAM_BOT_TOKEN বা TELEGRAM_CHAT_ID সেট করা নেই")

    fake_req = {
        "id":               "test-000",
        "user_name":        "আব্দুল্লাহ আল মামুন (TEST)",
        "user_email":       "test@example.com",
        "user_phone":       "01712345678",
        "course_title":     "কুরআন তিলাওয়াত কোর্স (TEST)",
        "amount":           500,
        "payment_method":   "bkash",
        "transaction_id":   "TXN-TEST-9999",
        "submitted_at":     now_iso(),
    }
    result = _tg_send_payment_alert(fake_req)
    if not result.get("ok"):
        raise HTTPException(500, f"Telegram error: {result}")

    # Immediately edit the test message so it's clear it's a test
    msg_id  = result.get("result", {}).get("message_id")
    chat_id = result.get("result", {}).get("chat", {}).get("id")
    if msg_id and chat_id:
        _tg_api("editMessageText", {
            "chat_id":    chat_id,
            "message_id": msg_id,
            "text": (
                "✅ *TEST সফল হয়েছে!*\n\n"
                "এটি একটি পরীক্ষামূলক বার্তা ছিল।\n"
                "Telegram Bot ও Webhook সঠিকভাবে কাজ করছে। 🎉\n\n"
                "_এখন থেকে নতুন পেমেন্ট আসলে Approve/Reject বোতামসহ বার্তা আসবে।_"
            ),
            "parse_mode": "Markdown",
        })

    return {"ok": True, "message": "Test notification সফলভাবে পাঠানো হয়েছে"}


# admin user list
@api.get("/users")
async def list_users(admin: AdminUser):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    # add enrollment count
    for u in users:
        u["enrollment_count"] = await db.enrollments.count_documents({"user_id": u["id"]})
    return users


@api.get("/users/{uid}/details")
async def user_details(uid: str, admin: AdminUser):
    """Full student profile: info + enrolled courses + login history + complaints."""
    user = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(404, "ইউজার পাওয়া যায়নি")
    enrolls = await db.enrollments.find({"user_id": uid}, {"_id": 0}).sort("enrolled_at", -1).to_list(500)
    # attach course details
    course_ids = [e["course_id"] for e in enrolls]
    courses = await db.courses.find({"id": {"$in": course_ids}}, {"_id": 0}).to_list(500)
    course_map = {c["id"]: c for c in courses}
    for e in enrolls:
        e["course"] = course_map.get(e["course_id"])
    logins = await db.login_logs.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    complaints = await db.complaints.find({"user_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {
        "user": user,
        "enrollments": enrolls,
        "login_history": logins,
        "complaints": complaints,
        "total_spent": sum(e.get("amount", 0) for e in enrolls if e.get("payment_status") == "success"),
    }


@api.get("/enrollments")
async def list_all_enrollments(admin: AdminUser):
    """All purchases / enrollments with student & course info — for admin overview."""
    enrolls = await db.enrollments.find({}, {"_id": 0}).sort("enrolled_at", -1).to_list(2000)
    user_ids = list({e["user_id"] for e in enrolls})
    course_ids = list({e["course_id"] for e in enrolls})
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "password_hash": 0}).to_list(2000)
    courses = await db.courses.find({"id": {"$in": course_ids}}, {"_id": 0}).to_list(2000)
    umap = {u["id"]: u for u in users}
    cmap = {c["id"]: c for c in courses}
    for e in enrolls:
        e["user"] = umap.get(e["user_id"])
        e["course"] = cmap.get(e["course_id"])
    return enrolls


@api.get("/login-logs")
async def list_login_logs(admin: AdminUser, limit: int = 200):
    logs = await db.login_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return logs


# ──────────────────────────────────────────────────────────────
# File Upload / Download
# ──────────────────────────────────────────────────────────────
@api.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Authenticated upload. Returns {url} suitable for <img src>."""
    if not file.filename:
        raise HTTPException(400, "No file")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    if ext not in MIME:
        raise HTTPException(400, "Unsupported file type")
    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(400, "ফাইল ১৫MB এর বেশি")
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/uploads/{file_id}.{ext}"
    content_type = file.content_type or MIME[ext]
    result = put_object(path, data, content_type)  # write to local disk cache
    file_doc = {
        "id": file_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "uploaded_by": user["id"],
        "is_deleted": False,
        "created_at": now_iso(),
        "data": data,  # store binary in MongoDB for cross-deployment persistence
    }
    await db.files.insert_one(file_doc)
    return {
        "id": file_id,
        "url": f"/api/files/{file_id}",
        "filename": file.filename,
        "content_type": content_type,
    }


@api.get("/files/{file_id}")
async def get_file(file_id: str):
    """Public file streaming endpoint — reads from local disk or MongoDB."""
    record = await db.files.find_one({"id": file_id, "is_deleted": False})
    if not record:
        raise HTTPException(404, "File not found")
    content_type = record.get("content_type", "application/octet-stream")

    # 1. Try local disk cache (fast)
    local_data, _ = get_object(record["storage_path"])
    if local_data is not None:
        return Response(
            content=local_data,
            media_type=content_type,
            headers={"Cache-Control": "public, max-age=86400"},
        )

    # 2. Fall back to MongoDB binary data
    if record.get("data"):
        raw = record["data"]
        # motor returns Binary; convert to bytes
        file_bytes = bytes(raw)
        # write to local disk cache for next request
        try:
            filename = Path(record["storage_path"]).name
            (UPLOAD_DIR / filename).write_bytes(file_bytes)
        except Exception:
            pass
        return Response(
            content=file_bytes,
            media_type=content_type,
            headers={"Cache-Control": "public, max-age=86400"},
        )

    raise HTTPException(404, "File data not found")


# ──────────────────────────────────────────────────────────────
# Generic CRUD factory — used by simple admin resources
# ──────────────────────────────────────────────────────────────
def register_crud(name: str, *, public_read: bool = True, admin_write: bool = True):
    """Register list/get/create/update/delete endpoints for /api/{name} → db[name]."""
    coll = db[name]

    if public_read:
        @api.get(f"/{name}", name=f"list_{name}")
        async def _list(q: Optional[str] = None):
            cur = coll.find({}, {"_id": 0}).sort("created_at", -1)
            items = await cur.to_list(None)   # no limit — unlimited
            if q:
                items = [i for i in items if q.lower() in str(i).lower()]
            return items
    else:
        @api.get(f"/{name}", name=f"list_{name}")
        async def _list(admin: AdminUser):
            return await coll.find({}, {"_id": 0}).sort("created_at", -1).to_list(None)  # no limit

    @api.get(f"/{name}/{{item_id}}", name=f"get_{name}")
    async def _get(item_id: str):
        d = await coll.find_one({"id": item_id}, {"_id": 0})
        if not d:
            raise HTTPException(404, "Not found")
        return d

    deps = [Depends(require_admin)] if admin_write else []

    @api.post(f"/{name}", dependencies=deps, name=f"create_{name}")
    async def _create(body: dict):
        body["id"] = str(uuid.uuid4())
        body["created_at"] = now_iso()
        await coll.insert_one(body)
        body.pop("_id", None)
        return body

    @api.put(f"/{name}/{{item_id}}", dependencies=deps, name=f"update_{name}")
    async def _update(item_id: str, body: dict):
        body.pop("id", None)
        body["updated_at"] = now_iso()
        res = await coll.update_one({"id": item_id}, {"$set": body})
        if res.matched_count == 0:
            raise HTTPException(404, "Not found")
        return await coll.find_one({"id": item_id}, {"_id": 0})

    @api.delete(f"/{name}/{{item_id}}", dependencies=deps, name=f"delete_{name}")
    async def _delete(item_id: str):
        r = await coll.delete_one({"id": item_id})
        return {"ok": True, "deleted": r.deleted_count}


SENSITIVE_CONFIGS = {"firebase", "security", "payment_gateways"}


def register_config(name: str):
    """Single-document config resource — /api/configs/{name}.
    Sensitive configs (firebase, security, payment_gateways) require admin auth even for GET."""
    if name in SENSITIVE_CONFIGS:
        @api.get(f"/configs/{name}")
        async def _get_cfg_protected(admin: AdminUser):
            d = await db.configs.find_one({"key": name}, {"_id": 0}) or {"key": name, "value": {}}
            return d.get("value", {})
    else:
        @api.get(f"/configs/{name}")
        async def _get_cfg():
            d = await db.configs.find_one({"key": name}, {"_id": 0}) or {"key": name, "value": {}}
            return d.get("value", {})

    @api.put(f"/configs/{name}")
    async def _put_cfg(body: dict, admin: AdminUser):
        await db.configs.update_one(
            {"key": name},
            {"$set": {"key": name, "value": body, "updated_at": now_iso(), "updated_by": admin["id"]}},
            upsert=True,
        )
        return body


# Activity log helper
async def log_activity(user_id: str, action: str, target: str = "", meta: dict | None = None):
    await db.activity_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": action,
        "target": target,
        "meta": meta or {},
        "created_at": now_iso(),
    })


# Register generic CRUD resources for the expanded admin panel
for _res in [
    "course_categories",
    "chapters",
    "lessons",
    "pdfs",
    "assignments",
    "exams",
    "results",
    "certificates",
    "recorded_classes",
    "hadiths",
    "islamic_content",
    "blogs",
    "products",
    "orders",
    "payments",
    "banners",
    "sliders",
    "gallery",
    "downloads",
    "winner_reviews",
]:
    register_crud(_res, public_read=True, admin_write=True)

# ── Student: place a shop order ──────────────────────────────────────────────
class ShopOrderItem(BaseModel):
    product_id: str
    product_name: str
    qty: int
    unit_price: float

class ShopOrderIn(BaseModel):
    items: List[ShopOrderItem]
    customer_name: str
    customer_phone: str
    customer_address: str
    payment_method: str  # bkash | nagad | rocket | cod
    payment_number: Optional[str] = ""   # sender number for mobile payment
    transaction_id: Optional[str] = ""  # trx id for mobile payment
    note: Optional[str] = ""
    promo_code: Optional[str] = ""       # optional promo/discount code

@api.post("/shop/place-order")
async def place_shop_order(body: ShopOrderIn, user: CurrentUser):
    """Any logged-in student can place an order."""
    if not body.items:
        raise HTTPException(400, "অর্ডারে কোনো প্রোডাক্ট নেই।")

    # Verify products & check stock
    total = 0.0
    order_lines = []
    for item in body.items:
        prod = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if not prod:
            raise HTTPException(404, f"প্রোডাক্ট পাওয়া যায়নি: {item.product_name}")
        stock = int(prod.get("stock") or 0)
        if stock > 0 and item.qty > stock:
            raise HTTPException(400, f"'{prod.get('name_bn')}' এর স্টক যথেষ্ট নেই (বাকি: {stock}টি)")
        unit = float(prod.get("discount_price") or prod.get("price") or item.unit_price)
        total += unit * item.qty
        order_lines.append({
            "product_id": item.product_id,
            "product_name": prod.get("name_bn") or item.product_name,
            "qty": item.qty,
            "unit_price": unit,
            "subtotal": unit * item.qty,
        })

    # Apply promo code discount if provided
    discount = 0.0
    promo_code_used = ""
    if body.promo_code and body.promo_code.strip():
        promo_doc = await db.promo_codes.find_one(
            {"code": body.promo_code.upper().strip(), "is_active": True}
        )
        if promo_doc:
            max_uses = int(promo_doc.get("max_uses") or 0)
            used_count = int(promo_doc.get("used_count") or 0)
            if max_uses == 0 or used_count < max_uses:
                disc_type = promo_doc.get("discount_type", "flat")
                disc_val  = float(promo_doc.get("discount_value") or 0)
                discount  = min(total * disc_val / 100, total) if disc_type == "percent" else min(disc_val, total)
                promo_code_used = promo_doc["code"]
                await db.promo_codes.update_one(
                    {"code": promo_code_used},
                    {"$inc": {"used_count": 1}}
                )
                new_used = used_count + 1
                if max_uses > 0 and new_used >= max_uses:
                    await db.promo_codes.update_one(
                        {"code": promo_code_used},
                        {"$set": {"is_active": False}}
                    )

    final_total = round(total - discount, 2)

    # Build a short order number
    import random as _random
    order_number = "ORD-" + str(_random.randint(100000, 999999))

    doc = {
        "id": str(uuid.uuid4()),
        "order_number": order_number,
        "user_id": user["id"],
        "user_email": user.get("email", ""),
        "customer_name": body.customer_name,
        "customer_phone": body.customer_phone,
        "customer_address": body.customer_address,
        "payment_method": body.payment_method,
        "payment_number": body.payment_number,
        "transaction_id": body.transaction_id,
        "note": body.note,
        "products": order_lines,
        "subtotal": total,
        "discount": discount,
        "promo_code": promo_code_used,
        "total": final_total,
        "status": "pending",
        "payment_status": "unpaid" if body.payment_method == "cod" else "pending",
        "created_at": now_iso(),
    }
    await db.orders.insert_one(doc)
    doc.pop("_id", None)

    # ── Telegram notification ────────────────────────────────────────────────
    try:
        tg_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        tg_chat  = os.environ.get("TELEGRAM_CHAT_ID", "")
        if tg_token and tg_chat:
            def _esc(v):
                return str(v).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
            pay_icon = {"bkash": "💗 bKash", "nagad": "🟠 Nagad", "cod": "💵 ক্যাশ অন ডেলিভারি"}.get(body.payment_method, body.payment_method.upper())
            items_text = "\n".join(
                f"  • {_esc(it['product_name'])} ×{it['qty']} = ৳{it['subtotal']:.0f}"
                for it in order_lines
            )
            tg_text = (
                f"🛒 <b>নতুন শপ অর্ডার!</b>\n\n"
                f"🔖 <b>অর্ডার নং:</b> <code>{order_number}</code>\n"
                f"👤 <b>নাম:</b> {_esc(body.customer_name)}\n"
                f"📱 <b>ফোন:</b> {_esc(body.customer_phone)}\n"
                f"📍 <b>ঠিকানা:</b> {_esc(body.customer_address)}\n\n"
                f"📦 <b>পণ্যসমূহ:</b>\n{items_text}\n\n"
                f"💰 <b>মোট:</b> ৳{total:.0f}\n"
                f"🏦 <b>পেমেন্ট:</b> {pay_icon}\n"
                + (f"📲 <b>পেমেন্ট নং:</b> {_esc(body.payment_number)}\n" if body.payment_number else "")
                + (f"🔖 <b>ট্রানজেকশন:</b> <code>{_esc(body.transaction_id)}</code>\n" if body.transaction_id else "")
                + (f"📝 <b>নোট:</b> {_esc(body.note)}\n" if body.note else "")
                + f"\n📧 {_esc(user.get('email', ''))}"
            )
            await _tg_api_async("sendMessage", {
                "chat_id": tg_chat,
                "parse_mode": "HTML",
                "text": tg_text,
            })
    except Exception as _tg_err:
        logging.warning(f"Shop order Telegram notify failed: {_tg_err}")

    return {"ok": True, "order_number": order_number, "total": final_total, "discount": discount, "order": doc}

@api.get("/shop/my-orders")
async def my_shop_orders(user: CurrentUser):
    """Return all orders for the logged-in student."""
    orders = await db.orders.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return orders


# ── Promo Codes ───────────────────────────────────────────────────────────────

class PromoCodeIn(BaseModel):
    code: str
    discount_type: str = "flat"   # "flat" | "percent"
    discount_value: float
    min_order: Optional[float] = 0
    max_uses: Optional[int] = 0   # 0 = unlimited
    is_active: bool = True
    note: Optional[str] = ""

@api.get("/promo-codes/validate")
async def validate_promo_code(code: str, order_total: float = 0, user: CurrentUser = None):
    """Validate a promo code and return discount info. Any logged-in user can call."""
    doc = await db.promo_codes.find_one({"code": code.upper().strip(), "is_active": True}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "এই প্রমো কোডটি বৈধ নয় বা মেয়াদ উত্তীর্ণ।")
    min_order = float(doc.get("min_order") or 0)
    if min_order > 0 and order_total < min_order:
        raise HTTPException(400, f"এই কোডের জন্য ন্যূনতম অর্ডার ৳{min_order:.0f} হতে হবে।")
    max_uses = int(doc.get("max_uses") or 0)
    used = int(doc.get("used_count") or 0)
    if max_uses > 0 and used >= max_uses:
        raise HTTPException(400, "এই প্রমো কোডের ব্যবহার সীমা শেষ হয়েছে।")
    disc_type = doc.get("discount_type", "flat")
    disc_val  = float(doc.get("discount_value") or 0)
    discount  = min(order_total * disc_val / 100, order_total) if disc_type == "percent" else min(disc_val, order_total)
    return {
        "code":           doc["code"],
        "discount_type":  disc_type,
        "discount_value": disc_val,
        "discount":       round(discount, 2),
        "note":           doc.get("note", ""),
    }

@api.get("/admin/promo-codes")
async def admin_list_promo_codes(user: AdminUser):
    docs = await db.promo_codes.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs

@api.post("/admin/promo-codes")
async def admin_create_promo_code(body: PromoCodeIn, user: AdminUser):
    existing = await db.promo_codes.find_one({"code": body.code.upper().strip()})
    if existing:
        raise HTTPException(400, "এই কোডটি আগেই আছে।")
    doc = {
        "id":             str(uuid.uuid4()),
        "code":           body.code.upper().strip(),
        "discount_type":  body.discount_type,
        "discount_value": body.discount_value,
        "min_order":      body.min_order,
        "max_uses":       body.max_uses,
        "is_active":      body.is_active,
        "note":           body.note,
        "used_count":     0,
        "created_at":     now_iso(),
    }
    await db.promo_codes.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/admin/promo-codes/{code_id}")
async def admin_update_promo_code(code_id: str, body: PromoCodeIn, user: AdminUser):
    doc = await db.promo_codes.find_one({"id": code_id})
    if not doc:
        raise HTTPException(404, "প্রমো কোড পাওয়া যায়নি।")
    await db.promo_codes.update_one({"id": code_id}, {"$set": {
        "code":           body.code.upper().strip(),
        "discount_type":  body.discount_type,
        "discount_value": body.discount_value,
        "min_order":      body.min_order,
        "max_uses":       body.max_uses,
        "is_active":      body.is_active,
        "note":           body.note,
    }})
    updated = await db.promo_codes.find_one({"id": code_id}, {"_id": 0})
    return updated

@api.delete("/admin/promo-codes/{code_id}")
async def admin_delete_promo_code(code_id: str, user: AdminUser):
    result = await db.promo_codes.delete_one({"id": code_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "প্রমো কোড পাওয়া যায়নি।")
    return {"ok": True}

# ── Reward / Coin System ──────────────────────────────────────────────────────

@api.get("/rewards/balance")
async def get_reward_balance(user: CurrentUser):
    doc = await db.reward_balances.find_one({"user_id": user["id"]}, {"_id": 0})
    return {"coins": int((doc or {}).get("coins", 0))}

@api.get("/rewards/daily-stats")
async def get_daily_stats(user: CurrentUser):
    """Return today's ad watch count and balance for the logged-in user."""
    from datetime import datetime as _dt, timezone as _tz
    today_start = _dt.now(_tz.utc).strftime("%Y-%m-%dT00:00:00")
    cfg_doc = await db.configs.find_one({"key": "reward_zone"}) or {}
    max_per_day = int(cfg_doc.get("max_ads_per_day", 0))  # 0 = unlimited
    today_count = await db.reward_transactions.count_documents({
        "user_id": user["id"],
        "type": "ad_watch",
        "created_at": {"$gte": today_start},
    })
    balance_doc = await db.reward_balances.find_one({"user_id": user["id"]}, {"_id": 0})
    # Time until next ad allowed
    last_doc = await db.reward_transactions.find_one(
        {"user_id": user["id"], "type": "ad_watch"},
        sort=[("created_at", -1)]
    )
    cooldown_remaining = 0
    if last_doc:
        cooldown_secs = int(cfg_doc.get("ad_watch_cooldown_seconds", 30))
        last_time = _dt.fromisoformat(last_doc["created_at"].replace("Z", "+00:00"))
        now_time  = _dt.now(_tz.utc)
        elapsed   = (now_time - last_time).total_seconds()
        cooldown_remaining = max(0, int(cooldown_secs - elapsed))
    unlimited = (max_per_day == 0)
    return {
        "coins":              int((balance_doc or {}).get("coins", 0)),
        "today_count":        today_count,
        "max_per_day":        max_per_day,
        "unlimited":          unlimited,
        "daily_remaining":    999999 if unlimited else max(0, max_per_day - today_count),
        "cooldown_remaining": cooldown_remaining,
        "coins_per_ad":       int(cfg_doc.get("coins_per_ad", 5)),
        "coins_per_taka":     int(cfg_doc.get("coins_per_taka", 10)),
        "min_cashout_coins":  int(cfg_doc.get("min_cashout_coins", 100)),
        "coins_per_redeem":   int(cfg_doc.get("coins_per_redeem", 50)),
        "promo_discount_type":  cfg_doc.get("promo_discount_type", "flat"),
        "promo_discount_value": float(cfg_doc.get("promo_discount_value", 50)),
    }

@api.post("/rewards/watch-ad")
async def earn_coins_from_ad(user: CurrentUser):
    from datetime import datetime as _dt, timezone as _tz
    cfg_doc = await db.configs.find_one({"key": "reward_zone"}) or {}
    coins_per_ad  = int(cfg_doc.get("coins_per_ad", 5))
    cooldown_secs = int(cfg_doc.get("ad_watch_cooldown_seconds", 30))
    max_per_day   = int(cfg_doc.get("max_ads_per_day", 0))  # 0 = unlimited

    # Daily limit check (skipped when max_per_day == 0)
    today_start = _dt.now(_tz.utc).strftime("%Y-%m-%dT00:00:00")
    today_count = await db.reward_transactions.count_documents({
        "user_id": user["id"],
        "type": "ad_watch",
        "created_at": {"$gte": today_start},
    })
    if max_per_day > 0 and today_count >= max_per_day:
        raise HTTPException(400, f"আজকের সীমা ({max_per_day}টি) শেষ হয়েছে। আগামীকাল আবার দেখুন।")

    # Cooldown check
    last_doc = await db.reward_transactions.find_one(
        {"user_id": user["id"], "type": "ad_watch"},
        sort=[("created_at", -1)]
    )
    if last_doc:
        last_time = _dt.fromisoformat(last_doc["created_at"].replace("Z", "+00:00"))
        now_time  = _dt.now(_tz.utc)
        if (now_time - last_time).total_seconds() < cooldown_secs:
            wait = int(cooldown_secs - (now_time - last_time).total_seconds())
            raise HTTPException(429, f"একটু অপেক্ষা করুন। {wait} সেকেন্ড বাকি।")

    await db.reward_balances.update_one(
        {"user_id": user["id"]},
        {"$inc": {"coins": coins_per_ad}, "$set": {"user_id": user["id"]}},
        upsert=True
    )
    await db.reward_transactions.insert_one({
        "id":         str(uuid.uuid4()),
        "user_id":    user["id"],
        "type":       "ad_watch",
        "coins":      coins_per_ad,
        "created_at": now_iso(),
    })
    balance_doc = await db.reward_balances.find_one({"user_id": user["id"]}, {"_id": 0})
    return {
        "ok":           True,
        "coins_earned": coins_per_ad,
        "total_coins":  int(balance_doc.get("coins", 0)),
        "today_count":  today_count + 1,
        "max_per_day":  max_per_day,
    }

@api.post("/rewards/redeem")
async def redeem_coins_for_promo(user: CurrentUser):
    cfg_doc = await db.configs.find_one({"key": "reward_zone"}) or {}
    coins_per_redeem = int(cfg_doc.get("coins_per_redeem", 50))
    promo_discount   = float(cfg_doc.get("promo_discount_value", 50))
    promo_type       = cfg_doc.get("promo_discount_type", "flat")
    balance_doc      = await db.reward_balances.find_one({"user_id": user["id"]})
    current_coins    = int((balance_doc or {}).get("coins", 0))
    if current_coins < coins_per_redeem:
        raise HTTPException(400, f"পর্যাপ্ত কয়েন নেই। প্রয়োজন: {coins_per_redeem}, আপনার: {current_coins}")
    import random as _rand, string as _str
    code = "RWD" + "".join(_rand.choices(_str.ascii_uppercase + _str.digits, k=6))
    await db.reward_balances.update_one({"user_id": user["id"]}, {"$inc": {"coins": -coins_per_redeem}})
    promo_doc = {
        "id":              str(uuid.uuid4()),
        "code":            code,
        "discount_type":   promo_type,
        "discount_value":  promo_discount,
        "min_order":       0,
        "max_uses":        1,
        "is_active":       True,
        "note":            f"রিওয়ার্ড জোন — {user.get('name', '')}",
        "used_count":      0,
        "created_by_user": user["id"],
        "created_at":      now_iso(),
    }
    await db.promo_codes.insert_one(promo_doc)
    await db.reward_transactions.insert_one({
        "id":         str(uuid.uuid4()),
        "user_id":    user["id"],
        "type":       "redeem",
        "coins":      -coins_per_redeem,
        "promo_code": code,
        "created_at": now_iso(),
    })
    new_balance = await db.reward_balances.find_one({"user_id": user["id"]}, {"_id": 0})
    return {
        "ok":               True,
        "promo_code":       code,
        "discount_type":    promo_type,
        "discount_value":   promo_discount,
        "coins_spent":      coins_per_redeem,
        "remaining_coins":  int((new_balance or {}).get("coins", 0)),
    }

@api.get("/admin/reward-settings")
async def get_reward_settings(user: AdminUser):
    doc = await db.configs.find_one({"key": "reward_zone"}, {"_id": 0}) or {}
    return doc

@api.put("/admin/reward-settings")
async def update_reward_settings(body: dict, user: AdminUser):
    body["key"] = "reward_zone"
    await db.configs.update_one({"key": "reward_zone"}, {"$set": body}, upsert=True)
    return {"ok": True}


# ── Cashout (coins → real money) ──────────────────────────────
class CashoutRequestIn(BaseModel):
    coins: int
    payment_method: str   # "bkash" | "nagad" | "rocket"
    payment_number: str

@api.post("/rewards/cashout")
async def request_cashout(body: CashoutRequestIn, user: CurrentUser):
    """User submits a cashout request. Coins are deducted immediately; refunded on rejection."""
    cfg_doc = await db.configs.find_one({"key": "reward_zone"}) or {}
    coins_per_taka    = int(cfg_doc.get("coins_per_taka", 10))
    min_cashout_coins = int(cfg_doc.get("min_cashout_coins", 100))

    if body.coins < min_cashout_coins:
        raise HTTPException(400, f"সর্বনিম্ন ক্যাশআউট {min_cashout_coins} কয়েন (৳{min_cashout_coins // coins_per_taka})")
    if body.coins % coins_per_taka != 0:
        raise HTTPException(400, f"কয়েনের পরিমাণ অবশ্যই {coins_per_taka}-এর গুণিতক হতে হবে")
    if body.payment_method not in ("bkash", "nagad", "rocket"):
        raise HTTPException(400, "পেমেন্ট মেথড ভুল। bkash, nagad বা rocket দিন।")
    if not body.payment_number.strip():
        raise HTTPException(400, "মোবাইল নম্বর দিন")

    # Check balance
    balance_doc   = await db.reward_balances.find_one({"user_id": user["id"]})
    current_coins = int((balance_doc or {}).get("coins", 0))
    if current_coins < body.coins:
        raise HTTPException(400, f"পর্যাপ্ত কয়েন নেই। আপনার: {current_coins}, প্রয়োজন: {body.coins}")

    taka_amount = body.coins // coins_per_taka
    req_id = str(uuid.uuid4())

    # Deduct coins immediately
    await db.reward_balances.update_one(
        {"user_id": user["id"]},
        {"$inc": {"coins": -body.coins}},
    )
    doc = {
        "id":             req_id,
        "user_id":        user["id"],
        "user_name":      user.get("name", ""),
        "user_email":     user.get("email", ""),
        "coins":          body.coins,
        "taka_amount":    taka_amount,
        "payment_method": body.payment_method,
        "payment_number": body.payment_number.strip(),
        "status":         "pending",
        "admin_note":     "",
        "created_at":     now_iso(),
        "updated_at":     now_iso(),
    }
    await db.cashout_requests.insert_one(doc)
    await db.reward_transactions.insert_one({
        "id":         str(uuid.uuid4()),
        "user_id":    user["id"],
        "type":       "cashout_request",
        "coins":      -body.coins,
        "ref_id":     req_id,
        "created_at": now_iso(),
    })
    new_bal = await db.reward_balances.find_one({"user_id": user["id"]}, {"_id": 0})
    return {
        "ok":            True,
        "id":            req_id,
        "taka_amount":   taka_amount,
        "coins_spent":   body.coins,
        "remaining_coins": int((new_bal or {}).get("coins", 0)),
    }

@api.get("/rewards/cashout-history")
async def cashout_history(user: CurrentUser):
    docs = await db.cashout_requests.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return docs

@api.get("/admin/cashout-requests")
async def admin_list_cashout(admin: AdminUser, status: str = "all"):
    q = {} if status == "all" else {"status": status}
    docs = await db.cashout_requests.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs

@api.put("/admin/cashout-requests/{req_id}/approve")
async def admin_approve_cashout(req_id: str, body: dict, admin: AdminUser):
    doc = await db.cashout_requests.find_one({"id": req_id})
    if not doc:
        raise HTTPException(404, "রিকোয়েস্ট পাওয়া যায়নি")
    if doc["status"] != "pending":
        raise HTTPException(400, f"এই রিকোয়েস্ট ইতিমধ্যে {doc['status']} করা হয়েছে")
    await db.cashout_requests.update_one(
        {"id": req_id},
        {"$set": {"status": "approved", "admin_note": body.get("note", ""), "updated_at": now_iso()}},
    )
    return {"ok": True}

@api.put("/admin/cashout-requests/{req_id}/reject")
async def admin_reject_cashout(req_id: str, body: dict, admin: AdminUser):
    doc = await db.cashout_requests.find_one({"id": req_id})
    if not doc:
        raise HTTPException(404, "রিকোয়েস্ট পাওয়া যায়নি")
    if doc["status"] != "pending":
        raise HTTPException(400, f"এই রিকোয়েস্ট ইতিমধ্যে {doc['status']} করা হয়েছে")
    # Refund coins
    await db.reward_balances.update_one(
        {"user_id": doc["user_id"]},
        {"$inc": {"coins": doc["coins"]}, "$set": {"user_id": doc["user_id"]}},
        upsert=True,
    )
    await db.cashout_requests.update_one(
        {"id": req_id},
        {"$set": {"status": "rejected", "admin_note": body.get("note", ""), "updated_at": now_iso()}},
    )
    await db.reward_transactions.insert_one({
        "id":         str(uuid.uuid4()),
        "user_id":    doc["user_id"],
        "type":       "cashout_refund",
        "coins":      doc["coins"],
        "ref_id":     req_id,
        "created_at": now_iso(),
    })
    return {"ok": True}

# ── Reward Zone — Admin-managed video/image ads ───────────────

class RewardAdIn(BaseModel):
    title: str
    ad_type: str = "image"          # "image" | "video" | "youtube"
    media_url: str
    thumbnail_url: str = ""
    duration_seconds: int = 15
    is_active: bool = True
    order: int = 0
    description: str = ""

@api.get("/rewards/ads")
async def get_reward_ads_public(user: CurrentUser):
    """Active reward-zone ads visible to students."""
    docs = await db.reward_ads.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(200)
    return docs

@api.get("/admin/reward-ads")
async def admin_list_reward_ads(user: AdminUser):
    docs = await db.reward_ads.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    return docs

@api.post("/admin/reward-ads")
async def admin_create_reward_ad(body: RewardAdIn, user: AdminUser):
    doc = {
        "id":               str(uuid.uuid4()),
        "title":            body.title,
        "ad_type":          body.ad_type,
        "media_url":        body.media_url,
        "thumbnail_url":    body.thumbnail_url,
        "duration_seconds": body.duration_seconds,
        "is_active":        body.is_active,
        "order":            body.order,
        "description":      body.description,
        "created_at":       now_iso(),
    }
    await db.reward_ads.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/admin/reward-ads/{ad_id}")
async def admin_update_reward_ad(ad_id: str, body: RewardAdIn, user: AdminUser):
    doc = await db.reward_ads.find_one({"id": ad_id})
    if not doc:
        raise HTTPException(404, "বিজ্ঞাপন পাওয়া যায়নি")
    await db.reward_ads.update_one({"id": ad_id}, {"$set": {
        "title":            body.title,
        "ad_type":          body.ad_type,
        "media_url":        body.media_url,
        "thumbnail_url":    body.thumbnail_url,
        "duration_seconds": body.duration_seconds,
        "is_active":        body.is_active,
        "order":            body.order,
        "description":      body.description,
    }})
    updated = await db.reward_ads.find_one({"id": ad_id}, {"_id": 0})
    return updated

@api.delete("/admin/reward-ads/{ad_id}")
async def admin_delete_reward_ad(ad_id: str, user: AdminUser):
    result = await db.reward_ads.delete_one({"id": ad_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "বিজ্ঞাপন পাওয়া যায়নি")
    return {"ok": True}

# ── Reward Zone — Admin manually give promo code ──────────────

@api.post("/admin/reward-zone/give-promo")
async def admin_give_promo_to_student(body: dict, user: AdminUser):
    """Admin manually gives a promo code to a specific student."""
    student_id     = (body.get("student_id") or "").strip()
    discount_type  = body.get("discount_type", "flat")
    discount_value = float(body.get("discount_value") or 50)
    note           = body.get("note", "")

    if not student_id:
        raise HTTPException(400, "স্টুডেন্ট আইডি দিন")

    student = await db.users.find_one({"student_id": student_id})
    if not student:
        raise HTTPException(404, f"স্টুডেন্ট '{student_id}' পাওয়া যায়নি")

    import random as _rand, string as _str
    code = "GIFT-" + "".join(_rand.choices(_str.ascii_uppercase + _str.digits, k=7))
    promo_doc = {
        "id":                   str(uuid.uuid4()),
        "code":                 code,
        "discount_type":        discount_type,
        "discount_value":       discount_value,
        "min_order":            0,
        "max_uses":             1,
        "used_count":           0,
        "is_active":            True,
        "note":                 note or f"এডমিন গিফট — {student.get('name', student_id)}",
        "given_to_student_id":  student_id,
        "given_by_admin_id":    user["id"],
        "source":               "admin_gift",
        "created_at":           now_iso(),
    }
    await db.promo_codes.insert_one(promo_doc)
    return {
        "ok":           True,
        "code":         code,
        "student_name": student.get("name", ""),
        "student_id":   student_id,
        "discount_type":  discount_type,
        "discount_value": discount_value,
    }

# ── Reward Zone — student coin history ────────────────────────

@api.get("/rewards/history")
async def get_reward_history(user: CurrentUser):
    docs = await db.reward_transactions.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return docs


@api.get("/rewards/leaderboard")
async def get_reward_leaderboard(user: CurrentUser):
    """Return top 50 users by coin balance for the global leaderboard."""
    balances = await db.reward_balances.find({}, {"_id": 0}).sort("coins", -1).to_list(50)
    result = []
    for i, bal in enumerate(balances):
        uid = bal.get("user_id")
        if not uid:
            continue
        u = await db.users.find_one({"id": uid}, {"_id": 0, "name": 1, "email": 1, "avatar": 1})
        if not u:
            continue
        ad_count    = await db.reward_transactions.count_documents({"user_id": uid, "type": "ad_watch"})
        order_count = await db.orders.count_documents({"user_id": uid})
        result.append({
            "rank":       i + 1,
            "user_id":    uid,
            "name":       u.get("name", "অজানা"),
            "avatar":     u.get("avatar", ""),
            "coins":      int(bal.get("coins", 0)),
            "ad_watches": ad_count,
            "orders":     order_count,
            "is_me":      uid == user["id"],
        })
    return result


@api.get("/rewards/my-promo-codes")
async def get_my_promo_codes(user: CurrentUser):
    """Return all promo codes earned by this user via reward redemption."""
    docs = await db.promo_codes.find(
        {"created_by_user": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return docs


# ──────────────────────────────────────────────────────────────
# SSLCommerz payment gateway integration
# ──────────────────────────────────────────────────────────────

class SSLCommerzInitIn(BaseModel):
    course_id: Optional[str] = None
    subscription_plan_id: Optional[str] = None


@api.post("/payments/sslcommerz/init")
async def sslcommerz_init(body: SSLCommerzInitIn, user: CurrentUser):
    """Initialize SSLCommerz session → returns gateway redirect URL."""
    cfg = await db.configs.find_one({"key": "payment_gateways"}, {"_id": 0}) or {}
    store_id     = cfg.get("sslcommerz_store_id", "")
    store_passwd = cfg.get("sslcommerz_store_password", "")
    is_sandbox   = cfg.get("sslcommerz_mode", "sandbox") != "live"

    if not store_id or not store_passwd:
        raise HTTPException(400, "SSLCommerz কনফিগার করা হয়নি। এডমিন প্যানেল → পেমেন্ট গেটওয়ে সেটিংস থেকে Store ID ও Password দিন।")

    amount       = 0.0
    product_name = ""
    tran_id      = str(uuid.uuid4())

    if body.course_id:
        course = await db.courses.find_one({"id": body.course_id}, {"_id": 0})
        if not course:
            raise HTTPException(404, "কোর্স পাওয়া যায়নি")
        if await db.enrollments.find_one({"user_id": user["id"], "course_id": body.course_id}):
            raise HTTPException(400, "আপনি ইতিমধ্যে এই কোর্সে ভর্তি আছেন")
        amount       = float(course.get("price", 0))
        product_name = course.get("title_bn") or course.get("title_en", "কোর্স")
    elif body.subscription_plan_id:
        plan = await db.subscription_plans.find_one({"id": body.subscription_plan_id}, {"_id": 0})
        if not plan:
            raise HTTPException(404, "সাবস্ক্রিপশন প্ল্যান পাওয়া যায়নি")
        amount       = float(plan.get("price", 0))
        product_name = plan.get("name_bn", "সাবস্ক্রিপশন")
    else:
        raise HTTPException(400, "course_id অথবা subscription_plan_id দিন")

    if amount < 10:
        raise HTTPException(400, "পেমেন্টের পরিমাণ কমপক্ষে ১০ টাকা হতে হবে")

    # Store payment intent so IPN & success redirect can fulfill it
    intent_doc = {
        "id": tran_id,
        "user_id": user["id"],
        "user_email": user.get("email", ""),
        "user_name":  user.get("name", ""),
        "user_phone": user.get("phone", "") or "01700000000",
        "course_id":             body.course_id,
        "subscription_plan_id":  body.subscription_plan_id,
        "product_name": product_name,
        "amount":  amount,
        "gateway": "sslcommerz",
        "status":  "initiated",
        "created_at": now_iso(),
    }
    await db.payment_intents.insert_one(intent_doc)

    # Determine base URL for SSLCommerz callbacks.
    # On Replit, /api is proxied through the frontend domain — use _site_url() so
    # callbacks always hit the publicly reachable URL regardless of environment.
    base_url = _site_url()

    ssl_url = (
        "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"
        if is_sandbox else
        "https://securepay.sslcommerz.com/gwprocess/v4/api.php"
    )

    payload = {
        "store_id":    store_id,
        "store_passwd": store_passwd,
        "total_amount": amount,
        "currency":    "BDT",
        "tran_id":     tran_id,
        "success_url": f"{base_url}/api/payments/sslcommerz/success",
        "fail_url":    f"{base_url}/api/payments/sslcommerz/fail",
        "cancel_url":  f"{base_url}/api/payments/sslcommerz/cancel",
        "ipn_url":     f"{base_url}/api/payments/sslcommerz/ipn",
        "cus_name":    user.get("name", "Customer"),
        "cus_email":   user.get("email", "customer@bii.edu"),
        "cus_phone":   (user.get("phone") or "01700000000"),
        "cus_add1":    (user.get("address") or "Bangladesh"),
        "cus_city":    "Dhaka",
        "cus_country": "Bangladesh",
        "product_name":     product_name,
        "product_category": "Education",
        "product_profile":  "non-physical-goods",
        "shipping_method":  "NO",
        "num_of_item":      1,
    }

    try:
        resp = await asyncio.to_thread(
            lambda: requests.post(ssl_url, data=payload, timeout=20)
        )
        data = resp.json()
    except Exception as exc:
        logging.error(f"SSLCommerz init request failed: {exc}")
        raise HTTPException(502, "SSLCommerz সার্ভারে সংযোগ করা সম্ভব হয়নি। পরে চেষ্টা করুন।")

    if data.get("status") != "SUCCESS":
        raise HTTPException(502, f"SSLCommerz ত্রুটি: {data.get('failedreason', 'Unknown error')}")

    return {"gateway_url": data["GatewayPageURL"], "tran_id": tran_id}


def _sslcommerz_verify_sync(val_id: str, store_id: str, store_passwd: str, is_sandbox: bool) -> bool:
    """Verify payment validity via SSLCommerz validation API (synchronous)."""
    url = (
        "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php"
        if is_sandbox else
        "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php"
    )
    r = requests.get(url, params={
        "val_id": val_id,
        "store_id": store_id,
        "store_passwd": store_passwd,
        "format": "json",
    }, timeout=15)
    return r.json().get("status") in ("VALID", "VALIDATED")


async def _fulfill_payment_intent(tran_id: str) -> bool:
    """
    Fulfill a verified payment intent:
    - enroll user in course, OR
    - activate subscription.
    Returns True if fulfilled, False if already done or not found.
    """
    intent = await db.payment_intents.find_one({"id": tran_id})
    if not intent or intent.get("status") == "fulfilled":
        return False

    await db.payment_intents.update_one(
        {"id": tran_id},
        {"$set": {"status": "fulfilled", "fulfilled_at": now_iso()}}
    )

    # ── Course enrollment ────────────────────────────────────────────────────
    if intent.get("course_id"):
        cid = intent["course_id"]
        if not await db.enrollments.find_one({"user_id": intent["user_id"], "course_id": cid}):
            await db.enrollments.insert_one({
                "id": str(uuid.uuid4()),
                "user_id":     intent["user_id"],
                "course_id":   cid,
                "enrolled_at": now_iso(),
                "payment_status": "success",
                "amount":         intent["amount"],
                "transaction_id": tran_id,
                "payment_method": "sslcommerz",
            })
        # User notification
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id":  intent["user_id"],
            "title_bn": "✅ কোর্সে ভর্তি সফল!",
            "title_en": "✅ Enrollment Successful!",
            "body_bn":  f"আপনি '{intent.get('product_name','')}' কোর্সে সফলভাবে ভর্তি হয়েছেন। এখনই পড়াশোনা শুরু করুন।",
            "body_en":  f"You are now enrolled in '{intent.get('product_name','')}'. Start learning now.",
            "created_at": now_iso(),
        })

    # ── Subscription activation ───────────────────────────────────────────────
    if intent.get("subscription_plan_id"):
        plan = await db.subscription_plans.find_one(
            {"id": intent["subscription_plan_id"]}, {"_id": 0}
        )
        if plan:
            expiry = (
                datetime.now(timezone.utc) + timedelta(days=int(plan.get("duration_days", 30)))
            ).isoformat()
            await db.subscriptions.insert_one({
                "id": str(uuid.uuid4()),
                "user_id":    intent["user_id"],
                "plan_id":    intent["subscription_plan_id"],
                "plan_name":  plan.get("name_bn", ""),
                "amount":     intent["amount"],
                "transaction_id": tran_id,
                "gateway":    "sslcommerz",
                "started_at": now_iso(),
                "expires_at": expiry,
                "status":     "active",
            })
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id":  intent["user_id"],
                "title_bn": "✅ সাবস্ক্রিপশন সক্রিয়!",
                "title_en": "✅ Subscription Activated!",
                "body_bn":  f"আপনার '{plan.get('name_bn','')}' সাবস্ক্রিপশন সফলভাবে সক্রিয় হয়েছে।",
                "body_en":  f"Your '{plan.get('name_bn','')}' subscription is now active.",
                "created_at": now_iso(),
            })

    return True


@api.post("/payments/sslcommerz/ipn")
async def sslcommerz_ipn(request: Request):
    """SSLCommerz Instant Payment Notification (IPN) webhook — auto-enrolls on success."""
    form     = await request.form()
    tran_id  = form.get("tran_id", "")
    val_id   = form.get("val_id", "")
    status   = form.get("status", "")

    if status not in ("VALID", "VALIDATED"):
        return {"ok": False, "reason": "status not valid"}

    cfg = await db.configs.find_one({"key": "payment_gateways"}, {"_id": 0}) or {}
    store_id     = cfg.get("sslcommerz_store_id", "")
    store_passwd = cfg.get("sslcommerz_store_password", "")
    is_sandbox   = cfg.get("sslcommerz_mode", "sandbox") != "live"

    if store_id and store_passwd:
        try:
            valid = await asyncio.to_thread(
                _sslcommerz_verify_sync, val_id, store_id, store_passwd, is_sandbox
            )
            if valid:
                await _fulfill_payment_intent(tran_id)
        except Exception as exc:
            logging.warning(f"SSLCommerz IPN verification failed: {exc}")

    return {"ok": True}


@api.get("/payments/sslcommerz/success")
async def sslcommerz_success(request: Request):
    """SSLCommerz redirects user here after successful payment."""
    from starlette.responses import RedirectResponse
    params   = dict(request.query_params)
    tran_id  = params.get("tran_id", "")
    val_id   = params.get("val_id", tran_id)

    cfg = await db.configs.find_one({"key": "payment_gateways"}, {"_id": 0}) or {}
    store_id     = cfg.get("sslcommerz_store_id", "")
    store_passwd = cfg.get("sslcommerz_store_password", "")
    is_sandbox   = cfg.get("sslcommerz_mode", "sandbox") != "live"

    if tran_id and store_id and store_passwd:
        try:
            valid = await asyncio.to_thread(
                _sslcommerz_verify_sync, val_id, store_id, store_passwd, is_sandbox
            )
            if valid:
                await _fulfill_payment_intent(tran_id)
        except Exception as exc:
            logging.warning(f"SSLCommerz success verify failed: {exc}")

    intent    = await db.payment_intents.find_one({"id": tran_id}, {"_id": 0})
    course_id = (intent or {}).get("course_id", "")
    redir = f"/payment/success?gateway=sslcommerz&tran={tran_id}"
    if course_id:
        redir += f"&course={course_id}"
    return RedirectResponse(redir)


@api.get("/payments/sslcommerz/fail")
async def sslcommerz_fail():
    from starlette.responses import RedirectResponse
    return RedirectResponse("/payment?error=payment_failed")


@api.get("/payments/sslcommerz/cancel")
async def sslcommerz_cancel():
    from starlette.responses import RedirectResponse
    return RedirectResponse("/payment?error=payment_cancelled")


@api.get("/payments/my-intents")
async def my_payment_intents(user: CurrentUser):
    """Return SSLCommerz payment intents for the logged-in user."""
    intents = await db.payment_intents.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return intents


# ──────────────────────────────────────────────────────────────
# Subscription plans & user subscriptions
# ──────────────────────────────────────────────────────────────

class SubscriptionPlanIn(BaseModel):
    name_bn: str
    name_en: Optional[str] = ""
    description_bn: Optional[str] = ""
    description_en: Optional[str] = ""
    price: float = 0
    duration_days: int = 30
    features: List[str] = []
    is_active: bool = True


@api.get("/subscription-plans")
async def list_subscription_plans():
    plans = await db.subscription_plans.find(
        {"is_active": True}, {"_id": 0}
    ).sort("price", 1).to_list(50)
    return plans


@api.get("/admin/subscription-plans")
async def admin_list_subscription_plans(admin: AdminUser):
    return await db.subscription_plans.find({}, {"_id": 0}).sort("price", 1).to_list(50)


@api.post("/subscription-plans")
async def create_subscription_plan(body: SubscriptionPlanIn, admin: AdminUser):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": now_iso()}
    await db.subscription_plans.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/subscription-plans/{pid}")
async def update_subscription_plan(pid: str, body: dict, admin: AdminUser):
    body.pop("id", None)
    await db.subscription_plans.update_one({"id": pid}, {"$set": body})
    return await db.subscription_plans.find_one({"id": pid}, {"_id": 0})


@api.delete("/subscription-plans/{pid}")
async def delete_subscription_plan(pid: str, admin: AdminUser):
    await db.subscription_plans.delete_one({"id": pid})
    return {"ok": True}


@api.get("/my-subscription")
async def my_subscription(user: CurrentUser):
    """Return user's active subscription (most recent)."""
    sub = await db.subscriptions.find_one(
        {"user_id": user["id"], "status": "active"},
        {"_id": 0},
        sort=[("started_at", -1)],
    )
    return sub or {}


@api.get("/admin/subscriptions")
async def admin_list_subscriptions(admin: AdminUser):
    return await db.subscriptions.find({}, {"_id": 0}).sort("started_at", -1).to_list(500)


# ──────────────────────────────────────────────────────────────
# Revenue analytics (admin)
# ──────────────────────────────────────────────────────────────

@api.get("/admin/revenue-stats")
async def revenue_stats(admin: AdminUser):
    """Aggregated revenue overview for the admin dashboard."""

    # Manual payment requests (bKash / Nagad / Rocket)
    pipe_manual = [
        {"$match": {"status": "approved"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
    ]
    r_manual = (await db.payment_requests.aggregate(pipe_manual).to_list(1) or [{}])[0]

    # Shop orders
    pipe_shop = [
        {"$match": {"payment_status": {"$ne": "unpaid"}}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}},
    ]
    r_shop = (await db.orders.aggregate(pipe_shop).to_list(1) or [{}])[0]

    # SSLCommerz / online gateway
    pipe_ssl = [
        {"$match": {"status": "fulfilled"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
    ]
    r_ssl = (await db.payment_intents.aggregate(pipe_ssl).to_list(1) or [{}])[0]

    # Subscriptions
    pipe_sub = [
        {"$match": {}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
    ]
    r_sub = (await db.subscriptions.aggregate(pipe_sub).to_list(1) or [{}])[0]

    # Monthly breakdown — last 6 months
    now_dt = datetime.now(timezone.utc)
    monthly = []
    for i in range(5, -1, -1):
        # first day of the month i months ago
        tmp        = now_dt - timedelta(days=30 * i)
        m_start    = tmp.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        m_end      = (m_start + timedelta(days=32)).replace(day=1)
        label      = m_start.strftime("%b %Y")
        s, e       = m_start.isoformat(), m_end.isoformat()

        mc = (await db.payment_requests.aggregate([
            {"$match": {"status": "approved", "submitted_at": {"$gte": s, "$lt": e}}},
            {"$group": {"_id": None, "t": {"$sum": "$amount"}}},
        ]).to_list(1) or [{}])[0]
        ms = (await db.orders.aggregate([
            {"$match": {"payment_status": {"$ne": "unpaid"}, "created_at": {"$gte": s, "$lt": e}}},
            {"$group": {"_id": None, "t": {"$sum": "$total"}}},
        ]).to_list(1) or [{}])[0]
        mg = (await db.payment_intents.aggregate([
            {"$match": {"status": "fulfilled", "created_at": {"$gte": s, "$lt": e}}},
            {"$group": {"_id": None, "t": {"$sum": "$amount"}}},
        ]).to_list(1) or [{}])[0]

        monthly.append({
            "month":   label,
            "courses": mc.get("t", 0),
            "shop":    ms.get("t", 0),
            "gateway": mg.get("t", 0),
        })

    pending_count  = await db.payment_requests.count_documents({"status": "pending"})
    active_subs    = await db.subscriptions.count_documents({"status": "active"})
    total_enrolled = await db.enrollments.count_documents({})

    return {
        "total_revenue":          (r_manual.get("total", 0) + r_shop.get("total", 0)
                                   + r_ssl.get("total", 0) + r_sub.get("total", 0)),
        "manual_payment_revenue": r_manual.get("total", 0),
        "manual_payment_count":   r_manual.get("count", 0),
        "shop_revenue":           r_shop.get("total", 0),
        "shop_orders":            r_shop.get("count", 0),
        "gateway_revenue":        r_ssl.get("total", 0),
        "gateway_transactions":   r_ssl.get("count", 0),
        "subscription_revenue":   r_sub.get("total", 0),
        "subscription_count":     r_sub.get("count", 0),
        "active_subscriptions":   active_subs,
        "pending_payments":       pending_count,
        "total_enrollments":      total_enrolled,
        "monthly":                monthly,
    }


# Single-document configs editable from admin panel
for _cfg in [
    "homepage", "welcome_page", "theme", "seo", "firebase",
    "security", "maintenance", "payment_gateways", "social_links", "contact_extra",
    "ads",          # AdSense / AdMob configuration
    "legal_terms",  # Terms of Service
    "legal_privacy",# Privacy Policy
    "legal_refund", # Refund Policy
]:
    register_config(_cfg)


# ──────────────────────────────────────────────────────────────
# Custom admin endpoints
# ──────────────────────────────────────────────────────────────
class TeacherIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = ""
    address: Optional[str] = ""
    bio: Optional[str] = ""
    specialization: Optional[str] = ""
    photo: Optional[str] = ""


@api.get("/teachers")
async def list_teachers():
    teachers = await db.users.find({"role": "teacher"}, {"_id": 0, "password_hash": 0}).to_list(500)
    return teachers


@api.post("/teachers")
async def create_teacher(body: TeacherIn, admin: AdminUser):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "এই ইমেইল ইতিমধ্যে নিবন্ধিত")
    doc = {
        "id": str(uuid.uuid4()),
        "name": body.name.strip(),
        "email": email,
        "password_hash": hash_password(body.password),
        "role": "teacher",
        "student_id": f"T{datetime.now(timezone.utc).year}{(await db.users.count_documents({'role':'teacher'})) + 1:03d}",
        "phone": body.phone or "",
        "address": body.address or "",
        "bio": body.bio or "",
        "specialization": body.specialization or "",
        "profile_photo": body.photo or "",
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    await log_activity(admin["id"], "create_teacher", doc["id"])
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


@api.put("/teachers/{tid}")
async def update_teacher(tid: str, body: dict, admin: AdminUser):
    body.pop("password_hash", None)
    body.pop("role", None)
    body.pop("id", None)
    if body.get("password"):
        body["password_hash"] = hash_password(body.pop("password"))
    res = await db.users.update_one({"id": tid, "role": "teacher"}, {"$set": body})
    if res.matched_count == 0:
        raise HTTPException(404, "শিক্ষক পাওয়া যায়নি")
    u = await db.users.find_one({"id": tid}, {"_id": 0, "password_hash": 0})
    return u


@api.delete("/teachers/{tid}")
async def delete_teacher(tid: str, admin: AdminUser):
    res = await db.users.delete_one({"id": tid, "role": "teacher"})
    return {"ok": True, "deleted": res.deleted_count}


# Admins management — super_admin only
@api.get("/admins")
async def list_admins(super_admin: dict = Depends(require_super_admin)):
    return await db.users.find(
        {"role": {"$in": ["admin", "super_admin"]}},
        {"_id": 0, "password_hash": 0},
    ).to_list(200)


class AdminIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    permissions: list = []


@api.post("/admins")
async def create_admin(body: AdminIn, super_admin: dict = Depends(require_super_admin)):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "এই ইমেইল ইতিমধ্যে নিবন্ধিত")
    doc = {
        "id": str(uuid.uuid4()),
        "name": body.name.strip(),
        "email": email,
        "password_hash": hash_password(body.password),
        "role": "admin",
        "permissions": body.permissions or ["dashboard", "students", "courses", "content"],
        "student_id": "ADMIN",
        "phone": "", "address": "", "profile_photo": "",
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    await log_activity(super_admin["id"], "create_admin", doc["id"])
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


@api.put("/admins/{aid}")
async def update_admin(aid: str, body: dict, super_admin: dict = Depends(require_super_admin)):
    body.pop("password_hash", None)
    body.pop("id", None)
    if body.get("password"):
        body["password_hash"] = hash_password(body.pop("password"))
    # Don't allow downgrading super_admin from yourself
    if aid == super_admin["id"] and body.get("role") and body["role"] != "super_admin":
        raise HTTPException(400, "নিজের super_admin role পরিবর্তন করা যাবে না")
    res = await db.users.update_one({"id": aid}, {"$set": body})
    if res.matched_count == 0:
        raise HTTPException(404, "এডমিন পাওয়া যায়নি")
    return await db.users.find_one({"id": aid}, {"_id": 0, "password_hash": 0})


@api.delete("/admins/{aid}")
async def delete_admin(aid: str, super_admin: dict = Depends(require_super_admin)):
    if aid == super_admin["id"]:
        raise HTTPException(400, "নিজেকে ডিলিট করা যাবে না")
    target = await db.users.find_one({"id": aid})
    if not target:
        raise HTTPException(404, "এডমিন পাওয়া যায়নি")
    if target.get("role") == "super_admin":
        raise HTTPException(400, "Super Admin ডিলিট করা যাবে না")
    res = await db.users.delete_one({"id": aid, "role": "admin"})
    return {"ok": True, "deleted": res.deleted_count}


# Maintenance mode (public read)
@api.get("/maintenance-status")
async def maintenance_status():
    c = await db.configs.find_one({"key": "maintenance"}, {"_id": 0})
    return {"enabled": (c or {}).get("value", {}).get("enabled", False),
            "message": (c or {}).get("value", {}).get("message", "")}


# Media library — list all uploaded files (admin)
@api.get("/media")
async def list_media(admin: AdminUser):
    files = await db.files.find({"is_deleted": False}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    for f in files:
        f["url"] = f"/api/files/{f['id']}"
    return files


@api.delete("/media/{file_id}")
async def delete_media(file_id: str, admin: AdminUser):
    await db.files.update_one({"id": file_id}, {"$set": {"is_deleted": True}})
    return {"ok": True}


# Analytics
@api.get("/analytics")
async def analytics(admin: AdminUser):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    counts = {
        "students": await db.users.count_documents({"role": "student"}),
        "teachers": await db.users.count_documents({"role": "teacher"}),
        "admins": await db.users.count_documents({"role": {"$in": ["admin", "super_admin"]}}),
        "courses": await db.courses.count_documents({}),
        "lessons": await db.lessons.count_documents({}),
        "videos": await db.videos.count_documents({}),
        "pdfs": await db.pdfs.count_documents({}),
        "live_classes": await db.live_classes.count_documents({}),
        "monthly_quizzes": await db.monthly_quizzes.count_documents({}),
        "enrollments": await db.enrollments.count_documents({}),
        "blogs": await db.blogs.count_documents({}),
        "products": await db.products.count_documents({}),
        "orders": await db.orders.count_documents({}),
        "hadiths": await db.hadiths.count_documents({}),
        "notifications": await db.notifications.count_documents({}),
    }
    # revenue from successful enrollments
    pipeline = [{"$match": {"payment_status": "success"}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    rev = await db.enrollments.aggregate(pipeline).to_list(1)
    counts["revenue"] = rev[0]["total"] if rev else 0
    # logins last 7 days
    counts["logins_recent"] = await db.login_logs.count_documents({
        "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()}
    })
    counts["date"] = today
    return counts


# Activity logs
@api.get("/activity-logs")
async def activity_logs(admin: AdminUser, limit: int = 200):
    return await db.activity_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)


# Backup & restore (MOCKED: returns counts)
@api.get("/backup/export")
async def backup_export(super_admin: dict = Depends(require_super_admin)):
    """Returns a dump of all collections (sanitized)."""
    out = {}
    for col in ["users", "courses", "posts", "videos", "live_classes", "notifications",
                "course_categories", "chapters", "lessons", "pdfs", "assignments", "exams",
                "results", "certificates", "recorded_classes", "hadiths", "islamic_content",
                "blogs", "products", "orders", "payments", "banners", "sliders", "gallery",
                "downloads", "configs", "settings", "enrollments"]:
        docs = await db[col].find({}, {"_id": 0}).to_list(5000)
        # strip password hashes from users
        if col == "users":
            for d in docs:
                d.pop("password_hash", None)
        out[col] = docs
    return {"exported_at": now_iso(), "collections": out}


# ──────────────────────────────────────────────────────────────
# Health
# ──────────────────────────────────────────────────────────────
@api.get("/")
async def root():
    return {"ok": True, "service": "BII API"}


# ──────────────────────────────────────────────────────────────
# দোয়া ও যিকির API
# ──────────────────────────────────────────────────────────────

@api.get("/dua-categories")
async def list_dua_categories():
    cats = await db.dua_categories.find({}, {"_id": 0}).sort("sort_order", 1).to_list(200)
    return cats

@api.post("/dua-categories")
async def create_dua_category(body: DuaCategoryIn, admin=Depends(require_admin)):
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "created_at": now_iso()}
    await db.dua_categories.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/dua-categories/{cid}")
async def update_dua_category(cid: str, body: DuaCategoryIn, admin=Depends(require_admin)):
    await db.dua_categories.update_one({"id": cid}, {"$set": body.model_dump()})
    cat = await db.dua_categories.find_one({"id": cid}, {"_id": 0})
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat

@api.delete("/dua-categories/{cid}")
async def delete_dua_category(cid: str, admin=Depends(require_admin)):
    await db.dua_categories.delete_one({"id": cid})
    return {"deleted": True}

@api.get("/duas/today")
async def today_dua():
    dua = await db.duas.find_one({"is_today_dua": True}, {"_id": 0})
    if not dua:
        dua = await db.duas.find_one({}, {"_id": 0})
    return dua or {}

@api.get("/duas/popular")
async def popular_duas():
    duas = await db.duas.find({}, {"_id": 0}).sort("view_count", -1).to_list(20)
    return duas

@api.get("/duas/favorites")
async def get_favorite_duas(user: dict = Depends(get_current_user)):
    favs = await db.dua_favorites.find({"user_id": user["id"]}, {"_id": 0, "dua_id": 1}).to_list(500)
    ids = [f["dua_id"] for f in favs]
    if not ids:
        return []
    duas = await db.duas.find({"id": {"$in": ids}}, {"_id": 0}).to_list(500)
    return duas

@api.get("/duas")
async def list_duas(
    category: Optional[str] = None,
    search: Optional[str] = None,
    featured: Optional[bool] = None,
):
    filt: dict = {}
    if category:
        filt["category_id"] = category
    if featured:
        filt["is_featured"] = True
    if search:
        filt["$or"] = [
            {"title_bn":       {"$regex": re.escape(search), "$options": "i"}},
            {"meaning_bn":     {"$regex": re.escape(search), "$options": "i"}},
            {"transliteration":{"$regex": re.escape(search), "$options": "i"}},
        ]
    duas = await db.duas.find(filt, {"_id": 0}).sort("sort_order", 1).to_list(1000)
    return duas

@api.get("/duas/{did}")
async def get_dua(did: str):
    dua = await db.duas.find_one({"id": did}, {"_id": 0})
    if not dua:
        raise HTTPException(status_code=404, detail="Dua not found")
    return dua

@api.post("/duas/{did}/view")
async def view_dua(did: str, user: dict = Depends(get_current_user)):
    await db.duas.update_one({"id": did}, {"$inc": {"view_count": 1}})
    return {"ok": True}

@api.post("/duas/{did}/favorite")
async def add_favorite_dua(did: str, user: dict = Depends(get_current_user)):
    exists = await db.dua_favorites.find_one({"user_id": user["id"], "dua_id": did})
    if not exists:
        await db.dua_favorites.insert_one({
            "id": str(uuid.uuid4()), "user_id": user["id"],
            "dua_id": did, "created_at": now_iso()
        })
    return {"ok": True}

@api.delete("/duas/{did}/favorite")
async def remove_favorite_dua(did: str, user: dict = Depends(get_current_user)):
    await db.dua_favorites.delete_one({"user_id": user["id"], "dua_id": did})
    return {"ok": True}

@api.get("/duas/{did}/is-favorite")
async def is_favorite_dua(did: str, user: dict = Depends(get_current_user)):
    exists = await db.dua_favorites.find_one({"user_id": user["id"], "dua_id": did})
    return {"is_favorite": bool(exists)}

@api.post("/duas")
async def create_dua(body: DuaIn, admin=Depends(require_admin)):
    if body.is_today_dua:
        await db.duas.update_many({}, {"$set": {"is_today_dua": False}})
    doc = {"id": str(uuid.uuid4()), **body.model_dump(), "view_count": 0, "created_at": now_iso()}
    await db.duas.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/duas/{did}")
async def update_dua(did: str, body: DuaIn, admin=Depends(require_admin)):
    if body.is_today_dua:
        await db.duas.update_many({"id": {"$ne": did}}, {"$set": {"is_today_dua": False}})
    await db.duas.update_one({"id": did}, {"$set": body.model_dump()})
    dua = await db.duas.find_one({"id": did}, {"_id": 0})
    if not dua:
        raise HTTPException(status_code=404, detail="Dua not found")
    return dua

@api.delete("/duas/{did}")
async def delete_dua(did: str, admin=Depends(require_admin)):
    await db.duas.delete_one({"id": did})
    return {"deleted": True}


# ──────────────────────────────────────────────────────────────
# Startup
# ──────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    # initialize object storage (best-effort)
    try:
        init_storage()
    except Exception as e:
        logging.warning(f"storage init at startup: {e}")

    # Register Telegram webhook (best-effort — no crash if it fails).
    # SITE_URL must be the public production URL. REPLIT_DEV_DOMAIN is only
    # suitable for local preview and cannot receive callbacks after publish.
    try:
        tg_token  = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        tg_site   = os.environ.get("SITE_URL", "").strip().rstrip("/")
        tg_domain = os.environ.get("REPLIT_DEV_DOMAIN", "").strip().rstrip("/")
        webhook_base = tg_site or (f"https://{tg_domain}" if tg_domain else "")
        if tg_token and webhook_base:
            webhook_url    = f"{webhook_base}/api/telegram/webhook"
            webhook_secret = _tg_webhook_secret()
            r = requests.post(
                f"https://api.telegram.org/bot{tg_token}/setWebhook",
                json={
                    "url": webhook_url,
                    "secret_token": webhook_secret,
                    "allowed_updates": ["callback_query"],
                    # Do not silently discard a button press during a restart.
                    "drop_pending_updates": False,
                },
                timeout=10,
            )
            logging.info(
                "Telegram webhook registration: "
                f"url={webhook_url} response={r.json()}"
            )
    except Exception as e:
        logging.warning(f"Telegram webhook registration failed (non-critical): {e}")
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.courses.create_index("id", unique=True)
    await db.posts.create_index("id", unique=True)
    await db.videos.create_index("id", unique=True)

    # ── Repair orphaned cover_image references ─────────────────────────────
    # Courses may reference /api/files/<uuid> that no longer exist on disk
    # (e.g. after a project import where uploads/ wasn't fully carried over).
    # Clear those broken references so admins see a clean "no image" state
    # instead of a broken image — they can then re-upload.
    try:
        courses_with_img = await db.courses.find(
            {"cover_image": {"$regex": "^/api/files/"}}, {"_id": 0, "id": 1, "cover_image": 1}
        ).to_list(1000)
        for course in courses_with_img:
            file_id = course["cover_image"].split("/api/files/")[-1]
            file_rec = await db.files.find_one({"id": file_id, "is_deleted": False})
            if not file_rec:
                # File record missing — clear the broken reference
                await db.courses.update_one({"id": course["id"]}, {"$set": {"cover_image": ""}})
                logging.info(f"Cleared orphaned cover_image for course {course['id']} (file {file_id} not in DB)")
                continue
            dest = UPLOAD_DIR / Path(file_rec["storage_path"]).name
            if not dest.exists():
                # Record exists but file missing from disk — clear and mark deleted
                await db.courses.update_one({"id": course["id"]}, {"$set": {"cover_image": ""}})
                await db.files.update_one({"id": file_id}, {"$set": {"is_deleted": True}})
                logging.info(f"Cleared orphaned cover_image for course {course['id']} (file {file_id} missing from disk)")
    except Exception as _repair_err:
        logging.warning(f"cover_image repair pass failed (non-critical): {_repair_err}")
    # ──────────────────────────────────────────────────────────────────────

    # Seed super admin
    admin_email = os.environ.get("ADMIN_EMAIL", "bengaliislamicinstitute@gmail.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "BiI@SuperAdmin#2026")
    admin_name = os.environ.get("ADMIN_NAME", "Super Admin")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one(
            {
                "id": str(uuid.uuid4()),
                "name": admin_name,
                "email": admin_email,
                "password_hash": hash_password(admin_password),
                "role": "super_admin",
                "student_id": "ADMIN",
                "phone": "",
                "address": "",
                "profile_photo": "",
                "permissions": ["*"],
                "created_at": now_iso(),
            }
        )
    else:
        # ensure password is in sync with .env on every boot
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {
                "password_hash": hash_password(admin_password),
                "role": "super_admin",
                "permissions": ["*"],
                "name": existing.get("name") or admin_name,
            }},
        )
    # Start scheduled push notification background runner
    asyncio.create_task(_scheduled_push_runner())

    # Remove legacy admin@bii.edu if it exists (cleanup from earlier seed)
    legacy = await db.users.find_one({"email": "admin@bii.edu"})
    if legacy and legacy.get("email") != admin_email:
        await db.users.delete_one({"email": "admin@bii.edu"})

    # Seed sample data only if empty
    if await db.courses.count_documents({}) == 0:
        sample_courses = [
            {
                "id": str(uuid.uuid4()),
                "title_bn": "তাজবীদ সহ কুরআন তেলাওয়াত",
                "title_en": "Quran Recitation with Tajweed",
                "description_bn": "সঠিক উচ্চারণ ও মাখরাজ সহ কুরআন তেলাওয়াত শিখুন।",
                "description_en": "Learn Quranic recitation with proper Tajweed.",
                "price": 1500,
                "is_free": False,
                "cover_image": "https://images.pexels.com/photos/29607829/pexels-photo-29607829.jpeg",
                "instructor": "মাওলানা আব্দুল্লাহ",
                "duration": "৩ মাস",
                "created_at": now_iso(),
            },
            {
                "id": str(uuid.uuid4()),
                "title_bn": "প্রাথমিক আরবি ভাষা",
                "title_en": "Basic Arabic Language",
                "description_bn": "আরবি ভাষার বুনিয়াদী শিক্ষা — হরফ থেকে কথোপকথন।",
                "description_en": "Foundations of Arabic — from alphabet to conversation.",
                "price": 0,
                "is_free": True,
                "cover_image": "https://images.pexels.com/photos/5788294/pexels-photo-5788294.jpeg",
                "instructor": "ওস্তাদ ইব্রাহিম",
                "duration": "৬ মাস",
                "created_at": now_iso(),
            },
            {
                "id": str(uuid.uuid4()),
                "title_bn": "ফরয ইলম — দৈনন্দিন মাসাঈল",
                "title_en": "Daily Islamic Rulings",
                "description_bn": "নামায, রোযা, পবিত্রতা ও দৈনন্দিন জীবনের জরুরী মাসাঈল।",
                "description_en": "Essential daily Islamic rulings.",
                "price": 800,
                "is_free": False,
                "cover_image": "https://images.unsplash.com/photo-1519817650390-64a93db51149",
                "instructor": "মুফতি ইউসুফ",
                "duration": "২ মাস",
                "created_at": now_iso(),
            },
        ]
        await db.courses.insert_many(sample_courses)

        # sample posts linking to those courses
        await db.posts.insert_many(
            [
                {
                    "id": str(uuid.uuid4()),
                    "title_bn": "নতুন ব্যাচ — তাজবীদ কোর্স",
                    "title_en": "New Batch — Tajweed Course",
                    "body_bn": "আগামী মাস থেকে নতুন ব্যাচ শুরু হবে। এখনই ভর্তি হোন।",
                    "body_en": "New batch starts next month. Enroll now.",
                    "cover_image": "https://images.pexels.com/photos/29607829/pexels-photo-29607829.jpeg",
                    "course_id": sample_courses[0]["id"],
                    "cta_label_bn": "ভর্তি হোন",
                    "created_at": now_iso(),
                },
                {
                    "id": str(uuid.uuid4()),
                    "title_bn": "ফ্রি আরবি ভাষা কোর্স",
                    "title_en": "Free Arabic Language Course",
                    "body_bn": "সম্পূর্ণ ফ্রি কোর্স। সবার জন্য উন্মুক্ত।",
                    "body_en": "Completely free course, open to all.",
                    "cover_image": "https://images.pexels.com/photos/5788294/pexels-photo-5788294.jpeg",
                    "course_id": sample_courses[1]["id"],
                    "cta_label_bn": "যোগ দিন",
                    "created_at": now_iso(),
                },
            ]
        )

        await db.notifications.insert_one(
            {
                "id": str(uuid.uuid4()),
                "title_bn": "স্বাগতম!",
                "title_en": "Welcome!",
                "body_bn": "বাঙালি ইসলামিক ইনস্টিটিউট-এ আপনাকে স্বাগতম।",
                "body_en": "Welcome to Bengali Islamic Institute.",
                "created_at": now_iso(),
            }
        )


    # ── Seed দোয়া ক্যাটাগরি ও নমুনা দোয়া ──────────────────────────
    if await db.dua_categories.count_documents({}) == 0:
        seed_cats = [
            {"id": str(uuid.uuid4()), "name_bn": "সকাল-সন্ধ্যার যিকির", "icon": "🌅", "color": "#f59e0b", "sort_order": 1, "description": "সকাল ও সন্ধ্যার মাসনুন যিকির", "created_at": now_iso()},
            {"id": str(uuid.uuid4()), "name_bn": "দৈনন্দিন জীবনের দোয়া", "icon": "🤲", "color": "#10b981", "sort_order": 2, "description": "প্রতিদিনের কাজে পড়ার দোয়া", "created_at": now_iso()},
            {"id": str(uuid.uuid4()), "name_bn": "নামাজের দোয়া", "icon": "🕌", "color": "#3b82f6", "sort_order": 3, "description": "নামাজে পঠিত দোয়া ও তাশাহহুদ", "created_at": now_iso()},
            {"id": str(uuid.uuid4()), "name_bn": "খাওয়া-দাওয়ার দোয়া", "icon": "🍽️", "color": "#ef4444", "sort_order": 4, "description": "খাওয়ার আগে ও পরে পড়ার দোয়া", "created_at": now_iso()},
            {"id": str(uuid.uuid4()), "name_bn": "ঘুমের দোয়া", "icon": "🛏️", "color": "#8b5cf6", "sort_order": 5, "description": "ঘুমানোর আগে ও পরে পড়ার দোয়া", "created_at": now_iso()},
            {"id": str(uuid.uuid4()), "name_bn": "ঘরে প্রবেশ ও বের হওয়ার দোয়া", "icon": "🏠", "color": "#06b6d4", "sort_order": 6, "description": "ঘরে প্রবেশ ও বের হওয়ার সময়ের দোয়া", "created_at": now_iso()},
            {"id": str(uuid.uuid4()), "name_bn": "সফরের দোয়া", "icon": "🚗", "color": "#f97316", "sort_order": 7, "description": "যাত্রা শুরু ও শেষে পড়ার দোয়া", "created_at": now_iso()},
            {"id": str(uuid.uuid4()), "name_bn": "অসুস্থতার দোয়া", "icon": "🤒", "color": "#ec4899", "sort_order": 8, "description": "অসুস্থ হলে পড়ার দোয়া ও রুকইয়া", "created_at": now_iso()},
            {"id": str(uuid.uuid4()), "name_bn": "বিপদ ও দুশ্চিন্তার দোয়া", "icon": "😔", "color": "#64748b", "sort_order": 9, "description": "কষ্ট ও দুশ্চিন্তার সময়ের দোয়া", "created_at": now_iso()},
            {"id": str(uuid.uuid4()), "name_bn": "তাসবিহ ও যিকির", "icon": "📿", "color": "#84cc16", "sort_order": 10, "description": "সুবহানাল্লাহ, আলহামদুলিল্লাহ ও আল্লাহু আকবার", "created_at": now_iso()},
            {"id": str(uuid.uuid4()), "name_bn": "কুরআনের দোয়া", "icon": "📖", "color": "#14b8a6", "sort_order": 11, "description": "কুরআন কারিমে বর্ণিত দোয়াসমূহ", "created_at": now_iso()},
        ]
        await db.dua_categories.insert_many(seed_cats)

        # নমুনা দোয়া — প্রতিটি ক্যাটাগরি থেকে ২-৩টি
        morning_id = seed_cats[0]["id"]
        daily_id   = seed_cats[1]["id"]
        prayer_id  = seed_cats[2]["id"]
        eating_id  = seed_cats[3]["id"]
        sleep_id   = seed_cats[4]["id"]
        home_id    = seed_cats[5]["id"]
        travel_id  = seed_cats[6]["id"]
        ill_id     = seed_cats[7]["id"]
        hardship_id = seed_cats[8]["id"]
        tasbih_id  = seed_cats[9]["id"]
        quran_id   = seed_cats[10]["id"]

        seed_duas = [
            # সকাল
            {"id": str(uuid.uuid4()), "category_id": morning_id, "title_bn": "সকালের দোয়া", "arabic_text": "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ", "transliteration": "আসবাহনা ওয়া আসবাহাল মুলকু লিল্লাহি ওয়াল হামদু লিল্লাহ", "meaning_bn": "আমরা সকালে উপনীত হয়েছি এবং আল্লাহর রাজত্বেই সকাল হয়েছে, সমস্ত প্রশংসা আল্লাহর।", "when_to_read": "প্রতিদিন সকালে ঘুম থেকে উঠে", "fazilat": "এই দোয়া পড়লে আল্লাহর রাজত্ব স্বীকার করা হয়।", "source": "সহীহ মুসলিম", "is_today_dua": True, "is_featured": True, "sort_order": 1, "view_count": 0, "created_at": now_iso()},
            {"id": str(uuid.uuid4()), "category_id": morning_id, "title_bn": "সন্ধ্যার দোয়া", "arabic_text": "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ", "transliteration": "আমসায়না ওয়া আমসাল মুলকু লিল্লাহি ওয়াল হামদু লিল্লাহ", "meaning_bn": "আমরা সন্ধ্যায় উপনীত হয়েছি এবং আল্লাহর রাজত্বেই সন্ধ্যা হয়েছে, সমস্ত প্রশংসা আল্লাহর।", "when_to_read": "প্রতিদিন সন্ধ্যায়", "fazilat": "দিনের শেষে আল্লাহর প্রতি কৃতজ্ঞতা প্রকাশের অন্যতম সেরা উপায়।", "source": "সহীহ মুসলিম", "is_today_dua": False, "is_featured": True, "sort_order": 2, "view_count": 0, "created_at": now_iso()},
            # দৈনন্দিন
            {"id": str(uuid.uuid4()), "category_id": daily_id, "title_bn": "বাথরুমে প্রবেশের দোয়া", "arabic_text": "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ", "transliteration": "আল্লাহুম্মা ইন্নি আউযু বিকা মিনাল খুবুসি ওয়াল খাবায়িস", "meaning_bn": "হে আল্লাহ! আমি তোমার কাছে পুরুষ ও নারী শয়তান থেকে আশ্রয় চাই।", "when_to_read": "বাথরুমে প্রবেশের আগে", "fazilat": "শয়তান থেকে সুরক্ষার দোয়া।", "source": "সহীহ বুখারী", "is_today_dua": False, "is_featured": False, "sort_order": 1, "view_count": 0, "created_at": now_iso()},
            {"id": str(uuid.uuid4()), "category_id": daily_id, "title_bn": "আয়নায় তাকানোর দোয়া", "arabic_text": "اللَّهُمَّ أَنْتَ حَسَّنْتَ خَلْقِي فَحَسِّنْ خُلُقِي", "transliteration": "আল্লাহুম্মা আনতা হাস্সানতা খালক্বি ফাহাস্সিন খুলুক্বি", "meaning_bn": "হে আল্লাহ! তুমি আমার শারীরিক গঠন সুন্দর করেছ, তাই আমার চরিত্রও সুন্দর করে দাও।", "when_to_read": "আয়নায় নিজের চেহারা দেখার সময়", "fazilat": "সুন্দর চরিত্রের জন্য দোয়া।", "source": "মুসনাদ আহমদ", "is_today_dua": False, "is_featured": False, "sort_order": 2, "view_count": 0, "created_at": now_iso()},
            # নামাজ
            {"id": str(uuid.uuid4()), "category_id": prayer_id, "title_bn": "তাশাহহুদ", "arabic_text": "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ", "transliteration": "আত্তাহিয়্যাতু লিল্লাহি ওয়াস্‌সালাওয়াতু ওয়াত্তায়্যিবাত, আস্‌সালামু আলাইকা আইয়্যুহান নাবিয়্যু ওয়া রাহমাতুল্লাহি ওয়াবারাকাতুহু", "meaning_bn": "সমস্ত মৌখিক সালাম, সব নামায এবং সব সৎকাজ আল্লাহর জন্য। হে নবী! আপনার উপর সালাম এবং আল্লাহর রহমত ও বরকত বর্ষিত হোক।", "when_to_read": "নামাজের বৈঠকে তাশাহহুদ পড়ার সময়", "fazilat": "নামাজের অন্যতম ওয়াজিব অংশ।", "source": "সহীহ বুখারী ও মুসলিম", "is_today_dua": False, "is_featured": True, "sort_order": 1, "view_count": 0, "created_at": now_iso()},
            # খাওয়া
            {"id": str(uuid.uuid4()), "category_id": eating_id, "title_bn": "খাওয়ার আগের দোয়া", "arabic_text": "بِسْمِ اللَّهِ وَعَلَى بَرَكَةِ اللَّهِ", "transliteration": "বিসমিল্লাহি ওয়া আলা বারাকাতিল্লাহ", "meaning_bn": "আল্লাহর নামে এবং আল্লাহর বরকতের সাথে।", "when_to_read": "খাওয়া শুরু করার আগে", "fazilat": "এই দোয়া পড়লে খাওয়ায় বরকত হয় এবং শয়তান খাবারে অংশ নিতে পারে না।", "source": "সহীহ বুখারী", "is_today_dua": False, "is_featured": True, "sort_order": 1, "view_count": 0, "created_at": now_iso()},
            {"id": str(uuid.uuid4()), "category_id": eating_id, "title_bn": "খাওয়ার পরের দোয়া", "arabic_text": "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ", "transliteration": "আলহামদুলিল্লাহিল্লাযি আত্বআমানি হাযা ওয়া রাযাক্বানিহি মিন গাইরি হাউলিন মিন্নি ওয়ালা কুউয়্যাহ", "meaning_bn": "সেই আল্লাহর প্রশংসা যিনি আমাকে এই খাবার খাওয়ালেন এবং রিযিক দিলেন আমার কোনো শক্তি ও চেষ্টা ছাড়াই।", "when_to_read": "খাওয়া শেষে", "fazilat": "এই দোয়া পড়লে আগের গুনাহ মাফ হয়।", "source": "তিরমিযী", "is_today_dua": False, "is_featured": False, "sort_order": 2, "view_count": 0, "created_at": now_iso()},
            # ঘুম
            {"id": str(uuid.uuid4()), "category_id": sleep_id, "title_bn": "ঘুমানোর আগের দোয়া", "arabic_text": "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا", "transliteration": "বিসমিকা আল্লাহুম্মা আমুতু ওয়া আহইয়া", "meaning_bn": "হে আল্লাহ! তোমার নামেই মরণ ও জীবন।", "when_to_read": "ঘুমানোর আগে ডান কাত হয়ে শুয়ে", "fazilat": "ঘুম একটি ছোট মৃত্যু, তাই আল্লাহর উপর ভরসা করে ঘুমানো সুন্নত।", "source": "সহীহ বুখারী", "is_today_dua": False, "is_featured": True, "sort_order": 1, "view_count": 0, "created_at": now_iso()},
            {"id": str(uuid.uuid4()), "category_id": sleep_id, "title_bn": "ঘুম থেকে উঠার দোয়া", "arabic_text": "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ", "transliteration": "আলহামদুলিল্লাহিল্লাযি আহইয়ানা বা'দা মা আমাতানা ওয়া ইলাইহিন নুশূর", "meaning_bn": "সমস্ত প্রশংসা সেই আল্লাহর যিনি আমাদের মৃত্যুর পর জীবন দিলেন এবং তাঁরই কাছে পুনরুত্থান।", "when_to_read": "ঘুম থেকে উঠার পর", "fazilat": "নতুন দিনের শুরু আল্লাহর কৃতজ্ঞতা দিয়ে করার মাধ্যম।", "source": "সহীহ বুখারী", "is_today_dua": False, "is_featured": False, "sort_order": 2, "view_count": 0, "created_at": now_iso()},
            # ঘর
            {"id": str(uuid.uuid4()), "category_id": home_id, "title_bn": "ঘরে প্রবেশের দোয়া", "arabic_text": "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ الْمَوْلَجِ وَخَيْرَ الْمَخْرَجِ", "transliteration": "আল্লাহুম্মা ইন্নি আসআলুকা খাইরাল মাওলাজি ওয়া খাইরাল মাখরাজ", "meaning_bn": "হে আল্লাহ! আমি তোমার কাছে প্রবেশ ও বাহিরে উত্তম কল্যাণ চাই।", "when_to_read": "ঘরে প্রবেশ করার সময়", "fazilat": "ঘরে শান্তি ও বরকত আসে।", "source": "আবু দাউদ", "is_today_dua": False, "is_featured": False, "sort_order": 1, "view_count": 0, "created_at": now_iso()},
            # সফর
            {"id": str(uuid.uuid4()), "category_id": travel_id, "title_bn": "যানবাহনে চড়ার দোয়া", "arabic_text": "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنقَلِبُونَ", "transliteration": "সুবহানাল্লাযি সাখখারা লানা হাযা ওয়ামা কুন্না লাহু মুক্বরিনিন ওয়া ইন্না ইলা রাব্বিনা লামুনক্বালিবুন", "meaning_bn": "পবিত্র সেই সত্তা যিনি এটা আমাদের বশ করে দিয়েছেন, অথচ আমরা এটা বশ করতে সক্ষম ছিলাম না। আর আমরা আমাদের প্রতিপালকের কাছে অবশ্যই প্রত্যাবর্তনকারী।", "when_to_read": "যানবাহনে উঠার সময়", "fazilat": "আল্লাহর অনুগ্রহ স্বীকার করার দোয়া।", "source": "তিরমিযী", "is_today_dua": False, "is_featured": True, "sort_order": 1, "view_count": 0, "created_at": now_iso()},
            # অসুস্থতা
            {"id": str(uuid.uuid4()), "category_id": ill_id, "title_bn": "অসুস্থ ব্যক্তির দোয়া", "arabic_text": "اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَاسَ اشْفِهِ وَأَنْتَ الشَّافِي", "transliteration": "আল্লাহুম্মা রাব্বান্নাসি আযহিবিল বা'সা ইশফিহি ওয়া আনতাশ শাফি", "meaning_bn": "হে আল্লাহ! মানুষের প্রতিপালক! কষ্ট দূর করুন, রোগীকে সুস্থ করুন, আপনিই আরোগ্যদানকারী।", "when_to_read": "অসুস্থ হলে বা অসুস্থ ব্যক্তিকে দেখতে গেলে", "fazilat": "তিনবার পড়লে আল্লাহ আরোগ্য দান করবেন।", "source": "সহীহ বুখারী", "is_today_dua": False, "is_featured": True, "sort_order": 1, "view_count": 0, "created_at": now_iso()},
            # বিপদ
            {"id": str(uuid.uuid4()), "category_id": hardship_id, "title_bn": "বিপদে পড়লে পড়ার দোয়া", "arabic_text": "إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ اللَّهُمَّ أْجُرْنِي فِي مُصِيبَتِي وَأَخْلِفْ لِي خَيْرًا مِنْهَا", "transliteration": "ইন্না লিল্লাহি ওয়া ইন্না ইলাইহি রাজিউন, আল্লাহুম্মা আজুরনি ফি মুসিবাতি ওয়া আখলিফলি খাইরান মিনহা", "meaning_bn": "নিশ্চয়ই আমরা আল্লাহর এবং তাঁর কাছেই আমাদের ফিরে যেতে হবে। হে আল্লাহ! আমার বিপদে সওয়াব দাও এবং এর চেয়ে উত্তম কিছু দাও।", "when_to_read": "কোনো বিপদ বা মৃত্যু সংবাদ শুনলে", "fazilat": "এই দোয়া পড়লে আল্লাহ উত্তম বিনিময় দেন।", "source": "সহীহ মুসলিম", "is_today_dua": False, "is_featured": True, "sort_order": 1, "view_count": 0, "created_at": now_iso()},
            # তাসবিহ
            {"id": str(uuid.uuid4()), "category_id": tasbih_id, "title_bn": "সুবহানাল্লাহ", "arabic_text": "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ سُبْحَانَ اللَّهِ الْعَظِيمِ", "transliteration": "সুবহানাল্লাহি ওয়া বিহামদিহি সুবহানাল্লাহিল আযিম", "meaning_bn": "আল্লাহ পবিত্র এবং তাঁর প্রশংসা করি, মহান আল্লাহ পবিত্র।", "when_to_read": "যেকোনো সময়, বিশেষত নামাজের পর", "fazilat": "রাসুলুল্লাহ (সা.) বলেছেন, এই দুটি বাক্য মুখে হালকা কিন্তু মিযানে ভারী এবং আল্লাহর কাছে প্রিয়।", "source": "সহীহ বুখারী ও মুসলিম", "is_today_dua": False, "is_featured": True, "sort_order": 1, "view_count": 0, "created_at": now_iso()},
            # কুরআনের দোয়া
            {"id": str(uuid.uuid4()), "category_id": quran_id, "title_bn": "রাব্বানা আতিনা — সূরা বাক্বারা", "arabic_text": "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", "transliteration": "রাব্বানা আতিনা ফিদ্দুনইয়া হাসানাতান ওয়া ফিল আখিরাতি হাসানাতান ওয়া ক্বিনা আযাবান্নার", "meaning_bn": "হে আমাদের প্রতিপালক! আমাদেরকে দুনিয়ায় কল্যাণ দাও এবং আখিরাতে কল্যাণ দাও এবং আমাদেরকে জাহান্নামের আযাব থেকে রক্ষা কর।", "when_to_read": "যেকোনো সময়, বিশেষত সালাতের পর", "fazilat": "কুরআনের সবচেয়ে বেশি পঠিত দোয়াগুলোর একটি, যা দুনিয়া ও আখিরাতের কল্যাণ চায়।", "source": "সূরা বাক্বারা: ২০১", "is_today_dua": False, "is_featured": True, "sort_order": 1, "view_count": 0, "created_at": now_iso()},
        ]
        await db.duas.insert_many(seed_duas)

# ── App version — Android/iOS force-update check ─────────────────────────────
@api.get("/app/version")
async def get_app_version():
    """Mobile apps call this on launch to check for mandatory updates."""
    return {
        "version":     APP_VERSION,
        "min_version": os.environ.get("APP_MIN_VERSION", "1.0.0"),
        "force_update": os.environ.get("APP_FORCE_UPDATE", "false").lower() == "true",
        "update_url":  os.environ.get("APP_UPDATE_URL", ""),
        "store_url_android": os.environ.get("APP_STORE_ANDROID", ""),
        "store_url_ios":     os.environ.get("APP_STORE_IOS", ""),
        "changelog_bn": os.environ.get("APP_CHANGELOG_BN", "নতুন ফিচার ও বাগ ফিক্স"),
        "changelog_en": os.environ.get("APP_CHANGELOG_EN", "Bug fixes and improvements"),
    }


# ── FCM device token — Android/iOS push notifications ────────────────────────
class FCMTokenIn(BaseModel):
    token:    str
    platform: str = "android"  # android | ios | web

@api.post("/notifications/register-device")
async def register_device_token(body: FCMTokenIn, user: CurrentUser, bg: BackgroundTasks):
    """Register or refresh an FCM/APNS device token for push notifications."""
    token = body.token.strip()
    if not token:
        raise HTTPException(400, "Token required")
    result = await db.device_tokens.update_one(
        {"user_id": user["id"], "token": token},
        {"$set": {
            "user_id":    user["id"],
            "user_email": user.get("email", ""),
            "token":      token,
            "platform":   body.platform,
            "updated_at": now_iso(),
        }},
        upsert=True,
    )

    # A newly registered browser/device gets one welcome push. Existing
    # devices are refreshed silently so every login does not create spam.
    if result.upserted_id is not None:
        welcome_id = str(uuid.uuid4())
        await db.push_notifications.insert_one({
            "id": welcome_id,
            "created_at": now_iso(),
            "created_by": "system",
            "title_bn": "স্বাগতম! বাঙালি ইসলামিক ইনস্টিটিউটে",
            "title_en": "Welcome to Bengali Islamic Institute",
            "body_bn": f"আসসালামু আলাইকুম {user.get('name', '')}! আপনার নোটিফিকেশন সফলভাবে চালু হয়েছে।",
            "body_en": f"Assalamu Alaikum {user.get('name', '')}! Your notifications are now enabled.",
            "click_action": "/home",
            "target": f"user:{user['id']}",
            "scheduled_for": None,
            "status": "sending",
            "source": "welcome",
        })
        bg.add_task(_do_send_push, welcome_id)

    return {"ok": True}

@api.delete("/notifications/unregister-device")
async def unregister_device_token(token: str, user: CurrentUser):
    """Remove a device token when user logs out."""
    await db.device_tokens.delete_one({"user_id": user["id"], "token": token})
    return {"ok": True}

@api.get("/admin/device-tokens", response_model=list)
async def list_device_tokens(admin: AdminUser):
    """Admin: list all registered device tokens (for sending push notifications)."""
    return await db.device_tokens.find({}, {"_id": 0}).sort("updated_at", -1).to_list(5000)


# ══════════════════════════════════════════════════════════════
# Push Notification System — FCM (Firebase Cloud Messaging)
# ══════════════════════════════════════════════════════════════

class PushNotifIn(BaseModel):
    title_bn:      str
    title_en:      str          = ""
    body_bn:       str          = ""
    body_en:       str          = ""
    image_url:     str          = ""   # /api/files/<uuid> or absolute HTTPS
    click_action:  str          = "/"  # relative or absolute URL
    target:        str          = "all"  # "all" | "course:<cid>" | "user:<uid>"
    scheduled_for: Optional[str] = None  # ISO-8601 datetime or None → immediate

_fcm_ready = False
_fcm_lock  = asyncio.Lock()


async def _ensure_fcm():
    """Lazy-initialise Firebase Admin SDK from DB config or FIREBASE_SERVICE_ACCOUNT_JSON env var."""
    global _fcm_ready
    if _fcm_ready:
        return
    async with _fcm_lock:
        if _fcm_ready:
            return
        # Primary source: DB config (set via Admin Panel or seed script)
        cfg = await db.configs.find_one({"key": "firebase"}) or {}
        nested = cfg.get("value") if isinstance(cfg.get("value"), dict) else {}
        sa_json = (cfg.get("service_account_json") or nested.get("service_account_json") or "").strip()
        # Fallback: environment variable
        if not sa_json:
            sa_json = (os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON") or "").strip()
        if not sa_json:
            raise HTTPException(
                503,
                "Firebase service account JSON not configured. "
                "Admin Panel → Settings → Firebase → service_account_json-এ যোগ করুন।"
            )
        import json as _j, firebase_admin
        from firebase_admin import credentials as fb_creds
        sa_dict = _j.loads(sa_json)
        try:
            firebase_admin.get_app("bii")
        except ValueError:
            firebase_admin.initialize_app(fb_creds.Certificate(sa_dict), name="bii")
        _fcm_ready = True


async def _tokens_for_target(target: str) -> list:
    if target == "all":
        docs = await db.device_tokens.find({}, {"token": 1}).to_list(None)
    elif target.startswith("course:"):
        cid = target[7:]
        enrolls = await db.enrollments.find({"course_id": cid}, {"user_id": 1}).to_list(None)
        uids = [e["user_id"] for e in enrolls]
        docs = await db.device_tokens.find({"user_id": {"$in": uids}}, {"token": 1}).to_list(None)
    elif target.startswith("user:"):
        uid = target[5:]
        docs = await db.device_tokens.find({"user_id": uid}, {"token": 1}).to_list(None)
    else:
        docs = []
    return list({d["token"] for d in docs if d.get("token")})


async def _do_send_push(notif_id: str):
    """Execute FCM multicast for a push_notifications record; updates status in DB."""
    doc = await db.push_notifications.find_one({"id": notif_id})
    if not doc:
        return

    try:
        await _ensure_fcm()
    except HTTPException as exc:
        await db.push_notifications.update_one(
            {"id": notif_id},
            {"$set": {"status": "failed", "error": exc.detail, "sent_at": now_iso()}}
        )
        return
    except Exception as exc:
        await db.push_notifications.update_one(
            {"id": notif_id},
            {"$set": {"status": "failed", "error": str(exc), "sent_at": now_iso()}}
        )
        return

    import firebase_admin
    from firebase_admin import messaging as fbm
    app = firebase_admin.get_app("bii")

    tokens = await _tokens_for_target(doc.get("target", "all"))

    title = doc.get("title_bn") or doc.get("title_en") or "BII"
    body  = doc.get("body_bn")  or doc.get("body_en")  or ""
    image = (doc.get("image_url") or "").strip()
    click = (doc.get("click_action") or "/").strip()

    # FCM requires image URL to be absolute HTTPS
    if image and image.startswith("/"):
        image = f"{_site_url()}{image}"
    # Resolve relative click_action to absolute for webpush
    click_abs = click if click.startswith("http") else f"{_site_url()}{click}"

    total_sent = 0
    total_fail = 0

    if not tokens:
        await db.push_notifications.update_one(
            {"id": notif_id},
            {"$set": {"status": "sent", "sent_count": 0, "failed_count": 0, "sent_at": now_iso()}}
        )
        return

    for i in range(0, len(tokens), 500):
        batch = tokens[i:i + 500]
        msg = fbm.MulticastMessage(
            tokens=batch,
            notification=fbm.Notification(
                title=title,
                body=body,
                image=image or None,
            ),
            data={k: v for k, v in {
                "click_action": click,
                "title_en":     doc.get("title_en", ""),
                "body_en":      doc.get("body_en", ""),
            }.items() if v},
            android=fbm.AndroidConfig(
                priority="high",
                notification=fbm.AndroidNotification(
                    title=title,
                    body=body,
                    image=image or None,
                    icon="notification_icon",
                    color="#0A422B",
                    click_action="FLUTTER_NOTIFICATION_CLICK",
                ),
            ),
            webpush=fbm.WebpushConfig(
                notification=fbm.WebpushNotification(
                    title=title,
                    body=body,
                    icon="/logo192.png",
                    image=image or None,
                ),
                fcm_options=fbm.WebpushFCMOptions(link=click_abs),
            ),
        )
        try:
            resp = fbm.send_each_for_multicast(msg, app=app)
            total_sent += resp.success_count
            total_fail += resp.failure_count
        except Exception as err:
            logging.warning(f"FCM batch error: {err}")
            total_fail += len(batch)

    await db.push_notifications.update_one(
        {"id": notif_id},
        {"$set": {
            "status":       "sent",
            "sent_count":   total_sent,
            "failed_count": total_fail,
            "sent_at":      now_iso(),
        }},
    )


async def _scheduled_push_runner():
    """Background loop: fires scheduled notifications when their time arrives."""
    while True:
        try:
            now = now_iso()
            pending = await db.push_notifications.find(
                {"status": "scheduled", "scheduled_for": {"$lte": now}}
            ).to_list(100)
            for doc in pending:
                await db.push_notifications.update_one(
                    {"id": doc["id"]}, {"$set": {"status": "sending"}}
                )
                asyncio.create_task(_do_send_push(doc["id"]))
        except Exception as exc:
            logging.warning(f"Scheduled push runner: {exc}")
        await asyncio.sleep(60)


# ── Public web config (no service account) ───────────────────
@api.get("/configs/firebase-web")
async def firebase_web_config():
    """Return only the browser-safe Firebase config fields.
    Handles both flat storage (key directly in doc) and nested storage (under 'value')."""
    cfg = await db.configs.find_one({"key": "firebase"}) or {}
    # Config may be stored flat OR nested under a 'value' key — check both
    nested = cfg.get("value") if isinstance(cfg.get("value"), dict) else {}
    def _get(k): return cfg.get(k) or nested.get(k) or ""
    return {
        "api_key":             _get("api_key"),
        "auth_domain":         _get("auth_domain"),
        "project_id":          _get("project_id"),
        "storage_bucket":      _get("storage_bucket"),
        "messaging_sender_id": _get("messaging_sender_id"),
        "app_id":              _get("app_id"),
        "vapid_key":           _get("vapid_key"),
    }


# ── Admin: push notification history ─────────────────────────
@api.get("/push-notifications")
async def list_push_notifications(admin: AdminUser):
    return await db.push_notifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.post("/push-notifications")
async def send_push_notification(body: PushNotifIn, bg: BackgroundTasks, admin: AdminUser):
    created_at = now_iso()
    doc = {
        "id":          str(uuid.uuid4()),
        "created_at":  created_at,
        "created_by":  admin["id"],
        **body.model_dump(),
    }
    is_scheduled = bool(
        body.scheduled_for and body.scheduled_for > created_at
    )
    doc["status"] = "scheduled" if is_scheduled else "sending"
    await db.push_notifications.insert_one(doc)
    if not is_scheduled:
        bg.add_task(_do_send_push, doc["id"])
    return {"ok": True, "id": doc["id"], "scheduled": is_scheduled}


@api.delete("/push-notifications/{nid}")
async def delete_push_notification(nid: str, admin: AdminUser):
    await db.push_notifications.delete_one({"id": nid})
    return {"ok": True}


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
@api.get("/health")
async def health_check():
    return {"status": "ok", "version": APP_VERSION, "timestamp": now_iso()}


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ══════════════════════════════════════════════════════
# LIBRARY — Books & Categories
# ══════════════════════════════════════════════════════
class BookCategoryIn(BaseModel):
    name_bn: str; name_en: str = ""; icon: str = "📚"; sort_order: int = 0

class BookIn(BaseModel):
    title_bn: str; title_en: str = ""; author_bn: str = ""; author_en: str = ""
    description_bn: str = ""; description_en: str = ""
    reader_content_bn: str = ""; reader_content_en: str = ""
    category: str = "general"; cover_image: str = ""; read_url: str = ""
    read_url_bn: str = ""; read_url_en: str = ""
    download_url: str = ""; pages: int = 0; year: int = 0
    language: str = "en"; is_featured: bool = False; is_published: bool = True
    rating: float = 0.0; gutenberg_id: int = 0

@api.get("/library/categories")
async def list_book_categories():
    cats = await db.book_categories.find({},{"_id":0}).sort("sort_order",1).to_list(100)
    if not cats:
        defaults = [
            {"id":str(uuid.uuid4()),"name_bn":"সব","name_en":"All","icon":"📚","sort_order":0},
            {"id":str(uuid.uuid4()),"name_bn":"ইসলামিক","name_en":"Islamic","icon":"☪️","sort_order":1},
            {"id":str(uuid.uuid4()),"name_bn":"বিজ্ঞান","name_en":"Science","icon":"🔬","sort_order":2},
            {"id":str(uuid.uuid4()),"name_bn":"ইতিহাস","name_en":"History","icon":"🏛️","sort_order":3},
            {"id":str(uuid.uuid4()),"name_bn":"সাহিত্য","name_en":"Literature","icon":"📖","sort_order":4},
            {"id":str(uuid.uuid4()),"name_bn":"আত্মউন্নয়ন","name_en":"Self-Help","icon":"🌟","sort_order":5},
            {"id":str(uuid.uuid4()),"name_bn":"দর্শন","name_en":"Philosophy","icon":"🧠","sort_order":6},
            {"id":str(uuid.uuid4()),"name_bn":"ব্যবসা","name_en":"Business","icon":"💼","sort_order":7},
            {"id":str(uuid.uuid4()),"name_bn":"শিশু","name_en":"Children","icon":"🧒","sort_order":8},
            {"id":str(uuid.uuid4()),"name_bn":"জীবনী","name_en":"Biography","icon":"👤","sort_order":9},
            {"id":str(uuid.uuid4()),"name_bn":"স্বাস্থ্য","name_en":"Health","icon":"❤️","sort_order":10},
            {"id":str(uuid.uuid4()),"name_bn":"প্রযুক্তি","name_en":"Technology","icon":"💻","sort_order":11},
        ]
        await db.book_categories.insert_many(defaults)
        return defaults
    return cats

@api.post("/library/categories")
async def create_book_category(body: BookCategoryIn, admin: AdminUser):
    doc = {"id":str(uuid4()), **body.model_dump()}
    await db.book_categories.insert_one(doc); doc.pop("_id",None); return doc

@api.put("/library/categories/{cid}")
async def update_book_category(cid: str, body: BookCategoryIn, admin: AdminUser):
    await db.book_categories.update_one({"id":cid},{"$set":body.model_dump()})
    return await db.book_categories.find_one({"id":cid},{"_id":0})

@api.delete("/library/categories/{cid}")
async def delete_book_category(cid: str, admin: AdminUser):
    await db.book_categories.delete_one({"id":cid}); return {"ok":True}

@api.get("/library/books")
async def list_books(category: str = "", search: str = "", featured: bool = False,
                     skip: int = 0, limit: int = 40):
    q: dict = {"is_published": True}
    if category and category != "all": q["category"] = category
    if featured: q["is_featured"] = True
    if search:
        q["$or"] = [
            {"title_bn":{"$regex":search,"$options":"i"}},
            {"title_en":{"$regex":search,"$options":"i"}},
            {"author_en":{"$regex":search,"$options":"i"}},
            {"author_bn":{"$regex":search,"$options":"i"}},
        ]
    total = await db.books.count_documents(q)
    books = await db.books.find(q,{"_id":0}).sort("sort_order",1).skip(skip).limit(limit).to_list(limit)
    return {"total":total,"books":books}

@api.get("/library/books/{bid}")
async def get_book(bid: str):
    book = await db.books.find_one({"id":bid},{"_id":0})
    if not book: raise HTTPException(404,"Book not found")
    await db.books.update_one({"id":bid},{"$inc":{"total_reads":1}})
    return book

@api.post("/library/books")
async def create_book(body: BookIn, admin: AdminUser):
    count = await db.books.count_documents({})
    doc = {"id":str(uuid4()), "sort_order":count, **body.model_dump(), "total_reads":0}
    await db.books.insert_one(doc); doc.pop("_id",None); return doc

@api.put("/library/books/{bid}")
async def update_book(bid: str, body: BookIn, admin: AdminUser):
    await db.books.update_one({"id":bid},{"$set":body.model_dump()})
    return await db.books.find_one({"id":bid},{"_id":0})

@api.delete("/library/books/{bid}")
async def delete_book(bid: str, admin: AdminUser):
    await db.books.delete_one({"id":bid}); return {"ok":True}

# ──────────────────────────────────────────────────────────────
# Mount
# ──────────────────────────────────────────────────────────────
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status": exc.status_code},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        f"Unhandled error [{request.method}] {request.url.path}: {exc}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )

# ── Serve React frontend (production build) ───────────────────────────────────
# Support three layouts (checked in order — first one with index.html wins):
#   1. Dev  (Replit):   backend/server.py  →  ../frontend/build/index.html
#   2. Prod (nested):   server.py at root  →  ./frontend/build/index.html
#   3. Prod (flat):     server.py at root  →  ./index.html  (cPanel flat deploy)
_FRONTEND_BUILD = next(
    (p for p in [
        Path(__file__).parent.parent / "frontend" / "build",  # dev
        Path(__file__).parent        / "frontend" / "build",  # prod nested
        Path(__file__).parent,                                 # prod flat
    ] if (p / "index.html").exists()),
    Path(__file__).parent.parent / "frontend" / "build",      # fallback (no crash)
)

if _FRONTEND_BUILD.exists():
    _static_dir = _FRONTEND_BUILD / "static"
    if _static_dir.exists():
        app.mount("/static", StaticFiles(directory=str(_static_dir)), name="react-static")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_react_app(full_path: str):
        """Catch-all: serve React index.html for client-side routing."""
        return FileResponse(str(_FRONTEND_BUILD / "index.html"))
