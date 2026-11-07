# Checkout add-on pricing audit — 2026-11-07

## Finding
The product detail UI offered premium gift wrapping (+5 GEL), VIP warranty (+15 GEL), and an optional free gift-card message. The cart included these fees in its displayed unit price, but checkout omitted structured add-on fields. The server correctly ignored browser-supplied prices and rebuilt each line from the catalogue base price, so paid add-ons and the gift message were not preserved in server-created orders.

## Staged correction
- Store explicit cart fields for gift wrapping, VIP warranty, and the free gift message.
- Keep catalogue base price separate from the displayed price.
- Reconcile catalogue price changes without losing selected add-ons.
- Calculate fixed fees on the server: gift wrapping = 5 GEL per unit; VIP warranty = 15 GEL per unit.
- Persist confirmed options and per-unit total in order item JSON.
- Include customizations in the idempotency fingerprint only when an add-on is selected, preserving replay compatibility for existing uncustomized orders.
- Validate boolean flags and cap gift message length at 240 characters.
- Recover legacy add-ons from localized names in saved carts.
- Show confirmed options and gift text in admin order details and invoices.

## Deployment safety
The forward-only migration `20261107140000_persist_checkout_addons_server_pricing.sql` is staged only. It has not been applied to Supabase. Do not deploy application changes before the migration is safely applied after migration-history reconciliation. No production orders, stock, products, or accounts were modified.
