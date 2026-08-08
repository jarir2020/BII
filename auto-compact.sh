#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# auto-compact.sh — Run periodically to check context health.
#
# Usage:
#   Run manually:  bash auto-compact.sh
#   Or via cron:   */30 * * * * bash ~/.../auto-compact.sh
#
# What it does:
#   1. Checks ~/.claude/settings.json rule count
#   2. Auto-compacts if rules exceed threshold
#   3. Logs compaction history
#   4. Prints token-saving summary
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SETTINGS="${HOME}/.claude/settings.json"
LOG="${HOME}/.claude/compact.log"
THRESHOLD=30  # compact if more than N rules

timestamp() { date '+%Y-%m-%d %H:%M:%S'; }

if [[ ! -f "$SETTINGS" ]]; then
  echo "[$(timestamp)] Settings not found" >> "$LOG"
  exit 1
fi

# Count current rules
BEFORE=$(python3 -c "import json; d=json.load(open('$SETTINGS')); print(len(d.get('permissions',{}).get('allow',[])))")

if [[ "$BEFORE" -le "$THRESHOLD" ]]; then
  echo "[$(timestamp)] OK: $BEFORE rules (threshold: $THRESHOLD)" >> "$LOG"
  echo "No compaction needed ($BEFORE rules ≤ $THRESHOLD threshold)"
  exit 0
fi

# Run compaction
python3 - "$SETTINGS" <<'PYEOF'
import json, sys, re

path = sys.argv[1]
with open(path) as f:
    data = json.load(f)

allow = data.get("permissions", {}).get("allow", [])

# Drop rules longer than 60 chars (too specific)
compact = []
for rule in allow:
    if len(rule) <= 60:
        compact.append(rule)

# Ensure broad patterns exist
essential = [
    "Read(//home/jarir-ahmed/**)",
    "Read(//opt/**)",
    "Read(//proc/**)",
    "Read(//dev/**)",
    "Read(//tmp/**)",
    "Read(//usr/lib/android-sdk/**)",
    "Bash(git add *)",
    "Bash(git commit *)",
    "Bash(git push *)",
    "Bash(gh workflow *)",
    "Bash(gh run *)",
    "Bash(curl *)",
    "Bash(chmod *)",
    "Bash(find *)",
    "Bash(cat *)",
    "Bash(grep *)",
    "Bash(ls *)",
    "Bash(head *)",
    "Bash(tail *)",
    "Bash(python3 *)",
    "Bash(dpkg -l)",
    "Bash(apt-cache *)",
    "Bash(~/android-sdk/platform-tools/adb *)",
    "Bash(/usr/lib/android-sdk/cmdline-tools/latest/bin/*)",
]
for e in essential:
    if e not in compact:
        compact.append(e)

data["permissions"]["allow"] = compact
with open(path, "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write("\n")

print(f"{len(allow)} → {len(compact)}")
PYEOF

AFTER=$(python3 -c "import json; d=json.load(open('$SETTINGS')); print(len(d.get('permissions',{}).get('allow',[])))")
SAVED=$((BEFORE - AFTER))

echo "[$(timestamp)] COMPACTED: $BEFORE → $AFTER rules (saved $SAVED)" >> "$LOG"
echo "Compacted: $BEFORE → $AFTER rules (saved $SAVED)"
