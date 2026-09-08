#!/usr/bin/env bash
#
# Bengali Islamic Institute — local build, FTP preflight, and deployment
#
# The FTP account opens directly inside /home/bengalii/public_html, therefore
# the default remote target is `.`. This script never uses --delete and keeps
# server uploads, .well-known files, runtime data, and unrelated files intact.
#
# Credentials:
#   FTP_HOST, FTP_USER, FTP_PORT, FTP_TARGET may be overridden in the shell.
#   FTP_PASS is read from the environment or requested silently at runtime.
#   The password is deliberately not stored in this script or printed.
#
# Usage:
#   ./deploy.sh --check       build and show the FTP dry-run only
#   ./deploy.sh               build, preflight, ask, then deploy
#   ./deploy.sh --yes         build, preflight, and deploy without the prompt
#
set -Eeuo pipefail
IFS=$'\n\t'

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND="$ROOT/zip-repl-1zip/Frontend"
BACKEND="$ROOT/zip-repl-1zip/Backend"
STAGING="$ROOT/deploy/_staging"

FTP_HOST="${FTP_HOST:-ftp.bengaliislamicinstitute.com}"
FTP_USER="${FTP_USER:-deploy@bengaliislamicinstitute.com}"
FTP_PORT="${FTP_PORT:-21}"
FTP_TARGET="${FTP_TARGET:-.}"
# The supplied FTP endpoint rejected its TLS certificate during inspection.
# Plain FTP is therefore the working default; set FTP_SSL_ALLOW=yes only when
# the server certificate/transport is corrected or an explicit exception is
# accepted by the operator.
FTP_SSL_ALLOW="${FTP_SSL_ALLOW:-no}"
FTP_SSL_VERIFY="${FTP_SSL_VERIFY:-yes}"
# Production already has vendor/ installed. Set this to yes when a dependency
# change must also be synchronized through FTP.
FTP_INCLUDE_VENDOR="${FTP_INCLUDE_VENDOR:-no}"
VERIFY_URL="${VERIFY_URL:-https://bengaliislamicinstitute.com}"

MODE="deploy"
if [[ "${1:-}" == "--check" ]]; then
  MODE="check"
elif [[ "${1:-}" == "--yes" ]]; then
  MODE="yes"
elif [[ -n "${1:-}" ]]; then
  printf 'Usage: %s [--check|--yes]\n' "$0" >&2
  exit 2
fi

case "$FTP_TARGET" in
  /|./) FTP_TARGET="." ;;
esac

