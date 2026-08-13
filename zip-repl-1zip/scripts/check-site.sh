#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# check-site.sh — quick health check for the public site + API.
#
# Usage:
#   ./scripts/check-site.sh
#   SITE_HOST=bengaliislamicinstitute.com ./scripts/check-site.sh
#   ADMIN_EMAIL=... ADMIN_PASSWORD=... ./scripts/check-site.sh
#
# Checks:
#   - DNS resolution
#   - HTTPS root response
#   - HTTP root response
#   - public API health/products
#   - optional super-admin login + admin-only live-classes endpoint
# ─────────────────────────────────────────────────────────────
set -euo pipefail

HOST="${SITE_HOST:-bengaliislamicinstitute.com}"
BASE_HTTPS="https://${HOST}"
BASE_HTTP="http://${HOST}"
API_BASE="${BASE_HTTPS}/api"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

hr() {
  printf '\n%s\n' "────────────────────────────────────────────────────────────"
}

section() {
  printf '\n[%s]\n' "$1"
}

check_dns() {
  section "DNS"
  if command -v getent >/dev/null 2>&1; then
    if getent ahosts "$HOST" >/dev/null 2>&1; then
      getent ahosts "$HOST" | awk 'NR<=4 {print}'
    else
      echo "DNS lookup failed for ${HOST}"
      return 1
    fi
  elif command -v nslookup >/dev/null 2>&1; then
    nslookup "$HOST"
  else
    echo "No DNS lookup tool available (getent/nslookup)."
  fi
}

fetch_head() {
  local label="$1"
  local url="$2"
  local out="$TMP_DIR/${label//[^a-zA-Z0-9_-]/_}.headers"

  if curl -sS --connect-timeout 10 --max-time 25 -D "$out" -o /dev/null "$url"; then
    printf '%s\n' "$label"
    sed -n '1,12p' "$out"
    return 0
  fi

  printf '%s\n' "$label"
  echo "FAILED"
  return 1
}

fetch_body() {
  local url="$1"
  curl -sS --connect-timeout 10 --max-time 30 "$url"
}

check_site_root() {
  section "Root"
  fetch_head "HTTPS ${BASE_HTTPS}/" "${BASE_HTTPS}/" || true
  fetch_head "HTTP  ${BASE_HTTP}/" "${BASE_HTTP}/" || true
}

check_public_api() {
  section "Public API"
  local endpoints=("/api/health" "/api/products" "/api/settings")
  local ep body count

  for ep in "${endpoints[@]}"; do
    printf '%s\n' "$ep"
    body="$(fetch_body "${BASE_HTTPS}${ep}" || true)"
    if [ -z "$body" ]; then
      echo "  FAILED"
      continue
    fi
    printf '%s\n' "$body" > "$TMP_DIR/response.json"
    python3 - "$ep" "$TMP_DIR/response.json" <<'PY'
import json, sys
ep = sys.argv[1]
path = sys.argv[2]
with open(path, 'r', encoding='utf-8') as f:
    raw = f.read().strip()
try:
    data = json.loads(raw)
except Exception:
    print("  non-JSON response")
    print(raw[:400])
    raise SystemExit(0)

if ep == "/api/products":
    if isinstance(data, list):
        print(f"  items={len(data)}")
        if data:
            print(f"  first_id={data[0].get('id', '')}")
    else:
        print(f"  unexpected shape={type(data).__name__}")
elif ep == "/api/settings":
    if isinstance(data, dict):
        keys = ", ".join(sorted(list(data.keys())[:8]))
        print(f"  keys={keys}")
    else:
        print(f"  unexpected shape={type(data).__name__}")
else:
    print(json.dumps(data, ensure_ascii=False))
PY
    echo "---"
  done
}

check_admin_api() {
  if [ -z "${ADMIN_EMAIL:-}" ] || [ -z "${ADMIN_PASSWORD:-}" ]; then
    section "Admin API"
    echo "Skipped (set ADMIN_EMAIL and ADMIN_PASSWORD to test protected endpoints)."
    return 0
  fi

  section "Admin API"
  local login_file="$TMP_DIR/login.json"
  local live_file="$TMP_DIR/live.json"

  if ! curl -sS --connect-timeout 10 --max-time 30 \
      -H 'Content-Type: application/json' \
      -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
      "${API_BASE}/auth/login" >"$login_file"; then
    echo "Login request failed"
    cat "$login_file" 2>/dev/null || true
    return 1
  fi

  local token
  token="$(python3 - <<'PY' "$login_file"
import json, sys
path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)
print(data.get('token', ''))
PY
)"

  if [ -z "$token" ]; then
    echo "Login succeeded but no token was returned."
    cat "$login_file"
    return 1
  fi

  echo "login=ok"
  echo "role=$(python3 - <<'PY' "$login_file"
import json, sys
path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)
user = data.get('user') or {}
print(user.get('role', ''))
PY
)"

  if curl -sS --connect-timeout 10 --max-time 30 \
      -H "Authorization: Bearer ${token}" \
      "${API_BASE}/live-classes" >"$live_file"; then
    python3 - <<'PY' "$live_file"
import json, sys
with open(sys.argv[1], 'r', encoding='utf-8') as f:
    data = json.load(f)
if isinstance(data, list):
    print(f"live-classes items={len(data)}")
    if data:
        sample = data[0]
        print("sample_id=", sample.get("id", ""), sep="")
        print("sample_title=", sample.get("title_bn") or sample.get("title_en") or "", sep="")
else:
    print(f"unexpected live-classes shape={type(data).__name__}")
PY
  else
    echo "live-classes request failed"
    cat "$live_file" 2>/dev/null || true
    return 1
  fi
}

main() {
  hr
  echo "Site checker for ${HOST}"
  echo "Timestamp: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  hr
  check_dns || true
  check_site_root || true
  check_public_api || true
  check_admin_api || true
  hr
}

main "$@"
