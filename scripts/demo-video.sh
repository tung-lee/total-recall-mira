#!/usr/bin/env bash
# Records the walkthrough and renders artifacts/mira-demo.mp4.
# DEMO=1 uses a demo mode server on :8788; otherwise records against the live server on :8787.
set -euo pipefail
cd "$(dirname "$0")/.."
PORT=8787
if [ "${DEMO:-0}" = "1" ]; then
  PORT=8788
  lsof -ti tcp:$PORT -sTCP:LISTEN | xargs kill 2>/dev/null || true
  YOUCAM_DEMO=1 PORT=$PORT node server/index.mjs &
  SERVER=$!
  trap 'kill $SERVER 2>/dev/null || true' EXIT
  sleep 2
fi
rm -rf artifacts/raw artifacts/work
node scripts/record-demo.mjs "http://localhost:$PORT"
node scripts/make-video.mjs
