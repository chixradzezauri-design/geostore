# GEOSTORE account-linked customer support ticket history audit — 2026-11-12

## Scope
Implemented and reviewed an authenticated customer's own support-ticket history list, ticket status summary, and secure open-from-list flow.

Repository: `chixradzezauri-design/geostore`
Branch: `fix/admin-panel-audit-2026-11-10`

## Confirmed limitation before this stage
- Customers had to manually enter a ticket number to reopen an existing conversation.
- There was no account-linked support-request history list.
- The ticket creation RPC already binds a ticket to `auth.uid()` when a customer is authenticated.
- Guest tickets and older tickets without an immutable account UUID cannot safely be added to a per-account list merely by matching an email address.

## Changes made

### Secure database RPC
Added `supabase/migrations/20261112170000_add_authenticated_customer_support_ticket_list.sql`:
- Adds `public.get_my_support_tickets(integer)` as a SECURITY DEFINER function with an empty search_path.
- Requires a non-null `auth.uid()`; anonymous calls are denied.
- Filters strictly by `support_tickets.customer_user_id = auth.uid()`.
- Does not use email matching, ticket number input, guest access tokens, or broad RLS/table access to enumerate records.
- Returns only ticket ID, subject, status, creation time and latest message time. It does not return message contents, customer email, customer name, attachment paths or private access tokens.
- Caps the result at 50 rows.
- Revokes execution from PUBLIC and anon; grants execution only to authenticated.

### Customer interface
- Added a localized “ჩემი მიმართვები” / “My support requests” section for signed-in customers.
- Displays subject, ticket number, status and latest update time.
- Adds an “Open conversation” action that loads the selected ticket through the existing owner-checked message/status RPCs. The list itself does not grant conversation access.
- Refreshes the list every 30 seconds and when the app becomes visible.
- If the new database RPC is not installed yet, the UI explicitly says the feature will appear after the support update is installed instead of incorrectly claiming the account has no tickets.
- Guest customers retain the existing ticket-number plus private-code workflow.

### Regression coverage
Extended `tests/supportTicketAuthorization.test.js` to assert:
- UUID-only ownership filter;
- authentication required;
- authenticated-only execute grant and anon/PUBLIC revoke;
- no email-based enumeration.

## Legacy ticket handling
- The list intentionally includes only records with `customer_user_id = auth.uid()`.
- Older guest tickets or tickets created before account binding are not silently claimed based on matching email.
- Existing signed-in email matching remains available for manually opening an individually known ticket through the existing owner-checked RPC; it does not expand the new account history list.
- No attempt was made to infer or rewrite ownership for old records.

## Data preservation and production safety
- No support tickets, messages, attachments, orders, products, users or other business data were modified or deleted.
- No Production SQL migration, Storage operation, customer message, test ticket, merge, deployment or Production promotion was performed.
- The new RPC migration is staged on the audit branch only. The account history UI will work after the code and migration are deployed together.

## Verification limits
- Re-fetched the changed source files, migration and test file from the target branch after updates.
- Static test assertions were added and inspected, but the test suite was not executed.
- No `npm test`, `npm run build`, browser E2E, live customer-account flow or Production migration was run.
- No current-head GitHub Actions workflow run was returned. Build/test success is therefore **not claimed**.

## Next recommended stage
Audit the customer-facing support status and unread indicators against the actual deployed schema and admin inbox behavior, then verify the account-linked history on a non-Production test environment once a safe test environment and deployment are available.
