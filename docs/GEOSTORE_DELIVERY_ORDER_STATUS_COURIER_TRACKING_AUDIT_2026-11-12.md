# GEOSTORE delivery, order status and courier tracking audit — 2026-11-12

## Scope and safety

Reviewed the customer checkout/order-tracking UI, account order-history and notification refresh logic, admin order-status workflow, delivery-fee configuration, and read-only Production schema/function/trigger metadata.

Only aggregate counts and schema/function metadata were queried in Production. No customer/order content or personal data was read. No Production rows, schema, grants, policies, Storage objects, secrets, or settings were changed. No test order, delivery, notification, or courier event was created. No migration, merge, deployment, or promotion was run.

## Verified functionality

### 1. Delivery fee calculation and checkout

- Delivery fees are stored in `public.store_delivery_fees` and editable by the admin panel.
- Three configured regions exist: Tbilisi — 0 GEL; major cities — 10 GEL; other locations — 15 GEL.
- Checkout re-fetches the current delivery-fee and coupon settings before order submission, calculates the authoritative amount server-side, and asks the customer to reconfirm if the fee changed during checkout.
- The order address field stores the entered address together with the selected region and delivery fee as a combined text value. There are no separate structured delivery-region, latitude/longitude, delivery window, courier, carrier, or shipment tracking-number columns.

### 2. Order status lifecycle

- Admin can set the supported server-side statuses: `ახალი`, `მუშავდება`, `გაგზავნილი`, `დასრულებული`, and `გაუქმებული`.
- Server-side RPC checks the fixed primary-admin identity and trusted app_metadata admin role, locks the order row, and validates status transitions.
- A shipped order cannot be rolled back or cancelled through the normal status path. A delivered order cannot be moved backwards. A cancelled order requires the protected reactivation workflow with fresh password authentication and stock reconciliation.
- Cancellation restores stock transactionally and idempotently. This is an inventory operation, not proof of delivery or a courier event.
- A database trigger automatically updates `status_changed_at` when the status changes.
- There is no separate immutable per-step delivery event history; the order stores the current status and last status-change timestamp.

### 3. Customer tracking

- Guest customers can look up an order using its order code and phone number.
- The lookup runs through a server-side function, normalizes the inputs, compares the order code and phone, and returns a minimized response: order ID, total, current status, order date, and item summary.
- Lookup attempts are rate-limited independently by hashed phone and hashed order code: maximum 10 attempts per 15-minute window for each key.
- The UI displays a four-step progress bar: accepted, preparing, on the way, delivered.
- The tracking UI explicitly informs customers that courier GPS is not connected and that status is updated by the admin panel. There is no live map, courier location, ETA, carrier link, or external tracking number.

### 4. Account order history and notifications

- Signed-in customer order history is fetched through a user-scoped RPC. It refreshes on Realtime-driven events, tab visibility, and a 30-second fallback interval.
- Admin order list subscribes to order Realtime changes and also refreshes every 15 seconds as a recovery path.
- Order status notifications are created by a database trigger only when `orders.user_id` is non-NULL. Customer notification reads are scoped to the authenticated recipient.
- The notification table and Realtime subscription provide in-app notifications. The inspected trigger only inserts a database notification; no email/SMS dispatch or external courier notification integration was found in the reviewed path.
- Guest orders do not have a linked account recipient, so they rely on the secure order-code + phone lookup rather than the signed-in notification feed.

## Production aggregate snapshot

At audit time:
- Orders: 1, status `გაუქმებული`, guest-owned (no linked account user).
- Order notification rows: 0.
- Delivery-fee configuration rows: 3 (Tbilisi 0 GEL, major cities 10 GEL, other 15 GEL).

These are aggregate counts only; no order contents, phone numbers, addresses, or customer identities were queried. The zero notification count is consistent with the current single guest-owned order and the trigger's explicit `user_id IS NOT NULL` condition; it is not evidence of a broken notification trigger.

## Risks and recommended next improvements

1. **Courier integration is absent.** If the business needs real tracking, first choose a carrier or courier partner and confirm its API, credentials, webhook/event model, and operational process. Do not display a fabricated map or ETA.
2. **Delivery metadata is unstructured.** Consider adding separate delivery region, recipient/contact snapshot, preferred delivery window, courier/carrier, shipment reference, and delivery instructions while preserving the existing address field and all historical order snapshots.
3. **Status event history is limited.** Add an append-only delivery/order status event ledger with actor, timestamp, previous/new status, source (admin, carrier webhook, system), and optional note. Do not rewrite old order rows or infer historical delivery events.
4. **Notifications are in-app only in the reviewed implementation.** If email/SMS is required, choose a provider and implement server-side delivery, retry/idempotency, consent/preferences, and delivery logs. Keep customer PII out of public Realtime payloads.
5. **Guest tracking is protected by ID + phone and rate limits.** Preserve the minimized response and hashed rate-limit keys; do not expose full addresses, email, internal notes, or other orders.
6. **Do not equate `გაგზავნილი` with carrier-verified pickup, nor `დასრულებული` with payment settlement.** Those events need separate verified records if the business requires that assurance.

## Outcome

The existing checkout delivery-fee calculation, admin-managed order statuses, secure guest tracking, account order history, and in-app notifications are present. The reviewed code explicitly discloses that courier GPS is not connected. No proven defect was found that justified a safe narrow source fix in this pass; courier GPS, structured shipment metadata, and delivery event history are additional capabilities requiring a chosen courier and agreed workflow.

No Production changes, test orders, courier calls, migrations, deployments, merges, or promotions were performed.
