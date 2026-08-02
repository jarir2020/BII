#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# build-staging.sh — assemble the merged public_html/ directory
#
# Produces deploy/_staging/ containing the Yii2 backend promoted to
# the web root (web/index.php + app tree) merged with the built React
# SPA. This is what gets FTP'd to /home/bengalii/public_html.
#
# Run by CI (GitHub Actions) AFTER composer install + yarn build.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BE="$ROOT/zip-repl-1zip/Backend"
FE_BUILD="$ROOT/zip-repl-1zip/Frontend/build"
STAGING="$ROOT/deploy/_staging"

if [ ! -d "$BE/vendor" ]; then
  echo "ERROR: Backend/vendor missing — run 'composer install' first." >&2; exit 1
fi
if [ ! -f "$FE_BUILD/index.html" ]; then
  echo "ERROR: Frontend/build/index.html missing — run 'yarn build' first." >&2; exit 1
fi

rm -rf "$STAGING"; mkdir -p "$STAGING"

# 1) Yii2 app tree at web root. Anchor excludes with a leading slash so we only
#    skip the top-level web/, runtime/, tests/ dirs — NOT nested ones like
#    vendor/yiisoft/yii2/web/ (which is required for the framework to run).
rsync -a --exclude '/web/' --exclude '/runtime/' --exclude '/tests/' --exclude '/.env' \
      "$BE/" "$STAGING/"

# 2) Root front controller (app tree at web root) + asset dir.
cp "$ROOT/deploy/index.php" "$STAGING/index.php"
mkdir -p "$STAGING/assets"

# 3) Merged .htaccess (routes /api/* -> index.php, else React).
cp "$ROOT/deploy/htaccess" "$STAGING/.htaccess"

# 4) Built React SPA into the root.
cp -r "$FE_BUILD/." "$STAGING/"

# 5) Writable runtime + asset dirs (cPanel files are owned by FTP user).
mkdir -p "$STAGING/runtime" "$STAGING/assets"
touch "$STAGING/runtime/.gitkeep"

echo "staged: $(du -sh "$STAGING" | awk '{print $1}')  ($(find "$STAGING" -type f | wc -l) files)"
