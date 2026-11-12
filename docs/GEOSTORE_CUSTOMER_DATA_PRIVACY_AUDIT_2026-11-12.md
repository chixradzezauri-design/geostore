# GEOSTORE Customer Data Access & Privacy Audit — 2026-11-12

Repository: `chixradzezauri-design/geostore`
Branch: `fix/admin-panel-audit-2026-11-10`
Audited branch HEAD before this report: `361b5eb751ea6515f9866a9fea645692d9fbe6b1`

## Scope

Read-only Production inspection of grants, RLS policies, RLS enablement, customer order/history RPCs, order tracking RPC, notification RPCs, and frontend request paths in `src/App.jsx`. No Production data, schema, grants, Auth users, or Storage objects were changed.

## Verified protections

1. **Orders are not publicly readable.** Production grants table-level SELECT on `public.orders` to `authenticated`, but not `anon`. RLS is enabled. Its only SELECT policy is restricted to the trusted primary admin: `app_metadata.role = 'admin'` and fixed Auth UID `1060de3d-d28a-45f8-9a64-5e0368cffc4b`. There is no customer or anonymous direct-table SELECT policy.
2. **Customer order history uses a narrow RPC.** `public.get_my_orders()` is executable by authenticated users only and delegates to `private.get_my_orders()`. The private function is `SECURITY DEFINER`, has an empty `search_path`, filters strictly by `o.user_id = auth.uid()`, and returns only order ID, date, total, status, items, and status-change timestamp. Item JSON removes procurement cost, vendor/supplier, margin, and profit fields before returning it.
3. **The browser uses the correct customer RPC.** `src/App.jsx` posts to `/rpc/get_my_orders` with an authenticated session; it does not directly query the orders table for customer order history. Admin order loading uses the direct table endpoint, which is protected by the admin-only RLS policy, and checks the active admin session during pagination.
4. **Guest order tracking returns a limited summary.** `lookup_order_for_tracking` is executable without login because it is the guest tracking path. It requires both an order ID and normalized phone match, bounds input lengths, rate-limits by independently hashed phone and order identifiers (10 attempts per 15-minute window), and returns only order ID, total, status, date, and a short product summary. It does not return the stored phone, email, address, or full order row.
5. **Order notifications are user-scoped.** The table has RLS enabled and forced. Its SELECT policy compares `recipient_user_id` to `auth.uid()`. The read RPC also filters by the authenticated UID and returns only notification ID, order ID, status, timestamps. The mark-read RPC updates only that same user's unread notifications.
6. **Chat and support data are not granted to anonymous users.** Production grants on `messages`, `support_tickets`, and `support_ticket_messages` are authenticated-only; their SELECT policies are restricted to the fixed primary admin. No anonymous SELECT grants or policies were found for these tables.
7. **RPC wrappers use a safe search path.** Public wrappers for customer order history, notifications, order tracking, and admin order operations set an empty `search_path`; privileged logic is delegated to the corresponding private functions.

## Findings / follow-up

- No verified anonymous or cross-customer read path was found in the audited order, notification, chat, or support surfaces.
- `public.orders` has RLS enabled but not FORCE RLS. Client API roles remain subject to RLS; table-owner/service-role bypass is expected for trusted server-side operations. No change is recommended without a separate owner-role/backup review.
- Guest tracking is intentionally a phone-plus-order-code verification flow, not full account authentication. Keep the rate limiter and limited response shape; do not expand its response with customer contact/address fields.
- Existing authenticated table-level SELECT on orders is necessary for the admin panel's current direct REST fetch and is constrained by the admin-only RLS policy. Do not revoke it without replacing the admin fetch path.

## Conclusion

No proven Production data-exposure defect was found in the checked customer-data paths. No speculative migration was created. Preserve the current narrow RPC responses and UID-scoped policies.

## Release safety

Documentation-only change on the audit branch. No Production migration, data/privilege change, deployment, PR merge, or promotion was performed.
