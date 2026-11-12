# GEOSTORE — product lifecycle, deletion and image integrity audit

Date: 2026-11-12  
Repository: `chixradzezauri-design/geostore`  
Branch: `fix/admin-panel-audit-2026-11-10`  
Scope: live Supabase product RPCs, product table privileges, Storage policy/configuration and object metadata; source-level product create/edit/delete and image upload/cleanup review. This was a read-only Production audit.

## Executive findings

Two Production-side protections need a staged forward fix before release:

1. **Product creation defaults:** live `private.admin_save_product(jsonb)` uses `jsonb_populate_record(NULL::public.products, ...)`. Omitted JSON keys become SQL NULL rather than using table defaults. The live function does not explicitly supply `is_featured=false` and `is_published=true`, although those columns are NOT NULL. The admin create payload omits `is_published`. This can make product creation fail at the database boundary.
2. **Product deletion/history guard:** live `private.admin_delete_product(text)` checks order-item `id`, but not legacy `product_id`. An old order line that stores only `product_id` could therefore fail to protect its catalog row. In addition, Production still grants `DELETE` on `public.products` to `authenticated`, allowing direct table deletion to bypass the guarded RPC if a caller has an authenticated session and passes RLS. Current observed data contained no order item with a non-empty legacy `product_id`; this does not remove the latent compatibility risk.

## Staged fixes already present on the audit branch

- `20261112063136_product_base_payload_validation.sql` adds trusted server-side payload validation and explicitly fills omitted boolean defaults while preserving explicitly supplied `false` values. It also keeps the create-only insert behavior and locked-row product update semantics.
- `20261112133000_guard_legacy_order_product_references.sql` checks both `id` and `product_id` across all order snapshots, including cancelled orders, after locking the product row.
- `20261112140000_revoke_direct_product_delete.sql` revokes direct table DELETE from PUBLIC, anon and authenticated so product removal must pass through the guarded RPC.
- Regression tests exist in `tests/productCreationDatabaseDefaults.test.js` and `tests/productDeleteHistoryGuard.test.js`.

These changes are staged only. They have **not** been applied to Production. Do not blindly run `supabase db push`: the repository's migration-history source gaps and release blockers remain in effect.

## Live RPC and privilege observations

- Public RPC wrappers `admin_save_product`, `admin_update_product_with_stock` and `admin_delete_product` are SECURITY INVOKER with an empty search_path and EXECUTE for authenticated, not anon.
- Their private implementation functions are SECURITY DEFINER with an empty search_path and validate the fixed primary-admin Auth UID plus trusted `app_metadata.role=admin`.
- Product update locks the existing product row and uses it as the base for omitted fields, preserving fields not included in the request. Variant stock changes are routed through the atomic stock-batch functions.
- Product triggers currently include variant-stock preservation and size/color aggregate-stock synchronization.
- Production still reports an authenticated DELETE table grant on `public.products`; the staged revoke migration is therefore important and must be validated alongside the RPC wrapper before release.

## Image upload and deletion review

- Product image uploads use the `storefront-media` bucket, random non-upsert object names under the exact `products/<product-id>/` folder, and track the prospective URL before the Storage request so ambiguous network failures can be accounted for.
- Client-side checks validate JPEG/PNG/WebP/GIF signatures and enforce a 5 MiB maximum. The live bucket independently enforces a 5 MiB limit and the same MIME allowlist.
- Image replacement uploads new assets first and only attempts old-image cleanup after the database RPC succeeds and the returned product ID is confirmed. Ambiguous RPC failures retain both old and newly uploaded assets rather than risking data loss.
- Product deletion confirms the database RPC before starting image cleanup.
- Cleanup validates exact bucket origin and the product's own folder, rejects traversal/encoded separators, checks other product references, order image snapshots, storefront draft/published configuration, historical storefront versions, legacy message images and the media registry. Any failed or incomplete reference read prevents deletion.
- Legacy order items without an image snapshot trigger retention of that product's images, because the order detail view may still fall back to the current catalog photo.
- Source tests cover upload ambiguity, duplicate submissions, cleanup ordering, reference-source coverage, URL/path validation and retention behavior.

## Live Storage snapshot

- Bucket: `storefront-media`; public read enabled for current public product-image URLs.
- Upload cap: 5 MiB; allowed MIME types: JPEG, PNG, WebP and GIF.
- INSERT, UPDATE and DELETE object policies are scoped to the fixed primary-admin Auth UID and trusted admin app metadata, for this bucket only.
- Snapshot: 12 objects, 2,413,683 bytes; all observed objects are in `products/`.
- 8 live products have image/gallery references (8 products total). The object count is not treated as a cleanup authorization; no object was deleted, overwritten, moved or downloaded.

## Risk notes / follow-up

- The reference-aware Storage cleanup is fail-closed, but its read-then-delete sequence is not a database-atomic reference lock. A concurrent operation could theoretically introduce a new reference between the final reference scan and Storage deletion. Do not broaden cleanup automation; a future hardening could serialize media-reference changes and deletion through a server-side lifecycle operation.
- This audit did not perform browser uploads, create/edit/delete a product, mutate stock, or place a test order. It is source and live-metadata inspection, not end-to-end functional certification.
- No Production data, schema, grants, Storage objects or bucket settings were changed. No migration was applied, no deployment or merge was performed.

## Release gate

Before any Production release: reconcile migration history against the known source gaps; validate the exact migration order and wrapper grants; confirm a current restorable database backup; run the full CI suite against the final branch SHA; then obtain explicit approval before any Production migration, merge or deployment.
