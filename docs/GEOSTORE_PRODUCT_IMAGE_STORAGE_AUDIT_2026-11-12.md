# GEOSTORE — product image storage and upload integrity audit
Date: 2026-11-12
Branch: `fix/admin-panel-audit-2026-11-10`
Scope: read-only audit of live Supabase Storage configuration, policies, object metadata and product image references.

## Live bucket configuration
- Bucket: `storefront-media`
- Public read enabled (required by the current public product-image URL format).
- Upload size limit: 5 MiB.
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
- Live Storage object policies:
  - INSERT: authenticated role, fixed primary-admin UID, and `app_metadata.role = admin`.
  - UPDATE: same fixed primary-admin identity and role, scoped to this bucket.
  - DELETE: same fixed primary-admin identity and role, scoped to this bucket.
- No broad authenticated/customer upload, update or delete policy was found for this bucket.

## Current live object audit
- 12 objects; 12 unique object names.
- All 12 have metadata and image MIME type; all 12 have allowed JPEG file extensions.
- Largest object: 304,566 bytes (about 297 KiB), below the 5 MiB bucket cap.
- 4 objects are referenced by current product image/gallery fields.
- 8 objects are not referenced by current product image/gallery fields. They appear in old/other product-ID folders and may be leftovers from earlier uploads or product changes. The read-only check found no matching Storage URL in current order JSON snapshots, but that alone is not proof that deletion is safe.

## Decision / safety
- No object was deleted, overwritten, moved, or re-uploaded.
- No bucket configuration or RLS policy was changed.
- The 8 unreferenced objects remain preserved. Do not delete them automatically: first verify their provenance and any non-product references, and obtain explicit approval for cleanup.
- No customer/order/product/stock data changed. No test product or order was created. No migration was applied to live Supabase and no Production deployment occurred.
- This is an audit-only result; it does not claim end-to-end browser upload/retry behavior was tested. Source-level upload lifecycle and failure recovery remain a separate follow-up check.
