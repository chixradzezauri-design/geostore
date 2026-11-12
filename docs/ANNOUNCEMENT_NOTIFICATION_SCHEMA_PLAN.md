# GEOSTORE announcement notification storage plan

Date: 2026-11-11
Branch: `fix/admin-panel-audit-2026-11-10`
Status: design only; not applied to the database

## Live schema findings

- `public.order_notifications` is a separate order-event table with `recipient_user_id`, `created_at`, and per-recipient `read_at`. Its existing customer read path is `get_my_order_notifications()`; its existing mark-read path is `mark_my_order_notifications_read()`.
- Both order RPC implementations live in `private` with empty `search_path`; public wrappers delegate to them. The read RPC requires `auth.uid()` and returns at most 100 notifications for that UID. The mark-read RPC updates only rows whose `recipient_user_id = auth.uid()`.
- The order notification table has an RLS SELECT policy restricting customers to their own `recipient_user_id`. No INSERT/UPDATE/DELETE customer policies were found.
- `public.messages`, `public.support_tickets`, and `public.support_ticket_messages` are separate tables with RLS enabled and existing admin/customer policies. They must not be reused for announcements.
- The current live migration history does not contain an announcement storage migration. No announcement table exists in the live schema.
- The existing localStorage key `geostore_broadcasts` is only a device-local test store and must remain readable and untouched.

## Recommended persistent model

Use two new, purpose-specific tables; do not alter `order_notifications` or support/message tables.

1. `public.announcements`
   - `id uuid primary key default gen_random_uuid()`
   - `title text not null` with a strict non-empty and maximum-length constraint
   - `body text not null` with a strict non-empty and maximum-length constraint
   - `created_by uuid not null` (the trusted primary-admin Auth UID)
   - `created_at timestamptz not null default now()`
   - `sent_at timestamptz not null default now()`
   - No client-editable status or arbitrary HTML field. Store plain text and render it as text.

2. `public.announcement_recipients`
   - `announcement_id uuid not null references public.announcements(id) on delete cascade`
   - `recipient_user_id uuid not null` (immutable Auth UID; avoid storing email as identity)
   - `created_at timestamptz not null default now()`
   - `read_at timestamptz null`
   - Composite primary key `(announcement_id, recipient_user_id)`
   - Index for a recipient's newest announcements, e.g. `(recipient_user_id, created_at desc)` or a recipient/announcement join index appropriate to the final query.

Recipient rows are a dispatch-time snapshot. Accounts created later receive no older announcement. Each recipient's `read_at` is independent. Keep deleted-account retention behavior explicit when finalizing the foreign-key policy; do not silently cascade away historical delivery evidence without a product decision.

## Access and transaction design

- Enable RLS on both tables. Revoke direct `anon` and `authenticated` table privileges; grant only the minimum server-side role access required. Do not expose Auth user directory data through table policies.
- Browser customers should use dedicated customer RPCs only. A customer read function must require non-null `auth.uid()` and return only announcements joined through recipient rows for that UID. The mark-read function must update only the caller's own recipient row, and should be idempotent.
- Keep privileged database implementations in the non-exposed `private` schema with empty `search_path`; expose only narrow wrappers where the browser needs them. Any `SECURITY DEFINER` routine needs an explicit identity/ownership check and least-privilege EXECUTE grants. Do not rely on `TO authenticated` alone.
- The Edge Function independently verifies the bearer token with Auth, checks the fixed primary-admin UID and trusted `app_metadata.role = 'admin'`, validates title/body and audience mode, and resolves the recipient IDs against the server-side Auth directory. Exclude admins and anonymous users.
- Dispatch must be one database transaction: create the announcement and insert its complete recipient snapshot atomically, returning the exact inserted recipient count. If any validation or insert fails, roll back both. Do not create an announcement row and recipient rows in separate REST requests.
- Restrict the privileged dispatch RPC to the server role used by the Edge Function; revoke default PUBLIC/anon/authenticated EXECUTE. The Edge Function remains the authorization boundary for the calling administrator; never put a service-role key in the browser.
- Enforce a documented maximum audience size and reject malformed, duplicate, empty, or stale selected IDs. For the all-users mode, resolve and snapshot the directory at dispatch time. Preserve the draft and selected audience in the UI when dispatch fails.
- Realtime may notify the client that its own recipient row was inserted, but it is an optimization only. Customer retrieval and read updates must remain protected by database authorization. Keep a refresh fallback.
- Merge announcement items into the customer notification view as a separate notification type. Preserve the current order notification RPC behavior and rendering unchanged; do not reinterpret order events as announcements.