if [[ "$FTP_TARGET" != "." && "$FTP_TARGET" != ./* ]]; then
  printf 'FTP_TARGET must be . or a relative path below the FTP account root.\n' >&2
  exit 2
fi

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'Required command not found: %s\n' "$1" >&2
    exit 1
  }
}

require_command composer
require_command lftp
require_command rsync
require_command yarn

if [[ -z "${FTP_PASS:-}" ]]; then
  if [[ ! -t 0 ]]; then
    printf 'FTP_PASS is required in non-interactive mode; it is never stored by this script.\n' >&2
    exit 1
  fi
  read -r -s -p "FTP password for $FTP_USER: " FTP_PASS
  printf '\n'
fi
export LFTP_PASSWORD="$FTP_PASS"

printf '%s\n' '============================================================'
printf '%s\n' ' Bengali Islamic Institute — FTP deployment'
printf '%s\n' '============================================================'
printf 'Local root:    %s\n' "$ROOT"
printf 'FTP server:    %s:%s\n' "$FTP_HOST" "$FTP_PORT"
printf 'Remote target: %s\n' "$FTP_TARGET"
printf 'HTTPS check:   %s\n' "$VERIFY_URL"
printf 'Mode:          %s\n' "$MODE"
printf '%s\n' 'Password:      supplied without displaying it'

printf '%s\n' '▶ Installing locked backend dependencies...'
(cd "$BACKEND" && composer install --no-dev --prefer-dist --no-interaction --no-progress)

printf '%s\n' '▶ Building the React frontend...'
(cd "$FRONTEND" && CI=false yarn build)

printf '%s\n' '▶ Assembling the merged public_html staging tree...'
bash "$ROOT/deploy/build-staging.sh"

LFTP_SETTINGS=$(cat <<EOF
set ftp:passive-mode yes
set net:timeout 30
set net:max-retries 1
set cmd:fail-exit yes
set bmk:save-passwords false
set ftp:ssl-allow $FTP_SSL_ALLOW
EOF
)
if [[ "$FTP_SSL_ALLOW" == "yes" ]]; then
  LFTP_SETTINGS+=$'\nset ssl:verify-certificate '"$FTP_SSL_VERIFY"
fi

LFTP_EXCLUDES="--exclude-glob '.env' --exclude-glob '.env.*' --exclude-glob '.git' --exclude-glob '.git/**' --exclude-glob '.well-known' --exclude-glob '.well-known/**' --exclude-glob 'uploads' --exclude-glob 'uploads/**' --exclude-glob 'runtime' --exclude-glob 'runtime/**' --exclude-glob 'index.html' --exclude-glob 'vagrant' --exclude-glob 'vagrant/**' --exclude-glob 'tests' --exclude-glob 'tests/**' --exclude-glob '.github' --exclude-glob '.github/**' --exclude-glob '.opencode' --exclude-glob '.opencode/**' --exclude-glob '.vscode' --exclude-glob '.vscode/**' --exclude-glob '*.log' --exclude-glob '*.md' --exclude-glob 'tools/__pycache__' --exclude-glob 'tools/__pycache__/**'"
if [[ "$FTP_INCLUDE_VENDOR" != "yes" ]]; then
  LFTP_EXCLUDES+=" --exclude-glob 'vendor' --exclude-glob 'vendor/**'"
fi

run_lftp() {
  local body="$1"
  LFTP_PASSWORD="$FTP_PASS" lftp --norc --env-password -e "$LFTP_SETTINGS
open --env-password -u '$FTP_USER' -p '$FTP_PORT' '$FTP_HOST'
$body
quit"
}

printf '%s\n' '▶ Read-only FTP preflight and local/remote dry-run comparison...'
run_lftp "
pwd
cls -la $FTP_TARGET
lcd $STAGING
mirror --reverse --dry-run --verbose --parallel=1 --no-perms $LFTP_EXCLUDES ./ $FTP_TARGET
"

if [[ "$MODE" == "check" ]]; then
  printf '%s\n' '✅ Preflight complete; no files were uploaded.'
  exit 0
fi

if [[ "$MODE" != "yes" ]]; then
  read -r -p "Upload this staged tree to $FTP_TARGET? [y/N] " answer
  if [[ ! "$answer" =~ ^[Yy]$ ]]; then
    printf '%s\n' 'Upload cancelled; no remote files were changed.'
    exit 0
  fi
fi

printf '%s\n' '▶ Uploading staged files (without deleting remote files)...'
run_lftp "
lcd $STAGING
mirror --reverse --verbose --parallel=2 --no-perms $LFTP_EXCLUDES ./ $FTP_TARGET
put $STAGING/index.html -o $FTP_TARGET/index.html
"

printf '%s\n' '▶ Verifying deployed FTP paths...'
run_lftp "
cls -l $FTP_TARGET/index.html
cls -l $FTP_TARGET/ads.txt
cls -l $FTP_TARGET/.htaccess
"

printf '%s\n' '▶ Verifying public HTTPS markers...'
if command -v curl >/dev/null 2>&1; then
  curl --fail --silent --show-error --max-time 30 "$VERIFY_URL/ads.txt" | sed -n '1,10p'
  curl --fail --silent --show-error --max-time 30 "$VERIFY_URL/" \
    | rg -o 'adsense-script|adsbygoogle\\.js|static/js/main\\.[^" ]+\\.js' \
    | sort -u || printf '%s\n' 'Warning: expected ad markers were not found in the live HTML.'
else
  printf '%s\n' 'curl not found; skipped HTTPS verification.'
fi

printf '%s\n' '✅ Deployment complete. AdSense fill status still depends on Google inventory/account eligibility.'
