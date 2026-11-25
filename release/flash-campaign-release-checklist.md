# Flash campaign release checklist

This release candidate is deliberately not applied to Production. The public storefront and admin draft changes must be published together only after explicit approval and final verification.

## Read-only schema preflight (2026-11-25)
- Product ID is text; variants are jsonb; prices and percentage are numeric; start/end are timestamptz. Legacy flash_sale_items exists.
- Authenticated has private schema USAGE; no new schedule table or schedule RPCs existed at inspection.
- Exactly one existing active expiry job, geostore_expire_flash_sales, every minute. Live expiry function includes both legacy campaign restoration and product-level expiry (different from the historical compatibility migration). Preserve it, do not reapply historical migrations.
- Existing owner-gated three-argument category RPC uses private definer and public invoker. Preserve its signature and behavior.

## Cutover (approval required)
1. Require all CI checks at the exact final head, especially active-sale browser geometry and isolated PostgreSQL contract. Review live schema/ACLs again before changes. Confirm owner authorization and no conflicting cron job.
2. Apply only reviewed staged-flash-sale-schedule.sql and staged-flash-sale-selected.sql using the established database release process. Verify table RLS, direct table access denial and public invoker permissions; verify existing expiry RPC and job are unchanged. Do not invoke price-writing RPCs on actual products for testing.
3. Enable staged-flash-sale-schedule-cron.sql only after server functions are validated and release is approved. Verify one new starter and one unchanged expiry job; no duplicated worker.
4. Merge reviewed PR and verify the resulting Production build, public catalogue and admin read-only schedule list. Publish storefront design via existing draft/publish flow only if explicitly requested; do not overwrite existing saved design.
5. If deployment fails before activation, stop the new starter, retain schedule/history and existing expiry job, revert frontend if needed. Do not bulk-restore prices or drop tables. Review any already processed schedules separately.
