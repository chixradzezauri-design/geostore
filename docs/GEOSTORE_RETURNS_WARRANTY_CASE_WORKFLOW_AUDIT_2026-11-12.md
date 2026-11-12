# GEOSTORE customer returns and warranty request workflow audit — 2026-11-12

## Scope and safety

Reviewed the customer-facing warranty policy modal, support-ticket intake and conversation flow, admin support-ticket processing UI, and read-only Production schema/catalog metadata.

No Production rows or customer/order contents were read. Only aggregate counts and schema metadata were queried. No Production data, schema, grants, policies, Storage objects, secrets, or settings were changed. No test return, warranty claim, support ticket, order, or message was created. No migration, merge, deployment, or promotion was run.

## Findings

### 1. Warranty information exists, but a warranty claim workflow does not

- The storefront contains a `Warranty policy` modal.
- Its text says warranty availability, duration, and service conditions depend on the individual product and must be stated on the product page or confirmed by the seller before purchase.
- The modal is informational only. It has no claim submission, order/product selector, purchase date, defect description, evidence upload, claim status, or case tracking.
- The reviewed order/product schema has no dedicated warranty registration/claim fields or warranty case table.

### 2. Generic customer support is available

- Customers can submit a general support ticket with name, optional email, optional subject, and free-text message.
- The intake path creates a secure ticket ID and one-time access token, stores only the access-token hash, and uses an idempotent request ID for retry safety.
- The customer is shown the ticket ID and access code once and can reopen the conversation using them.
- The customer conversation supports text and attachment-aware replies. The initial ticket form itself does not collect a structured order ID, product ID, item/quantity, return reason, warranty/return category, purchase date, or initial evidence attachment.
- Consequently, customers can describe a return or warranty problem in free text, but the system does not recognize it as a structured return/warranty case.

### 3. Admin support handling exists, but it is not a return/warranty case manager

- The admin panel lists support tickets, shows customer-submitted details, supports the statuses `ღია`, `მუშავდება`, and `მოგვარებული`, and provides the full conversation history.
- Admin replies support image attachments; the UI explicitly states that this reply action does not send an email.
- Tickets are intentionally not deleted from the admin UI to preserve conversation history.
- No dedicated return/warranty queues, product/order linkage, eligibility checks, inspection outcome, replacement decision, repair tracking, refund decision, return shipping label, stock disposition, or immutable case-event history were found.

### 4. Production schema and aggregate snapshot

- Production has `support_tickets` and `support_ticket_messages`, but no dedicated `returns`, `return_items`, `warranty_claims`, or `warranty_events` tables.
- The support ticket schema stores customer name, optional email, subject, initial message, status, reply, creation time, optional customer user ID, access-token hash, and idempotency request ID.
- The order schema does not contain a return or warranty lifecycle.
- Aggregate-only live counts at audit time: 3 support tickets, 5 support messages, and 1 order. Ticket statuses: 1 `ღია`, 2 `მოგვარებული`. No ticket or order content was accessed.

## Risks and recommendations

1. Keep the existing support-ticket system intact; it is useful for general questions and should not be replaced or cleared.
2. Add a distinct structured return/warranty case workflow linked to the original order and exact order-item snapshot, rather than relying on free-text subject/message.
3. Capture case type (return, exchange, repair, warranty), order ID, product/item, quantity, reason, description, requested outcome, relevant dates, and evidence attachments. Validate ownership/guest access server-side.
4. Use explicit states such as submitted, under_review, awaiting_customer, approved, rejected, item_in_transit, received, inspection, replacement_or_repair, refund_pending, completed. Keep these separate from delivery order status and payment status.
5. Preserve an append-only case history with actor, timestamp, previous/new state, decision reason, and references to any refund/replacement. Restrict state changes to authorized server-side RPCs.
6. Define eligibility periods, product-specific warranty terms, exclusions, shipping responsibilities, inspection rules, and refund/replacement outcomes before implementing business logic.
7. Never treat a support-ticket status of `მოგვარებული` as proof that a product was returned, repaired, replaced, or refunded.

## Outcome

The current site provides a warranty policy notice and a generic support conversation system, but it does **not** provide a structured customer return or warranty claim workflow or a dedicated admin case-management process. No source-code fix was staged because the new workflow needs agreed return/warranty policy and case-state rules. The existing support and messaging data should remain untouched.

No Production changes, test tickets, returns, warranty claims, refunds, migrations, deployments, merges, or promotions were performed.
