# GEOSTORE Order Lifecycle and Admin Delivery Audit — 2026-11-12

## Scope
Read-only Production review of order persistence, stock markers, status transitions, RLS and customer order notifications. No order rows, products, stock, notifications, or other Production data were changed. No test orders or status updates were created.

## Production findings
- `public.orders` contains 1 row.
- The only order is guest-owned (`user_id IS NULL`); there are 0 account-linked orders.
- That order has a stock deduction marker and a stock restoration marker; its status is cancelled. No order has a missing status or invalid/negative total.
- The order item payload is a non-empty JSON array; no invalid item payloads were detected by the aggregate check.
- `public.order_notifications` contains 0 rows; there are no orphan notification rows.
- This zero notification count is consistent with the live trigger: `private.record_order_notification()` intentionally returns without inserting when `NEW.user_id IS NULL`. The live order is a guest order, so the count alone does not establish a notification-trigger failure.
- RLS is enabled on both `orders` and `order_notifications`. Orders have a primary-admin SELECT policy and primary-admin UPDATE policy. Notifications have an authenticated-owner SELECT policy bound to `auth.uid() = recipient_user_id`.
- Live order triggers include authenticated owner binding, status-transition guard, notification recording on insert/status update, guest email validation, status timestamping, post-dispatch cancellation protection, and unpublished-product rejection.
- Status transition guard blocks changes after delivery, backward transitions after dispatch, and reactivation of cancelled orders except through the protected reactivation RPC with recent password authentication.

## Known customer-notification limitation
Guest orders have no Auth UUID, and the current notification trigger only records in-app notifications for orders with a non-null `user_id`. The existing application audit also found no configured transactional email delivery provider. Therefore, guest customers should not be assumed to receive automatic order-created/status-change notifications. This is a known capability gap, not a proven failure of the current trigger.

## Result
- No new Production defect requiring a safe immediate code change was confirmed in this pass.
- No Production mutation or deployment was performed.
- No code change was made because changing guest notification behavior safely requires a defined delivery channel (verified email provider or guest tracking/access flow), idempotent delivery and retry handling. It should not be improvised by writing notifications to unowned accounts.

## Next recommended stage
Review the full admin order detail and status-update UI against the live schema and protected RPC contracts, then add tests for guest-order communication expectations without creating Production test orders.
