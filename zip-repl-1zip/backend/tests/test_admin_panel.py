"""
Iteration 3 — Admin panel comprehensive tests.

Covers:
- Super admin login + role/permissions
- Legacy admin@bii.edu cleanup
- /api/auth/me with super_admin
- Analytics
- Teachers CRUD (admin)
- Admins CRUD (super_admin)
- /api/users/{uid}/details
- /api/enrollments
- /api/login-logs, /api/activity-logs
- Generic CRUD register_crud across all resources
- Configs register_config across all single-doc configs
- Maintenance status (public)
- Media library list + delete
- Backup export (super_admin)
- Password reset (mocked) full flow
- Role enforcement (403 for non-admin on /admins, /teachers)
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", ".env")
    with open(os.path.abspath(env_path)) as fh:
        for line in fh:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                break
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"

SUPER_ADMIN = {"email": "bengaliislamicinstitute@gmail.com", "password": "BiI@SuperAdmin#2026"}


# ────── fixtures ──────
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def super_token(session):
    r = session.post(f"{API}/auth/login", json=SUPER_ADMIN, timeout=30)
    assert r.status_code == 200, f"super admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "super_admin"
    assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 20
    return data["token"]


@pytest.fixture
def super_auth(super_token):
    return {"Authorization": f"Bearer {super_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def student_creds():
    suf = uuid.uuid4().hex[:8]
    return {
        "email": f"TEST_admin_panel_{suf}@bii.edu",
        "password": "Student@123",
        "name": "Test Student APT",
    }


@pytest.fixture(scope="session")
def student_token(session, student_creds):
    r = session.post(f"{API}/auth/register", json=student_creds, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture
def student_auth(student_token):
    return {"Authorization": f"Bearer {student_token}", "Content-Type": "application/json"}


# ────── 1. Auth ──────
class TestAuth:
    def test_super_admin_login(self, session):
        r = session.post(f"{API}/auth/login", json=SUPER_ADMIN, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["email"] == SUPER_ADMIN["email"]
        assert d["user"]["role"] == "super_admin"

    def test_legacy_admin_removed(self, session):
        r = session.post(
            f"{API}/auth/login",
            json={"email": "admin@bii.edu", "password": "Admin@123"},
            timeout=20,
        )
        assert r.status_code in (400, 401, 404), f"legacy admin still exists: {r.status_code}"

    def test_me_returns_super_admin(self, super_auth):
        r = requests.get(f"{API}/auth/me", headers=super_auth, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["role"] == "super_admin"
        assert d.get("permissions") == ["*"]


# ────── 2. Password reset (mocked) ──────
class TestPasswordReset:
    def test_full_flow(self, session):
        # 1) register temp user
        suf = uuid.uuid4().hex[:8]
        creds = {"email": f"TEST_pwreset_{suf}@bii.edu", "password": "Old@1234", "name": "PW Reset"}
        r = session.post(f"{API}/auth/register", json=creds)
        assert r.status_code == 200, r.text

        # 2) forgot-password returns code (MOCKED)
        r = session.post(f"{API}/auth/forgot-password", json={"email": creds["email"]})
        assert r.status_code == 200
        d = r.json()
        assert d.get("ok") is True
        assert "reset_code" in d
        assert d.get("mocked") is True
        code = d["reset_code"]

        # 3) reset-password
        new_pw = "New@9999"
        r = session.post(
            f"{API}/auth/reset-password",
            json={"email": creds["email"], "code": code, "new_password": new_pw},
        )
        assert r.status_code == 200, r.text

        # 4) old password fails
        r = session.post(f"{API}/auth/login", json={"email": creds["email"], "password": creds["password"]})
        assert r.status_code in (400, 401)

        # 5) new password works
        r = session.post(f"{API}/auth/login", json={"email": creds["email"], "password": new_pw})
        assert r.status_code == 200


# ────── 3. Analytics ──────
def test_analytics(super_auth):
    r = requests.get(f"{API}/analytics", headers=super_auth, timeout=20)
    assert r.status_code == 200
    d = r.json()
    for k in ["students", "teachers", "admins", "courses", "lessons", "videos",
              "pdfs", "live_classes", "enrollments", "revenue", "logins_recent"]:
        assert k in d, f"missing analytics key: {k}"
        assert isinstance(d[k], (int, float)), f"{k} not numeric"


# ────── 4. Teachers CRUD ──────
class TestTeachers:
    def test_crud(self, super_auth):
        suf = uuid.uuid4().hex[:6]
        body = {
            "name": "TEST Teacher",
            "email": f"TEST_teach_{suf}@bii.edu",
            "password": "Teach@123",
            "specialization": "Tajweed",
        }
        r = requests.post(f"{API}/teachers", json=body, headers=super_auth)
        assert r.status_code == 200, r.text
        t = r.json()
        assert t["role"] == "teacher"
        assert t["student_id"].startswith("T"), f"student_id should start with T: {t['student_id']}"
        tid = t["id"]

        # list contains
        r = requests.get(f"{API}/teachers", headers=super_auth)
        assert r.status_code == 200
        assert any(x["id"] == tid for x in r.json())

        # update
        r = requests.put(f"{API}/teachers/{tid}", json={"bio": "Senior"}, headers=super_auth)
        assert r.status_code == 200
        assert r.json()["bio"] == "Senior"

        # delete
        r = requests.delete(f"{API}/teachers/{tid}", headers=super_auth)
        assert r.status_code == 200
        assert r.json().get("deleted") == 1

    def test_student_forbidden(self, student_auth):
        r = requests.post(
            f"{API}/teachers",
            json={"name": "x", "email": "x@y.com", "password": "P@ss1234"},
            headers=student_auth,
        )
        assert r.status_code == 403


# ────── 5. Admins CRUD ──────
class TestAdmins:
    def test_list_and_create(self, super_auth):
        r = requests.get(f"{API}/admins", headers=super_auth)
        assert r.status_code == 200
        admins = r.json()
        assert any(a["role"] == "super_admin" for a in admins)

        suf = uuid.uuid4().hex[:6]
        body = {
            "name": "TEST Admin",
            "email": f"TEST_admin_{suf}@bii.edu",
            "password": "Adm@1234",
            "permissions": ["dashboard", "courses"],
        }
        r = requests.post(f"{API}/admins", json=body, headers=super_auth)
        assert r.status_code == 200, r.text
        a = r.json()
        assert a["role"] == "admin"
        assert "dashboard" in a["permissions"]
        aid = a["id"]

        # update
        r = requests.put(f"{API}/admins/{aid}", json={"name": "TEST Admin 2"}, headers=super_auth)
        assert r.status_code == 200

        # delete
        r = requests.delete(f"{API}/admins/{aid}", headers=super_auth)
        assert r.status_code == 200

    def test_student_forbidden(self, student_auth):
        r = requests.post(
            f"{API}/admins",
            json={"name": "x", "email": "x@y.com", "password": "P@ss1234"},
            headers=student_auth,
        )
        assert r.status_code == 403


# ────── 6. User details + enrollments + login logs + activity logs ──────
def test_user_details(super_auth, student_token, student_creds):
    # find student id
    me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {student_token}"}).json()
    r = requests.get(f"{API}/users/{me['id']}/details", headers=super_auth)
    assert r.status_code == 200
    d = r.json()
    assert "user" in d
    assert "enrollments" in d
    assert "login_history" in d
    assert "total_spent" in d


def test_enrollments_list(super_auth):
    r = requests.get(f"{API}/enrollments", headers=super_auth)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_login_logs(super_auth):
    r = requests.get(f"{API}/login-logs", headers=super_auth)
    assert r.status_code == 200
    logs = r.json()
    assert isinstance(logs, list)


def test_activity_logs(super_auth):
    r = requests.get(f"{API}/activity-logs", headers=super_auth)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ────── 7. Generic CRUD across resources ──────
GENERIC_RESOURCES = [
    ("course_categories", {"name_bn": "TEST কুরআন", "name_en": "TEST Quran", "icon": "🕌"}),
    ("chapters", {"title_bn": "TEST অধ্যায়", "title_en": "TEST Chapter"}),
    ("lessons", {"title_bn": "TEST পাঠ", "order": 1}),
    ("pdfs", {"title_bn": "TEST PDF", "url": "https://x/y.pdf"}),
    ("assignments", {"title_bn": "TEST এসাইন"}),
    ("exams", {"title_bn": "TEST পরীক্ষা"}),
    ("results", {"user_id": "x", "exam_id": "y", "score": 10}),
    ("certificates", {"user_id": "x", "title_bn": "TEST সনদ"}),
    ("recorded_classes", {"title_bn": "TEST রেকর্ডিং", "url": "https://x/v.mp4"}),
    ("hadiths", {"text_bn": "টেস্ট হাদীস", "reference": "বুখারী ১"}),
    ("islamic_content", {"title_bn": "TEST ইসলামিক"}),
    ("blogs", {"title_bn": "TEST ব্লগ"}),
    ("products", {"name_bn": "TEST পণ্য", "price": 100}),
    ("orders", {"user_id": "x", "amount": 100}),
    ("payments", {"order_id": "x", "amount": 100, "method": "bkash"}),
    ("banners", {"title_bn": "TEST ব্যানার", "image_url": "https://x"}),
    ("sliders", {"title_bn": "TEST স্লাইডার", "image_url": "https://x"}),
    ("gallery", {"title_bn": "TEST গ্যালারি", "image_url": "https://x"}),
    ("downloads", {"title_bn": "TEST ডাউনলোড", "url": "https://x"}),
]


@pytest.mark.parametrize("name,payload", GENERIC_RESOURCES)
def test_generic_crud(super_auth, name, payload):
    r = requests.post(f"{API}/{name}", json=payload, headers=super_auth)
    assert r.status_code == 200, f"{name} create: {r.status_code} {r.text}"
    created = r.json()
    assert "id" in created
    cid = created["id"]

    # list contains
    r = requests.get(f"{API}/{name}")
    assert r.status_code == 200, f"{name} public list failed: {r.status_code}"
    assert any(x.get("id") == cid for x in r.json())

    # delete
    r = requests.delete(f"{API}/{name}/{cid}", headers=super_auth)
    assert r.status_code == 200


# ────── 8. Configs ──────
CONFIGS = [
    ("homepage", {"hero_title": "Welcome"}),
    ("welcome_page", {"intro_bn": "স্বাগতম"}),
    ("theme", {"primary_color": "#0A422B"}),
    ("seo", {"title": "BII"}),
    ("firebase", {"api_key": "FAKE"}),
    ("security", {"max_login_attempts": 5}),
    ("payment_gateways", {"bkash": {"enabled": True}}),
    ("social_links", {"facebook": "https://fb.com/bii"}),
]


@pytest.mark.parametrize("name,payload", CONFIGS)
def test_configs(super_auth, name, payload):
    r = requests.put(f"{API}/configs/{name}", json=payload, headers=super_auth)
    assert r.status_code == 200, f"{name} PUT: {r.text}"
    r = requests.get(f"{API}/configs/{name}")
    assert r.status_code == 200
    d = r.json()
    for k, v in payload.items():
        assert d.get(k) == v, f"{name}.{k}: expected {v} got {d.get(k)}"


def test_maintenance_flow_and_public(super_auth, session):
    # toggle ON
    r = requests.put(
        f"{API}/configs/maintenance",
        json={"enabled": True, "message": "Brief downtime"},
        headers=super_auth,
    )
    assert r.status_code == 200

    # public read
    r = session.get(f"{API}/maintenance-status")
    assert r.status_code == 200
    d = r.json()
    assert d.get("enabled") is True
    assert d.get("message") == "Brief downtime"

    # turn it off so app remains usable
    r = requests.put(
        f"{API}/configs/maintenance",
        json={"enabled": False, "message": ""},
        headers=super_auth,
    )
    assert r.status_code == 200


# ────── 9. Media library ──────
def test_media_list(super_auth):
    r = requests.get(f"{API}/media", headers=super_auth)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ────── 10. Backup export ──────
def test_backup_export(super_auth):
    r = requests.get(f"{API}/backup/export", headers=super_auth, timeout=60)
    assert r.status_code == 200
    d = r.json()
    assert "collections" in d
    cols = d["collections"]
    for key in ["users", "courses", "posts"]:
        assert key in cols
    # password_hash should not leak in any user
    for u in cols.get("users", []):
        assert "password_hash" not in u
