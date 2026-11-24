# Stage 63 — Supabase full-schema release preflight (Draft PR #149)

**Status: partially verified, NOT RELEASE-READY.** This document is a read-only 2026-11-22 comparison of the connected live project's catalog and migration history against the three unapplied draft migrations. No production DDL/DML, staging project, staff accounts, orders, inventory or Auth settings were changed.

## Already verified — do not repeat earlier stages

- Stage61–62 disposable PostgreSQL contracts and all six exact-HEAD workflows passed at Stage62 commit 924219131e8d2ffb5579bb348f342d7ad0f66db0. Those runs exercised partial schema fixtures, not the entire Supabase database.
- Connected Supabase: PostgreSQL 17; **135 applied migrations**, latest migration 20261120124250_storefront_publish_concurrency_safe_compat; **no Supabase development branches** listed at this review.
- Real order schema uses public.orders (id text, items jsonb, checkout_result jsonb, checkout_request jsonb, total_gel numeric, user_id uuid) with RLS enabled. Real expenses amount is numeric; staff membership uses user_id uuid, permissions jsonb; inventory movement includes variant_id text and quantity_delta integer.
- Real public.create_order_with_stock(jsonb) and public.get_my_orders() are invoker wrappers; private implementations are definer functions. Order status/reactivation wrappers, staff-permission wrappers and the relevant order/product triggers exist. No account-specific, customer or financial row contents were fetched.
- **Important current-release gap:** as of this read-only check, authenticated still has column SELECT privileges on public.orders.items, checkout_result and checkout_request. Orders RLS restricts reads to accounts with the orders staff permission, but it does not itself redact finance fields from those authorized users. The staged Stage57 migration is designed to revoke direct snapshot reads and route them through projected RPCs with separate expenses permission. This is a release-blocking verification obligation, *not* evidence that anonymous users currently see these fields.

## Stage63 finding — live migration history differs from repository filenames (release blocker)

**This is a read-only name/version inventory, not a migration equivalence proof.** Comparing the PR #149 branch with the connected live migration registry on 2026-11-22:

- 122 SQL migration files on the draft branch; 135 applied migration records on the connected Supabase project.
- 80 files match an applied version exactly. **42 branch filenames have version numbers absent from the live registry.**
- Of these 42, **32 have a matching normalized migration name registered under a different version number**. This does *not* establish that their SQL contents or side effects are identical.
- **10 do not have that name match:** 7 older/unreconciled files plus the 3 intentional pending Stage51/54/57 migrations. These must be checked individually.
- **4 duplicated logical migration names** occur under different local versions: add_order_status_notifications, harden_flash_sale_rounding, add_product_data_integrity_constraints, revoke_anon_completed_order_reactivation.

**Never blindly run all local migrations or auto-repair production migration history.** A CLI migration push from this folder could attempt to execute already-present changes because the version identifiers differ. Before staging application: inventory all versions, establish the true schema effects of each older unmatched file, compare name-matched definitions rather than assuming equivalence, reconcile duplicate logical names on an isolated copy, and verify exactly which three new draft migrations need execution. Do not rename, mark applied, delete or re-apply Production migrations as an automatic workaround.

### Files without a live matching version or normalized name

- 20261106120000_validate_order_item_variants.sql (requires individual reconciliation)
- 20261106210000_validate_checkout_input_on_order_insert.sql (requires individual reconciliation)
- 20261106220000_harden_support_ticket_public_insert.sql (requires individual reconciliation)
- 20261107153000_enable_rls_order_tracking_rate_limits.sql (requires individual reconciliation)
- 20261107170000_integrate_custom_product_variants.sql (requires individual reconciliation)
- 20261107172000_stabilize_admin_product_order.sql (requires individual reconciliation)
- 20261110050000_enable_support_ticket_status_realtime.sql (requires individual reconciliation)
- 20261121170000_strip_private_costs_from_checkout_rpc.sql (intentional pending draft)
- 20261121190000_redact_alternate_costs_from_order_history.sql (intentional pending draft)
- 20261121210000_scope_admin_order_ledger_permissions.sql (intentional pending draft)

### Local-to-live version-name matches requiring content verification

