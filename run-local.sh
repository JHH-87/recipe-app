#!/usr/bin/env bash
# Run from the project root (the directory containing this script).
# Usage: ./run-local.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR"   # was: "$SCRIPT_DIR/app"
PORT=8080

echo ""
echo "Recipe PWA — local dev server"
echo "─────────────────────────────"

# Verify app directory exists
if [ ! -d "$APP_DIR" ]; then
  echo "ERROR: Could not find app/ directory."
  echo ""
  echo "Expected structure:"
  echo "  $(basename $SCRIPT_DIR)/"
  echo "    run-local.sh   ← you are here"
  echo "    app/"
  echo "      index.html"
  echo "      main.js"
  echo "      ..."
  echo ""
  echo "If you have index.html in the same directory as this script,"
  echo "run this instead:"
  echo "  npx serve $SCRIPT_DIR"
  exit 1
fi

# Verify index.html exists
if [ ! -f "$APP_DIR/index.html" ]; then
  echo "ERROR: app/index.html not found. Check your file structure."
  exit 1
fi

echo "Serving:  $APP_DIR"
echo "URL:      http://localhost:$PORT"
echo ""
echo "Open the URL above in your browser."
echo "Press Ctrl-C to stop."
echo ""

if command -v npx &> /dev/null; then
  npx serve "$APP_DIR" --listen "$PORT" --no-clipboard
elif command -v python3 &> /dev/null; then
  cd "$APP_DIR" && python3 -m http.server "$PORT"
else
  echo "ERROR: neither npx nor python3 found."
  exit 1
fi
