#!/usr/bin/env bash
# Fallback submission pipeline — run if the operator is unavailable before deadline.
# Usage: ./scripts/deadline_fallback.sh
# Suggested cron (Paris, CEST): 45 11 5 7 * cd /path/to/tribunal && ./scripts/deadline_fallback.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PATH="$HOME/.local/bin:$PATH"

echo "=== Tribunal deadline fallback $(date -Iseconds) ==="

npm install
npm test
npm run demo

# Record demo from the committed real CLI run (reliable, no live keys required).
npm run record:demo -- --replay || npm run record:demo || true

echo ""
echo "Video: runs/demo-recording/webm/*.webm"
echo "Upload to YouTube/Loom, then run: npm run submit:prep"
echo "Form: https://cerebralvalley.ai/e/raise-summit-hackathon/hackathon/submit"

npm run submit:prep
