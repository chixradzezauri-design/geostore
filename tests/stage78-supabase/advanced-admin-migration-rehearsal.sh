#!/usr/bin/env bash
# Disposable GitHub Actions only. Never run against a linked project.
set -euo pipefail
test "${GITHUB_ACTIONS:-}" = true
test "$(pwd -P)" = "$GITHUB_WORKSPACE/tests/stage78-supabase"
grep -Fx 'project_id = "geostore-stage78-ci"' supabase/config.toml >/dev/null
test ! -e supabase/.temp/project-ref
test -n "${RUNNER_TEMP:-}"
unset SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD DATABASE_URL PGHOST PGPORT PGUSER PGDATABASE PGSERVICE
export PGPASSWORD=postgres
db=(psql -X -h 127.0.0.1 -p 54322 -U postgres -d postgres -v ON_ERROR_STOP=1)
supabase migration new --help >/dev/null
supabase migration up --help | grep -F -- '--local' >/dev/null
supabase migration list --help | grep -F -- '--local' >/dev/null
supabase migration new advanced_admin_release
shopt -s nullglob
files=(supabase/migrations/*_advanced_admin_release.sql)
test "${#files[@]}" -eq 1
file="${files[0]}"
version="$(basename "$file" | cut -d_ -f1)"
[[ "$version" =~ ^[0-9]{14}$ ]]
trap 'rm -f -- "$file"' EXIT
# Exercise the exact staged release body, including in-transaction guards.
node "$GITHUB_WORKSPACE/scripts/advancedAdminReleaseBundle.mjs" --final-migration > "$file"
cmp "$file" "$GITHUB_WORKSPACE/release/advanced-admin-final-migration.sql"
echo "PREPARED MIGRATION: $(basename "$file")"
sha256sum "$file"
cp "$file" "$RUNNER_TEMP/advanced-admin-cli-reviewed-body.sql"
# Prove a late failure rolls back DDL and migration history, not just SQL.
printf '\nSELECT 1/0;\n' >> "$file"
if supabase migration up --local >"$RUNNER_TEMP/advanced-admin-expected-failure.log" 2>&1; then
  echo 'Expected migration failure did not occur' >&2; exit 1
fi
grep -Ei 'division by zero|22012' "$RUNNER_TEMP/advanced-admin-expected-failure.log" >/dev/null
test "$("${db[@]}" -Atc "SELECT (to_regclass('public.admin_suppliers') IS NULL AND to_regclass('private.marketing_campaign_preflights') IS NULL AND to_regprocedure('public.admin_marketing_segments()') IS NULL)::int")" = 1
test "$("${db[@]}" -Atc "SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version='$version'")" = 0
echo 'PASS local CLI failed migration leaves no candidate sentinel objects or migration history entry'
cp "$RUNNER_TEMP/advanced-admin-cli-reviewed-body.sql" "$file"
supabase migration up --local
test "$("${db[@]}" -Atc "SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version='$version' AND name='advanced_admin_release'")" = 1
test "$("${db[@]}" -Atc "SELECT (to_regclass('public.admin_suppliers') IS NOT NULL AND to_regclass('private.marketing_campaign_preflights') IS NOT NULL AND to_regprocedure('public.admin_marketing_segments()') IS NOT NULL)::int")" = 1
supabase migration up --local
test "$("${db[@]}" -Atc "SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version='$version'")" = 1
supabase migration list --local
echo 'PASS local CLI candidate applied once and recorded exactly once; rerun is a no-op'
