# GEOSTORE audit log

Branch: `maintenance/storefront-draft-save-2026-11-06`
Repository: `chixradzezauri-design/geostore`

This file is the durable handoff log for staged audit work. Add new findings and fixes here rather than repeating completed checks. Reopen a completed item only when a new finding requires it.

## Completed / already reviewed

- Password hardening: 10-character minimum, mixed character classes, common-password checks and browser-side HIBP k-anonymity check are staged in the branch. Supabase's built-in leaked-password protection remains unavailable on the current Free plan.
- Public order tracking: privacy-limited response and staged rate limiting (10 attempts per phone/order key per 15 minutes); migration is staged, not applied to production.
- Guest checkout: staged request bounds and validation; migration is staged, not applied to production.
- Stock safety: staged non-negative stock constraint; production currently has no negative stock values.
- Order state transitions: staged migration adds DB-level transition guard and protects the order ledger from deletion. Migration is not applied to production.
- Financial reporting: staged UI changes distinguish historical cost-backed profit from estimated/unknown cost; no build or test run claimed.

## Admin security audit — 2026-11-07

### Verified in live Supabase

- All 10 public tables inspected have RLS enabled.
- Admin policies for finance, orders, products, coupons, storefront configuration/media/versions, support tickets and messages bind access to the primary admin Auth UID `1060de3d-d28a-45f8-9a64-5e0368cffc4b` and trusted `app_metadata.role = 'admin'`.
- Sensitive private admin RPCs use `SECURITY DEFINER`, empty `search_path`, and deny anon execution; the inspected RPCs require the primary admin identity/role in their function body.
- Frontend admin access is derived from server-verified Supabase Auth user and trusted `app_metadata`, not localStorage or URL flags.
- Staff/roles screen is explicitly a local planning list only. It does not create Auth users or grant server-side permissions. It must not be described as functional multi-user staff access.
- Live database check: anon has no DELETE grant on `public.orders`; authenticated has DELETE grant. The live RLS policy currently allows the primary admin to delete orders.
- Live database check: authenticated has no direct UPDATE grant on `public.orders`; status changes go through admin RPC.
- The staged migration `20261106200000_prevent_completed_order_status_rollback.sql` is not recorded in live `supabase_migrations.schema_migrations`; the status-guard trigger is absent in production. It includes the order DELETE grant/policy revocation, but is not yet applied.
- Security advisor's only current warning is Supabase leaked-password protection disabled (known Free-plan limitation).

### Required next actions

1. Keep the order-ledger DELETE restriction and order status trigger staged. Before applying any migrations, reconcile the full staged migration sequence with live migration history and review dependencies; do not apply a partial/out-of-order migration.
2. Continue inspecting every privileged admin function and its public wrapper, including EXECUTE grants, identity checks, input validation, and transaction boundaries.
3. Inspect storefront publish/draft and support-ticket mutation flows for authorization and auditability.
4. Decide separately whether to implement real server-backed staff accounts/permissions. Current UI is only local notes; do not enable it as an authorization mechanism.
5. Run automated tests and build only after the staged work is ready; avoid repeated Vercel builds.

## Safety boundaries

- No production schema/data changes were made during this audit step.
- No Vercel build or deployment was triggered.
- Do not claim tests passed unless they are actually executed.


## Admin security audit — continuation 2026-11-07

### Additional checks

- No `SECURITY DEFINER` functions exist in the exposed `public` schema; privileged implementations are in `private` and exposed only through SQL wrappers.
- No ordinary views were found in `public`; therefore no public view bypass of RLS was identified.
- `public.products` has column-level SELECT grants for anon/authenticated even though the table-level SELECT privilege check is false. This is intentional/functional for the public catalogue; do not interpret the table-level result alone as a storefront outage.
- Sensitive mutation grants checked: anon has no UPDATE/DELETE on support tickets or storefront configuration/media; authenticated has grants, but RLS policies bind writes to the primary administrator UID and trusted app_metadata role.
- Support-ticket public INSERT is intentionally allowed with field-length/status/reply constraints. No server-side rate limiter was identified for this public submission path; abuse protection remains a follow-up item.
- Admin activity log in AdminDashboardPro is component state only (initial sample entries + local state updates); it is not a durable server audit trail. Do not present it as a tamper-resistant audit log.
- Staff permissions remain a local-only planning list; they do not grant or restrict actual access. Do not rely on these checkboxes for authorization.

