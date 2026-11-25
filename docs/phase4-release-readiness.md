# 4BG — PWA regression isolation and release assessment

## Regression
Previous PR head 1b7f92f48e28287aaa9d68825f816e7be60a24fb passed build, dependency audit, CodeQL and isolated SQL but failed Responsive browser smoke (run 45563902614, job 139033913926). All Chromium checkout and admin workspace scenarios passed; WebKit timed out at direct product navigation (Stage46 Everyday Wallet). Service worker registration newly introduced in the built app can interfere with Playwright request interception; this is a plausible cause, not yet proven. Block workers in existing application and mock-network contexts to maintain deterministic route interception and prevent service-worker requests bypassing fixtures. Do not weaken any existing assertion. Dedicated actual built worker smoke in 4BF explicitly permits workers and exercises network failure, API cache exclusion, reconnection and waiting update. CI must pass before claiming the regression resolved. Hosted behavior and native installation remain unverified.

## Release matrix — keep distinct from completed feature claims
- SEO: catalogue product/category links, sitemap and isolated HTTP behavior implemented; hosted routing/headers and Google indexing still require verification.
- Performance: build chunk reductions measured, not real Core Web Vitals. Image compression scoped to eligible new JPEG uploads; existing assets untouched. No blanket runtime cache.
- Local account isolation: wardrobe local data isolated by owner; legacy global wardrobe retained but not automatically imported. Cart/wishlist/wardrobe server sync drafts, transports, locks and erasure machinery are not fully wired or released. Do not claim cross-device synchronization.
- Admin MFA: rollout remains off; SQL candidates not live, actual Auth factor/session and fresh password AMR verification, recovery and complete API authorization coverage are release gates.
- Monitoring: bounded in-memory observation collection and fallbacks are present; central history and server reporting gated off. Server-side key provisioning, actual API tests, retention schedule and abuse controls required before activation.
- PWA: offline static fallback only, no offline checkout, no automatic worker takeover or reload, local raster icons, installation help. Native iOS/Android and hosted static routing need testing. Dedicated worker browser smoke pending.
- Production: no merge/deployment, no database migration or secret configuration without explicit approval. No generic db push, historical migration reconciliation remains separate. Keep all unfinished SQL drafts under release/ and do not activate flags simply because CI is green.

## Publication decision
Do not label the whole phase production-ready. A reviewed application-only release could include fully tested non-gated changes if release owner explicitly chooses that scope; do not silently activate or apply incomplete server features. Require complete head CI, diff audit, hosted rollout plan and rollback plan; no additional paid environment or preview created.

## 4BH — synchronization acknowledgement review
Wishlist and cart SQL RPC arguments/statuses reviewed against the staged contracts. Transport now independently computes the exact expected snapshot and accepted status before sending, rejecting a matching revision with wrong membership, order, quantity or extra lines. No automatic local overwrite or journal clearing on ambiguous acknowledgement. Added unit regressions. This fixes a candidate transport validation gap; it does not mount cross-device synchronization or authorize a database release. Full owner-context hydration, conflict UX, checkout reconciliation and real Auth still required.
