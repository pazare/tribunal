#!/bin/zsh

clear
cd "/Users/pablo/Desktop/RAISE Cursor" || exit 1

echo "TRIBUNAL CLINICAL RECOVERY — READ-ONLY CLAUDE INVENTORY"
echo "========================================================"
date '+%Y-%m-%d %H:%M:%S %Z'
echo
echo "No model prompt is being sent. No Claude credits are being used by this script."
echo "Allowed future Claude model: claude-fable-5, effort max, no fallback."
echo
echo "Claude CLI authentication status"
echo "--------------------------------"
/Users/pablo/.local/bin/claude auth status
echo
echo "Stopped/background sessions for this repository"
echo "-----------------------------------------------"
/Users/pablo/.local/bin/claude agents --json --all --cwd "/Users/pablo/Desktop/RAISE Cursor"
echo
echo "Recovery plan"
echo "-------------"
echo "/Users/pablo/Desktop/RAISE Cursor/docs/hackathon/ORCHESTRATION_RECOVERY_PLAN_2026-07-16.md"
echo
echo "This terminal is intentionally left open for Pablo to inspect."
exec /bin/zsh
