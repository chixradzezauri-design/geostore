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


## Checkout variant-change messaging — 2026-11-07

### Finding and fix
- Cart reconciliation correctly detects stale size/color selections, but the checkout interruption message previously described every discrepancy as only a price or stock change.
- Updated the checkout message in Georgian, English, and Russian. When a size/color is no longer offered, it now explicitly tells the customer to remove the affected item or choose an available option before retrying.
- Price/stock-only discrepancies retain their previous localized message.
- No order submission, stock, database, or pricing logic changed.

### Verification boundary
- Confirmed the exact localized branch was saved on the maintenance branch.
- Existing regression tests cover valid and invalid variant selections; they were not executed in this environment.
- No build, real checkout, Vercel build, or deployment was run.


## Server-side checkout variant enforcement — 2026-11-07

### Finding and repair
- The live `private.create_order_with_stock(jsonb)` preserved selected size/color values in order snapshots and idempotency keys, but it did not verify that the selected options still belonged to the product's current catalogue options.
- Updated the live function to load `available_sizes` and `available_colors` from the product row and reject any non-empty selection that is not an exact member of the corresponding JSON array.
- The validation treats missing, malformed, or non-array option data as offering no selectable values; it does not silently accept arbitrary options.
- Retained the existing private SECURITY DEFINER implementation, empty search_path, server-side product price/stock calculation, advisory lock, order idempotency, and public SECURITY INVOKER wrapper.

### Verification
- Invalid size was rejected with the expected server error.
- Invalid color was rejected with the expected server error (the current live product has no available colors).
- A valid size was accepted and preserved in the generated order snapshot inside a rollback-only test block.
- Confirmed no test order was persisted and product stock remained 45.
- Confirmed the public RPC wrapper remains SECURITY INVOKER and callable by anon/authenticated as before; the private implementation remains SECURITY DEFINER with its empty search_path.
- Security Advisor still reports only the known leaked-password-protection warning (plan-level setting); no new security lint appeared.

### Migration tracking limitation
- The existing migration version `20261106103325` is present in live migration history, but its checked-in SQL did not match the live function and the migration runner rejected the full PL/pgSQL body. Two attempts were stopped; no migration-history entry was added by those failed attempts.
- The live DDL was applied and verified through the SQL execution path. A canonical follow-up migration still needs to be generated with the Supabase CLI migration workflow before final release; do not treat this as fully reconciled in migration history.
- No order/customer data was changed; no stock changed; no build or deployment was run.


## Order cancellation, stock restoration and reactivation — 2026-11-07

### Findings and repair
- Live `private.admin_update_order_status` was older than the staged hardening SQL: cancellation restored stock without validating each raw line/quantity and did not enforce the full shipped/delivered transition rules at the function boundary.
- Live `private.admin_reactivate_cancelled_order` was missing the fresh-password `auth.jwt()->'amr'` check and strict validation of stored order lines before stock deduction.
- The live `orders` table did not yet have the dedicated status-transition guard trigger.
- Applied Supabase migration `20261107084940_harden_order_status_stock_transitions`. It updates the two admin RPC implementations, adds the trigger guard, requires a fresh password authentication for reactivation, validates order line quantities before stock math, and revokes order DELETE for client roles.
- Preserved existing public RPC wrappers and their authenticated-only execute permissions. The private implementations remain SECURITY DEFINER with empty search_path.

### Verification
- Ran a rollback-only test against the pre-existing explicitly named test order `GEOSTORE-TEST-IDEMP-20261103-01`.
- Cancellation restored exactly one stock unit; repeating cancellation did not restore stock again.
- Direct table-update reactivation was rejected by the new trigger.
- Dedicated reactivation RPC re-deducted exactly one unit and reset the stock ledger markers.
- Test transaction rolled back successfully: test order remained in its original `ახალი` status, stock remained 45, and no extra test order was created.
- Confirmed the new trigger exists and the migration version appears in Supabase migration history.
- Security Advisor still reports only the existing leaked-password-protection warning.

### Release boundary
- Canonical migration source added to the maintenance branch at `supabase/migrations/20261107084940_harden_order_status_stock_transitions.sql`.
- No real customer orders or stock were changed by verification; no build or deployment was run.


## Authorized test-order cleanup and stock reconciliation — 2026-11-07

