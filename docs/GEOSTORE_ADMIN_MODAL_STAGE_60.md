# GEOSTORE Admin Modal Reflow — Stage 60

## Scope
- Improve the order reactivation confirmation dialog on small screens.
- Bound the dialog to the viewport and allow its content to scroll internally.
- Respect mobile safe-area insets and keep action controls touch-sized.
- Scope the rules to non-order-detail dialogs.

## Preserved
- The Stage 45 order detail modal is explicitly excluded.
- No order status transitions, reactivation handlers, database calls, order data, customer data, or other application logic changed.
- No tables, support-ticket flows, or existing modal content were rewritten.

## Verification
- Automated tests check the existing dialog markers, selector exclusion, safe-area behavior and stylesheet order.
- Full repository tests and production build run in GitHub Actions.
- Real device review is still required at 320px, 390px, tablet and desktop sizes.
- Draft only; no merge or deployment.
