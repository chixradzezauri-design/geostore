# GEOSTORE database migration reconciliation

Date: 2026-11-07
Supabase project: `xmtnszxtnfxnrojionoa`
Working branch: `maintenance/storefront-draft-save-2026-11-06`
Reviewed branch commit: `284511356901059dcaa19ece3a0e1d90d29b2eb8`

## Current reconciliation status

- Supabase remote migration ledger: **58 applied versions**.
- Working branch: **44 SQL migration files**.
- Exact version-and-name matches: **38**.
- Remote applied versions with no exact matching source file in the working branch: **20**.
- Branch files not present in the remote migration ledger: **6**.
- The migrations `20261107110746_enforce_nonnegative_product_stock` and `20261107115218_persist_checkout_addons_server_pricing` are applied remotely and their exact source files are present in the branch.
- Three exact historical source files were recovered from the original Git object history/known source branches and restored without executing them again:
  - `20261103044438_add_idempotent_checkout_replay.sql`
  - `20261103044704_validate_checkout_idempotency_payload.sql`
  - `20261103044919_minimize_checkout_idempotency_snapshot.sql`
- The existing `20261103121325_persist_admin_coupons_and_delivery_fees.sql` source was checked against the original source branch and is already present in this branch.
- GitHub path-history lookup for the remaining 20 exact missing filenames returned no commits. Their original SQL has not yet been recovered.

## Remote applied versions without exact branch source

- `20261102181854_add_product_purchase_cost.sql`
- `20261103042140_server_checkout_prices_and_store_config.sql`
- `20261103083543_add_optional_customer_email_to_orders.sql`
- `20261103113219_restrict_unused_public_order_tracking_rpc.sql`
- `20261103114054_restrict_anon_products_to_public_catalog_columns.sql`
- `20261103114610_restore_secure_order_tracking_and_admin_notes.sql`
- `20261103114846_protect_product_cost_from_authenticated_customers.sql`
- `20261103114947_optimize_admin_rls_policies_without_changing_access.sql`
- `20261103114954_correct_admin_email_in_message_rls.sql`
- `20261103115012_restore_exact_admin_email_in_rls_policies.sql`
- `20261103115142_move_privileged_rpc_implementations_to_private_schema.sql`
- `20261103115237_keep_current_main_admin_catalog_compatible_until_pr18_merge.sql`
- `20261103124219_grant_admin_product_purchase_cost_write.sql`
- `20261103124349_align_product_admin_access_with_app_metadata.sql`
- `20261103124427_optimize_product_admin_role_policy_jwt_calls.sql`
- `20261103153931_correct_admin_reactivation_email_guard.sql`
- `20261103205301_snapshot_order_item_cost_vendor_category.sql`
- `20261103225225_create_storefront_studio_foundation.sql`
- `20261103225301_tighten_storefront_studio_rls_and_indexes.sql`
- `20261103230610_create_storefront_media_bucket_and_admin_policies.sql`

## Branch-only migrations; do not replay without reconciliation

- `20261106120000_validate_order_item_variants.sql`
- `20261106210000_validate_checkout_input_on_order_insert.sql`
- `20261106220000_harden_support_ticket_public_insert.sql`
- `20261107001000_add_product_data_integrity_constraints.sql`
- `20261107002000_harden_flash_sale_rounding.sql`
- `20261107020000_add_order_status_notifications.sql`

## Read-only live schema inventory

The live catalog was queried across `public` and `private` schemas before the checkout add-on migration. Counts at that snapshot:

| Catalog object | Count |
| --- | ---: |
| Tables | 13 |
| Columns | 110 |
| Constraints | 41 |
| Indexes | 25 |
| RLS policies | 30 |
| Non-internal triggers | 4 |
| Routines | 30 |
| Ordinary views | 0 |
| Table-level grants | 197 |
| Column-level grants | 1,137 |
| Extensions | 5 |
| Storage buckets | 1 |

All public tables remain RLS-enabled based on the preceding security audit. The initial reconciliation inventory was read-only. After that snapshot, the forward-only checkout add-on migration `20261107115218_persist_checkout_addons_server_pricing` was applied; its transactional verification rolled back all test orders and stock changes. Current order count remains zero.

## Confirmed support-intake permission detail