- User explicitly confirmed that all existing orders were test orders and authorized deleting them.
- Preflight found 21 orders total: 14 with stock-deduction markers, one already marked restored, and 7 legacy orders with no deduction marker. The 7 legacy orders predated the stock automation rollout (their timestamps are before the 2026-11-02 18:01 UTC stock automation migration), so they were not credited back to stock.
- The 13 orders with an un-restored stock-deduction marker contained 16 units for product `prod-1793257789731`. All item JSON/IDs/quantities were validated before cleanup.
- In one transaction, locked orders and products, restored those 16 proven-deducted units, then deleted all 21 test orders. No product row was missing; no foreign-key dependencies referenced `public.orders`.
- Post-cleanup verification: `public.orders` count = 0; product stock = 61 (was 45); pending stock restorations = 0; cancelled orders = 0.
- No non-order customer, product, account, or settings data was deleted. No build or deployment was run.


## Support anti-spam and persistent admin audit trail — 2026-11-07

### Support intake protection
- Added a database trigger on `public.support_tickets` that reads the trusted request IP from the PostgREST `X-Forwarded-For` request header and stores only SHA-256 hashes of the IP/email keys, never raw IP addresses or email addresses in the limiter table.
- Enforced at most 5 support submissions per IP in 15 minutes and at most 3 submissions per normalized email in 60 minutes. Advisory transaction locks serialize concurrent attempts per key so parallel submissions cannot bypass the counters.
- Old rate-limit rows older than 24 hours are purged during accepted submissions. If the gateway supplies no usable IP for an anonymous request, the submission fails closed with a temporary-unavailable response rather than silently disabling the limit.
- Rate-limit responses use PostgREST's documented `PGRST` response mechanism with HTTP 429. The customer-facing support form now shows a localized retry-later message in KA/EN/RU.

### Persistent administrator activity log
- Replaced fabricated component-only seed entries with database-backed activity records. Existing `logActivity` call sites now write through a protected RPC and the admin logs tab loads the latest 100 persisted records.
- Added private `admin_activity_log` storage and private SECURITY DEFINER read/write implementations. Both validate the primary administrator Auth UID and trusted `app_metadata.role='admin'`; public wrappers are SECURITY INVOKER, have empty search_path, and are executable only by authenticated users.
- The activity table has RLS enabled and no direct client grants. There are no update/delete RPCs or client grants, so the application-facing audit interface is append-only.
- The two internal tables are in the private schema and are not exposed as public Data API tables.

### Verification
- Rollback-only support tests accepted five same-IP submissions, rejected the sixth with SQLSTATE `PGRST` and HTTP status 429, accepted three same-email submissions from distinct IPs, and rejected the fourth with HTTP 429.
- Rollback-only admin audit tests ran under the actual PostgreSQL `authenticated` role: the primary-admin JWT successfully inserted/read a record, while a non-admin JWT was denied. A separate anonymous-role test submitted five tickets through the existing public INSERT policy and received HTTP 429 on the sixth.
- Verified no test tickets, rate-limit entries, or audit records persisted after rollback.
- Verified RLS enabled on both private tables; anon has no direct table access or audit RPC access; authenticated has no direct table access but can call the admin wrappers; private functions use SECURITY DEFINER with empty search_path.
- Security Advisor reports the existing leaked-password-protection warning plus INFO-only notices that the private tables have RLS enabled without policies. This is intentional: the tables have no direct client grants, and all access is through narrowly scoped protected functions.
- Three pre-existing support tickets remain untouched. Orders remain at 0 and the product stock remains 61.

### Migration tracking and release boundary
- Applied and recorded migrations `20261107085444_secure_support_intake_and_persist_admin_activity` and `20261107085535_return_http_429_for_support_rate_limits`.
- Matching SQL files were saved on the maintenance branch. The GitHub migration files reflect the applied SQL, including the follow-up HTTP 429 behavior.
- No customer tickets, order records, product records, or account data were changed by the tests. No local build, browser test, Vercel build, or deployment was run.


## Storage and media security review — 2026-11-07

