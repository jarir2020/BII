# Bengali Islamic Institute (BII) — Deployment Plan for Hostinger / Namecheap

## 1. What the project is built with

Full-stack app split into two independent parts:

| Layer | Stack | Where it runs today |
|-------|-------|---------------------|
| **Frontend (SPA)** | React 19 + CRA/CRACO, Tailwind CSS, Radix UI, React Router v7 | Static files built with `yarn build` → `index.html` + `static/` |
| **Backend (API)** | **Python 3.12 / FastAPI**, Motor (async MongoDB), JWT auth, `uvicorn` | Needs a Python runtime (ASGI/WSGI server) |
| **Database** | **MongoDB Atlas** (fully cloud, already external) | None needed on the host |

The production bundle was already prepared in `bii_cpanel_deploy/bii_deploy/`:
`index.html`, `static/` (built React app), `server.py` (FastAPI), `passenger_wsgi.py` (ASGI→WSGI bridge), `setup.sh` (one-command installer), `.htaccess`, `.env.example`, `requirements_prod.txt`.

---

## 2. Root cause — why it won't run on Hostinger / Namecheap

The backend is **Python/FastAPI**, and the deployment package runs it through **cPanel's "Setup Python App" → Passenger WSGI**.

**Hostinger and Namecheap shared hosting do not provide "Setup Python App" / Passenger WSGI.** They run PHP (and in some cases Node.js) only, with Apache serving static files. Without a Python app runtime there is **no way to execute `server.py`** — so the site either returns the raw files, a 500, or a blank page. The `.htaccess` references `PassengerEnabled On`, which these hosts ignore or reject.

The **database is already fine** — MongoDB Atlas is external/cloud, so it has nothing to do with this. The only thing that needs a Python server is the **FastAPI API**.

> This is an infrastructure limitation, not a code bug. No amount of `.htaccess` or `.env` tweaking fixes it on a host that cannot run Python.

---

## 3. The three viable paths (pick ONE)

