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


## Product sizes, colors, variants and checkout validation — 2026-11-07

### Findings

- The product loader previously substituted `['S', 'M', 'L', 'XL']` and `['შავი', 'თეთრი']` whenever the database values were NULL. This invented selectable options for products that had not actually declared them.
- Fixed `src/App.jsx` mapping to accept only JSON arrays for `available_sizes` and `available_colors`; absent or malformed values now map to empty arrays. The existing `productVariants.js` normalizer already treats absent options as empty and does not invent choices.
- Product detail selection uses the available options from the product record; cart insertion validates selected size/color against those options. No change was needed in the cart logic.
- Live database inventory: 1 product; size, color and variants fields all have valid JSON array shapes. Live product stock is 45; its sizes are S/M/L/XL/XXL; colors and custom variants are empty. No product row was modified.
- The live `private.create_order_with_stock(jsonb)` function currently does **not** validate selected size/color against the product's allowed arrays (verified directly from its live function definition).
- The staged repository migration `20261106103325_preserve_order_item_variants.sql` contains server-side size/color validation and preserves the selected options in order snapshots, but it is not present in live Supabase migration history. Therefore this protection is staged only and is not yet active in production. Do not claim otherwise or test by placing a real order.
- Checkout stock and price continue to be recomputed from locked server-side product rows in the live function; this stage did not alter that behavior.

### Change saved

- `src/App.jsx`: removed fabricated fallback size/color options; missing/non-array database values become empty arrays.
- Commit: `87f88c3f90f325e81b0897e22dcf6995fe011983`.

### Verification boundary

- Re-read the committed source lines and confirmed the fallback removal.
- Read-only database checks confirmed valid JSON array shapes for the single live product.
- Read-only function inspection confirmed size/color enforcement is absent from the live function but present in the staged migration noted above.
- No product/order data changed; no production SQL, migration, build, deployment, or automated tests executed.


## Category hierarchy, persistence, media and product-reference audit — 2026-11-07

### Live state reviewed (read-only)

- `public.storefront_config` currently has no row for `config_key='storefront'`; `public.storefront_versions` has no rows. Therefore there is no server-saved draft/published category snapshot yet. The storefront currently falls back to the built-in category list until the administrator saves a draft and publishes it.
- The one live product is assigned to category `ტანსაცმელი`, which matches the built-in default root category. No product row or category data was changed.
- The earlier Storage inventory remains empty; category images are uploaded to `storefront-media` only when the administrator saves/publishes the storefront snapshot.

### Bugs found and fixed in admin category manager

- Category rename previously changed only the category list, leaving product rows with the old category name. Such products could disappear from category filters. Rename is now blocked while products still use the old name; move those products first.
- Category deletion previously removed the category and its direct children without checking whether products used any of those names. Deletion is now blocked if products are assigned to the target category or its child categories.
- Category creation/editing now rejects blank/too-short/overlong names and duplicate names (case-insensitive). New subcategories must reference an existing root category; category IDs use `crypto.randomUUID()` when available, with a collision-resistant fallback.
- Reordering controls now allow moving root categories and sibling subcategories up/down. Array order is retained by the existing App state/localStorage effect and by the existing storefront draft/publish snapshot pipeline.
- Category image selection now accepts only JPEG/PNG/WEBP/GIF and reuses the existing `validateImageFile` / `isValidImageDataUrl` checks, including real file signature and 5 MiB maximum. FileReader failures and invalid files are surfaced instead of silently ignored.
- Legacy category object properties are preserved during admin normalization; category names are normalized to strings to avoid malformed legacy values causing `.trim()` runtime errors.
- Category add/edit notices now explicitly tell the administrator that changes must be saved to the Supabase draft and published before visitors see them.

### Changes committed

- `src/components/AdminDashboardPro.jsx` category validation, safe edit/delete, image checks, ordering controls, legacy normalization.
- Commits:
  - `20e423cb37681e76efd4300371a12b404b932da5`
  - `ae4710219d729d5dc2db51882a953a458abe7be8`
  - `9fe8cabbb6b9ea91c45af212f9fb7ae46bb18f69`

### Verification boundary / remaining limitations

