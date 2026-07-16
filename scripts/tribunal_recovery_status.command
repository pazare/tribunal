#!/bin/zsh

clear
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1

echo "TRIBUNAL CLINICAL RECOVERY — LOCAL STATUS"
echo "========================================================"
date '+%Y-%m-%d %H:%M:%S %Z'
echo
echo "Claude CLI is disabled by operator instruction."
echo "This script executes no Claude command and does not inspect or message app sessions."
echo
echo "Recovery plan"
echo "-------------"
echo "$ROOT/docs/hackathon/ORCHESTRATION_RECOVERY_PLAN_2026-07-16.md"
echo
echo "This terminal is intentionally left open for Pablo to inspect."
exec /bin/zsh
