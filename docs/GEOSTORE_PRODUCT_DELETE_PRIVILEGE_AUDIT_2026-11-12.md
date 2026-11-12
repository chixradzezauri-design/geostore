# GEOSTORE direct product deletion privilege audit — 2026-11-12

## Finding

A read-only Production catalog audit found that `authenticated` retained table-level `DELETE` on `public.products`. The matching RLS policy restricted direct deletion to the primary administrator, but it did not require callers to use `private.admin_delete_product`. A primary-admin direct REST DELETE could therefore bypass the RPC's historical-order reference guard.

## Staged correction

- Added `supabase/migrations/20261112140000_revoke_direct_product_delete.sql`.
- Revokes table-level DELETE from `PUBLIC`, `anon`, and `authenticated`.
- Leaves the guarded SECURITY DEFINER RPC intact. Its owner retains the ability to perform the DELETE after verifying the primary-admin identity, trusted `app_metadata.role`, row lock, and both current/legacy order-line identifiers.
- Added a regression assertion to `tests/productDeleteHistoryGuard.test.js`.

## Safety

- This migration is staged on `fix/admin-panel-audit-2026-11-10` only.
- It has NOT been applied to Production.
- No Production product, order, stock, user, message, or Storage data was changed.
- Service-role and database-owner privileges remain privileged server/database capabilities; they are not customer-facing API roles.
- The admin UI still calls the guarded RPC, and product photo cleanup occurs only after the RPC confirms deletion.
