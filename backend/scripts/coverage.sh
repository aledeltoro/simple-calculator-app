#!/usr/bin/env bash
set -euo pipefail

# Generates a coverage report excluding cmd/api/main.go (wiring-only entry point).
# Run from backend/: ./scripts/coverage.sh

cd "$(dirname "$0")/.."

go test -coverprofile=coverage.out ./... >/dev/null 2>&1

# Exclude cmd/api/main.go from the profile
grep -v "cmd/api/main.go" coverage.out > coverage_filtered.out

echo ""
echo "Coverage (excluding cmd/api/main.go):"
echo ""
go tool cover -func=coverage_filtered.out
echo ""

rm -f coverage_filtered.out
