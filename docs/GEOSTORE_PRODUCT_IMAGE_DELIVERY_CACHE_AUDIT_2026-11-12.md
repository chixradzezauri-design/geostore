# GEOSTORE — product image delivery, optimization and cache audit

Date: 2026-11-12  
Repository: `chixradzeuri-design/geostore`  
Branch: `fix/admin-panel-audit-2026-11-10`

## Scope
A new focused stage covering storefront image rendering, browser loading behavior, image transformation/optimization usage and Vercel cache headers. This does not repeat the preceding Storage authorization or cleanup audit.

## Verified behavior

### Storefront image loading
- `src/components/StoreView.jsx` wraps storefront images in `StorefrontImage`, which rejects unsafe URL schemes and falls back if an image fails.
- Catalogue product cards, flash-sale images, banners, category images, gallery thumbnails and customer review photos use lazy loading and asynchronous decoding.
- The selected product's primary detail image is intentionally not marked lazy, so the currently viewed product image is not deferred.
- Catalogue and detail image CSS uses constrained image frames and `object-fit: contain` for product photography; editorial/category backgrounds use cover where appropriate.
- No product URL is rewritten or mutated by the image component.

### Upload and optimization behavior
- Product image upload validates actual JPEG/PNG/WebP/GIF signatures and limits each image to 5 MiB.
- The upload helper sends the original validated bytes to Storage; this reviewed path does not resize, recompress or generate responsive variants before upload.
- The upload request does not explicitly set a `cacheControl` value. Therefore a specific long-lived Storage object cache lifetime is not established by this code review.
- Storefront image rendering does not currently generate `srcSet`/responsive image candidates or request Supabase image transformations. This is an optimization opportunity, not a demonstrated rendering failure.

### Vercel cache configuration
- `index.html`: `public, max-age=0, must-revalidate`.
- `/assets/*`: `public, max-age=31536000, immutable`.
- These policies are appropriate for a build that emits content-hashed assets; this stage did not inspect a current production build manifest to independently prove every asset filename is content-hashed.

## Findings and recommendations
- No newly confirmed correctness or data-integrity defect was found.
- A future performance enhancement could create responsive image variants (for example, thumbnail/card/detail widths), preserve the original as the source of truth, and use explicit immutable cache headers only for versioned, content-addressed objects.
- Such a change must preserve original URLs used by historical order snapshots and existing products, avoid rewriting legacy image URLs, and be validated against actual Supabase Storage image-transformation availability and billing/limits before implementation.
- Do not blindly set long-lived immutable caching on existing mutable object paths: replacement or re-upload under a reused URL could otherwise serve stale images.

## Verification limits
- Source/configuration review only. No Lighthouse, network waterfall, browser device test, current Production cache-header probe, image transformation request, build or CI run was performed.
- No application files, images, Storage objects, bucket settings, Production data or deployment were changed.
- No PR was merged and no Production deployment was initiated.

## Result
No code change was warranted in this stage. Existing lazy loading, image safety checks, responsive image framing and Vercel asset caching are preserved. Responsive image generation and explicit versioned Storage caching remain a separately testable optimization project.
