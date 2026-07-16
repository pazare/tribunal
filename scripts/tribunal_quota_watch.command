#!/bin/zsh

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATUS="$ROOT/.local-data/tribunal/CLAUDE_QUOTA_STATUS.json"

while true; do
  clear
  echo "Tribunal Claude quota ledger (local-only; Claude CLI disabled)"
  echo "Updated display: $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo
  echo "Recorded account quota evidence"
  if [[ -f "$STATUS" ]]; then
    jq -r '
    .accounts[] |
    "\n" + .account + " [" + .surface + "]" +
    "\n  5-hour: " + .five_hour_limit.status +
    (if .five_hour_limit.remaining == null then "" else " (remaining " + (.five_hour_limit.remaining|tostring) + ")" end) +
    (if .five_hour_limit.reset_at == null then "" else " | reset " + .five_hour_limit.reset_at end) +
    "\n  weekly: " + .weekly_limit.status +
    (if .weekly_limit.remaining == null then "" else " (remaining " + (.weekly_limit.remaining|tostring) + ")" end) +
    (if .weekly_limit.reset_at == null then "" else " | reset " + .weekly_limit.reset_at end) +
    "\n  Fable: " + .fable_limit.status +
    (if .fable_limit.remaining == null then "" else " (remaining " + (.fable_limit.remaining|tostring) + ")" end) +
    (if .fable_limit.reset_at == null then "" else " | reset " + .fable_limit.reset_at end)
    ' "$STATUS"
  else
    echo "No private quota snapshot recorded"
  fi
  echo
  echo "Exact percentages remain UNKNOWN unless the authenticated usage UI exposes them."
  echo "No Claude CLI command is executed. App work is operator-owned and canonical."
  echo "This display refreshes every 60 seconds. Ctrl-C stops only this monitor."
  sleep 60
done