- Re-read the committed category handlers and UI diff; checked live product/category references and the absence of a saved storefront config row.
- No production rows, Storage objects, migrations, or policies changed.
- No local automated tests, build, deployment, or interactive browser test executed in this session. Do not represent this stage as fully end-to-end tested.
- Reordering persists in the current category array/localStorage immediately, but server durability requires the existing explicit “Save storefront draft” action; visitor visibility requires “Publish”.
- Publish still writes `storefront_config` and `storefront_versions` in separate requests. The previously logged non-atomic version-history gap remains open and was not modified in this category-focused stage.
- A future hardening step should validate the full category tree and product-category references again at the save/publish boundary, not only in the admin UI.


### Additional save/publish boundary validation

- Added a shared `validateStorefrontCategorySnapshot` guard to both draft-save and publish paths in `src/App.jsx`.
- Before any category image upload or storefront configuration write, the guard normalizes legacy string entries and validates: maximum 100 categories; non-empty unique IDs; 2–60 character unique names; valid one-level parent references; and every non-empty live product category must still exist in the category snapshot.
- This prevents malformed or orphaning category trees from being saved/published even if stale localStorage or legacy data bypasses the admin UI checks.
- Current live catalogue remains compatible: the single product uses `ტანსაცმელი`, which exists in the built-in default category list. No production data was changed.
- Additional commit: `ca89a542d6853515b573b80042b6b4261b1d6a1d`.
- Added a persistent admin-panel note explaining that category changes must be saved to the Supabase draft and published for visitors; commit `fcb14dee9886548cfb98e5b86b9b2c170985ba4b`.

### Final verification status for this stage

- Re-read the committed App validator and confirmed it is invoked in both draft-save and publish flows.
- Re-read category CRUD, file validation, and reorder handlers after the final changes.
- Read-only Supabase check: 1 live product; its category is `ტანსაცმელი`; no product/category mismatch in the built-in default categories. No `storefront_config` or `storefront_versions` rows exist yet.
- No production database changes, Storage writes, migrations, tests, build, or deployment were performed. Full compile/runtime verification remains pending.


## Storefront banners, site settings and draft/publish workflow — 2026-11-07

### Findings and fixes saved

- Found that the admin could create and save banner records, but `App.jsx` did not pass the banner list to `StoreView`; the public storefront therefore never rendered published banners. Added a responsive featured-banner section to the customer storefront, limited to the first four configured banners.
- Banner destination links are rendered as external links only when their parsed protocol is HTTP or HTTPS; new tabs use `noopener noreferrer`. Unsafe protocols are not rendered as clickable links.
- Added a shared save/publish boundary validator for banner snapshots: array shape, maximum 20 banners, unique non-empty IDs, required title, bounded title/subtitle lengths, and valid HTTP(S) destination links.
- The admin banner creator now enforces the 20-banner limit and uses `crypto.randomUUID()` where available, with a collision-resistant fallback, instead of timestamp-only IDs.
- Found that the global settings form only wrote to this device's localStorage while its success message implied a completed save. It now sends normalized settings through the authenticated Supabase draft-save callback. The callback accepts the normalized settings directly so the snapshot does not capture stale React state from the same event tick.
- Added editable hero title and subtitle fields (120/240 character limits) and bounded the store name (2–60) and announcement bar (160). Both draft-save and publish validate and normalize the full settings object, filling missing legacy fields with fashion-store defaults.
- Replaced only the exact legacy technology-marketplace default copy during initial load; custom user-entered copy is preserved.
- Storefront image references now accept only HTTP(S) URLs or supported validated image data URLs before Storage upload/persistence. This closes a malformed/unsafe URL path for both banners and categories.
- Draft and publish continue to upload inline image data to the existing private-write/public-read Storage bucket, and cleanup of newly uploaded assets remains tied to failed config writes. Existing published images are not automatically deleted.

### Commits

