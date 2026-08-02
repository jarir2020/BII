#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# run-fe.sh — start the React frontend dev server
#   URL:  http://localhost:3000   (proxies /api → backend :8090)
#   Override port:  FRONTEND_PORT=4000 ./run-fe.sh
#   Override backend proxy:  REACT_APP_BACKEND_URL=https://… ./run-fe.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/Frontend"

PORT="${FRONTEND_PORT:-3000}"

if [ ! -d node_modules ]; then
  echo "node_modules/ missing — installing frontend dependencies…"
  if [ -f yarn.lock ] && command -v yarn >/dev/null 2>&1; then
    yarn install || { echo "yarn failed — falling back to npm install…"; npm install; }
  else
    npm install
  fi
fi

echo "▶ Frontend starting → http://localhost:${PORT}"
echo "  (dev server proxies /api → http://localhost:8090)"
exec yarn start