### Live Storage inventory
- Confirmed the only configured bucket is `storefront-media`, public for storefront image delivery, with a 5 MiB per-file limit and MIME allowlist `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
- Confirmed bucket-scoped Storage object policies allow INSERT/UPDATE/DELETE only to the authenticated primary administrator UID `1060de3d-d28a-45f8-9a64-5e0368cffc4b` with trusted `app_metadata.role='admin'`. No anon write/update/delete policies exist.
- Public bucket reads are intentionally public; never store private documents, customer uploads, identity documents, or other sensitive files in this bucket.
- Live inventory is empty: 0 Storage objects, 0 `storefront_media` metadata rows, 0 orphan objects, and 0 metadata rows without a corresponding object. No files or metadata were deleted.
- One live product remains. Its main image is a valid JPEG data URL (133,771 bytes), and its one-item gallery references the same image. This remains compatible and untouched; moving it to Storage requires a separate verified migration and a backup/rollback plan.

### Code review and correction
- Reviewed product image upload, deletion, storefront category/banner upload, upload rollback cleanup, and media metadata handling.
- Existing upload checks validate actual image signatures and enforce JPEG/PNG/WEBP/GIF and 5 MiB limits. Product gallery is capped at 10 images.
- Replaced the product image object-name suffix based on `Math.random()` with 128 bits from `crypto.getRandomValues`. Upload now fails closed if a secure browser random generator is unavailable. This reduces collision/predictability risk without changing product paths, URL format, bucket, or compatibility.
- Existing storefront upload paths already used cryptographically secure random bytes; cleanup preserves metadata if Storage deletion fails, avoiding untracked public objects.
- No Storage policy changes or production object mutations were necessary.

### Verification and release boundary
- Re-queried bucket configuration, object inventory, metadata inventory, Storage RLS policies, and product image/gallery references after the code change.
- Confirmed 1 authenticated primary-admin write/update/delete policy for the bucket and 0 anonymous write/update/delete policies.
- Confirmed the product image and gallery remain unchanged; all live Storage and media metadata counts remain zero.
- Supabase Storage documentation confirms public buckets serve objects publicly while write operations remain governed by Storage RLS policies; bucket-level file size and MIME restrictions are enforced by Storage.
- No build, unit test runner, browser/device test, Vercel build, or deployment was run because no local checkout/CLI runtime is connected here. No production files or rows were changed.


## Dependency, build pipeline, and frontend bootstrap audit — 2026-11-07

### Critical build configuration finding and correction
- The repository had `src/index.css` containing Tailwind directives (`@tailwind base/components/utilities`) and extensive JSX utility classes, but no `postcss.config.*` or `tailwind.config.*` file existed. The HTML also had a leftover Tailwind CDN comment but no CDN script.
- Added `postcss.config.js` to run the installed local Tailwind 3 and Autoprefixer plugins.
- Added `tailwind.config.js` with explicit scanning of `index.html` and all JS/TS/JSX/TSX source files under `src`.
- This is a build-pipeline correction: without these configuration files, Vite had no configured Tailwind PostCSS plugin to expand the directives and generate the utility CSS used throughout the application. Build output still needs to be verified in a real build before release.

### Runtime compatibility
- Vercel discontinued Node.js 20 for new builds/functions in October 2026 and now offers Node 26 as the default, with Node 24 and 22 available.
- Pinned `engines.node` to `24.x` in `package.json` and synchronized the root package metadata in `package-lock.json`. Node 24 is the conservative supported runtime choice; this avoids accidentally jumping to the newly-defaulted Node 26 while keeping compatibility with supported Supabase JS runtimes.
- Did not change dependency versions or major framework versions without a reproducible local install/build and regression test environment.

### Dependency integrity and advisory review
- Lockfile version 3 contains 195 package entries. All resolved tarballs use the npm registry and all resolved packages have integrity hashes.
- Only two packages declare install scripts: `esbuild` (expected platform binary setup) and optional `fsevents`. No Git, file, or alternate-host package sources were found.
- Two duplicated transitive package names (`glob-parent` and `picomatch`) resolve to multiple versions; retained because dependency consumers may require different compatible majors.
- Reviewed the pinned versions of React/React DOM 18.3.1, Vite 6.4.5, PostCSS 8.5.32, Tailwind 3.4.19, and Supabase JS 2.109.0 against current public advisories. Vite 6.4.5 includes the October 2026 v6 security fixes; PostCSS 8.5.32 is beyond the published affected ranges; no direct React 18.3.1 or React DOM 18.3.1 advisory was identified for this client-only app. React Server Components advisories do not map to the current client-only Vite architecture.
- Supabase JS 2.109.0 is behind current releases; its later 2.110 line dropped Node 20 support. The selected Node 24 runtime is compatible, but a dependency refresh (including Supabase JS and the older Lucide icon package) remains a separately testable maintenance task. No semver/lockfile mismatch was introduced by this stage.

### Frontend bootstrap cleanup
- Removed legacy `no-cache/no-store` HTML meta directives that conflicted with the actual HTTP cache policy already defined in `vercel.json`: HTML revalidation and immutable caching for hashed assets.
- Removed the stale Tailwind CDN comment; Tailwind is now configured as a local build dependency.
- Removed duplicate inline font/scrollbar CSS from `index.html` and aligned the global body font with the Manrope + Noto Sans Georgian font stack already loaded in the document head. This fixes the previous cascade override where `src/index.css` replaced the intended font stack with system fonts.
- Kept React StrictMode enabled. Its development-only effect replays are intentional and are not grounds to disable it; any actual duplicate network side effects need targeted effect cleanup, not removing StrictMode.

### Verification boundaries
- Re-fetched all changed files and verified package.json and package-lock root Node engine declarations both equal `24.x`; confirmed the new PostCSS/Tailwind configs exist and the old cache meta tags are absent.
- Static lockfile inspection: 195 packages, no non-npm tarball sources, no missing integrity hashes, two expected install-script packages.
- Public advisory sources reviewed include the official Vite advisory list, React advisories, PostCSS advisories, Supabase JS changelog/runtime support, and Vercel's Node version documentation.
- No npm install, `npm audit`, `npm audit signatures`, `npm test`, Vite build, browser test, or Vercel deployment was run. The connected environment does not provide the project's local Node/npm runtime. Do not represent this stage as a verified successful build.
- No production database, Storage object, order, product, or customer record was changed.


## CI failure investigation and stale-cart compatibility fix — 2026-11-07

### Reproduced CI finding
- GitHub Actions run `42358214019` installed dependencies successfully, then ran 55 Node tests: 54 passed and 1 failed. The production build step was correctly skipped because the test step failed.
- Failure: `src/utils/orderSafety.test.js`, "reconciles stale cart prices and stock against the latest catalogue". Legacy catalogue fixture omitted the optional `available_sizes` and `available_colors` fields, but the reconciliation helper treated missing fields as explicit empty option lists and incorrectly flagged previously selected sizes.
- This was a real compatibility bug in the stale-cart guard, not a reason to weaken the test.

### Correction
- Updated `reconcileCartWithCatalog` to distinguish absent legacy variant fields from explicitly configured option arrays.
- When the catalogue omits a variant field entirely, it no longer invalidates a selected size/color based on missing metadata.
- When the catalogue explicitly supplies an empty array, the selection is still rejected as unavailable. Non-empty configured lists continue to enforce exact option matching.
- Added a regression test for explicitly empty size/color arrays; retained the original stale-price/stock test unchanged.

### Verification boundary
- The npm audit workflow passed with zero high/critical advisories, and CodeQL completed successfully on commit `ecc1cdd66f0e95cd9394e7d94f49f8a5b518929c`.
- The correction is committed for immediate CI re-test. Do not consider tests or production build passed until the new workflow run completes.
- No Vercel deployment or production database changes were made.


## Initial storefront bundle optimization — 2026-11-07

### Finding
- The first successful production build emitted a Rollup warning because the main JavaScript chunk was 559.22 kB minified (154.99 kB gzip), above the default 500 kB warning threshold.
- The storefront view was statically imported into the root App even though other large screens were already lazy-loaded.

### Correction
- Changed the primary StoreView to a React lazy import, matching the existing lazy-loading strategy for the admin dashboard, wardrobe, compare, image search, assistant, and modal screens.
- Wrapped the store view in a localized, accessible Suspense loading state (Georgian/English/Russian). No store functionality, data flow, route/tab behavior, or business logic was changed.
- This should split the large storefront view from the root entry chunk. Confirm the resulting chunk sizes and build output in CI before claiming the warning is resolved.

### Verification boundary
- Prior commit `8a9e11213ec87681c142e92cdd8a14fb1e9ad703` passed 56/56 unit tests, production Vite build, npm audit (0 high/critical advisories), and CodeQL.
- This lazy-loading adjustment requires its own CI test/build and CodeQL run. No Vercel deployment was performed.


## Final static-analysis review and secure identifier hardening — 2026-11-07

### Final CI status before this change
- Build check run `42358531404`: passed; 56/56 tests passed; Vite production build completed.
- Dependency security audit run `42358531443`: passed.
- CodeQL run `42358531419`: completed successfully.
- CodeQL successful completion confirms analysis workflow completed; it is not by itself a claim of zero repository alerts.

### Additional code review
- Reviewed AdminDashboardPro hook ordering: all React hooks are called unconditionally at component top level before render; no conditional hook-order violation found in the inspected component.
- Verified admin data request helper uses the current Supabase session access token when available and falls back to the public anon key only without a session.
- Found remaining `Math.random()` fallbacks in admin-generated variant IDs, category IDs, product SKUs, and banner IDs. These identifiers are not authentication credentials, but the fallbacks could collide and were inconsistent with the secure-random policy used elsewhere.

### Correction
- Added one shared 128-bit `crypto.getRandomValues` identifier generator.
- Replaced all remaining `Math.random()` identifier fallbacks in AdminDashboardPro.
- If secure browser randomness is unavailable, variant/category creation fails with a clear message; product/banner creation is caught by their existing save error handling. No weak random fallback remains.

### Verification boundary
- This change requires a new CI run. Do not treat it as tested until 56+ tests, production build, dependency audit and CodeQL complete on the new commit.
- Static source review only; no interactive mobile/desktop browser test or Vercel deployment was performed.


## Re-run verification and stylesheet maintainability review — 2026-11-07

### CI results for secure identifier commit `20e5f62b957d40fad0931413765f09370555b385`
- Build check run `42358761193`: completed successfully.
- `npm ci`: passed.
- Automated tests: 56 passed, 0 failed.
- Vite production build: passed; no large-chunk warning was emitted in the captured build log.
- Dependency audit run `42358761153`: passed; `npm audit` reported **0 vulnerabilities** (not merely zero high/critical).
- CodeQL run `42358761151`: completed successfully.
- This records successful workflow completion, not a claim that no CodeQL alerts exist; alert inventory was not available through the connected GitHub actions interface.

### Additional maintainability review
- `src/index.css` is approximately 402 kB and contains about 2,488 top-level selector/media-rule matches in a static scan.
- Many storefront and modal selectors are redefined repeatedly (e.g. product modal, product info, category cards, filter panel, footer links) across multiple media breakpoints.
- The Vite build parses the stylesheet successfully, but repeated overrides increase cascade complexity and make visual regressions harder to reason about.
- No CSS rules were deleted or merged in this pass: without an interactive browser and visual regression snapshots, collapsing repeated rules could change specificity/order and reintroduce the mobile layout problems reported by the user.

### Next work item
- Begin a scoped stylesheet consolidation, starting with one isolated surface at a time (storefront product cards/modal, then filters/categories, then footer/navigation).
- Preserve current rendered declarations and source order; require CI build and mobile/desktop visual review before each consolidation is considered complete.
- No Vercel deployment or production database changes were made.


## Checkout revenue and inventory consistency follow-up — 2026-11-07

### Findings confirmed against the connected Supabase project
- The live `private.create_order_with_stock` function already validates custom variant selection, prices custom variants from the database, atomically deducts the matching variant stock, and calculates server-side gift-wrap (+5 GEL) and VIP-warranty (+15 GEL) fees.
- The server order snapshot stores the final per-unit `price` with add-on fees already included, and separately stores `base_price` and `addon_total`.
- The live `private.preserve_product_variant_stock` trigger already preserves stock for existing variant IDs and blocks removal/reuse of variant IDs referenced in order history. The products table also has an admin-only UPDATE RLS policy.
- The order-notifications table has RLS enabled and no direct table policies; customer access is intentionally through authenticated, owner-scoped RPC functions. Supabase advisors also report the private rate-limit/activity tables with RLS enabled and no policies. These are not exposed direct-table access paths.
- Supabase security advisor still reports Leaked Password Protection disabled; this is a dashboard Auth setting and was not changed by SQL.

### Corrections made on the design branch
- Removed the redundant, not-yet-applied `admin_update_product` migration and restored the existing admin product PATCH path. It omits stale base stock from the payload; the existing database trigger protects variant stock.
- Restored the already-applied `20261106103325_preserve_order_item_variants.sql` migration file to its original content. Applied migration history must not be rewritten to retrofit later changes.
- Corrected admin finance and invoice line totals: server snapshots already include add-on fees in `price`, so adding the fees again would double-count revenue. A shared `calculateOrderLineRevenueGEL` helper now uses the final server price and is covered by a focused unit test.
- Hardened the staged custom-variant migration's cancellation/reactivation paths by separating JSON array-type validation from `jsonb_array_length`; malformed non-array order items now produce the intended validation error rather than an array-function exception.
- Added a checkout fingerprint test ensuring paid add-ons remain grouped with the exact custom variant.

### Verification boundary
- GitHub file refetches confirmed each edited file matches the saved branch content.
- Four focused Node smoke assertions for the server-priced revenue helper passed.
- The complete Node test suite, production build, and browser QA were not run on these latest commits. No live Supabase migration was applied.
- Latest GitHub commit status reports Vercel failure with the build-rate-limit upgrade URL. No additional Vercel build/deploy was initiated.
- Continue with the staged Auth UUID ownership migration review and migration-history reconciliation before any production database change.
