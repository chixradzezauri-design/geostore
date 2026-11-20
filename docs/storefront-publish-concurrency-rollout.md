# Safe storefront publication RPC rollout — 20 November 2026

- Connected Supabase project migration history records `20261120124250_storefront_publish_concurrency_safe_compat`.
- New three-argument public `publish_storefront_config(jsonb, text, timestamptz)` RPC is `SECURITY INVOKER`; private implementation is `SECURITY DEFINER` with owner-only `auth.uid()` plus `app_metadata.role=admin` validation.
- The original two-argument public and private functions remain unchanged. Verified before/after database function definitions retained checksums `d78ff4b772db3f16b354468024c058f8` (public) and `fe6eef21f8bc64220517e036a58fd4ca` (private). Do not revoke old EXECUTE privileges until all clients migrate.
- Verified with an authorized owner role inside a rolled-back SQL transaction: stale draft rejected with SQLSTATE `40001`, matching draft revision accepted, successful result included `version_id` and advanced `draft_updated_at`, and replay using the previous revision rejected with `40001`.
- The test transaction rolled back. Follow-up read-only counts confirmed 8 products, 7 storefront versions, and 0 replenishment settings; no storefront publication was persisted by this test.
- This is **not** complete isolation from legacy clients: the old two-argument API retains last-write-wins behavior. Once old clients are retired, add a separately reviewed migration to revoke that signature.
- The original unapplied migration filename `20261119210000_storefront_publish_concurrency.sql` must be removed in this PR and replaced with the already-applied migration-history filename to prevent accidental duplicate/restrictive application on a future migration push.
- Browser user-interface and cross-device release QA remain necessary before merging and deploying the frontend.
