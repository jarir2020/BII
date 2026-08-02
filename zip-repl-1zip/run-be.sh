#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# run-be.sh — start the Yii2 backend (JSON API)
#   Base URL:  http://localhost:8090/api   health: /api/health
#   Override port:  BACKEND_PORT=9000 ./run-be.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/Backend"

PORT="${BACKEND_PORT:-8090}"

# Backend self-loads .env (bootstrap/env.php), so no sourcing needed here.
if [ ! -f vendor/autoload.php ]; then
  echo "vendor/ missing — installing dependencies…"
  composer install --no-interaction
fi

echo "▶ Backend starting → http://localhost:${PORT}/api"
echo "  health check:      http://localhost:${PORT}/api/health"
exec php yii serve --port="${PORT}" --docroot=web
