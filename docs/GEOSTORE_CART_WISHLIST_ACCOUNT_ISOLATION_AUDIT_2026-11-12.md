# GEOSTORE — Cart, Wishlist & Comparison Ownership Audit
Date: 2026-11-12
Repository: chixradzezauri-design/geostore
Branch: fix/admin-panel-audit-2026-11-10

## Scope
Reviewed browser persistence, account switching, cart snapshot sanitization, wishlist and comparison ownership, and checkout cart validation. No customer browser storage or account content was accessed.

## Verified findings
- Cart storage keys are scoped by immutable Supabase Auth user UUID: `geostore_cart:guest` and `geostore_cart:user:<encoded-user-id>`.
- Wishlist and comparison use equivalent user-scoped keys.
- Legacy unscoped cart/wishlist/comparison values are migrated to the guest slot on first owner activation; existing legacy values are not deleted by the migration helper.
- On account switch, the outgoing collection is saved under the outgoing owner and the next owner's own collection is loaded.
- Persistence is blocked while auth is loading, before owner initialization, and whenever active owner ID differs from the current auth user ID.
- If owner switching throws, in-memory private collections are cleared and the owner state is reset rather than risking persistence under a different account.
- Cart snapshots are sanitized for malformed entries, item count, quantity, price, variant identifiers, and add-on metadata. Wishlist/comparison snapshots are sanitized and bounded.
- Checkout refreshes the current catalogue before submission; server RPC remains authoritative for current price, stock, variant, coupon, delivery and total.
- Cart quantity edits use current catalogue stock, not persisted stock snapshots.
- Automated tests in `tests/cartSafety.test.js` cover guest/account isolation, two-account separation, sign-in/sign-out switching, persistence guards, legacy migration, collection sanitization and variant stock behavior.

## Limitations / product behavior
- Cart, wishlist and comparison are browser-local localStorage data, not server-synchronized. They do not automatically follow a customer to another device or browser.
- No confirmed cross-account leakage defect was found in the reviewed implementation.
- Storage quota/privacy-mode failures are caught; this can prevent persistence on that browser, but should not cause another account's data to be loaded.

## Actions
- No code change or database migration was justified by the reviewed evidence.
- No Production data or browser storage was read or modified.
- No test orders, deployments, merges or Production changes were performed.
- Unit tests were reviewed but not executed in this audit environment; no build/CI pass is claimed.
