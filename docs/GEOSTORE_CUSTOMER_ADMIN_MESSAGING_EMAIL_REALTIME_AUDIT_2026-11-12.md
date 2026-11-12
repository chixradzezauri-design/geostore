# GEOSTORE — Customer/Admin Messaging, Email & Realtime Delivery Audit
**Date:** 2026-11-12  
**Repository:** `chixradzezauri-design/geostore`  
**Branch:** `fix/admin-panel-audit-2026-11-10`  
**Starting branch HEAD:** `37647168e59bedbb38712ebfab7ae2385454c4dc`

## Scope and safety
Reviewed customer support-thread flow, legacy `public.messages` admin inbox, admin support replies, customer order notifications, Realtime subscriptions/publication, polling/visibility recovery, announcement Edge Function source, and live migration/function inventory. Production SQL was read-only and limited to schema/function definitions, publication membership, and aggregate counts. No message bodies, customer names, email addresses, phone numbers, tokens, or other message/customer contents were queried. No test messages, emails, orders, or other mutations were sent. No Production configuration, data, migration, or deployment was changed.

## Executive findings
1. **No store-operational email delivery path was found in the reviewed application/backend source.** Admin support replies are persisted in the support thread; the UI explicitly tells the administrator that this action does not send an email. The `admin-announcements` Edge Function source only implements authenticated customer-recipient directory lookup (`list-recipients`); it does not send announcements or email. No SMTP, Resend, SendGrid, Postmark, Mailgun, or equivalent mail-dispatch implementation was found in the reviewed source. Supabase Auth email confirmation/password-reset calls exist, but these are account-authentication emails, not order/support notifications.
2. **Customer support conversations have Realtime plus a 15-second recovery poll.** Customer and admin subscribe to `public.support_ticket_messages`; the admin also subscribes to `public.support_tickets`. Reconnect events trigger a fresh read. Customer thread refresh is protected against overlapping requests and retries a queued refresh when an event arrives during an in-flight read. Admin also polls ticket/thread data every 15 seconds and refreshes when the page becomes visible.
3. **Legacy `messages` are admin-facing only in the inspected UI.** The admin inbox subscribes to Realtime and polls every 15 seconds. Its UI labels these as existing `messages` records. The inspected customer-facing flow creates support tickets and ticket-thread messages; no active customer send path to the legacy `messages` table was found.
4. **Order-status notifications are in-app only and only for Auth-owned orders.** The live trigger returns without creating a notification when `orders.user_id` is NULL. Notifications are scoped to `recipient_user_id`, protected by RLS, and delivered to signed-in customers through Realtime with a 30-second poll and visibility refresh. Guest orders therefore do not receive this account-inbox notification; no email fallback was found.
5. **Realtime publication currently includes all five relevant tables:** `orders`, `order_notifications`, `messages`, `support_tickets`, and `support_ticket_messages`. This confirms publication membership, not guaranteed browser connectivity at every moment; the polling/visibility fallbacks are important.
6. **Staged support enhancements are not fully live.** The current Production migration ledger does not include the branch's support read-receipt and attachment migrations. Production `support_ticket_messages` currently has no attachment columns (confirmed in the separate support audit). These staged features must be deployed together with their matching Edge Function/storage setup in a controlled release; they were not applied here.

## Live aggregate snapshot
Read-only Production counts at audit time:
- `public.messages`: **14**
- `public.support_tickets`: **3**
- `public.support_ticket_messages`: **5** (3 customer-authored, 2 admin-authored)
- `public.order_notifications`: **0**

The zero order-notification count is consistent with the separately observed single Production order being guest-owned; it does not prove that the notification trigger is broken. No row contents were read.

## Detailed flow review

### Support ticket conversation
- Customer thread uses `fetchSupportTicketMessages`, attachment URL resolution where available, and `markSupportTicketMessagesRead`.
- Customer subscribes to `support_ticket_messages` filtered by ticket reference; it refreshes on `SUBSCRIBED`, message events, a 15-second interval, and tab visibility changes.
- Admin subscribes to all `support_ticket_messages` and `support_tickets` changes, refreshes the selected thread/ticket list, and has a 15-second poll/visibility fallback.
- Admin reply uses `add_support_ticket_message_idempotent` (or the attachment upload flow) and then reloads the thread and ticket list. The success message explicitly says email is not sent.
- The current staged branch contains read-receipt and private-attachment migrations, but Production migration history does not yet show these enhancements as applied. Do not assume staged features are live.

### Legacy messages inbox
- Admin reads the existing message rows through the existing authenticated/RLS-protected REST path.
- Realtime subscription and a 15-second poll both refresh the admin list.
- The customer-facing source inspected in this audit uses the newer support-ticket thread; no active customer submission to the legacy `messages` table was identified.
- Existing rows are preserved; this audit did not alter or delete them.

### Order notifications
- Database trigger `private.record_order_notification()` inserts an in-app notification on order creation/status change only when `NEW.user_id` is non-NULL and status is non-empty.
- Customer notification RPCs are `get_my_order_notifications` and `mark_my_order_notifications_read`; the table's SELECT policy scopes rows to `auth.uid() = recipient_user_id`.
- The client subscribes to `order_notifications` filtered by the signed-in user's UUID, reloads on reconnect/events, polls every 30 seconds, and refreshes on visibility change.
- Guest orders have no account inbox and no email notification fallback in the reviewed implementation.

### Email and announcement dispatch
- Supabase Auth confirmation and password reset use the Supabase Auth client; this is not evidence of order or support email delivery.
- The repository's `admin-announcements` function accepts only `list-recipients` and returns eligible Auth users. No dispatch/send action is implemented in that function source.
- The admin support reply success text itself confirms that the reply is stored in the support conversation without sending email.
- The Supabase Edge Function inventory API returned an empty function list during this audit. This means no deployed Edge Function was confirmed through that listing; it is not treated as proof that no external mail service or provider account exists.
- No provider secrets or environment-variable values were accessed.

## Defects / gaps and disposition
- **Confirmed functional gap:** no verified operational email dispatch for new orders, order-status changes, customer support intake, or admin replies. As a result, customers must rely on the site/account inbox or revisit the support thread; guest customers have no account notification inbox. This is a feature gap, not a failed email delivery incident.
- **Scope limitation:** the audit cannot confirm any external provider configured outside the repository/Supabase project. No secrets were read.
- **No safe code-only fix applied:** adding email delivery requires the owner's provider choice, sender/domain verification, secret configuration, event/recipient rules, retry/idempotency, bounce/error handling, and privacy/consent policy. Implementing a guessed provider or sending real mail without those decisions would be unsafe. Prepare this as a separate staged feature after the provider and notification rules are chosen.
- No evidence justified modifying the existing Realtime subscriptions or polling intervals. Their fallback paths are present, and no live delivery failure was established by read-only inspection.

## Release / safety status
- Report-only commit; no application source, schema, Production rows, secrets, or deployment changed.
- No Production migrations applied; no Edge Functions deployed; no PR merged; no Production promotion.
- No build, browser E2E, or live message-send test was run. No CI/build pass is claimed.

## Recommended next stage
Audit the remaining customer communication experience end-to-end: support intake visibility, ticket ownership/lookup UX, unread indicators/read receipts, and admin response workflow. Separately, once the owner chooses an email provider and sender domain, design an idempotent transactional email outbox/dispatcher for order and support events without changing existing message/order records.