- `2c48415891846ad09eba769b14545b30e49fb315` — banner/site settings validation at draft/publish boundary.
- `4bb7092d80a41b47edea8494206130bfdde9a5bb` — settings saved through Supabase draft callback.
- `675dbc281a5011b0b8f098a8f6b3dc690379ab08` — public storefront banner rendering.
- `081e6b39f7fe3626582051110b274de6dc56b8ea` — safe storefront image URL validation.
- `ffe32538838c2c06442c6d971f696e68bb4b9973` — banner count and ID hardening.
- `6d6b5d7520546ca0e00b085f86492d0b27597fea` and `bfd426e79fb567e508348e083a96cfaa137cd7a8` — pass normalized settings into the same draft snapshot.
- `e0e3e2fbb7b808d64cb23578abcb72572b41e71e` — fashion-focused legacy defaults.
- `263103d3b55ffe0c95f6533da578adff5f26547f` — store-name input length bound.

### Live state and verification boundary

- Read-only live SQL recheck: `storefront_config` rows for key `storefront` = 0; `storefront_versions` rows = 0; `storefront_media` metadata rows = 0; `storefront-media` Storage objects = 0. No production database rows, Storage objects, migrations, or policies were changed.
- Re-fetched the three changed source files from the work branch and checked for the banner validator, draft settings override, admin-to-draft callback, public banner rendering, safe external-link protocol checks, hero fields, and 20-banner limit. All these targeted source-presence checks passed.
- No local compile, automated test suite, browser interaction test, Vercel build, or deployment was run. Full runtime verification remains pending and must be completed in the final consolidated verification stage.
- The previously recorded non-atomic publish/version-history gap remains open: config publish and version insertion are still separate requests. This stage did not pretend to fix it or change production schema.
- Version-history listing/restore UI, safe old-media garbage collection, and server-side support-ticket throttling also remain open from earlier stages.


## Storefront version history visibility and safe draft restore — 2026-11-07

### Changes saved

- Added an authenticated-admin-only read of the latest 20 `storefront_versions` rows, selecting only the fields needed by the admin UI.
- Added a version-history panel in global settings with label and timestamp.
- Added guarded “restore to draft” behavior. It validates the snapshot shape before loading categories, banners, and site settings into the editor; it requires confirmation and never publishes automatically or deletes/replaces history.
- Version history reloads after the publish operation finishes, so a newly created version can appear without a full page refresh.
- Current live version table is empty, so the history panel will correctly show an empty-state message until a successful publish writes a version.

### Live database review for the next hardening stage

- Live migration history currently ends at `20261106110051` (`fix_flash_sale_stale_original_price`).
- `storefront_versions` columns are: UUID id, config_key, JSONB snapshot, optional version_label, optional created_by, and created_at.
- RLS policies allow the primary administrator to SELECT, INSERT, UPDATE, and DELETE version rows. The UI added here only reads rows; it does not edit or delete them. For durable history integrity, a later server-side migration should remove browser UPDATE/DELETE capability and use append-only transactional functions.
- No existing public/private function matching storefront publish/version transaction was found in the live database. The current two-request publish/version consistency gap remains.
- Security advisor currently reports only the known `auth_leaked_password_protection` warning. Performance advisor reports three unused indexes as INFO; these are not removed because current workload evidence is insufficient.
- The environment has no Supabase CLI installed and no checked-out local repository. Per the Supabase workflow requirements, a new migration file must first be generated with `supabase migration new`; therefore no migration filename was invented and no direct production DDL was applied. Transactional publish and append-only version hardening remain queued until a verified local CLI/migration workflow is available.

### Verification boundary

- Re-fetched the changed App/Admin/StoreView files and confirmed the banner validation runs in both draft and publish paths; settings validation runs in both paths; normalized settings are passed into the draft snapshot; banners are passed into and rendered by StoreView; version reads are gated by admin state; and restore loads only into the draft editor.
- Read-only live database checks only. No production data, schema, policies, Storage objects, or migration history changed.
- No local compile, automated tests, browser interaction test, Vercel build, or deployment was run. These must be part of the final consolidated verification stage.


## Storefront publish atomicity and version-history security review — 2026-11-07

### Verified live findings