## Dispatch request validation and duplicate-send protection

- The Edge Function must require a client-generated UUID `requestId` for each intentional send attempt. A network retry must reuse the same ID; a new intentional announcement must use a new ID.
- Persist this key in the same transaction as the announcement, protected by a UNIQUE constraint. Store a canonical payload digest alongside it. If the same key and same digest are retried, return the original announcement ID and recipient count without inserting or delivering a second announcement. If the key is reused with a different digest, return a conflict and do not send.
- Compute the digest on the server from normalized title, body, audience mode, and the canonical sorted recipient UID set (or a stable all-audience snapshot identifier). Do not trust a client-provided digest. The all-audience snapshot must be resolved once per idempotent request; a retry must return the original result rather than resolve a changed directory.
- The dispatch transaction must acquire/insert the idempotency record under a unique constraint before creating recipient rows. Concurrent requests with the same key must converge on one result; database uniqueness/transaction locking, not a frontend disabled button, is the protection.
- Server validation groundwork is now staged in `supabase/functions/admin-announcements/validation.js`: UUID request ID, non-empty plain text, title max 120 characters, body max 5,000 characters, explicit audience mode, selected account UUID validation, duplicate rejection, and a 500-recipient cap for selected mode. This helper is not yet wired to a send action and does not authorize recipients; the Edge Function must still resolve and validate every UID against Auth Admin.
- The 500-recipient cap is an explicit bounded operational limit for the initial dispatch endpoint. If product requirements later need larger targeted audiences, design a paginated server-side selection flow rather than raising request limits without review.
- Focused tests were added in `tests/adminAnnouncementDispatchValidation.test.js`; they have not yet been executed in the repository's declared Node 24 environment.

## Data API / migration compatibility

- The current Supabase guidance distinguishes table grants from RLS: both must be correct. The migration must explicitly grant only the roles needed and enable RLS.
- Supabase's current Data API exposure defaults are changing; do not assume a new public table or function is automatically reachable. Check project Data API settings and explicitly grant only required privileges.
- Create any migration using the Supabase CLI's `supabase migration new <name>` workflow; do not invent a timestamp filename. The current working environment has no verified local Supabase CLI/repository checkout, so this design does not create or apply a migration.
- Before release, run advisors, inspect all grants/policies/function definitions, test cross-account isolation and idempotent read state, then deploy the migration and matching Edge Function together with the frontend.

## Safety / verification boundary

- Read-only live checks only. No table, policy, function, grant, Auth user, order, message, support ticket, or notification row was changed.
- No announcement was sent. The local test key and warning remain unchanged.
- No migration was created or applied, no Edge Function deployed, no build/deploy run.
- PR #87 remains Draft and unmerged. Production release remains deferred until the complete admin audit is finished and the user explicitly approves the combined release.


## Canonical payload digest groundwork — 2026-11-11

- Added `supabase/functions/admin-announcements/digest.js` to compute a server-side SHA-256 digest from normalized title/body, explicit audience mode, and the exact resolved Auth UID snapshot.
- Recipient UIDs are lowercased, validated, deduplicated, and sorted before hashing. Reordering selected accounts therefore does not change the digest.
- Selected-mode resolved IDs must exactly match the validated selected IDs. All-users mode hashes the resolved directory snapshot, so an audience change produces a different digest.
- The helper rejects empty or oversized snapshots (hard safety ceiling 100,000) and does not accept a client-provided digest.
- Added focused tests in `tests/adminAnnouncementDispatchDigest.test.js` for stable ordering, content/mode/audience changes, all-user snapshot changes, and invalid/mismatched recipients.
- This remains pure validation/hash groundwork: it is not connected to a database idempotency record, does not resolve Auth users itself, and cannot prevent duplicate sends until the transactional DB migration and dispatch RPC are implemented and deployed together.


