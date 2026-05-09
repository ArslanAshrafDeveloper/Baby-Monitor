#!/usr/bin/env bash
# Bootstrap script for the Baby Monitor App.
# Installs deps for the signaling server and the RN app.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Installing signaling server deps"
cd "$ROOT/server"
[ -f .env ] || cp .env.example .env
npm install

echo "==> Installing RN app deps"
cd "$ROOT/app"
npm install

echo
echo "Bootstrap complete."
echo "Next:"
echo "  1. Read app/SETUP.md for the native iOS/Android setup checklist."
echo "  2. Read ml/README.md for the cry-detection model download."
echo "  3. Start the server:   cd server && npm run dev"
