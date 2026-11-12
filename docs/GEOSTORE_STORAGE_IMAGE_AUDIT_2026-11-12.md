# GEOSTORE Storage and image lifecycle audit — 2026-11-12

Production project: `xmtnszxtnfxnrojionoa`
Audit branch: `fix/admin-panel-audit-2026-11-10`

## Read-only Production findings

- Only one Storage bucket exists: `storefront-media`.
- It is public, with a 5 MiB object limit and MIME allowlist JPEG, PNG, WebP, GIF.
- It contains 12 JPEG objects totaling 2,413,683 bytes.
- Current Storage object policies permit INSERT, UPDATE and DELETE only for the fixed primary admin identity with trusted `app_metadata.role = admin`. No direct anon/customer upload or mutation policy was found.
- The `storefront_media` metadata table exists but currently has zero rows. The 12 objects are in `products/<product-id>/...` paths.
- Production has 8 products with image URLs and all 8 have non-empty galleries. The observed product image hosts are the project's Supabase Storage domain and images.unsplash.com.
- No object was downloaded, modified, moved, or deleted.

## Frontend safeguards reviewed

- `src/utils/imageSafety.js` validates declared MIME, file size, and actual file signature for JPEG/PNG/WebP/GIF.
- `src/utils/productImageCleanup.js` collects references from product images/galleries, order snapshots, storefront configuration and versions, and legacy message images. It validates same-origin Storage URLs and decodes paths before deletion.
- `src/components/AdminDashboardPro.jsx` pages through products, orders, storefront configuration, snapshots, and legacy messages before attempting deletion. Any incomplete read or pagination cap fails closed and prevents deletion. It also retains images for legacy orders whose snapshots do not contain an image.
- The cleanup implementation therefore errs toward retaining unreferenced images rather than risking deletion of referenced historical media.

## Support attachments: not live

- Production currently has no `support-attachments` bucket.
- Production `support_ticket_messages` has no `attachment_*` columns.
- Production Edge Functions list is empty; `support-attachments` is not deployed.
- The attachment migration and Edge Function are staged in the audit branch only. They must be deployed together with the database migration after migration-source reconciliation and a recoverable backup plan. Do not deploy the Edge Function alone.

## Findings and release guidance

1. No confirmed unsafe direct customer write access to `storefront-media` was found.
2. Public bucket reads are intentional for product/storefront images; do not switch the bucket to private without redesigning every public image URL and storefront consumer.
3. The 12 existing objects should be preserved. The metadata table being empty does not prove those objects are unused; product image URLs reference the bucket and older order/storefront snapshots may also reference them.
4. Do not run bulk orphan cleanup until a complete reference audit has been made and backup/restore is available.
5. The audit branch's cleanup logic has fail-closed behavior and regression tests. No Production Storage mutation was made.

## Status
Audit documentation only. No Production Storage policies, buckets, objects, database rows, migrations, or deployments were changed.
