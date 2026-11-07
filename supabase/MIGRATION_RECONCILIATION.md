# Supabase migration reconciliation snapshot

Checked against project `xmtnszxtnfxnrojionoa` and branch `design/neo-editorial-2026-11-07` on 2026-11-08.

## Current result

- Remote migration history entries: 67
- SQL migration files in branch: 67
- Duplicate migration versions in branch: 0
- Remote-applied versions without a matching SQL file in this branch: 20
- Branch SQL migrations not recorded as applied remotely: 20

**Do not apply pending branch migrations to production as a batch.** The remote history and checked-in migration set have diverged. Some schema changes may already exist because migrations were previously applied through another workflow, and some branch migrations may still be unapplied. Reconcile the actual schema/function/policy state for each migration before applying anything.

## Remote-applied versions missing from this branch

- `20261102181854` — `add_product_purchase_cost`
- `20261103042140` — `server_checkout_prices_and_store_config`
- `20261103083543` — `add_optional_customer_email_to_orders`
- `20261103113219` — `restrict_unused_public_order_tracking_rpc`
- `20261103114054` — `restrict_anon_products_to_public_catalog_columns`
- `20261103114610` — `restore_secure_order_tracking_and_admin_notes`
- `20261103114846` — `protect_product_cost_from_authenticated_customers`
- `20261103114947` — `optimize_admin_rls_policies_without_changing_access`
- `20261103114954` — `correct_admin_email_in_message_rls`
- `20261103115012` — `restore_exact_admin_email_in_rls_policies`
- `20261103115142` — `move_privileged_rpc_implementations_to_private_schema`
- `20261103115237` — `keep_current_main_admin_catalog_compatible_until_pr18_merge`
- `20261103124219` — `grant_admin_product_purchase_cost_write`
- `20261103124349` — `align_product_admin_access_with_app_metadata`
- `20261103124427` — `optimize_product_admin_role_policy_jwt_calls`
- `20261103153931` — `correct_admin_reactivation_email_guard`
- `20261103205301` — `snapshot_order_item_cost_vendor_category`
- `20261103225225` — `create_storefront_studio_foundation`
- `20261103225301` — `tighten_storefront_studio_rls_and_indexes`
- `20261103230610` — `create_storefront_media_bucket_and_admin_policies`

## Branch migrations not recorded as applied remotely

- `20261106120000_validate_order_item_variants.sql`
- `20261106210000_validate_checkout_input_on_order_insert.sql`
- `20261106220000_harden_support_ticket_public_insert.sql`
- `20261107001000_add_product_data_integrity_constraints.sql`
- `20261107002000_harden_flash_sale_rounding.sql`
- `20261107020000_add_order_status_notifications.sql`
- `20261107153000_enable_rls_order_tracking_rate_limits.sql`
- `20261107170000_integrate_custom_product_variants.sql`
- `20261107172000_stabilize_admin_product_order.sql`
- `20261107180000_redact_internal_fields_from_customer_order_history.sql`
- `20261107181500_skip_custom_variant_products_in_flash_sales.sql`
- `20261107190000_restrict_public_storefront_config_columns.sql`
- `20261107200000_bind_order_ownership_to_auth_user_uuid.sql`
- `20261107230000_require_configured_product_options.sql`
- `20261107233000_bound_variant_stock_on_cancellation.sql`
- `20261107234500_harden_order_json_and_variant_integrity.sql`
- `20261107235000_enforce_checkout_pricing_precision.sql`
- `20261107241000_revoke_direct_order_note_column_update.sql`
- `20261108001000_validate_variant_price_precision.sql`
- `20261108010000_add_product_optimistic_version.sql`

## Product cross-session concurrency release dependency

The staged migration `20261108010000_add_product_optimistic_version.sql` adds `products.updated_at` and `products.version`, a version-bump trigger, and version-checked admin update/delete/variant-stock RPCs. The application now selects those two fields and uses the version-checked endpoints.

**Release order:** reconcile and safely apply the required database migration first, then deploy the matching application code. Deploying the app before the database migration will make the catalogue query request columns that do not yet exist.

No production migration was applied during this check. No product/order rows were changed.

## Read-only schema preflight

A read-only query confirmed that several branch-only migrations have effects already present in the live schema even though their versions are not recorded as applied. Examples include:

- `public.order_notifications` and its order insert trigger exist.
- The private order-tracking rate-limit table has RLS enabled.
- The product variant stock-preservation trigger exists.
- The live checkout function already contains the configured custom-variant guard.
- `private.admin_list_products()` and `private.get_my_orders()` exist.
- The support-ticket column-level INSERT grant is already present.

Other checks found missing effects:

- The order-item variant validation trigger and checkout-input insert trigger are absent.
- `products.updated_at` and `products.version` are absent (required by the new concurrency migration).
- The order `user_id` column and auth-owner binding trigger are absent.
- The variant identity validation trigger is absent.
- The 3-argument variant-stock RPC from the staged migration is absent.
- Direct authenticated UPDATE permission on `orders.admin_note` is still present.

