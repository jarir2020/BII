"""Backend tests for Bengali Islamic Institute API."""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
# Fallback to reading frontend .env
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                break

API = f"{BASE_URL}/api"
ADMIN = {"email": "bengaliislamicinstitute@gmail.com", "password": "BiI@SuperAdmin#2026"}


# ── Fixtures ─────────────────────────────────────────────
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] in ("admin", "super_admin")
    return data["token"]


@pytest.fixture(scope="session")
def student_account():
    email = f"teststudent+{uuid.uuid4().hex[:6]}@bii.edu"
    password = "Student@123"
    r = requests.post(
        f"{API}/auth/register",
        json={"name": "Test Student", "email": email, "password": password},
        timeout=15,
    )
    assert r.status_code == 200, f"register failed: {r.text}"
    data = r.json()
    assert "token" in data and data["user"]["role"] == "student"
    assert data["user"].get("student_id", "").startswith(str(time.gmtime().tm_year))
    return {"email": email, "password": password, "token": data["token"], "user": data["user"]}


def admin_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ── Health & public ─────────────────────────────────────
def test_health():
    r = requests.get(f"{API}/", timeout=10)
    assert r.status_code == 200
    assert r.json().get("ok") is True


def test_public_courses_seeded():
    r = requests.get(f"{API}/courses", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) >= 3
    titles = [c.get("title_bn") for c in data]
    assert any("আরবি" in t for t in titles)


def test_public_posts():
    r = requests.get(f"{API}/posts", timeout=10)
    assert r.status_code == 200
    assert isinstance(r.json(), list) and len(r.json()) >= 1


def test_public_settings():
    r = requests.get(f"{API}/settings", timeout=10)
    assert r.status_code == 200
    s = r.json()
    assert "name_bn" in s and "বাঙালি" in s["name_bn"]


def test_public_notifications():
    r = requests.get(f"{API}/notifications", timeout=10)
    assert r.status_code == 200
    assert isinstance(r.json(), list) and len(r.json()) >= 1


# ── Auth ────────────────────────────────────────────────
def test_admin_login_and_me(admin_token):
    r = requests.get(f"{API}/auth/me", headers=admin_headers(admin_token), timeout=10)
    assert r.status_code == 200
    assert r.json()["role"] in ("admin", "super_admin")


def test_student_registration_and_id_format(student_account):
    sid = student_account["user"]["student_id"]
    assert len(sid) == 8 and sid.isdigit()


def test_student_change_password(student_account):
    new_pw = "Student@456"
    r = requests.post(
        f"{API}/auth/change-password",
        json={"current_password": student_account["password"], "new_password": new_pw},
        headers=admin_headers(student_account["token"]),
        timeout=10,
    )
    assert r.status_code == 200
    # change back
    r2 = requests.post(
        f"{API}/auth/login",
        json={"email": student_account["email"], "password": new_pw},
        timeout=10,
    )
    assert r2.status_code == 200
    # Restore for subsequent fixtures using this account
    requests.post(
        f"{API}/auth/change-password",
        json={"current_password": new_pw, "new_password": student_account["password"]},
        headers=admin_headers(r2.json()["token"]),
        timeout=10,
    )