The public support form sends only these five fields: `id`, `customer_name`, `email`, `subject`, and `message`.

The live `public.support_tickets` table currently grants the `anon` role table-level INSERT, which permits attempts to supply all columns. Its RLS insert policy already forces `status = 'ღია'` and `reply IS NULL`, but a caller can still supply `created_at`. The safer target is a column-level INSERT grant for the five form fields only, with the database default controlling `created_at`. This should be a new forward-only migration after the history reconciliation; do not rewrite an already-applied migration.

## Branch-only migration conflict review

Three branch-only migration files were removed from the working branch after live catalog inspection:

- `20261107010000_add_authenticated_order_history.sql`: the live `private.get_my_orders()` already exists with a `RETURNS TABLE(...)` signature. The staged file attempts `CREATE OR REPLACE FUNCTION` with `RETURNS jsonb`, which PostgreSQL cannot apply as a return-type change. The live implementation must be reviewed and retained rather than overwritten.
- `20261107030000_preserve_stock_on_admin_product_upsert.sql`: the live `private.admin_save_product(jsonb)` is intentionally insert-only to prevent ID collisions from overwriting existing product data. The staged file would replace it with an UPSERT. Although that version preserves stock, it reintroduces the previously fixed product-ID overwrite risk.

- `20261106200000_prevent_completed_order_status_rollback.sql`: its three function bodies and the status-transition trigger are already present in the live database with equivalent behavior. Catalog output omits default `SECURITY INVOKER` and normalizes `SET search_path` syntax; the executable logic matches. Its order-delete grant/policy restrictions are also already in place. Replaying it would only drop/recreate the existing trigger and replace equivalent functions.

These deletions affect only unapplied files in the working branch; no production database objects or data were changed.

## Remaining branch-only migration review

- `20261106120000_validate_order_item_variants.sql` has no corresponding live trigger, but the only permitted order-creation path is the protected checkout RPC, which already checks selected sizes and colors against the product catalogue. Direct INSERT is not granted to `anon` or `authenticated`; keep this as optional defense-in-depth pending review.
- `20261106210000_validate_checkout_input_on_order_insert.sql` has no corresponding live trigger, but direct INSERT is not granted to `anon` or `authenticated`, and the protected checkout RPC already validates customer name, phone, address, email, item shape, quantity, and selected options. Keep staged until its additional trigger checks are compared against the RPC to avoid duplicate or conflicting validation.
- `20261106220000_harden_support_ticket_public_insert.sql` is a valid staged least-privilege improvement: it restricts anonymous INSERT to the five fields the browser sends. It is not applied because migration history remains unreconciled.
- `20261107001000_add_product_data_integrity_constraints.sql` has no matching live checks except existing nonnegative stock and purchase-cost checks. The current product rows produced zero violations for the proposed limits.
- `20261107002000_harden_flash_sale_rounding.sql` addresses a confirmed live gap: the current flash-sale function does not enforce two-decimal discount precision and updates rows even when the rounded price is unchanged.

## Recovery and safety constraints

1. Do not create placeholder/no-op migrations for missing versions.
2. Do not rename a similar migration to impersonate a missing version unless the original SQL is recovered and equivalence is independently verified.
3. Do not run `supabase migration repair`, `supabase db push`, or `supabase db reset` while the source history and live schema have not been reconciled.
4. Do not replay any of the 58 already-applied migrations.
5. Recover exact original SQL where possible. For unrecoverable versions, use the catalogued live schema as a reviewed baseline; do not invent historical SQL.
6. Keep the six remaining branch-only migrations staged until their effects are individually compared with the live catalog and routines.
7. Once reconciliation is complete, add new forward-only migrations for verified security improvements; do not rewrite historical migration files.

## Next actions

1. Finish classifying the 20 unrecovered historical migrations by their live schema effects and source provenance.
2. Complete equivalence review of the overlapping order-status trigger/function migration.
3. Keep the verified support INSERT least-privilege migration staged until history reconciliation is complete.
4. Validate and prepare the flash-sale rounding fix and product data constraints for a safe forward-only migration.
5. Decide whether order-status notifications are a wanted feature before adding their table/functions; no live notification table currently exists.
6. Run CI/security checks after the latest source changes. Do not trigger a Vercel production deployment until the consolidated release is approved.

## Deployment rule

