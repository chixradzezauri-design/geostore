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
their bytes with the **stored applied** SQL checksum. It originally classified 80
exact-version/name matches and 32 same-name/different-version pairs before Stage75 local-only renaming.

**byte equality** is positive evidence of exact SQL source identity at the
time a migration was applied. A different MD5 does *not* prove a different
runtime effect or establish that replay is safe; it requires source-level
semantic reconciliation and real end-state checks. MD5 here is only a
change-detection checksum, not an authorization token or security primitive.

## Original Stage73 source-checksum results before Stage75

The existing no-cost PostgreSQL17 CI successfully compared **112** local files
to the full SQL bodies that Supabase stored as applied migrations:

| Version/name relationship | SQL bytes identical | SQL differs |
| --- | ---: | ---: |
| Same version and logical name (80) | **19** | **61** |
| Same logical name but different version (32) | **21** | **11** |

Therefore **21 of the 32** previously uncertain timestamp-only pairs are now
confirmed to have exactly the same stored SQL bytes. The remaining **11**
different-timestamp pairs have different SQL text and need a semantic diff
before any attempt to repair or replay migration history:

- `20261107001000_add_product_data_integrity_constraints.sql`
- `20261107002000_harden_flash_sale_rounding.sql`
- `20261107020000_add_order_status_notifications.sql`
- `20261107181500_skip_custom_variant_products_in_flash_sales.sql`
- `20261112133000_guard_legacy_order_product_references.sql`
- `20261116071600_harden_support_ticket_authorization_and_admin_reply_status.sql`
- `20261118180000_move_all_support_ticket_history_rpcs_to_private.sql`
- `20261119090000_revoke_anon_completed_order_reactivation.sql`
- `20261119110000_add_storefront_hero_storage_scope.sql`
- `20261119150000_admin_panel_visual_design_sync.sql`
- `20261119152000_admin_panel_visual_design_concurrency.sql`

The 61 same-version-but-different-SQL migrations also require appropriate
review. Some differences may be whitespace, comments or intentional local
updates. Neither different hashes nor identical names prove runtime
incompatibility; no SQL was applied as part of these checks.

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

## Stage75 post-reconciliation snapshot (updated repository filenames)

After locally renaming the 21 byte-identical historical SQL files to their confirmed already-applied remote version IDs (without changing bytes or Production), the same 112 linked local files now classify as **101 exact version/name** (40 byte-identical, 61 SQL-different) and **11 same-name/different-version** (0 byte-identical, 11 SQL-different). The other seven older and four new unapplied migrations remain blocked. The original 80/32 comparison above is preserved as historical audit evidence, not the present folder state.
