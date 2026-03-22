#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# run-tests.sh
#
# Run all unit and integration tests across all phases.
# Run from the project root.
#
# Usage:
#   chmod +x run-tests.sh
#   ./run-tests.sh            # run all
#   ./run-tests.sh --watch    # watch mode
# ─────────────────────────────────────────────────────────────────────────────

WATCH=${1:-""}

echo ""
echo "Recipe PWA — test suite"
echo "───────────────────────"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
  echo ""
fi

if [ "$WATCH" = "--watch" ]; then
  npx vitest
else
  npx vitest run \
    schema/schema.test.js \
    extractor/categoriser.test.js \
    extractor/parser.test.js \
    app/data.test.js \
    app/views/shopping.test.js \
    app/views/mise.test.js \
    app/views/cook.test.js \
    app/views/editor.test.js
fi
