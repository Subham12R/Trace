#!/usr/bin/env bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Prefer Python 3.12 for best package compatibility; fall back to available python3
for PY in python3.12 python3.13 python3; do
  if command -v "$PY" &>/dev/null; then
    PYTHON="$PY"
    break
  fi
done

echo "[build] Using $PYTHON ($(${PYTHON} --version))"
echo "[build] Setting up venv..."
"$PYTHON" -m venv .venv
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet -r requirements.txt pyinstaller

echo "[build] Bundling server into single executable..."
.venv/bin/pyinstaller server_mac.spec --noconfirm

echo "[build] Server binary ready at dist/server"