This confirms that migration version history alone cannot establish whether a migration's SQL effects are already applied. Each pending migration must be checked against the actual live schema before it is considered safe to run.

## Additional issues found and corrected in the staged SQL

### Storefront draft-field exposure

The live ACL query confirmed that both `anon` and `authenticated` currently have table-level SELECT on `public.storefront_config` and `public.storefront_media`. The row policies restrict rows, but any visitor who can see a published row can also read the `draft_config` field; signed-in non-admins can do so as well. The `created_by` administrator UUID is also readable from public media metadata. The migration now revokes table SELECT from `PUBLIC`, `anon`, and `authenticated`, grants only safe published metadata columns, and adds an admin-verified `public.get_storefront_draft()` RPC. `src/App.jsx` now loads drafts through that RPC and saves with `return=minimal`. These changes are staged and **not yet applied to production**.

### Migration replacement ordering

- `20261107200000_bind_order_ownership_to_auth_user_uuid.sql` renames the original checkout implementation to `private.create_order_with_stock_unchecked` and wraps it with immutable Auth UUID ownership validation.
- Later migrations `20261107230000_require_configured_product_options.sql` and `20261108001000_validate_variant_price_precision.sql` now replace the `_unchecked` implementation rather than overwriting the ownership wrapper. This preserves the owner check on idempotent replays.
- `20261107234500_harden_order_json_and_variant_integrity.sql` now retains the custom-variant stock restoration upper bound introduced by `20261107233000`; the later migration no longer removes that guard.
- `20261108001000_validate_variant_price_precision.sql` was rebuilt from the valid stock-preservation function and final checkout function. The variant price validator is now created before its trigger, and duplicate intermediate function copies were removed.
- `20261108010000_add_product_optimistic_version.sql` now revokes the legacy 3-argument variant-stock RPC so callers cannot bypass the version-checked endpoint.

## Remaining confirmed live gaps

The live read-only schema checks still show these staged protections are not active:

- Anonymous table-level SELECT on storefront config/media (see above).
- Order UUID ownership columns and binding trigger are absent.
- Order-item variant validation and checkout-input insert validation triggers are absent.
- Direct authenticated UPDATE permission on `orders.admin_note` remains.
- Product optimistic version columns and versioned mutation RPCs are absent.

These are release blockers to address through a reviewed, coordinated migration sequence. No production migration has been applied and no product/order rows have been changed.

### Follow-up SQL integrity review

The migration files were checked again for replacement-order and delimiter integrity. Three additional corrections are now staged:

- `20261107234500_harden_order_json_and_variant_integrity.sql` was restored to one definition of each function and keeps the variant stock ceiling check during cancellation restoration.
- `20261108001000_validate_variant_price_precision.sql` now has one valid stock-preservation function, then the price-validation function, then its trigger, followed by the checkout implementation update to `private.create_order_with_stock_unchecked`. This avoids both malformed function ordering and replacement of the immutable-owner wrapper.
- `20261108010000_add_product_optimistic_version.sql` was rebuilt with balanced dollar-quoted function bodies and one definition of each versioned RPC. It also revokes the old non-versioned variant-stock and product-delete RPCs.

The storefront draft reader is now an admin-verified RPC; the application no longer requests `draft_config` through direct table SELECT. The draft upsert requests a minimal response so it does not need to read the private draft column.

Static checks confirm unique migration version numbers and balanced function delimiters in the reviewed files. These checks are not a substitute for executing the migrations against a disposable PostgreSQL database. No migration was executed against production, and no Vercel build or deployment was started.

## Follow-up: revoke legacy column-level SELECT grants

- A live read-only inspection of `information_schema.column_privileges` confirmed that the earlier storefront ACL migration's table-level `REVOKE SELECT` would not remove pre-existing column-level grants.
- The live database still listed `anon` SELECT on `storefront_config.draft_config`, `draft_updated_at`, `published_at`, and `updated_by`; `storefront_media.created_by` was also still readable. Authenticated had broad column-level privileges from the existing policy setup.
- Corrected `20261107190000_restrict_public_storefront_config_columns.sql` to explicitly revoke SELECT on those sensitive columns from `PUBLIC`, `anon`, and `authenticated`, before granting only the intended published snapshot/media columns.
- The fix is committed to the working branch only. No production SQL was executed; live exposure remains until the coordinated migration is applied.

## Follow-up: storefront RLS and order-note path

- Rechecked live `pg_policies`: storefront config writes and media writes are restricted to the exact primary-admin UUID plus `app_metadata.role = 'admin'`. Public reads are row-filtered to published config/public media; the remaining exposure was the sensitive column grants documented above.
- Confirmed the application saves admin order notes through `admin_save_order_note`, not a direct table PATCH. The staged `20261107241000_revoke_direct_order_note_column_update.sql` removes the legacy authenticated column-level UPDATE grant. Live still has that grant until the migration is applied; current RLS independently limits order updates to the primary admin.
- Live orders history still uses the older email-based function because the Auth UUID ownership migration is not applied. The staged ownership migration adds `orders.user_id`, binds it from `auth.uid()`, backfills only unambiguous email matches, and changes customer history/notifications to immutable UUID ownership.

