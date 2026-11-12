# GEOSTORE Product Detail URL & Routing Architecture Audit — 2026-11-12

## Scope
Read-only review of the existing storefront product-detail flow, product identity, SPA hosting rewrite, and the Production `public.products` identity/SEO columns. This is a new stage following the SEO metadata/indexing audit.

## Repository and branch
- Repository: `chixradzezauri-design/geostore`
- Branch: `fix/admin-panel-audit-2026-11-10`
- Base HEAD reviewed: `1edc89d1a22133f4619f56ec1a39852d6b8f584b`
- No Production deployment, merge, schema migration, or data mutation was performed.

## Findings

### 1. Product detail is modal-only
- `src/components/StoreView.jsx` owns `selectedProduct` locally.
- `handleOpenProduct(product)` sets modal state and initializes image, size, color, variant, gift, and review state.
- Product cards invoke `handleOpenProduct(prod)`; closing the detail modal calls `setSelectedProduct(null)`.
- No route callback is passed from `src/App.jsx` to `StoreView.jsx`.
- No product pathname parser, History API synchronization, or `popstate` listener was found in `App.jsx`, `StoreView.jsx`, or `Header.jsx`.
- Result: the current detail modal cannot be opened reliably from a copied product-specific URL, and browser back/forward does not select or close a product.

### 2. Stable product identity is already available
- `src/App.jsx` builds `publishedProductById` using `String(product.id)`.
- Public product data is filtered through `sanitizePublicProductCache`; unpublished rows are not passed to the storefront.
- Storefront reviews also use the product's existing `id`.
- Production schema inspection confirms `public.products.id` is `text NOT NULL`; `name` is `text NOT NULL`; `is_published` is `boolean NOT NULL`.
- Production `public.products` has no `slug` column.
- Read-only aggregate inspection found 8 products; all 8 IDs are 18–37 characters and match the URL-safe segment pattern `^[A-Za-z0-9_-]+$`. None are UUID-format IDs.
- Do not replace or regenerate these existing IDs. Product ID is the correct durable route identity; a slug must never be the identity.

### 3. Hosting already supports SPA fallback
- `vercel.json` rewrites all non-`/api/` paths to `/index.html`.
- Therefore a route such as `/products/{id}` reaches the React app on a direct request/refresh at the rewrite layer.
- The app currently ignores that pathname, so the route still renders the general storefront rather than the requested product.
- No additional rewrite is needed for the proposed product path under the current configuration.

### 4. SEO limitation remains
- `index.html` contains the homepage canonical and Open Graph metadata from the preceding SEO stage.
- The React product modal does not provide product-specific route metadata.
- Even if React updates `document.title` and meta tags after loading, the initial HTML delivered to a crawler remains the generic homepage HTML unless prerendering/SSR or another crawler-visible rendering strategy is added.
- The existing sitemap contains only the homepage. Do not add invented product URLs to the sitemap until a safe published-product URL source/generation mechanism is implemented.

## Recommended compatible route design

1. Introduce canonical route shape `/products/{encoded-stable-product-id}`. Do not require a database slug column or rename existing product IDs.
2. Treat the ID as the lookup key. Decode defensively; reject malformed/empty path segments; never query by product name or SKU as a fallback identity.
3. Resolve the route only against the same published product collection already supplied to the public storefront. Never expose unpublished drafts through direct URLs.
4. Preserve the existing modal UX and its state initialization. A route-selected product should open the same detail modal, so size/color selection, custom variants, image gallery, reviews, gift options, stock checks, and add-to-cart behavior remain in the existing component.
5. Use `history.pushState` for card-open/share navigation and a single `popstate` synchronization path. Closing a route-opened modal should navigate back when the current history entry belongs to that modal; direct-entry close should return to the storefront without accidentally leaving the site. This requires explicit state/marker handling to avoid back-button loops.
6. When the catalogue is still loading, retain the requested product ID and resolve only after the published catalogue is ready. If the product is missing, unpublished, or removed, show a safe not-found/store fallback and do not leak draft data.
7. Keep query parameters such as the existing `?admin=secret` legacy tab switch intact; product navigation must not overwrite unrelated query parameters.
8. Product renames should not change the canonical ID URL. If a human-readable slug is later added, it is an alias only and must redirect/canonicalize to the same ID URL.
9. Add tests for safe ID parsing/encoding, direct deep-link resolution after catalogue load, unpublished/missing products, open-close history, back/forward navigation, query preservation, and product rename stability.
10. Add product-specific crawler-visible metadata and sitemap output only after selecting and validating a prerender/SSR or equivalent build/runtime approach. Do not expose service-role credentials or introduce an unsafe build-time database secret.

## Zero-loss compatibility requirements
- Preserve the current product modal and every existing detail interaction.
- Do not modify product rows, IDs, slugs, orders, order-item snapshots, variants, inventory, images, reviews, users, carts, or support data.
- Do not rewrite historical order snapshots if a product name or future slug changes.
- Do not add a database migration merely to create a decorative slug when the stable text ID is sufficient.

## Changes made in this stage
- No application code or database schema was changed. This is intentional: route/history integration crosses App and StoreView lifecycle and should be implemented with dedicated tests and browser verification rather than an untested partial URL patch.
- This report is the only staged change in this stage.

## Verification and limitations
- Reviewed `src/App.jsx`, `src/components/StoreView.jsx`, `src/components/Header.jsx`, `src/utils/publishedProducts.js`, `src/utils/productSearch.js`, `vercel.json`, `vite.config.js`, `index.html`, and `package.json`.
- Queried Production `information_schema.columns` for product identity/publication/slug fields and ran aggregate-only ID shape checks.
- Production SQL was read-only. No row values or customer data were requested.
- No local test suite, Vite build, browser E2E, crawler, Search Console, or live Production route test was run.
- Current HEAD CI status is not asserted.
- No Production deployment, PR merge, schema migration, product mutation, or Storage operation was performed.

## Next stage
Implement and test the stable-ID product route with backward-compatible modal and browser-history synchronization; then separately address crawler-visible product metadata and sitemap generation.
