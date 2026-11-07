# Product variant validation parity — 2026-11-07

A final review compared `src/utils/productValidation.js` with the staged PostgreSQL trigger/RPC validation.

The staged database validation now enforces the same hard limits as the product editor:
- at most 50 variants per product;
- variant ID length up to 80 characters;
- variant name length up to 80 characters;
- numeric variant price from 0 through 1,000,000,000 GEL, with at most two decimal places;
- variant stock from 0 through 1,000,000 units.

The admin stock-adjustment RPC additionally bounds product IDs to 64 characters, variant IDs to 80 characters, current stock to 1,000,000, and each signed delta to ±1,000,000. It locks the product row and requires exactly one matching variant ID.

Static parity checks against the frontend validator passed. The four staged database migrations were then re-executed inside an explicit transaction followed by `ROLLBACK`; PostgreSQL accepted the updated SQL. No migration was applied permanently and no product/order rows or stock values were changed.