| Local migration file | Supabase applied version with same normalized name |
| --- | --- |
| 20261107001000_add_product_data_integrity_constraints.sql | 20261107130536 |
| 20261107002000_harden_flash_sale_rounding.sql | 20261107130453 |
| 20261107020000_add_order_status_notifications.sql | 20261107130302 |
| 20261107181500_skip_custom_variant_products_in_flash_sales.sql | 20261107135028 |
| 20261112133000_guard_legacy_order_product_references.sql | 20261112234156 |
| 20261116071600_harden_support_ticket_authorization_and_admin_reply_status.sql | 20261116120900 |
| 20261116130000_support_ticket_read_receipts.sql | 20261116120907 |
| 20261116150000_add_owner_checked_support_ticket_status.sql | 20261116120914 |
| 20261116160000_restore_single_flash_sale_expiry_job.sql | 20261116135251 |
| 20261116170000_customer_support_ticket_history.sql | 20261116121216 |
| 20261117100000_admin_staff_auth_foundation.sql | 20261117231455 |
| 20261117103000_staff_orders_permission.sql | 20261117231459 |
| 20261117120000_add_secure_admin_customer_crm.sql | 20261119071959 |
| 20261117130000_reopen_completed_orders.sql | 20261117231504 |
| 20261117140000_staff_products_permission.sql | 20261117231508 |
| 20261117143000_staff_expenses_permission.sql | 20261117231531 |
| 20261117144500_staff_crm_support_permissions.sql | 20261117231534 |
| 20261117150000_staff_settings_permission.sql | 20261117231538 |
| 20261117153000_staff_analytics_summary.sql | 20261117231542 |
| 20261117160000_stable_checkout_idempotency_ordering.sql | 20261117231546 |
| 20261117170000_admin_staff_pending_invites.sql | 20261117231549 |
| 20261118180000_move_all_support_ticket_history_rpcs_to_private.sql | 20261119071946 |
| 20261118190000_admin_rpc_invoker_wrappers.sql | 20261119071952 |
| 20261119090000_revoke_anon_completed_order_reactivation.sql | 20261119094446 |
| 20261119100000_revoke_anon_completed_order_reactivation.sql | 20261119094446 |
| 20261119110000_add_storefront_hero_storage_scope.sql | 20261119160821 |
| 20261119150000_admin_panel_visual_design_sync.sql | 20261119140237 |
| 20261119151000_admin_panel_visual_settings_owner_policy.sql | 20261119140327 |
| 20261119152000_admin_panel_visual_design_concurrency.sql | 20261119160433 |
| 20261119170000_storefront_draft_concurrency.sql | 20261119181855 |
| 20261119190000_restore_storefront_version_to_draft.sql | 20261119181911 |
| 20261119200000_legacy_storefront_draft_save_compat.sql | 20261119181955 |

**Until this mismatch is reconciled and staging full-schema tests pass, release remains blocked.**

## Pending migrations already staged in PR #149 — apply in this order only on staging

1. 20261121170000_strip_private_costs_from_checkout_rpc.sql — public checkout receipt only; private stored finance/idempotency snapshot unchanged.
2. 20261121190000_redact_alternate_costs_from_order_history.sql — authenticated own-history rows remain owner-scoped; cost aliases stripped.
3. 20261121210000_scope_admin_order_ledger_permissions.sql — orders access requires orders; raw cost fields require expenses; image-reference cleanup gets a narrowly projected RPC; direct order snapshot column SELECT revoked.

The baseline is time-sensitive. At release, **re-list remote applied migrations** and diff the full repository migration history; stop on missing prerequisites, duplicate versions, out-of-order application, drift or an unexpected new migration. The file-order check in tests/stage63ReleaseGate.test.js is not a substitute for this remote comparison.

## Mandatory full-schema isolated Supabase staging procedure

1. Create or select an isolated full Supabase staging environment with matching Auth, RLS, PostgREST/Data API schema exposure, Storage, triggers and entire migration history. Never assume the Stage52 disposable partial PostgreSQL fixture proves this. Supabase paid branching may incur cost: obtain explicit approval for any charge before creating a branch. Do not copy real customer data or production secrets.
2. Confirm private is excluded from the PostgREST exposed schemas. Apply pending repository migrations only to staging in chronological order. Inspect migration status and errors before testing.
3. With staging-only PostgreSQL credentials, run from repository root: psql -v ON_ERROR_STOP=1 -f tests/sql/stage63_full_schema_release_gate.sql . This explicitly opens a READ ONLY transaction and rolls it back. It checks required tables/column types, RLS, public/private RPC presence and SECURITY DEFINER/INVOKER boundaries, anonymous/authenticated EXECUTE grants, direct order snapshot SELECT revocation, customer-history redaction, staff finance separation, and critical stock/order triggers.
4. Perform **authenticated owner/staff E2E** on staging with real staging JWTs (a SQL catalog test cannot establish JWT freshness or actual staff permissions): (a) owner can view finance and authorized orders; (b) orders-only staff can view/update allowed statuses but cannot read purchase costs or expenses; (c) expenses-only staff cannot browse orders; (d) products-only staff can check order image references but cannot access customer/order or finance details; (e) anonymous and ordinary customer accounts cannot call admin RPCs and only see their own safe order history.
5. On staging, submit realistic cart and distinct size/color/custom variant orders with coupon, delivery, gift wrap and idempotent replay. Verify exact stock decrements, no double deductions, cancellation/re-activation atomicity, stock/movement ledger consistency, permission denials and **no confidential cost fields** in public receipts or customer history.
6. Compare original finance snapshots, expense visibility and aggregate totals before/after the staged migrations using staging test fixtures, not production rows. Check status-change notifications, variants, CRM, admin/visual editor persistence across sessions/devices. Review Supabase Auth leaked-password protection setting and physical iPhone Safari separately.

## Exit criteria

- Automated Stage63 Node guards and prior Stage52–62 tests green on **exact final PR HEAD**.
- Stage63 read-only SQL gate green on **full isolated Supabase staging after migrations**.
- Staging owner/staff/JWT and commerce + finance E2E green, including negative authorization tests.
- No unexpected remote migration drift, unsafe exposed private schema or sensitive order-field grants.
- No merge, Supabase production migration, Vercel Production deploy, or live data changes without **new explicit production-release approval**.

**Scope of this stage:** safety preflight, an executable future staging-only read-only gate and release documentation. It does not claim a full staging run occurred and does not duplicate the Stage51–62 application fixes.
