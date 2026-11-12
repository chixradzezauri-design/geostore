# GEOSTORE — product image upload and replacement failure-recovery audit

Date: 2026-11-12  
Repository: `chixradzezauri-design/geostore`  
Branch: `fix/admin-panel-audit-2026-11-10`  
Scope: focused follow-up of client upload validation, ambiguous upload/save failures, replacement cleanup ordering, Storage write boundaries and live object metadata. This stage does not repeat the prior historical-order snapshot audit.

## Findings

### Upload validation and object naming
- `src/utils/imageSafety.js` checks actual file signatures for JPEG, PNG, WebP and GIF rather than trusting the file extension or browser MIME label.
- Product upload accepts only those four MIME types, enforces 5 MiB per image and caps a gallery at 10 images.
- Product upload independently re-validates the data URL signature and byte count before decoding.
- Object names use a cryptographically random 128-bit suffix, a timestamp and image index; uploads use `x-upsert: false`, so a retry cannot overwrite an existing object.
- Uploads are sequential and scoped to `products/<product-id>/`.

### Failure and replacement lifecycle
- The prospective unique URL is tracked before the Storage POST, accounting for ambiguous non-2xx/network outcomes.
- If upload fails before the product RPC begins, cleanup is attempted only through the reference-aware, fail-closed cleanup routine.
- Once the product RPC request starts, every uncertain outcome retains the new images; an HTTP/proxy error is not treated as proof that the database did not commit.
- Existing images are cleaned only after the product RPC returns and the saved product identity/variant response is validated.
- Product deletion similarly confirms the guarded database RPC before starting image cleanup.
- Cleanup checks product rows, order snapshots, legacy order lines without image snapshots, storefront draft/published settings, historical storefront versions, legacy messages and the media registry. Failed or incomplete reference reads prevent Storage deletion.
- Cleanup is restricted to exact URLs in the configured bucket and the current product's folder; malformed paths, traversal, encoded separators and foreign folders are rejected.

### Live Production Storage (read-only)
- Bucket `storefront-media` is public-read, with a 5 MiB object limit and MIME allowlist JPEG/PNG/WebP/GIF.
- INSERT, UPDATE and DELETE policies are restricted to authenticated users matching the fixed primary-admin UID and trusted `app_metadata.role=admin`, and to this bucket.
- Current snapshot: 12 objects, 12 unique names, no missing metadata and no unexpected MIME metadata.
- No Storage object was downloaded, deleted, overwritten, moved or changed. No bucket setting or policy was changed.

## Residual risk — not changed in this stage
The current cleanup is reference-aware and fail-closed, but its final reference scan and Storage DELETE are separate operations. A concurrent product/storefront/media write could theoretically add a reference after the scan and before deletion (a time-of-check/time-of-use race). This is an architectural concurrency limitation, not evidence that a live image was lost. The safe long-term solution is a server-side media lifecycle operation that serializes reference changes and deletion (or a tombstone/quarantine workflow), rather than broadening client-side deletion. No such change was made because it requires a coordinated database/API design and staged validation.

## Verification limits
- Reviewed the upload helper, image signature validator, product save/replacement flow, cleanup helper and existing source-level regression tests.
- Reviewed live bucket configuration, object policies and aggregate object metadata using read-only queries.
- Existing tests were inspected but not executed in this stage. No browser upload, product edit/delete, CI/build or end-to-end test was run.
- No Production data, schema, grants, Storage objects or bucket settings changed. No migration, deployment or PR merge was performed.

## Result
No newly confirmed defect requiring a safe narrow code change was found in the upload validation or failure-recovery flow. No application code was changed. Preserve all current images and leave the 12 live objects untouched. The concurrency limitation above remains a future hardening item requiring a staged server-side design.
