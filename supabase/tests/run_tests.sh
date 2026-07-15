#!/usr/bin/env bash
# ============================================================================
# PodMind AI — Database test runner.
# Creates a throwaway database, applies the Supabase shim, runs every
# migration in order, then executes the smoke test suite.
# Usage:   ./supabase/tests/run_tests.sh [database_name]
# Exit:    0 on success, 1 on any migration or test failure.
# ============================================================================
set -euo pipefail

DB="${1:-podmind_ci_$(date +%s)}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cleanup() { dropdb --if-exists "$DB" 2>/dev/null || true; }
trap cleanup EXIT

echo "==> Creating database: $DB"
createdb "$DB"

echo "==> Applying Supabase environment shim"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$ROOT/supabase/tests/00_supabase_shim.sql"

echo "==> Applying migrations"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "    -> $(basename "$f")"
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"
done

echo "==> Running smoke tests"
psql -v ON_ERROR_STOP=1 -d "$DB" -f "$ROOT/supabase/tests/01_smoke_tests.sql"

echo "==> ALL GREEN"