def test_update_profile(student_account):
    r = requests.put(
        f"{API}/users/me",
        json={"phone": "+8801712345678", "address": "Dhaka", "name": "Updated Student"},
        headers=admin_headers(student_account["token"]),
        timeout=10,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["phone"] == "+8801712345678"
    assert data["address"] == "Dhaka"
    assert data["name"] == "Updated Student"


# ── Admin CRUD ──────────────────────────────────────────
def test_admin_course_crud(admin_token):
    # Create
    r = requests.post(
        f"{API}/courses",
        json={"title_bn": "TEST_কোর্স", "title_en": "TEST Course", "price": 500, "is_free": False},
        headers=admin_headers(admin_token),
        timeout=10,
    )
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    assert r.json()["price"] == 500

    # List contains it
    r2 = requests.get(f"{API}/courses", timeout=10)
    ids = [c["id"] for c in r2.json()]
    assert cid in ids

    # Update price
    r3 = requests.put(
        f"{API}/courses/{cid}",
        json={"title_bn": "TEST_কোর্স", "price": 999, "is_free": False},
        headers=admin_headers(admin_token),
        timeout=10,
    )
    assert r3.status_code == 200
    assert r3.json()["price"] == 999

    # Delete
    r4 = requests.delete(f"{API}/courses/{cid}", headers=admin_headers(admin_token), timeout=10)
    assert r4.status_code == 200

    # Verify gone
    r5 = requests.get(f"{API}/courses/{cid}", timeout=10)
    assert r5.status_code == 404


def test_admin_video_create(admin_token):
    r = requests.post(
        f"{API}/videos",
        json={"title_bn": "TEST_ভিডিও", "video_url": "https://www.youtube.com/watch?v=abc123"},
        headers=admin_headers(admin_token),
        timeout=10,
    )
    assert r.status_code == 200
    vid = r.json()["id"]
    assert r.json()["video_url"].startswith("https://www.youtube.com")
    requests.delete(f"{API}/videos/{vid}", headers=admin_headers(admin_token), timeout=10)


def test_admin_post_linked_to_course(admin_token):
    courses = requests.get(f"{API}/courses", timeout=10).json()
    cid = courses[0]["id"] if courses else ""
    r = requests.post(
        f"{API}/posts",
        json={"title_bn": "TEST_পোস্ট", "body_bn": "test", "course_id": cid},
        headers=admin_headers(admin_token),
        timeout=10,
    )
    assert r.status_code == 200
    pid = r.json()["id"]
    assert r.json()["course_id"] == cid
    requests.delete(f"{API}/posts/{pid}", headers=admin_headers(admin_token), timeout=10)


def test_admin_live_class(admin_token):
    r = requests.post(
        f"{API}/live-classes",
        json={
            "title_bn": "TEST_লাইভ",
            "join_url": "https://zoom.us/j/12345",
            "scheduled_at": "2026-02-01T10:00:00Z",
        },
        headers=admin_headers(admin_token),
        timeout=10,
    )
    assert r.status_code == 200
    lid = r.json()["id"]
    assert "zoom" in r.json()["join_url"]
    requests.delete(f"{API}/live-classes/{lid}", headers=admin_headers(admin_token), timeout=10)


def test_admin_notification(admin_token):
    r = requests.post(
        f"{API}/notifications",
        json={"title_bn": "TEST_নোটিস", "body_bn": "test body"},
        headers=admin_headers(admin_token),
        timeout=10,
    )
    assert r.status_code == 200
    nid = r.json()["id"]
    requests.delete(f"{API}/notifications/{nid}", headers=admin_headers(admin_token), timeout=10)


# ── Role enforcement ────────────────────────────────────
def test_student_cannot_create_course(student_account):
    r = requests.post(
        f"{API}/courses",
        json={"title_bn": "TEST_blocked", "price": 0, "is_free": True},
        headers=admin_headers(student_account["token"]),
        timeout=10,
    )
    assert r.status_code == 403


# ── Enrollment flow ─────────────────────────────────────
def test_enrollment_flow(student_account):
    courses = requests.get(f"{API}/courses", timeout=10).json()
    free = next((c for c in courses if c.get("is_free")), courses[0])
    cid = free["id"]
    r = requests.post(
        f"{API}/courses/{cid}/enroll",
        headers=admin_headers(student_account["token"]),
        timeout=10,
    )
    assert r.status_code == 200
    assert r.json()["ok"] is True

    # my-courses returns it
    r2 = requests.get(
        f"{API}/my-courses",
        headers=admin_headers(student_account["token"]),
        timeout=10,
    )
    assert r2.status_code == 200
    assert any(c["id"] == cid for c in r2.json())

    # Re-enroll → already_enrolled
    r3 = requests.post(
        f"{API}/courses/{cid}/enroll",
        headers=admin_headers(student_account["token"]),
        timeout=10,
    )
    assert r3.json().get("already_enrolled") is True


# ── Contact + Complaint ─────────────────────────────────
def test_contact_unauth():
    r = requests.post(
        f"{API}/contact",
        json={"name": "TEST", "email": "t@t.com", "message": "hi"},
        timeout=10,
    )
    assert r.status_code == 200


def test_complaint_authed(student_account):
    r = requests.post(
        f"{API}/complaints",
        json={"subject": "TEST_subject", "message": "TEST_msg"},
        headers=admin_headers(student_account["token"]),
        timeout=10,
    )
    assert r.status_code == 200