## Follow-up: preserve product media after a successful database response

- Found a second edge case in `AdminDashboardPro.jsx`: after an HTTP-successful versioned product update, malformed/empty response JSON incorrectly changed the write state from `committed` to `rejected`.
- That could cause the catch handler to delete newly uploaded images even though the database update may already reference them.
- Removed the incorrect state downgrade. An HTTP-successful write remains `committed`; if its returned row cannot be validated, the UI now tells the admin to refresh and verify the product while retaining the uploaded media.
- Existing `productImageCleanup.test.js` already asserts that `committed` and `unknown` writes must retain uploaded images. Test execution is still pending.

## Product media cleanup regression check

- Ran the isolated Node test file for `src/utils/productImageCleanup.js` and `src/utils/productImageCleanup.test.js` against the exact current branch contents.
- Result: 5 tests passed, 0 failed. This covers image reference collection, malformed gallery handling, cleanup only after a known rejected/not-started write, and retention when order history exists.
- This was a focused helper test only; it is not the full project test suite, a Vite production build, or browser/device QA.


## Follow-up: close the direct order UPDATE path

- A live read-only privilege check confirmed that `authenticated` had no table-level UPDATE on `public.orders`, but still had effective column-level UPDATE on `admin_note`. Anonymous users had no such access.
- The application reads orders for the authenticated primary-admin session and writes order notes/status only through validated RPCs; no direct REST PATCH to `orders` was found in `App.jsx` or `AdminDashboardPro.jsx`.
- Hardened `20261107241000_revoke_direct_order_note_column_update.sql` to revoke table-level UPDATE and the `admin_note` column-level UPDATE from `PUBLIC`, `anon`, and `authenticated`. This prevents future broad grants from restoring direct client-side order mutation.
- This remains staged only. Live read-only preflight still reports `authenticated` can update `orders.admin_note` until the migration is applied in the coordinated release. No production database changes were made.


## Follow-up: normalize guest identity in checkout input validation

- Reviewed the staged INSERT validation trigger against the separate order-ownership trigger. Ownership treats `guest` case-insensitively and trims surrounding whitespace, while the checkout input validator previously compared `user_email` to the exact lowercase string only.
- This mismatch allowed crafted values such as `Guest` or ` guest ` to take the non-guest validation branch even though the ownership trigger classified them as guest orders. That could bypass the guest email-required check.
- Updated `20261106210000_validate_checkout_input_on_order_insert.sql` to normalize with `lower(btrim(coalesce(new.user_email, 'guest')))` before deciding whether the guest email requirement applies.
- Staged SQL only; no live database write was made. The trigger's complete behavior still needs PostgreSQL execution testing before release.


## Follow-up: order transition stock-cast safety and live trigger drift

- Read-only inspection of live `orders` / `products` triggers confirmed that the production database currently has the legacy guest-email trigger and status/notification triggers, but does not yet have the staged immutable Auth UUID ownership trigger, strict checkout-input trigger, or selected size/color validation trigger. The staged changes are therefore still required for the coordinated release; no live DDL was run.
- The cancellation/reactivation SQL used regex predicates alongside integer casts in `AND` conditions. PostgreSQL does not promise left-to-right evaluation of boolean predicates, so malformed historical JSON stock could still raise during a cast. Updated `20261107234500_harden_order_json_and_variant_integrity.sql` to put each cast behind a `CASE WHEN` regex guard for both cancellation restoration caps and reactivation stock availability.
- The live `private.create_order_with_stock(jsonb)` function remains a `SECURITY DEFINER` function with an empty search path and currently permits guest checkout via the anon role. The immutable UUID owner-binding wrapper is staged but not live yet. Guest access is intentional for checkout; the wrapper must be deployed with the complete validated trigger sequence before treating ownership isolation as complete.
- No real orders, stock values, or production schema were changed. Static review only; PostgreSQL execution tests are still required.

## Follow-up: safe numeric validation in versioned product mutations

- Re-reviewed the staged 20261108010000_add_product_optimistic_version.sql mutation RPCs.
- Found that old-price and purchase-cost validation combined a regex check with numeric casts in boolean OR expressions. PostgreSQL does not guarantee predicate evaluation order, so malformed strings could still reach a numeric cast and raise an unhandled cast error.
- Rewrote both checks with explicit CASE guards. Numeric casts now occur only after the input matches the supported non-negative GEL decimal format; malformed input is rejected through the intended validation path.
- Static review confirms the migration has balanced dollar-quoted function delimiters and three explicit CASE guards in its input-validation / stock-update logic.
- The migration remains staged. No production schema or product data was changed; PostgreSQL execution tests and coordinated release are still pending.
