"""Backend tests for /api/upload and /api/files/{id} (iteration 2)."""
import io
import os
import struct
import zlib
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                break
API = f"{BASE_URL}/api"
ADMIN = {"email": "bengaliislamicinstitute@gmail.com", "password": "BiI@SuperAdmin#2026"}


def _make_png(w=10, h=10):
    """Minimal valid PNG bytes (small)."""
    def chunk(typ, data):
        return (struct.pack(">I", len(data)) + typ + data
                + struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff))
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    raw = b""
    for _ in range(h):
        raw += b"\x00" + b"\xff\x00\x00" * w
    idat = zlib.compress(raw)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200
    return r.json()["token"]


@pytest.fixture(scope="module")
def student_token():
    email = f"upltest+{uuid.uuid4().hex[:6]}@bii.edu"
    r = requests.post(f"{API}/auth/register",
                      json={"name": "Upl Test", "email": email, "password": "Test@123"},
                      timeout=15)
    assert r.status_code == 200
    return r.json()["token"]


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


# ── Upload as admin ───────────────────────────────────────
def test_upload_admin_png_then_fetch(admin_token):
    png = _make_png()
    files = {"file": ("test.png", io.BytesIO(png), "image/png")}
    r = requests.post(f"{API}/upload", files=files, headers=H(admin_token), timeout=60)
    assert r.status_code == 200, r.text
    j = r.json()
    assert "id" in j and "url" in j
    assert j["url"] == f"/api/files/{j['id']}"
    assert j["content_type"] == "image/png"

    # GET file back
    r2 = requests.get(f"{API}/files/{j['id']}", timeout=30)
    assert r2.status_code == 200
    assert r2.headers["content-type"].startswith("image/png")
    assert len(r2.content) > 0
    # Optional: payload integrity – first 8 bytes is PNG signature
    assert r2.content[:8] == b"\x89PNG\r\n\x1a\n"


def test_upload_jpeg_admin(admin_token):
    # tiny JPEG header bytes – minimal valid SOI/EOI marker pair won't be a valid image,
    # but server accepts based on extension+mime. Use small bytes.
    data = b"\xff\xd8\xff\xe0" + b"\x00" * 50 + b"\xff\xd9"
    files = {"file": ("p.jpg", io.BytesIO(data), "image/jpeg")}
    r = requests.post(f"{API}/upload", files=files, headers=H(admin_token), timeout=60)
    assert r.status_code == 200, r.text
    assert r.json()["content_type"] == "image/jpeg"
    fid = r.json()["id"]
    r2 = requests.get(f"{API}/files/{fid}", timeout=30)
    assert r2.status_code == 200
    assert r2.headers["content-type"].startswith("image/jpeg")


# ── Student can also upload ──────────────────────────────
def test_upload_student(student_token):
    png = _make_png()
    files = {"file": ("s.png", io.BytesIO(png), "image/png")}
    r = requests.post(f"{API}/upload", files=files, headers=H(student_token), timeout=60)
    assert r.status_code == 200, r.text
    assert r.json()["url"].startswith("/api/files/")


# ── Unauth → 401 ─────────────────────────────────────────
def test_upload_unauth():
    png = _make_png()
    files = {"file": ("x.png", io.BytesIO(png), "image/png")}
    r = requests.post(f"{API}/upload", files=files, timeout=30)
    assert r.status_code == 401


# ── Reject unsupported file ──────────────────────────────
def test_upload_rejects_txt(admin_token):
    files = {"file": ("note.txt", io.BytesIO(b"hello world"), "text/plain")}
    r = requests.post(f"{API}/upload", files=files, headers=H(admin_token), timeout=30)
    assert r.status_code == 400
    assert "Unsupported" in r.text or "type" in r.text.lower()


# ── Reject > 5MB ─────────────────────────────────────────
def test_upload_rejects_oversize(admin_token):
    big = b"\x89PNG\r\n\x1a\n" + b"0" * (5 * 1024 * 1024 + 10)
    files = {"file": ("big.png", io.BytesIO(big), "image/png")}
    r = requests.post(f"{API}/upload", files=files, headers=H(admin_token), timeout=120)
    assert r.status_code == 400
    # Bengali error
    assert "৫MB" in r.text or "5" in r.text


# ── 404 on missing file ──────────────────────────────────
def test_get_file_missing():
    r = requests.get(f"{API}/files/{uuid.uuid4().hex}", timeout=10)
    assert r.status_code == 404


# ── Course can reference uploaded image ──────────────────
def test_course_with_uploaded_cover(admin_token):
    png = _make_png()
    files = {"file": ("cover.png", io.BytesIO(png), "image/png")}
    up = requests.post(f"{API}/upload", files=files, headers=H(admin_token), timeout=60)
    assert up.status_code == 200
    url = up.json()["url"]

    r = requests.post(f"{API}/courses",
                      json={"title_bn": "TEST_আপলোড কোর্স", "is_free": True, "price": 0,
                            "cover_image": url},
                      headers=H(admin_token), timeout=15)
    assert r.status_code == 200
    cid = r.json()["id"]
    assert r.json()["cover_image"] == url

    listed = requests.get(f"{API}/courses", timeout=10).json()
    match = next((c for c in listed if c["id"] == cid), None)
    assert match and match["cover_image"] == url

    # Image fetchable publicly
    fid = url.split("/")[-1]
    img = requests.get(f"{API}/files/{fid}", timeout=20)
    assert img.status_code == 200

    requests.delete(f"{API}/courses/{cid}", headers=H(admin_token), timeout=10)