- The current frontend still publishes in two HTTP requests: first an upsert to `storefront_config`, then an insert to `storefront_versions`. The UI reports the partial-success case honestly, but the database does not guarantee that a published config always has a matching history record.
- The primary administrator is consistently identified by immutable Auth UID `1060de3d-d28a-45f8-9a64-5e0368cffc4b` plus trusted `app_metadata.role = 'admin'`. Do not replace this with email-only checks or user-editable `user_metadata`.
- Live RLS policies on both storefront tables use this UID and trusted app_metadata role.
- `storefront_versions` currently grants the authenticated role SELECT, INSERT, UPDATE, and DELETE, with RLS limiting all four to the primary admin. The frontend UI only needs SELECT and INSERT. This means the history is admin-only but not append-only at the database layer.
- `storefront_config` currently grants authenticated SELECT, INSERT, UPDATE, and DELETE under primary-admin policies. Draft save still needs authenticated INSERT/UPDATE. A publish RPC should own the published snapshot + version write; draft-save behavior must remain intact.
- `storefront_versions` schema: UUID id, config_key text, snapshot JSONB, optional version_label, optional created_by UUID, created_at timestamp.
- `storefront_config` schema: config_key text, draft_config JSONB, published_config JSONB nullable, is_published boolean, draft_updated_at timestamp, published_at nullable timestamp, updated_by nullable UUID.
- Live migration history ends at `20261106110051`; no storefront transaction function exists.

### Correct target design