## Trusted recipient resolution groundwork — 2026-11-11

- Added `resolve-dispatch-recipients.js` to resolve the dispatch audience exclusively through Supabase Auth Admin.
- Selected recipients are checked individually with Auth Admin `getUserById`, with a bounded concurrency of 10. Missing, mismatched, anonymous, admin, or otherwise ineligible accounts fail closed.
- The all-users audience uses the paginated Auth Admin directory snapshot and existing eligibility filter; empty/error/over-limit directories fail closed.
- The helper returns only immutable Auth UIDs for hashing and the eventual transaction. Browser-supplied email/labels are never trusted.
- Added tests for selected lookup, invalid/ineligible accounts, concurrency bound, all-user pagination, and fail-closed behavior.
- This helper is not yet wired into the Edge Function. Dispatch remains unavailable until the database migration and atomic idempotent RPC exist.


## Transactional dispatch contract — 2026-11-11

This is the implementation contract for the future migration/RPC. It is deliberately documentation-only until a real Supabase migration workflow is available. It does not claim duplicate-send protection is active.

### Idempotency record

Add a dedicated private dispatch-request table (name to be finalized with the migration) with:
- `request_id uuid primary key` — global idempotency key supplied by the client for one intentional send.
- `payload_digest text not null` — exactly 64 lowercase hexadecimal SHA-256 characters, computed by the Edge Function from the normalized payload and resolved UID snapshot.
- `created_by uuid not null` — fixed trusted primary-admin Auth UID.
- `announcement_id uuid unique null` — populated in the same transaction after the announcement is inserted.
- `recipient_count integer null` — exact number of recipient rows inserted.
- `created_at timestamptz not null default now()`.

The nullable result columns exist only within the transaction: a successful RPC commits them populated. An exception rolls back the request row too. Do not commit a durable "processing" row in a separate transaction; that creates stale/incomplete request recovery complexity without improving atomicity.

### RPC transaction algorithm

1. The Edge Function authenticates the bearer token, verifies the fixed primary-admin UID and trusted `app_metadata.role`, normalizes input, resolves every recipient through Auth Admin, and computes the canonical digest. Browser-supplied digest, email, role, and recipient labels are never trusted.
2. Call one narrow server-only database RPC with request UUID, digest, trusted admin UID, title/body, and the resolved UID array.
3. In one PostgreSQL transaction, attempt to insert the idempotency row with `ON CONFLICT (request_id) DO NOTHING`.
4. Select that request row `FOR UPDATE`. The unique-key conflict makes concurrent calls with the same UUID wait for the first transaction to commit or roll back.
5. If the stored digest or creator differs, return a conflict and perform no writes. If `announcement_id` is already populated and the digest/creator match, return that original ID and stored count without inserting anything.
6. For a new request, validate the digest format, non-empty recipient array, maximum audience size, UUID shape, and duplicate-free UID set again in the database. The Edge Function remains responsible for confirming each UID is a real, eligible Auth account; SQL must not pretend a UUID alone proves account eligibility.
7. Insert exactly one announcement, then insert the complete recipient snapshot. Compare inserted row count with the validated array cardinality; any mismatch raises an exception and rolls back the announcement, recipient rows, and idempotency row together.
8. Update the idempotency row with the announcement ID and exact recipient count, then return those values. Commit is the only point at which the send record becomes visible.

### Concurrency and retry outcomes

- Same UUID + same digest, first transaction commits: every later retry returns the same announcement ID and recipient count; no second announcement or recipient set is created.
- Same UUID + different digest or creator: conflict; no new announcement is created.
- Two simultaneous requests with the same UUID: the unique constraint serializes them. The second reads the committed result after the first commits; if the first rolls back, the second can become the creator.
- Failure at any point before commit: all writes in that transaction roll back. The client may retry with the same request UUID and same payload.
- A genuinely new intentional announcement must use a new UUID, even if its text and audience happen to match an earlier send.
- The all-users UID snapshot is resolved once by the Edge Function for the first attempt. A retry with the same UUID must return the stored result and must not resolve a changed directory into a different audience.

### Privilege boundary

