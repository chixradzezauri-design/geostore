# GEOSTORE Product Deletion / Historical Order Reference Safety Audit — 2026-11-12

## Scope
New-stage review of the product-delete RPC, direct table permissions, RLS policy, and legacy JSONB order-item references. Earlier completed audit areas were not repeated.

## Confirmed Production defect
Read-only checks against Supabase project `xmtnszxtnfxnrojionoa` established:
- `authenticated` still has table-level DELETE privilege on `public.products`.
- The RLS policy `Admin can delete products` is still present.
- `anon` and `PUBLIC` do not have the same table-level DELETE privilege.
- The live `public.admin_delete_product(text)` wrapper is SECURITY INVOKER and is executable by authenticated users.
- The live private delete function currently checks order snapshot `id` only; it does not check legacy `product_id`.
- Production migration ledger currently ends at `20261110133651`; the branch's product-delete guard/revoke migrations are not applied in Production.

An authenticated caller who passes the admin RLS policy can therefore bypass the guarded RPC and directly delete a product referenced by historical orders. The RPC's current legacy-reference check is also incomplete for older order-item JSON shapes.

## Audit-branch fix prepared
- Updated `20261112133000_guard_legacy_order_product_references.sql` to block deletion when any order item references the product through either `id` or `product_id`, including cancelled orders. It retains a row lock to serialize deletion against checkout/product updates and the fixed primary-admin UID + trusted role check.
- `20261112140000_revoke_direct_product_delete.sql` drops the direct-delete RLS policy and revokes table DELETE from PUBLIC, anon and authenticated.
- Added `20261112150000_restore_private_product_delete_rpc_execute.sql` to grant authenticated EXECUTE on the private implementation required by the SECURITY INVOKER public wrapper. The private function continues to enforce primary-admin UID and role; PUBLIC and anon are not granted execution.
- Added regression tests for both historical JSONB keys, row locking, authorization, direct-delete revocation, RLS policy removal, and the invoker-wrapper execution grant.

## Safety / validation status
- Only the audit branch was modified. No Production migration, privilege, policy, order, or product was changed.
- No live product deletion or synthetic order was attempted.
- The current-branch CI run was not available in this pass. The latest visible successful Build check / dependency audit / CodeQL runs belong to an earlier commit (`f7708d8e...`), not the current audit-branch HEAD. They do not validate this fix.
- No local test run or browser E2E was performed.

## Deployment gate
Before applying these migrations to Production, obtain and verify a restorable backup, validate the exact migration sequence in an isolated Supabase development environment, confirm the public invoker wrapper and authenticated EXECUTE path, then request explicit Production approval. Do not apply via blanket `supabase db push`.

## Result
A concrete Production data-integrity/security gap was found and a staged code/migration/test fix was prepared. Production remains unchanged.
