# GEOSTORE technical excellence — phase 4

Base: 0816293d70be26e215235d231f49468338e2b36f, released PR #154. All work accumulated in draft, no production or database changes without explicit release consent. Branch-specific Vercel preview suppression, no paid services assumed.

## Work plan and gates
1. SEO: audit canonical host, actual crawlable product and category routes (including direct navigation/back/forward, hidden/deleted products, existing editor and saved-product behavior), metadata and proper unavailable-page handling; then dynamic public-catalogue sitemap with pagination, no private data and no false success on upstream errors. Test sitemap/links against the published catalogue, then Search Console submission when domain ownership is confirmed.
2. Performance: baseline mobile LCP/INP/CLS and bundle/request size; preserve lazy modules and responsive behavior; optimize measured bottlenecks.
3. Images: audit upload and delivery; loss-aware resizing/modern formats with size and MIME validation, transparency handling, safe fallback, no bulk destructive replacement.
4. Cross-device cart, favorites and digital wardrobe: audit current account-scoped local storage, guest merge and account switching. Design owner-only RLS, revision/idempotency/conflict-safe sync and offline behavior; staged migrations only, synthetic two-device tests; never sync sensitive local data unintentionally.
5. Admin MFA: audit owner/staff Auth, TOTP enrollment/recovery, AAL2 server enforcement for sensitive operations and lockout-safe staged rollout. No production enforcement before enrollment and verified recovery.
6. Monitoring: privacy-preserving redacted diagnostics, rate limits, no secrets, no paid monitoring without approval.
7. Real Auth testing: disposable Supabase users and JWTs, cross-account and staff/owner denial, full checkout/stock/permissions regressions; no real orders or production credentials in CI.
8. PWA: audit existing manifest/service worker and install flow, offline shell/update lifecycle without caching private/admin/checkout responses or outdated pricing.

## 4A — first foundation
Confirmed existing public/sitemap.xml lists only https://geostore.ge/; index HTML contains a generic title/description. Production Vercel previously verified geostore.vercel.app; custom domain ownership/routing needs confirmation before changing canonical origin. StoreView product details are modal state, not addressable URLs; existing App saved-product request and editor preview must be preserved. App public product queries use anonymous-safe projection; admin paths can include unpublished data. Added pure shared route/sitemap contract and unit tests; deliberately not yet wired to navigation or published sitemap. Sitemap must only consume complete successful anonymous catalogue data. Product IDs are stable path keys; category names match existing filter semantics. No origin change yet. Next implement route integration and metadata, then server-side sitemap endpoint and live-safe tests. No schema modification, deployment or real-user mutations.

References: Google Search Central crawlable links and sitemap guidelines; Vercel filesystem precedence for rewrites. Sitemap inclusion does not guarantee indexing. CI pending.

## 4B — catalogue navigation integration
StoreView opts in only from the real App, not the visual editor. Shared route parser controls history, direct product waits for verified current catalogue epoch and excludes unpublished rows; category and child routes resolve existing filters, back/forward handled, unknown product displays unavailable message. Existing saved-product flow retained. Query/hash and legacy admin route preserved. This block does not change canonical origin or sitemap. CI pending; browser tests and crawlable anchor links/metadata are next. No production changes.
