# Admin dashboard and finance audit — 2026-11-07

## Scope

Read-only review of the current maintenance-branch admin UI and live Supabase schema, policies, privileges, and RPC definitions. One new SQL migration was staged in GitHub; it has NOT been applied to Supabase. No live rows were changed and no production deployment was triggered.

## Findings

### 1. Orders: live database still grants authenticated DELETE

The live `public.orders` table has an admin-only DELETE RLS policy, and `has_table_privilege('authenticated', 'public.orders', 'DELETE')` currently returns true. The admin UI has no normal order-delete action, but a direct authenticated REST request could delete an order and break the stock/audit ledger.

The staged migration `20261106200000_prevent_completed_order_status_rollback.sql` already drops the `Admin can delete orders` policy and revokes DELETE from PUBLIC, anon, and authenticated. This is a release-critical hardening item and must be applied only after migration history is reconciled.

### 2. Product stock: a stale-upsert path exists in the database RPC

The current product editor uses a direct PATCH for edits and deliberately omits `stock`, protecting checkout deductions from the stale form value. Quick stock edits use a compare-and-set filter on the previous stock value.

However, live `private.admin_save_product(jsonb)` also supports `ON CONFLICT (id) DO UPDATE` and writes `stock = EXCLUDED.stock`. An authorized caller using that RPC with an existing product ID could overwrite newer stock with a stale payload. The current frontend uses this RPC for creates, not ordinary edits, but the database function should be safe independently of the current UI.

A new staged migration was added:
`20261107030000_preserve_stock_on_admin_product_upsert.sql`

It changes the upsert conflict path to preserve `existing.stock`. It is not applied to the live database.

### 3. Product CRUD and image lifecycle

- Product reads are public; insert/update/delete RLS policies require the primary admin UUID and `app_metadata.role = admin`.
- Product creation calls the protected RPC.
- Existing product edits use authenticated PATCH and omit stock.
- Quick stock/price/cost updates use compare-and-set against the value last read, preventing silent overwrite when another update wins first.
- Editing loads the existing gallery into the form; unchanged images are retained. Removed managed images are cleaned up after the product update. Upload failure cleanup is attempted.
- Product deletion uses a protected RPC, then attempts to delete only managed images under that product's own Storage prefix.
- The product editor's custom variants are validated client-side; the database variant trigger migration remains staged, not live.

### 4. Finance and expenses

- The live expenses table has an admin-only ALL policy; public/anon cannot access it.
- The admin UI validates positive amount, date shape, category, and description before inserting.
- The live expense table currently contains one row. The earlier exploratory regex check was not valid for PostgreSQL's regex escaping; a corrected canonical-date check found no malformed dates.
- Analytics counts revenue only from delivered/completed orders; cancelled and in-progress orders are not counted as realized sales.
- Gross profit is withheld (`null`) when any delivered order item has unknown cost. It prefers historical `purchase_cost` snapshots and only falls back to current product cost while incrementing an estimated-cost counter.
- Net result is gross product profit plus recorded delivery revenue less recorded expenses.
- This is a management estimate, not audited accounting: delivery charge is parsed from the stored address string, and legacy rows missing product snapshots or status timestamps are flagged. Do not present estimated COGS as exact.

### 5. Order notes and support tickets

- Admin order notes use a protected SECURITY DEFINER RPC with admin identity validation and a 5,000-character cap.
- Support tickets are readable/updatable/deletable only by the primary admin. Public insert is constrained to a validated open ticket with no reply.
- Ticket reply is stored in the database; the UI correctly tells the admin that this action does not send an email.

### 6. Staff, CRM, vendors, categories, banners, broadcasts

These features must not be mistaken for server-side user permissions or multi-user persistence:

- Staff list is explicitly localStorage-only. Adding a staff member does not create a Supabase Auth account or grant access.
- CRM/VIP/blocking/customer-note actions operate on the legacy in-memory/local user list; they do not alter Supabase Auth users or server authorization.
- Vendors are currently local app state.
- Categories and banners are edited in app state/localStorage and are persisted as storefront draft/published configuration through the App-level draft workflow; they are not independent database tables.
- Broadcasts are stored only in the current device's localStorage and are not sent to customers.

The UI must continue to communicate these limitations honestly until real server-side workflows are implemented.

## Required before release

1. Reconcile all live migration versions with repository migration files.
2. Apply the reviewed order-delete revocation and order-status safeguards in a controlled migration window.
3. Apply the product upsert stock-preservation migration and verify product create/edit/stock deduction behavior in staging.
4. Run admin role-negative tests for every admin RPC and direct REST mutation.
5. Test image upload/edit/remove/delete, coupon and delivery fee CRUD, expenses CRUD, order note persistence, and finance totals.
6. Label local-only staff, CRM, vendor, and broadcast functionality as device-only; do not describe it as server-backed access control or messaging.

## Conclusion

Most core admin operations are protected by the primary admin identity and RLS/RPC checks. The important live risk is authenticated DELETE on orders; the important code-level hardening is preventing the admin product upsert RPC from replacing live stock. Both are recorded for staged migration work. Do not release the database changes until migration history is reconciled and staging tests pass.