- Add one database transaction function that validates the snapshot shape, checks both `auth.uid()` against the immutable primary-admin UID and `auth.jwt()->'app_metadata'->>'role' = 'admin'`, then upserts the draft/published config and inserts the version row in the same PostgreSQL transaction. Set `created_by` and `updated_by` from `auth.uid()`, never from client input.
- Keep the privileged implementation in the non-exposed `private` schema with `SECURITY DEFINER`, an empty `search_path`, and fully schema-qualified table/function references. Expose only a narrowly granted authenticated RPC wrapper (or otherwise use the project's established private-RPC pattern); revoke execution from PUBLIC and anon.
- Make `storefront_versions` append-only for browser clients: revoke authenticated UPDATE and DELETE table grants and remove those policies; keep authenticated SELECT. INSERT should be performed only by the transaction function, not direct browser REST.
- Do not remove draft-save capability or weaken existing RLS. Preserve the public read of published config.
- After the migration, verify both positive and negative authorization cases, verify a forced failure rolls back both writes, run Supabase security/performance advisors, and test the frontend RPC path before any deploy.

### Why this change was not applied in this stage

- The active execution environment has neither a Supabase CLI binary nor a checked-out local repository. The Supabase skill explicitly requires creating a new migration with `supabase migration new` before adding a migration; it also requires CLI help/version discovery and local migration-list verification.
- No migration filename was fabricated, no direct production DDL was executed, and no existing production data/policies/migrations were modified.
- This is an environment/workflow blocker, not a code fix. The SQL migration and frontend RPC switch must be completed together when a verified CLI/local checkout is available; changing only the frontend would break publishing, while applying untracked production DDL would leave the repository unreproducible.

### Verification

- Re-read live schema columns, RLS policies, and grants separately for both storefront tables.
- Re-read the frontend publish implementation and verified the two-request consistency gap remains.
- Rechecked live migration history.
- Consulted current Supabase Database Functions and RLS documentation and the 2026 changelog. The current CLI v3 behavior is local-by-default and confirms hosted changes; no relevant database-function breaking change was found.
- No production database changes, GitHub source-code changes, build, automated tests, browser test, or deployment were performed in this stage.

## 2026-11-07 — Atomic storefront publish made available

### Root cause correction
- The previous stage incorrectly treated the missing local Supabase CLI and local checkout as a hard blocker. The connected Supabase MCP supports schema migrations directly, and GitHub file operations are available; no end-user plan upgrade or local CLI installation is required for this change.
- Current Supabase CLI v3 is local-by-default and requires explicit remote targeting for hosted commands. This change used the authenticated Supabase migration interface rather than an unverified shell/CLI path.

### Implemented
- Added `private.publish_storefront_config(jsonb,text)`, a narrowly scoped `SECURITY DEFINER` transaction function with empty `search_path` and fully qualified table references.
- The function checks both the immutable primary-admin Auth UID and trusted `app_metadata.role = 'admin'`; it does not trust client-supplied user IDs.
- Server-side validation bounds snapshot size, category/banner counts and fields, required JSON sections, duplicate category/banner IDs, and site-setting lengths.
- The function updates `storefront_config` draft + published snapshots and inserts the matching `storefront_versions` row in the same PostgreSQL transaction.
- Added the exposed `public.publish_storefront_config` `SECURITY INVOKER` RPC wrapper; execute is granted only to authenticated callers. The private implementation is not exposed as a PostgREST schema.
- Removed authenticated direct INSERT/UPDATE/DELETE permissions and corresponding write policies from `storefront_versions`. Authenticated admin SELECT remains. Version history is now append-only for browser clients.
- Updated `src/App.jsx` to call the single RPC instead of issuing separate REST writes. Draft-save remains on its existing path.
- Added ambiguous-network-outcome protection: if the publish request was sent but the browser cannot determine whether it committed, newly uploaded images are retained instead of being deleted while they may already be referenced by a committed publish.

### Migration records and repository files
- Live Supabase migration `20261107083528_atomic_storefront_publish_and_append_only_versions`.
- Live Supabase migration `20261107083600_validate_storefront_publish_snapshot_shape` tightens required JSON key checks using `IS DISTINCT FROM` to prevent SQL NULL semantics from bypassing validation.
- Matching SQL files are saved under `supabase/migrations/` on branch `maintenance/storefront-draft-save-2026-11-06`.
- App source and migration SQL are saved on the same branch. No production Vercel deployment was triggered.

### Verification
- Verified the private implementation is `SECURITY DEFINER` with empty `search_path`; public wrapper is `SECURITY INVOKER`.
- Verified anon cannot execute either function; authenticated can execute the public wrapper and the private implementation it delegates to.
- Verified authenticated cannot INSERT/UPDATE/DELETE `storefront_versions`, but can SELECT; only the admin SELECT RLS policy remains.
- Positive RPC path executed with a simulated trusted admin JWT inside an explicit transaction, then rolled back. Confirmed live `storefront_config` and `storefront_versions` row counts remained zero.
- Negative authorization and malformed/missing-snapshot checks were rejected as expected.
- Re-ran Supabase advisors: the only security warning remains the existing leaked-password-protection setting; performance advisor still reports the same three unused-index INFO findings. No indexes were removed.
- Source inspection confirms the publish handler uses the RPC and no longer performs a separate direct insert into `storefront_versions`.
- A forced mid-transaction trigger-failure test and full browser interaction/build were not run. PostgreSQL transaction semantics provide all-or-nothing behavior; a real admin publish should still be exercised in the final pre-deploy verification.

### Scope and data safety
- No real storefront config or version row was published or created during verification; both tables remain empty.
- Existing draft-save, public published-config reads, category/banner behavior, and version-history read/restore UI were preserved.
- No Vercel build or deployment was run.

## 2026-11-07 — Checkout confirmation and order-code visibility

### Findings
- The order creation handler already validates the server RPC response against the generated idempotent `ORD-` order reference, then sets `orderConfirmation` with that full ID.
- The checkout submit handler displayed a separate generic “order sending started” toast while the button itself already displayed the loading state. It also displayed a second success toast after the confirmation dialog was opened. These duplicate toast surfaces could distract from or visually overlap the actual confirmation.
- The confirmation dialog had a long order reference, but its layout relied on utility classes and earlier CSS rules. A dedicated final code style makes the reference's wrapping and selection behavior explicit on narrow screens.

### Implemented
- Removed the redundant initial “sending” toast. The submit button remains the loading indicator and still disables repeat submission.
- Removed the duplicate success toast. The order confirmation dialog is now the single success surface and continues to show the full server-confirmed order ID.
- Rendered the code in a left-to-right code element with an accessible label, explicit full-width wrapping, selectable text, and a safe empty-state fallback.
- Copy action now disables if no order ID exists and copies the exact order ID without the visual leading `#`; fallback still exposes the full code if clipboard access is unavailable.
- Added dedicated responsive CSS so the success dialog and order-code panel cannot exceed viewport width, and the full 36-character `ORD-` code wraps instead of overflowing.

### Verification
- Re-fetched all three changed source files from the working branch and verified the handler still sets `orderConfirmation` from the validated server response.
- Verified the redundant sending/success toast strings are absent from the order handler.
- Verified the confirmation component has the left-to-right code element, empty-state fallback, disabled-copy guard, and dedicated responsive CSS.
- Package scripts confirm tests run with `node --test` and production build with `vite build`; neither was run because there is no checked-out local working tree in this environment. No Vercel build/deploy was triggered.
- No order or customer data was written to Supabase during this frontend-only stage.

### Scope
- No checkout pricing, order RPC, idempotency, stock, auth, or RLS logic was changed.
- Existing KA/EN/RU checkout labels and order tracking behavior were preserved.


## Checkout confirmation responsive fix — 2026-11-07

### Finding
- The server-generated order reference uses the format `ORD-` plus 32 hexadecimal characters. The success modal rendered it in a full-width `code` element but did not enable line breaking. On narrow screens, a long unbroken code could overflow the confirmation panel and appear clipped/outside the modal.

### Change saved
- Added `min-w-0`, `max-w-full`, `overflow-hidden`, and responsive panel padding to the order-code panel.
- Added `break-all` and `overflow-wrap:anywhere` to the code display so the complete reference stays inside the modal on narrow screens.
- Preserved the full order ID, copy action, server confirmation check, and existing order flow. No checkout/database logic was changed.

### Verification boundary
- Re-read the updated JSX and confirmed the wrapping classes are present.
- No local build, automated test, browser/device interaction, real order, Vercel build, or deployment was run in this stage.


## Checkout variant reconciliation and responsive confirmation — 2026-11-07

### Fixed in frontend
- Order confirmation code display now wraps long secure ORD references within the mobile dialog and the panel cannot exceed its available width.
- The checkout's fresh catalogue request now includes `available_sizes` and `available_colors`.
- Cart reconciliation now compares selected size/color against the latest server catalogue and reports unavailable options before checkout. It supports both snake_case API fields and camelCase in-memory product fields.
- Added regression tests for rejected stale size/color choices and accepted current choices.

### Database discrepancy discovered
- Live `private.create_order_with_stock(jsonb)` contains variant snapshotting/idempotency but does **not** contain the size/color membership checks present in the staged `20261106103325_preserve_order_item_variants.sql` source file.
- Live migration history already contains version `20261106103325`, so the checked-in SQL and live function body are out of sync.
- Attempted to apply a corrective migration named `enforce_order_variant_selection`; Supabase rejected the SQL with a syntax-at-end-of-input error before applying it. No database function change was committed by that attempt.
- Do not claim server-side variant enforcement is fixed. It remains a backend follow-up; frontend now blocks stale/invalid selections during normal checkout but cannot secure direct API calls by itself.

### Verification boundary
- Confirmed updated source and test text was saved on the maintenance branch.
- Could not run Node tests, local build, or browser checkout in the current environment.
- No production order, stock, product, or customer data was changed. No Vercel build/deployment was run.


## Support intake and admin activity-log audit — 2026-11-07

### Findings
- Public support intake currently creates a cryptographically random ticket ID in the browser and submits only customer name, optional email/subject, and message. Browser bounds are 100/254/150/4000 characters; database constraints independently enforce these limits.
- Supabase RLS/privileges restrict public callers to INSERT; ticket SELECT/UPDATE/DELETE remains admin-only. Public callers cannot set status or reply through the validated INSERT policy.
- No server-side rate limit or abuse throttle is present for support ticket creation. A browser-only cooldown would be bypassable and is not represented as a security fix.
- Admin ticket polling refreshes every 15 seconds while the admin panel is open.
- The admin activity log is currently component state seeded with two sample entries; actions append only in memory. It is not a durable audit trail and resets on reload. The label “Audit Logs” can therefore overstate its persistence.
- Ticket replies are saved to the database, but the UI explicitly tells admins they are not emailed to the customer. No email delivery integration was found in this path.

### Safety decision
- No frontend-only anti-spam shim or localStorage pseudo-audit log was added; neither would provide server-side enforcement or durable audit evidence.
- Proper completion requires a database-backed rate-limit mechanism for anonymous ticket intake and a protected, append-only admin activity table/write path. These are separate schema changes and need careful migration + authorization tests.
- No ticket, order, or customer data was changed. No build or deployment was run.