- Keep the privileged implementation in the non-exposed `private` schema with an empty `search_path` and fully qualified object names.
- The Edge Function calls it using the server-side service role only. Revoke EXECUTE from `PUBLIC`, `anon`, and `authenticated`; grant only the minimum required server role.
- Prefer `SECURITY INVOKER` where the service role's existing privileges are sufficient. Do not add `SECURITY DEFINER` merely to bypass a permission issue.
- If a narrow public-schema RPC wrapper is required for PostgREST routing, it must be non-callable by browser roles, delegate only to the private implementation, and have explicit least-privilege grants. Do not expose the dispatch RPC to customer sessions.
- RLS and table grants must be reviewed separately; neither substitutes for the other.

### Required database verification before wiring the send endpoint

- Repeated same-key/same-digest call returns exactly the same announcement ID and recipient count.
- Same key with changed title, body, mode, audience snapshot, or creator conflicts.
- Concurrent same-key requests produce exactly one announcement and one recipient row per eligible UID.
- A forced recipient insert failure leaves no announcement, recipient rows, or idempotency row.
- Duplicate, empty, malformed, and over-limit recipient arrays fail closed.
- Customer A cannot read or mark Customer B's announcement recipient row.
- Browser roles cannot execute the dispatch RPC or write either announcement table.
- Run Supabase security/performance advisors and inspect effective grants/RLS after migration.



## Live schema preflight — read-only inspection — 2026-11-11

Read-only inspection of the connected Supabase project confirmed:
- Project is ACTIVE_HEALTHY on PostgreSQL 17.11 (region us-west-2).
- The `private` schema exists and already contains unrelated internal rate-limit and admin-activity tables. New announcement dispatch objects must be independently named and must not reuse or modify those tables.
- No announcement-named table, function, or RLS policy currently exists in either `public` or `private`.
- Existing `public.order_notifications` is a separate order-status notification system. It must remain unchanged; announcement read state must live in separate announcement-recipient rows and dedicated customer RPCs.
- The remote migration history currently ends at `20261110133651` (`admin_update_product_with_stock`); no announcement schema migration is applied.
- The project has existing RLS-enabled public tables and existing private-schema protections. The new migration must explicitly set grants/RLS for every new object; do not infer safe access merely because the schema is named private.

### Migration-generation gate

The local environment was checked for the Supabase CLI and a repository checkout; neither is available. Per the Supabase workflow, a migration timestamp must be generated by `supabase migration new <name>` rather than fabricated. Therefore this stage records verified preflight facts only. It does not create a migration with a guessed timestamp, apply SQL, or alter the live project.

### Next implementation prerequisites

1. Restore a repository-backed Supabase CLI workspace and link it to the existing project without applying changes.
2. Generate the migration through the CLI, then review the generated timestamp/name and the exact SQL diff.
3. Create the announcement tables and narrowly scoped RPCs in the intended schemas, preserving `order_notifications` and all order/support data.
4. Apply only after the migration is reviewed and the user explicitly approves the database change; then run idempotency, concurrency, RLS isolation, grants, and rollback tests.


## Existing customer notification access pattern — read-only review — 2026-11-11

The current order-notification implementation was inspected to establish a safe compatibility boundary:
- `public.order_notifications` has a customer SELECT policy for `authenticated` where `recipient_user_id = auth.uid()`.
- Its private read/mark-read implementations explicitly reject a null `auth.uid()`, scope every read/update to the caller's own UID, return a bounded read result (100 rows), and use an empty `search_path`.
- Those private implementations are `SECURITY DEFINER`; the public RPC wrappers are `SECURITY INVOKER` SQL wrappers with an empty `search_path`. The current grants include authenticated users for those existing order-notification wrappers.
- This is an observed legacy pattern, not blanket permission to copy SECURITY DEFINER. Any announcement customer RPC must be reviewed independently for caller UID checks, strict recipient-row ownership, fixed object qualification, bounded reads, and minimum grants.
- Announcement dispatch remains a separate server-only operation; customer read/mark-read RPCs must never call or expose the privileged dispatch function.
- No existing order-notification table, policy, function, grant, or row was changed.


## Customer-facing announcement read / mark-read RPC contract — 2026-11-11

This stage defines the customer access contract separately from dispatch. It is documentation only; no SQL, grants, policies, or functions were changed.

### Read RPC

