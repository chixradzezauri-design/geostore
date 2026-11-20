# Inventory replenishment concurrency rollout

## Verified preflight (2026-11-20)

- Live `private.inventory_replenishment_settings` contains **0 rows**.
- Live `public.products` contains **8 rows**.
- `private.inventory_replenishment_settings.updated_at` exists as `timestamptz`.
- Live `public.admin_save_inventory_replenishment_setting` currently has **one** (four-argument) overload.
- Migration `20261120123000_replenishment_optimistic_concurrency.sql` is **committed but not applied**.

## Safe activation sequence

1. Verify PR Build check, CodeQL, and dependency audit. Confirm the migration has not already been applied.
2. Apply the **additive** five-argument migration before deploying the new client. This does not revoke the existing four-argument function.
3. Inspect `pg_proc` signatures, `prosecdef`, function grants, and `pg_get_functiondef` after migration. Verify the five-argument wrapper is invoker, private implementation is definer, and `public.has_staff_permission('products')` remains enforced.
4. Test with an **authorized** account and a dedicated non-production/test product: initial save with `p_expected_updated_at: null`, then update with returned timestamp, then repeat the stale timestamp and expect SQLSTATE `40001`. Do not modify real product settings during verification.
5. Deploy the new client only after the new RPC works and the deployment quota allows it.
6. Once **all** clients have migrated and old builds are no longer supported, separately revoke execute on the four-argument public RPC. Verify older clients cannot bypass revision checks. Never revoke it in the same step as the additive migration.

## Known limitations

- Until step 6, legacy clients can still overwrite settings via the four-argument RPC.
- Manual refresh is required to see edits made on other devices; this is not realtime synchronization.
- Reloading the server list does not automatically discard a local unsaved draft. Use the per-row discard action to reset it.
- Avoid a claim of fully verified concurrency protection before running an authenticated two-client integration test.

## Read-only SQL verification

```sql
SELECT n.nspname, p.proname,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN (
  'save_inventory_replenishment_setting',
  'admin_save_inventory_replenishment_setting'
)
ORDER BY n.nspname, p.proname, arguments;
```