### Follow-up items (not yet implemented)

1. Design abuse controls for public support-ticket submission (prefer server-side throttling; avoid trusting client-only limits).
2. If durable admin auditing is required, implement a server-written append-only event log with actor UID, action, target, timestamp, and restricted read access. Never allow the browser to author arbitrary actor identity.
3. Implement staff accounts only with real Supabase Auth identities and server-side permission checks; otherwise keep the current local-only warning explicit.
4. Continue storefront publish/draft and media lifecycle review. No production changes made in this continuation.

### Verification boundary

- Read-only live Supabase queries only.
- No migration applied, no production data changed, no build/deploy run, and no automated tests executed.


## Storefront draft, publish, version history and media audit — 2026-11-07

### Code-path findings

- Admin draft loading is session-gated and reads only `draft_config`; public loading reads only `published_config` when `is_published = true`. The two read paths are separated to prevent a slower public request from overwriting the admin draft.
- Draft save validates the signed-in primary-admin identity, uploads category/banner images, writes the draft snapshot, and cleans up newly uploaded assets if the draft write fails.
- Publishing validates the same admin identity and uploads images before updating the published snapshot.
- **Consistency gap:** publishing updates `storefront_config` first and inserts the `storefront_versions` snapshot in a second HTTP request. If the second request fails, the storefront is already published but its history entry is missing. This is not an atomic publish operation.
- **Recovery gap:** the current frontend writes `storefront_versions` but no version-list or restore path was found in the reviewed App/AdminDashboard code. The history table is therefore write-only from the current UI; an administrator cannot recover a previous snapshot through the reviewed interface.
- **Media lifecycle gap:** newly uploaded images are tracked and cleaned up on a failed draft/publish write, but the reviewed flow does not reconcile superseded media after a successful save/publish. This may leave old media objects and metadata orphaned. Do not delete media automatically until references across draft, published config, version snapshots, products, and banners are checked.
- The support form still posts directly to `public.support_tickets` using the public Data API. It validates field lengths in the browser and the DB enforces field constraints/status/reply rules, but no server-side throttling was identified. The browser submit lock only prevents repeat clicks in the current page.

### Live read-only state check

- No `storefront_config` row currently exists for `config_key='storefront'`.
- No `storefront_versions` rows exist for that key.
- No `storefront_media` metadata rows currently exist.
- This means there is currently no saved/published storefront snapshot or version history in the live database to restore. It does not prove there are no untracked objects in the Storage bucket; bucket object inventory requires a separate check.
- Live migration history currently includes entries through `20261106110051`; later staged migrations in the branch must be reconciled before any production migration sequence is applied.

### Required remediation before production

1. Replace the two-request publish + version write with one server-side transactional operation. Derive actor identity from `auth.uid()`/trusted `app_metadata`, validate the snapshot, write the published config and version row in the same transaction, and deny browser-supplied actor identity. No production schema change was made.
2. Add an authenticated admin-only version history list and guarded restore operation. Restore must create a new history entry rather than overwrite/delete old history.
3. Add a safe media reconciliation process that preserves every object referenced by current draft, published snapshot, version history, product images, and banners. Delete only positively unreferenced objects after a grace period.
4. Add server-side support-ticket abuse controls; browser-only throttling/honeypots are not sufficient.
5. Inspect Storage bucket object inventory and reconcile it against `storefront_media` before cleanup.

### Tooling / compatibility note

- Supabase's November 4, 2026 CLI v3 breaking change makes database commands target the local stack by default; hosted changes require explicit `--remote` and confirmation. Do not run a migration command against production implicitly. Source: https://supabase.com/changelog?types=breaking-change
- Supabase skill requires creating new migration files with `supabase migration new` first. The current session has GitHub and Supabase MCP actions but no verified local Supabase CLI execution path; therefore no hand-invented migration file was added.

### Verification boundary

- Read-only Supabase schema, policy, constraint, and row-count queries only.
- No production schema/data changes, no Storage object deletion, no code changes to storefront behavior, no build/deploy, and no automated tests executed.


## Storage inventory and server-side remediation readiness — 2026-11-07

### Verified live Storage state

