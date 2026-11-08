# Checkout add-on pricing audit — 2026-11-07

## Finding
The product detail UI offered premium gift wrapping (+5 GEL), VIP warranty (+15 GEL), and an optional free gift-card message. The cart included these fees in its displayed unit price, but checkout omitted structured add-on fields. The server correctly ignored browser-supplied prices and rebuilt each line from the catalogue base price, so paid add-ons and the gift message were not preserved in server-created orders.

## Implemented correction
- Store explicit cart fields for gift wrapping, VIP warranty, and the free gift message.
- Keep catalogue base price separate from the displayed price.
- Reconcile catalogue price changes without losing selected add-ons.
- Calculate fixed fees on the server: gift wrapping = 5 GEL per unit; VIP warranty = 15 GEL per unit.
- Persist confirmed options and per-unit total in order item JSON.
- Include customizations in the idempotency fingerprint only when an add-on is selected, preserving replay compatibility for existing uncustomized orders; cart grouping keeps differently customized lines separate.
- Validate boolean flags and require a string/null gift message capped at 240 characters on both client and server.
- Recover legacy add-ons from localized names in saved carts.
- Show confirmed options and gift text in admin order details and invoices.

## Deployment safety
The forward-only migration `20261107115218_persist_checkout_addons_server_pricing.sql` is applied to Supabase and matches the migration ledger. A rollback-only transaction verified per-unit pricing, persisted options, idempotent replay, changed-option rejection, malformed-message rejection, and unchanged plain-order pricing. The transaction was rolled back; no production orders, stock, products, or accounts were modified. Application changes are saved on the maintenance branch but have not been deployed to the live storefront; keep production deployment deferred until the consolidated release review.
