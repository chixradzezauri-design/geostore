# Stage 72 — source-pinned migration history and release manifest

**NOT RELEASE-READY. Production unchanged. PR #149 remains Draft.**

This stage does **not** apply SQL, merge code, deploy Vercel, run real checkout
or create a paid resource. Its purpose is to make a later **manual** release
reproducible and fail-closed against changes in the remote schema history or
the four specifically reviewed SQL source files.

## Fresh live baseline (read-only, 2026-11-22)

- 135 applied Supabase migrations; latest `20261120124250`.
- 101 exact local version/name matches, 11 same-name/different-version,
  seven older unmatched, and **four pinned SQL files** awaiting deployment.
- 22 local versions have no matching remote version (11 + 7 + 4).
- Production has **34 remote-only** applied migration versions that do not
  exist locally with the same version number. Some are logically equivalent
  by name, but their SQL content has NOT been proven identical.
- Four duplicate logical migration names in the local migrations directory.

The snapshot is **metadata-only**: version and migration name; no customer,
order, stock, financial, password, API key or JWT data. A live SELECT-only
SQL query established `count=135`, `latest=20261120124250` and the
canonical history MD5 `4f09258df9fbd7b415cc2d3dc5ffbe6f`.
The corresponding captured names and versions are frozen in
`release/stage72-production-history-baseline.json`.

## Reviewed source and deployment ordering

`scripts/stage72ReconciledReleaseGate.mjs` checks all four Git blob SHA-1
hashes before permitting even a **plan** to be printed (not SQL execution).
The plan contains only these files:

**Phase A**, before new frontend, in this exact order:

1. `20261121170000_strip_private_costs_from_checkout_rpc.sql` — redacted
   public checkout API response; no private stock function replacement.
2. `20261121190000_redact_alternate_costs_from_order_history.sql` — redacted
   authenticated customer-history order snapshot.
3. `20261121210000_scope_admin_order_ledger_permissions.sql` — adds the
   two order projection RPCs without revoking existing direct table reads.

Deploy and verify the new reviewed frontend only after Phase A is checked
in a compatible **full-schema Supabase** environment with real authenticated
**JWT** and PostgREST authorization, inventory, checkout, idempotency, orders
and finance permissions. Preserve the stable Production commit as rollback
reference; test older loaded admin browser tabs.

**Phase B**, only after new site is READY and operational:

4. `20261121213000_revoke_legacy_order_snapshot_reads.sql` — removes
   finance-bearing legacy SELECT grants; its own SQL transaction checks
   Phase A RPCs and role grants first.

Seven older unmatched SQL migrations remain blocked (including four
with already demonstrated compatibility regressions). **Never run a blind
migration push, repair version history, mark old migrations applied or
cherry-pick the old checkout**. Source hash matching proves the reviewed
local bytes, not SQL equality against the remote historical scripts.

## Free automated verification

`node scripts/stage72ReconciledReleaseGate.mjs --verify-pinned`
validates the frozen baseline, four original SQL blob hashes, version
buckets and exact Phase A/Phase B order. It prints a
`BLOCKED_PENDING_FULL_SCHEMA_STAGING_AND_MANUAL_SQL_HISTORY_RECONCILIATION`
status; a pass does NOT mean safe to publish.

To verify **fresh** production metadata just before any human-supervised
release, export `list_migrations` to an approved local JSON without
credentials or table rows and run:

`node scripts/stage72ReconciledReleaseGate.mjs --fresh-migrations-json /path/to/migrations.json`

The script fails if even a single applied migration name/version changed
since the baseline. For each release attempt, also verify SQL grant/catalog
preflight and the exact tested commit. Existing GitHub CI includes this
non-deploying validator in the same no-cost PostgreSQL17 workflow.

**Remaining blockers:** true authenticated full-schema Supabase staging and
HTTP/JWT tests, historical SQL-by-SQL migration reconciliation, and a
coordinated cutover with checkout, stock, staff-orders, accounting and
web-client compatibility checks. The user declined paid development
infrastructure; **no paid staging** was created. **Production unchanged**.

## Stage75 safe local version reconciliation

21 previously different-timestamp SQL files were **byte-identical** to already applied Supabase SQL and have been renamed **locally only**, with original Git blob SHA preserved. The Production migration table was not edited. New totals: 101 exact version/name, 11 same-name/different-version, 7 older unmatched, and 4 staged; 22 unmatched local versions and 34 remote-only applied versions. See `release/stage75-reviewed-local-renames.json` and the CI gate for the 21 one-to-one references.