- The only bucket is `storefront-media`; it is public for delivery of storefront images, has a 5 MiB file-size limit, and allows JPEG, PNG, WEBP, and GIF.
- A direct read-only count of `storage.objects` for this bucket returned **0 objects / 0 bytes**.
- `public.storefront_media` currently contains **0 metadata rows**.
- Storage object mutation policies are restricted to `authenticated` and require both the primary administrator UID and trusted `app_metadata.role='admin'`. INSERT, UPDATE (including WITH CHECK), and DELETE were individually verified.
- No Storage object deletion or policy change was performed.

### Server-side capability check

- Supabase currently reports **zero deployed Edge Functions** for this project.
- No `supabase/functions` source directory was found in the inspected repository search results.
- Therefore, there is no existing deployed Edge Function to reuse for support-ticket throttling or transactional storefront publishing. A frontend-only rate limiter would not provide meaningful abuse protection and was deliberately not added.
- A transactional publish/version RPC and server-side ticket throttling require a properly scaffolded, reviewed, versioned Supabase migration and Edge Function (or a DB-backed rate-limit implementation). The current connected tools do not provide a verified local Supabase CLI workflow to create and test these artifacts under the skill's required migration-generation process.

### Result

- The Storage inventory is clean at this point: no bucket objects and no metadata records exist to reconcile or delete.
- Existing bucket write policies are appropriately restricted; the public bucket setting is intentional for public storefront image URLs and is not equivalent to public write access.
- Server-side remediation is blocked on establishing the correct local Supabase CLI / function deployment workflow. Do not replace it with client-only security controls or deploy unreviewed SQL.
- No production changes, migration application, function deployment, code behavior changes, build, or deploy were made.


## Product image persistence and catalogue payload audit — 2026-11-07

### Product image flow reviewed

- Public and admin catalogue reads both fetch the `image` and `gallery` columns from `public.products`; the frontend maps these into `image` and `gallery` fields without converting or stripping the original values.
- Admin upload accepts only validated JPEG/PNG/WEBP/GIF data URLs up to 5 MiB per image and up to 10 gallery images. New data URLs are uploaded to the public `storefront-media` bucket under a product-specific path; already-hosted URLs are retained unchanged.
- New uploads are tracked and removed if the product database write fails. When an edit succeeds, previously referenced images not present in the new gallery are cleaned up only if they belong to that product's own Storage prefix. A cleanup failure is surfaced as a warning rather than silently reported as success.
- Product editing preloads the existing gallery (or main image fallback) into the editor. This means existing URLs/data URLs are retained by default when the admin opens and saves an unchanged product.
- Existing product deletion first deletes the database row via the admin RPC and then attempts to remove that product's own Storage images; if cleanup fails, the UI warns that orphaned images may remain.

### Live data and payload finding

- Live `public.products` currently contains 1 product.
- That product's main image and its one gallery item are both embedded JPEG data URLs, each 133,771 characters/bytes of text; the gallery item is not a Storage URL.
- Live `storefront-media` contains 0 objects, and `public.storefront_media` contains 0 metadata rows (verified in the preceding stage).
- Because the same data URL is stored in both `image` and `gallery`, catalogue requests may transfer roughly twice the image text payload for that product. This is a storage/transfer inefficiency, not evidence of data loss or an access-control failure.
- The single live product has a valid one-item gallery array; no malformed or empty gallery was found. No live data was altered or migrated.

### Follow-up / safe remediation

1. Preserve compatibility with legacy inline data URLs while migrating images to Storage. Do not bulk-rewrite product rows until every image has been uploaded, URL responses verified, and rollback data retained.
2. Avoid duplicating the same full image payload in both `image` and `gallery` in future writes where schema/UI compatibility allows; retain `image` as the main-image compatibility field and gallery as the canonical ordered set.
3. Consider returning compact catalogue fields or separating image metadata from large binary-like values only after verifying every storefront, AI, product detail, admin, order, and export consumer.
4. Add a safe admin preview/check for missing or unreachable image URLs before cleanup; never delete an old image until the replacement is confirmed persisted and readable.
5. Keep the existing 5 MiB per-image and 10-image gallery bounds unless a tested product requirement justifies a change.

### Verification boundary

- Read-only repository review and read-only SQL counts/length checks only.
- No product rows or Storage objects changed; no migration, build, deployment, or automated tests executed.
