# Inventory replenishment concurrency rollout

## Verified preflight (2026-11-20)

- Live `private.inventory_replenishment_settings` contains **0 rows**.
- Live `public.products` contains **8 rows**.
- `private.inventory_replenishment_settings.updated_at` exists as `timestamptz`.
- Live `public.admin_save_inventory_replenishment_setting` now has **two** overloads: the original four-argument compatibility RPC and the additive five-argument revision-checked RPC.
- Migration `20261120122908_replenishment_optimistic_concurrency.sql` was **applied to the connected Supabase project** as migration version `20261120122908` (20 November 2026).

## Confirmed verification (2026-11-20)

- The PR head `9878641` passed GitHub Build Check, dependency security audit and CodeQL before activation.
- Inspected both public and private RPC overloads: new public wrapper is `SECURITY INVOKER`, new private implementation is `SECURITY DEFINER`; `anon` cannot execute either.
- Authorized-owner, transaction-scoped SQL test passed: create with null revision, update with returned revision, and rejection of stale revision with SQLSTATE `40001`.
- Separate negative tests passed: anonymous execution was denied, and an authenticated user without staff permissions was denied.
- All verification writes were wrapped in `BEGIN ... ROLLBACK`. Follow-up read-only counts confirmed 8 products and 0 saved replenishment settings.
- A real two-client/browser race has **not** been executed and remains a release gate. The older four-argument RPC remains available until all clients have migrated.
- The repository migration filename is aligned with the applied Supabase migration-history version to avoid an accidental second application during a future CLI migration push.

## Safe activation sequence

1. **Complete.** PR Build, CodeQL and dependency audit passed, and migration absence was confirmed before activation.
2. **Complete.** Applied the additive five-argument migration as `20261120122908`. The old four-argument function is still available.
3. **Complete.** Inspected `pg_proc` signatures, `prosecdef`, grants, and verified the owner permission path through an authorized transaction; the new public wrapper is invoker and the private implementation definer.
4. **Complete for single-session SQL checks.** Verified create/update/stale rejection under rollback and preserved all rows. The separate real two-client integration and browser Preview test is still outstanding.
5. **Pending.** Run an authenticated two-client test, finish rendered mobile/desktop QA, and deploy the new client only after all release gates and explicit approval.
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
