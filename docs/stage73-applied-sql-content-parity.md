# Stage 73 — applied SQL content parity instead of timestamp assumptions

**NOT RELEASE-READY. Production unchanged; no paid staging.**

## New read-only evidence

Supabase itself stores one SQL statement body for every one of its **135**
recorded applied migrations in `supabase_migrations.schema_migrations.statements[1]`.
The full SQL is not copied into this PR, and NO customer, staff, financial or
order data is read. We used only a read-only PostgreSQL SELECT returning
`version`, `name`, `md5(statements[1])`, byte count and statement count.

This is stronger than Stage72's version/name-only metadata. The archived
checksum-only snapshot is
`release/stage73-production-sql-digests.json`, tied to Stage72's frozen
135-migration history fingerprint. The script
`scripts/stage73SqlContentParity.mjs` hashes local SQL files and compares
their bytes with the **stored applied** SQL checksum. It classifies all 80
exact-version/name matches and the 32 same-name/different-version pairs.

**Byte equality** is positive evidence of exact SQL source identity at the
time a migration was applied. A different MD5 does *not* prove a different
runtime effect or establish that replay is safe; it requires source-level
semantic reconciliation and real end-state checks. MD5 here is only a
change-detection checksum, not an authorization token or security primitive.

## Deployment consequences

- Do not assume all **32** different-timestamp migrations have the same SQL.
  The CI report separately lists byte-equal and differing source files.
- Do not replay any of the seven known old migrations or rerun the 55
  remote-only history entries merely because the local timestamps are
  missing. Never run `supabase db push` or automatic history repair.
- Four vetted migration sources remain pinned by Git blob SHA in Stage72:
  **Phase A** (three checkout/customer-history/admin-order RPC files), then
  the reviewed new frontend deployment, then **Phase B** (legacy raw
  order-column SELECT revocation after the new frontend is READY).
- The scripts only compare local metadata/SQL in the existing free
  PostgreSQL 17 GitHub Actions suite. They cannot mutate Production,
  write SQL to Supabase or deploy Vercel.

Run: `node scripts/stage73SqlContentParity.mjs --verify-frozen-digests`.
A current metadata-only digest JSON can also be passed via
`--fresh-digests-json PATH` to fail closed if the recorded Production SQL
history changes; never include passwords or original SQL text in this JSON.

Full-schema authenticated Supabase **JWT** + PostgREST staging tests and
manual analysis of every SQL difference remain release blockers. The user
previously declined paid resources. **No paid staging** was created and
**Production unchanged**. PR #149 remains Draft/unmerged.