### Path A — Zero code change: switch to a Python-capable host (recommended if they can)
Move the **exact same `bii_cpanel_deploy/bii_deploy` package** to a provider that supports Python apps / Passenger WSGI:
- A cPanel host with **"Setup Python App"** enabled (e.g. A2, InMotion, HostPapa — the README's ProCloudify also supports it), **or**
- A **VPS / Cloud** (DigitalOcean, Vultr, Hetzner) running `uvicorn` (or Passenger) + Nginx/Apache, **or**
- A PaaS for the API (Render / Railway / Fly.io).

Upload the ZIP, create the Python App, run `bash setup.sh`. **No code changes.** This is the least work overall — the trade-off is that the client can't use the Hostinger/Namecheap plan they already bought for the backend.

### Path B — Split hosting (keeps Hostinger/Namecheap for the site) — *recommended given they already have these hosts*
Host the two halves separately, since the shared host can serve static files with no Python:

1. **Frontend (static)** → stays on Hostinger/Namecheap `public_html`. Apache serves it directly.
2. **Backend (FastAPI)** → deploy `bii_deploy/server.py` on a free/minimal Python host: **Render, Railway, or Fly.io** (they connect to the same MongoDB Atlas).
3. Point the frontend at the API host and rebuild the static bundle (see §4).
4. Strip the Passenger lines from `.htaccess` and keep only the Apache SPA-fallback + static-serving rules (§5).

**Cost:** one small code change (API URL) + rebuild + re-upload the static files. The SPA itself needs no Python at all, so the shared host handles it easily.

### Path C — Full rewrite to PHP / Node — NOT recommended
The backend is ~4,200 lines of async Python (Motor, JWT, uploads, payments, Telegram, push). Rewriting it to PHP or Node for a shared host is a large, risky project and violates the "minimal changes" goal. **Avoid** unless the client refuses every option above.

---

## 4. What "minimal change" actually means in the code (Path B)

Only **two** things change, and neither touches the app's logic:

1. **API base URL** — the frontend already reads `process.env.REACT_APP_BACKEND_URL` (defaults to `""` = same-origin `/api`). Found in:
   - `frontend/src/lib/api.js` (`API = ${BACKEND_URL}/api`)
   - `frontend/src/pages/Shop.jsx`, `frontend/src/pages/ShopOrder.jsx`
   - `frontend/src/components/ImageUpload.jsx`
   
   Rebuild with the API host baked in:
   ```bash
   cd frontend && yarn install --frozen-lockfile && REACT_APP_BACKEND_URL=https://<api-host> yarn build
   ```

2. **`.htaccess`** — remove the Passenger lines (`PassengerEnabled On`, `PassengerAppType`, `PassengerStartupFile`) and the `/api` pass-through; keep the static-file rules + SPA fallback (§5).

**Optional:** set `CORS_ORIGINS` on the API host to your domain(s) in `.env` (the backend already splits `CORS_ORIGINS` on commas — no code change).

---

## 5. `.htaccess` for the shared host (Path B — frontend only)

Place in `public_html`. This is the existing file minus the Passenger block:

```apache
RewriteEngine On

# Serve real files directly (JS, CSS, images, fonts, manifest)
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]

# Serve real directories directly
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# SPA fallback — /courses, /admin, etc. are client-side routes
RewriteRule ^ /index.html [L]

# Security headers
<IfModule mod_headers.c>
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Gzip + caching (same as before — keep as-is)
```

> Do **not** add a `RewriteRule ^/api/ ... [P]` reverse proxy to the API host — the `[P]` flag needs `mod_proxy`, which is almost always disabled on shared hosting. Instead, bake the API host into the React build (§4).

---

## 6. Backend deployment reference (Path B) — no code change

Deploy `bii_cpanel_deploy/bii_deploy/` (or `backend/`) to Render/Railway/Fly:

- **Start command:** `uvicorn server:app --host 0.0.0.0 --port 8000` (or the platform's default port via env `PORT`)
- **Env vars to set:** `MONGODB_URL`, `JWT_SECRET`, `SITE_URL`, `CORS_ORIGINS`, `DB_NAME`, plus optional `ADMIN_EMAIL/ADMIN_PASSWORD` for first-time seeding, SMTP/Telegram/Firebase/SSLCommerz as needed.
- **Persistent storage:** user-uploaded images go to `./uploads` — on Render/Railway use a mounted disk/volume for `uploads/` (or `Render.com` disk) so uploads survive restarts.

`server.py` already auto-detects the deployment layout (dev / nested / flat), and `passenger_wsgi.py` is only needed for Passenger hosts — **skip it on Render/Fly** and run `uvicorn` directly.

---

## 7. Verification checklist

- [ ] `GET https://<api-host>/api/health` returns OK.
- [ ] MongoDB Atlas **Network Access** includes the API host's outbound IP (or `0.0.0.0/0` for Render/Fly egress).
- [ ] Open the site — homepage loads (React, no console 404s on `/api`).
- [ ] Login as admin → seeded account works.
- [ ] A user-upload (image) appears and persists (volume/disk attached).
- [ ] Full page refresh on `/admin` / `/courses` does **not** 404 (SPA fallback working).

---

## 8. Recommendation summary

- **If the client can change hosts:** Path A — re-upload the existing package on a Python-capable host. **Zero code changes.**
- **If they must stay on Hostinger/Namecheap:** Path B — shared host serves the static React build; the FastAPI backend moves to Render/Railway/Fly connected to the same MongoDB Atlas. **One env var + a trimmed `.htaccess` + rebuild.**
- **Path C (PHP/Node rewrite) is the wrong answer** — large effort, breaks "minimal changes".

The single most important message to the client: *the Python backend cannot run on Hostinger/Namecheap shared hosting at all; it's a hosting capability, not a bug.* Choose Path A or B accordingly.
