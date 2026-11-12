# GEOSTORE SEO metadata and indexing audit — 2026-11-12

## Scope
Reviewed the staged branch's document shell, robots policy, sitemap, Vite/Vercel routing, React entrypoint and storefront product-detail behavior. This is a source audit; no search-engine crawl, Search Console data, live HTTP response or browser rendering could be verified.

## Findings
1. `index.html` was using a generic English title despite `lang="ka"`, and only had a basic description. It lacked a canonical URL and Open Graph metadata.
2. `public/robots.txt` allows crawling and references `https://geostore.ge/sitemap.xml`. No disallow rule blocks the storefront.
3. `public/sitemap.xml` contains only the homepage. This is consistent with the current app architecture: the storefront opens product details in a React modal and no product-specific route or URL/history integration was found. Products therefore do not have independent crawlable canonical URLs in the current implementation.
4. Vercel rewrites non-API paths to `/index.html`; this supports SPA navigation but does not provide product-specific server-rendered metadata or HTML to crawlers.
5. No JSON-LD structured data, social preview image, hreflang alternates, dynamic title/description updates or product-specific canonical metadata were found in the inspected files.
6. The PWA manifest is present. Its description and app name are consistent with the store's clothing, footwear and accessories scope.

## Safe source correction
Updated `index.html` on the audit branch:
- Georgian storefront title matching the document language.
- More descriptive Georgian meta description.
- Canonical homepage URL matching the existing sitemap domain.
- Explicit `index, follow` robots metadata.
- Open Graph website/site-name/locale/title/description/url tags for link previews.

The existing React entrypoint, fonts, manifest, body classes and root mount remain intact. No new product routes or speculative URLs were added to the sitemap.

## Important remaining SEO work
- Product-level SEO requires genuine stable product URLs, route-aware product rendering, title/description/canonical metadata, product JSON-LD and sitemap entries generated from published products. A modal-only detail view cannot supply that reliably.
- Consider server-side rendering or prerendering for product routes so crawlers receive product-specific HTML and metadata without relying solely on JavaScript execution.
- Add a real social preview image only after selecting/creating an approved brand asset; no image URL was invented.
- Add hreflang only after language-specific canonical URLs exist. The current language switcher does not create separate locale routes.
- Validate the live canonical host, redirects, sitemap fetch, robots fetch, rendered metadata and Google indexing in Search Console after deployment.

## Verification and safety
- Source files inspected: `index.html`, `public/robots.txt`, `public/sitemap.xml`, `public/manifest.json`, `vercel.json`, `vite.config.js`, `src/main.jsx`, `src/App.jsx`, `src/components/StoreView.jsx`, and `package.json`.
- No products, categories, images, orders, users, reviews, database rows, Storage objects, Supabase settings or Production deployment were changed.
- No build, test suite, live crawler test, Search Console inspection or browser E2E was run. Current-HEAD CI status is not asserted.
- No merge, Production deployment or Preview promotion was performed.

## Result
The storefront shell now has improved Georgian homepage metadata and canonical/social tags on the audit branch. The major remaining limitation is architectural: products do not yet have independent URLs, so product-level indexing and rich product snippets cannot be completed by metadata-only changes.
