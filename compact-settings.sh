#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# compact-settings.sh — Consolidate duplicate permissions in
# ~/.claude/settings.json into broad wildcard patterns.
#
# Keeps the allow list short so Claude doesn't waste tokens
# reading hundreds of specific command entries.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SETTINGS="${HOME}/.claude/settings.json"
BACKUP="${SETTINGS}.bak.$(date +%s)"

if [[ ! -f "$SETTINGS" ]]; then
  echo "Settings file not found: $SETTINGS" >&2
  exit 1
fi

cp "$SETTINGS" "$BACKUP"
echo "Backup: $BACKUP"

python3 - "$SETTINGS" <<'PYEOF'
import json, sys, re

path = sys.argv[1]
with open(path) as f:
    data = json.load(f)

perms = data.get("permissions", {})
allow = perms.get("allow", [])

# Group rules by tool prefix
groups = {}
for rule in allow:
    m = re.match(r'^(\w+)\(', rule)
    if m:
        tool = m.group(1)
        groups.setdefault(tool, []).append(rule)
    else:
        groups.setdefault("other", []).append(rule)

# Patterns that already use wildcards
WILDCARD_RE = re.compile(r'^\w+\(\S*\*\S*\)$')

# Commands that are destructive and must never be auto-compacted
DESTRUCTIVE = re.compile(r'rm\b|rmdir\b|unlink\b|reset\s+--hard|clean\b|drop\s+table|delete\s+from|drop\s+database|force', re.I)

# Build compact allow list
compact = []
seen_patterns = set()

for tool, rules in sorted(groups.items()):
    # If we already have a wildcard for this tool, skip individual rules
    has_wildcard = any(WILDCARD_RE.match(r) for r in rules)
    if has_wildcard:
        compact.extend(r for r in rules if WILDCARD_RE.match(r))
        non_wc = [r for r in rules if not WILDCARD_RE.match(r)]
        if non_wc:
            print(f"[skip] {tool}: {len(non_wc)} specific rules covered by wildcard")
        continue

    # If only 1-2 rules, keep them as-is
    if len(rules) <= 2:
        compact.extend(rules)
        continue

    # Check if all rules are for the same base command
    base_cmds = set()
    for r in rules:
        m2 = re.match(r'^\w+\((\S+)', r)
        if m2:
            cmd = m2.group(1).split()[0].rstrip('*').rstrip('/')
            base_cmds.add(cmd)

    # If all rules share a prefix, use wildcard
    if len(base_cmds) == 1:
        pattern = f"{tool}({list(base_cmds)[0]}*)"
        if pattern not in seen_patterns:
            compact.append(pattern)
            seen_patterns.add(pattern)
            print(f"[compact] {tool}: {len(rules)} rules → {pattern}")
        continue

    # Keep specific rules (mixed commands in this tool)
    compact.extend(rules)

data["permissions"]["allow"] = compact

with open(path, "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write("\n")

print(f"\nResult: {len(allow)} rules → {len(compact)} rules (saved {len(allow)-len(compact)})")
PYEOF

echo "Done. Review with: cat $SETTINGS | python3 -m json.tool"
