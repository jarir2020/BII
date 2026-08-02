"""
passenger_wsgi.py — Passenger / cPanel entry point for Bengali Islamic Institute
=================================================================================

FastAPI is an ASGI framework; cPanel's Passenger module expects WSGI.
The `a2wsgi` library bridges them: it wraps the ASGI app in a WSGI adapter
that runs asyncio in a worker thread, so all async code (Motor/MongoDB,
background tasks, startup events) works correctly.

HOW CPANEL FINDS THIS FILE
───────────────────────────
In cPanel → Setup Python App → Application startup file : passenger_wsgi.py
                              Application Entry point   : application

WHAT THIS FILE DOES
────────────────────
1. Adds this directory to sys.path so `import server` works
2. Loads environment variables from .env (create this from .env.example)
3. Imports the FastAPI `app` object from server.py
4. Wraps it with ASGIMiddleware so Passenger can call it as WSGI
"""

import sys
import os

# ── Put the app directory on Python's import path ────────────────────────────
APP_DIR = os.path.dirname(os.path.abspath(__file__))
if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)

# ── Load .env from the same directory as this file ───────────────────────────
# python-dotenv is safe to call even if .env does not exist (it just skips it).
# Required secrets (MONGODB_URL, JWT_SECRET) are validated inside server.py.
from dotenv import load_dotenv
load_dotenv(os.path.join(APP_DIR, ".env"), override=False)

# ── Import the FastAPI ASGI application ──────────────────────────────────────
# server.py reads env vars at import time (MongoDB URL, JWT secret, etc.).
# If a required secret is missing, it raises RuntimeError here with a clear
# message — check Passenger's error log in cPanel → Logs.
try:
    from server import app as asgi_app
except RuntimeError as exc:
    # Surface a clear error in the Passenger log instead of a cryptic 500
    import traceback
    _msg = f"[BII] STARTUP FAILED: {exc}\n{traceback.format_exc()}"
    print(_msg, file=sys.stderr)
    # Still define `application` so Passenger doesn't crash on import;
    # every request will return a 500 with the error message.
    def application(environ, start_response):
        start_response("500 Internal Server Error", [("Content-Type", "text/plain")])
        return [_msg.encode()]
else:
    # ── Wrap ASGI → WSGI for Passenger ───────────────────────────────────────
    from a2wsgi import ASGIMiddleware
    application = ASGIMiddleware(asgi_app)