Vercel production deployment remains intentionally deferred until the complete release review. Avoid repeated builds/deployments while the free account's usage limits are a concern.


---

# GEOSTORE database and release reconciliation — 2026-11-09

Project: \`xmtnszxtnfxnrojionoa\`
Repository: \`chixradzezauri-design/geostore\`
Working branch: \`maintenance/storefront-draft-save-2026-11-06\`
PR: #71
Reviewed maintenance head before this reconciliation: \`ff0ac34375ded32d6e99e3145fb981e1a74f041d\`
Production main at review: \`3f8ca352ce6cb9faf016c0ce696b9ee558441652\`

## Live database changes and verification

The Auth UUID ownership migration was applied as **\`20261108215548_bind_order_ownership_to_auth_user_uuid\`**. The branch migration file was renamed to this exact version so a future migration push will not replay the stale \`20261107200000\` filename.

- \`public.orders.user_id\` references \`auth.users(id)\`.
- \`public.order_notifications.recipient_user_id\` references \`auth.users(id)\`.
- New authenticated-order ownership trigger: \`orders_bind_auth_user_before_insert\`.
- \`private.get_my_orders()\` now filters by \`auth.uid()\`.
- Customer notification read/mark-read functions now filter by \`recipient_user_id = auth.uid()\`.
- Public RPC wrappers retain the same request and response contracts used by \`src/App.jsx\`.
- Orders RLS remains enabled.
- At the time of migration there was one guest test order, zero registered-email orders, and zero order notifications. The backfill therefore linked zero rows and left the existing guest order untouched.

## Migration history reconciliation

The remote Supabase ledger now contains **69 applied versions**, with \`20261108215548\` as the newest entry.

The maintenance branch contains historical migrations whose effects are already present under other applied migration versions. They must not be replayed:

- Support-ticket public INSERT is already column-scoped: anon can insert only \`id\`, \`customer_name\`, \`email\`, \`subject\`, and \`message\`; it cannot set \`created_at\`, \`status\`, or \`reply\`.
- Product integrity checks are present and validated, including price, old price, stock, purchase cost, size/color arrays, gallery, variants, and tags.
- Flash-sale logic already validates two-decimal discounts, avoids no-op rounded prices, and excludes products with custom variants.
- Order notification table, triggers, and RPC wrappers already exist; the table currently has no rows and no direct client grants.
- Order-tracking rate-limit storage exists in the private schema with RLS enabled.
- Custom-variant checkout, stock deduction/restoration, variant-preservation trigger, and deterministic admin product ordering are already present.
- The two optional staged validations for order-item variants and checkout input are not installed. The protected checkout RPC already validates those inputs; these triggers remain staged rather than being applied redundantly.

The previous reconciliation report documents **20 remote-applied historical versions whose exact SQL source could not be recovered from repository path history**. They are already applied in the live database; they must not be replayed. No placeholder/no-op historical SQL has been fabricated. This remains a source-archive/reproducibility gap, not a pending live DDL operation.

## Security and health review

- Public tables retain RLS.
- Four INFO advisor findings report RLS-enabled tables without policies: three private operational tables and \`public.order_notifications\`. These are intentionally private/RPC-only and have no direct client grants.
- The Auth advisor still warns that leaked-password protection is disabled. This is an Auth dashboard setting, not a SQL migration; it remains to be enabled in Supabase Auth settings.
- Performance advisor reports five unused indexes. The two new user-ID indexes are expected to be unused until authenticated customer orders exist; do not remove them based on this initial sample.
- Health advisor returned no findings.

## Deployment and release gates

- The maintenance Preview deployment for the reviewed head was READY and its Vite production build succeeded.
- The build still reports the existing JavaScript chunk-size warning (about 509 kB); this is a performance follow-up, not a build failure.
- Production remains on \`main\`; no production deployment was triggered by this reconciliation.
- Full rendered visual QA on an actual mobile device and desktop is still required before Production merge. HTTP/build success is not a substitute for rendered visual verification.

## Safety rules

1. Do not replay any already-applied migration.
2. Do not reset the production database or rewrite the remote migration ledger.
3. Do not fabricate missing historical SQL.
4. Keep the two redundant optional validation migrations staged until separately justified.
5. Merge/deploy only after current CI checks and visual QA are complete.