- Public PostgREST entry point: `public.get_my_announcements(p_limit integer default 50, p_before_sent_at timestamptz default null, p_before_announcement_id uuid default null)`.
- Require a non-null `auth.uid()`; fail closed for unauthenticated or anonymous sessions.
- Return only `public.announcements` rows joined to `public.announcement_recipients` where `recipient_user_id = auth.uid()`. Never accept a caller-supplied recipient UID.
- Return only the fields needed by the notification UI: announcement ID, plain-text title/body, sent timestamp, and that caller's `read_at`. Do not return creator metadata, recipient lists, email addresses, or dispatch/idempotency internals.
- Use a deterministic descending keyset cursor on `(sent_at, id)`; when a cursor is supplied, require both values and apply the strict tuple comparison. Order by the same pair. This prevents unstable pagination when new announcements arrive.
- Bound page size to 1–100 (default 50); reject invalid cursor/limit inputs rather than allowing unbounded reads.
- The recipient snapshot is authoritative: newly registered accounts without a recipient row do not see historical announcements.

### Mark-read RPC

- Public PostgREST entry point: `public.mark_my_announcement_read(p_announcement_id uuid)`.
- Require non-null `auth.uid()`; update only the row matching both the supplied announcement ID and `recipient_user_id = auth.uid()`.
- Set `read_at = coalesce(read_at, now())` so retries are idempotent and the original read timestamp is preserved.
- Return only a boolean indicating whether the caller is an actual recipient. Return false for an unknown ID or another user's announcement; never reveal whether another user has a matching row.
- Accept one announcement ID per call initially. A bulk mark-read API is unnecessary until the UI demonstrates a need.

### Function privilege and RLS boundary

- Revoke direct table access from `anon` and `authenticated`; enable RLS on both announcement tables and do not add broad customer table policies.
- Because direct customer table privileges are intentionally absent, the public wrappers may delegate to narrowly scoped private implementations. Keep wrappers `SECURITY INVOKER`, empty `search_path`, and fully qualified calls.
- If a private implementation must be `SECURITY DEFINER` to read/update the protected tables, make that decision explicit and narrowly: empty `search_path`; fully qualify every relation and function; reject null `auth.uid()`; hard-code ownership to `auth.uid()`; expose no dynamic SQL; revoke EXECUTE from `PUBLIC`, `anon`, and unintended roles; grant only to the wrapper owner/required role. Do not use the dispatch RPC from customer functions.
- Check effective privileges and function owners after creation. Do not assume private schema alone makes a function safe.
- Keep `public.order_notifications`, its policies, grants, and existing read/mark-read RPCs unchanged.

### UI integration and verification gates

- Render announcement notifications as a separate notification type; preserve all existing order-status notification rendering and actions.
- Realtime is optional. First implementation may refresh on notification-center open/focus and use a bounded polling/refetch fallback; do not make correctness depend on realtime delivery.
- Preserve the local-only `geostore_broadcasts` test data and its current warning; do not silently import or delete it.
- Test unauthenticated rejection; customer A sees only A's recipient rows; customer A cannot read or mark customer B's rows; repeated mark-read preserves the first timestamp; unknown/foreign IDs return the same false result; pagination has no duplicates or gaps while new announcements are inserted; page size is bounded; browser roles cannot directly select or mutate either table; dispatch remains inaccessible to customers.
- Do not connect the customer UI or enable sending until the migration, private functions, public wrappers, Edge Function, and frontend are reviewed and released as one coordinated change.

### Workspace blocker reassessment

- Supabase MCP connectivity is available for controlled database inspection, so the earlier assumption that no Supabase integration exists is no longer applicable.
- The execution container still has no Supabase CLI or repository checkout. An attempt to reach the npm registry to obtain the CLI failed at DNS resolution (`EAI_AGAIN registry.npmjs.org`); no package was installed.
- GitHub repository APIs remain available for source/documentation commits, but they do not replace the CLI's migration timestamp generation requirement. Do not fabricate a migration timestamp or use a Production DDL call as a workaround.
- Safe next route: restore an authenticated repository-backed CLI workspace, or obtain an explicitly approved isolated Supabase development branch and generate/apply/test the migration there. No paid/usage-incurring database branch was created in this stage.

