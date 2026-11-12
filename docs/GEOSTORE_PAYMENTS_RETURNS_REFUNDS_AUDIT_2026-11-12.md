# GEOSTORE payments, returns and refunds audit — 2026-11-12

## Scope and safety

Read-only audit of the Production Supabase schema/catalog and the maintenance branch `fix/admin-panel-audit-2026-11-10`. Reviewed the checkout submission path, customer order/status UI, deployed database object names, and repository Edge Function inventory.

No Production data, schema, grants, policies, Storage objects, secrets, or settings were changed. No test order, payment, cancellation, return, or refund was performed. No migration, merge, deployment, or promotion was run. No customer/order contents were queried.

## Verified current behavior

### 1. Checkout is order creation, not payment capture

- The browser submits to `/rest/v1/rpc/create_order_with_stock` and validates the server-confirmed order response.
- After the RPC returns a valid order ID and total, the frontend displays order confirmation. The inspected path contains no payment-provider redirect/session, payment intent, card form, provider SDK invocation, or payment callback.
- The live checkout RPC calculates authoritative pricing and deducts stock transactionally when creating the order. Therefore an order can exist and stock can be deducted without any evidence that money was collected.
- The checkout/order model must not be interpreted as a verified paid transaction.

### 2. Production payment data model is absent

- The live `public.orders` columns include customer/contact fields, items, total, status, checkout request/result, and stock deduction/restoration timestamps.
- There is no dedicated payment method, payment status, provider, provider transaction/reference ID, paid timestamp, payment attempt, or reconciliation field.
- No public payment/refund/return table or corresponding named public/private database RPC was found in the live schema catalog.
- The repository's Supabase Edge Function inventory contains `admin-announcements`, `product-reviews`, and `support-attachments`; no payment-provider or refund webhook function was found.
- No TBC/Bank of Georgia/Stripe/PayPal payment integration was found in the inspected checkout frontend path. This is a code/schema finding, not a claim about uninspected external merchant accounts or environment secrets.

### 3. Cancellation is not a refund

- Existing order cancellation is an inventory workflow: the stock ledger markers and cancellation RPC restore stock transactionally and protect against duplicate restoration.
- This does not initiate a bank/card refund, confirm that money was returned, or create a financial refund record.
- The order status workflow is delivery/fulfilment-oriented. It has no separate verified `paid`, `refund_pending`, `partially_refunded`, or `refunded` payment lifecycle.
- The customer-facing order tracking text explains that delivery progress is updated from the admin panel; it does not offer a return/refund request flow.

### 4. Returns and refunds infrastructure is absent

- No dedicated return request table, return item/quantity record, reason/evidence fields, inspection state, refund ledger, refund provider reference, or return/refund RPC was found in Production.
- No dedicated return/refund Edge Function was found in the repository.
- No workflow was found for partial returns, partial refunds, restocking returned items, damaged-item disposition, shipping-fee treatment, refund idempotency, or refund audit trail.
- Support tickets/messages exist, but a support conversation is not a structured return/refund record and should not be treated as one.

## Risk and required design decisions

1. **Do not label an order as paid** until a server-verified payment-provider event or trusted reconciliation establishes payment.
2. Before enabling online card payments, choose the provider and agree the business flow. The implementation needs server-side payment session creation, signed webhook verification, strict order/amount/currency binding, idempotent event handling, replay protection, explicit payment-state transitions, and a defined stock reservation/expiry strategy.
3. Before enabling returns/refunds, define eligibility windows, item/quantity rules, evidence/reason handling, delivery-fee policy, partial-refund calculations, restock/disposition rules, authorization, and customer/admin notifications.
4. Refund execution must be server-side and idempotent, with provider reference, amount/currency, actor, timestamps, and immutable audit history. A cancellation or admin status change must never be mistaken for a refund.
5. Reconcile the existing migration-history/source gaps and establish a verified backup/release plan before any Production schema change. Do not bulk-apply staged migrations.

## Outcome

The existing checkout/order/stock workflow is present and server-controlled, but the reviewed Production schema and checkout code do **not** provide verified online payment capture, a payment ledger, a structured return flow, or a refund workflow. No defect fix was staged because implementing these capabilities safely requires a chosen payment provider and explicit return/refund business rules; inventing either would risk customer funds and order/stock integrity.

No Production changes, test orders, payment attempts, refunds, migrations, deployments, merges, or promotions were performed.
