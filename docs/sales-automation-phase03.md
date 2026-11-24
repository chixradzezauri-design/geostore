# Sales automation — phase 03
Base: 4ed3052dc58ec3b7e935f17b93d36ff9e6b13a52 (released PR #152). Scope: accumulate in one draft PR; no preview builds, production merge, live migration, paid provider or outbound messages without owner approval.

## Implementation sequence
1. Verified price-drop/restock decision contract and tests (this commit).
2. Server-backed per-account opt-in subscriptions, RLS, transactional event/outbox deduplication, exact product/variant prices and stock. Design and test migrations in isolation; do not apply to live until release approval.
3. Customer product controls, subscription management and in-app notification integration. Existing order notifications must remain intact. Support guest sign-in prompt; no silent subscription.
4. Abandoned cart recovery: explicit opt-in, server-side account-scoped cart activity, inactivity delay, cancellation on checkout/empty cart, cooldown and one-shot reminders. Never use another account's local cart.
5. Campaign scheduling and admin control: draft, eligibility, consent, preview, pause, delivery/failure status and audit trail. Existing local broadcast UI must not be represented as real delivery.
6. Measurement: verified counts for eligible, queued, delivered, clicked and converted; no invented attribution. Test permissions and concurrent retries.
7. End-to-end isolated tests, release preflight, one approved release. Email/SMS/push providers, costs and legal consent requirements require separate review.

## Stage 1
Existing notification UI uses order-specific RPCs and polling/realtime; preserve that path. Existing cart is browser-stored and principal-scoped. Do not pretend that cross-device cart reminders already work.
Added a pure one-shot in-app decision contract for price-drop and restock subscriptions. Requires explicit consent, active unexpired subscription, verified chronological post-consent published observations, exact product/variant, nonnegative integer tetri and stock. Price drop only if item is available; optional target price; restock only zero-to-positive. Stable event key per subscription; future database must enforce unique event and atomic consumption. The verified flag is a contract for trusted backend inputs, not an authorization mechanism; never trust browser claims. No runtime integration or notifications are enabled by this commit. No new dependencies.
Ten Node test cases cover positive and negative paths. CI pending.
