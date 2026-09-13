#!/usr/bin/env bash
set -euo pipefail

# Generates a coverage report from Vitest.
# Run from frontend/: ./scripts/coverage.sh

cd "$(dirname "$0")/.."

npx vitest run --coverage 2>&1 | sed -n '/^ % Coverage/,$p'
