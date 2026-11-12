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


## Storage image-reference normalization — 2026-11-10

### Finding
- Product-image cleanup compared complete public URLs as raw strings. The same Storage object referenced with an added query string or fragment could fail the exact comparison and be treated as unreferenced.
- This was a fail-open reference-matching gap: cleanup could remove an image still referenced by another product, an order snapshot, or storefront configuration when URL variants were present.

### Correction
- Added `collectReferencedProductImagePaths` to normalize public Storage URLs to decoded object paths.
- Product image cleanup now compares object paths, ignoring query strings and fragments while requiring the exact Storage origin and bucket path.
- Added regression tests for query strings, fragments, percent-encoded path segments, unrelated origins/buckets, malformed URLs, and invalid prefixes.
- No existing Storage objects or database rows were modified or deleted.

### Read-only Storage review
- `storefront-media` currently contains 12 objects, all under the `products/` prefix.
- `public.storefront_media` currently contains 0 rows; product image references are stored on product rows and historical order snapshots rather than in this storefront-editor metadata table.
- Existing Storage objects were retained. No orphan cleanup was attempted because historical references must be preserved.

### Verification
- Build check run 1146: passed; automated tests 208 passed, 0 failed; Vite production build passed.
- Dependency security audit run 742: passed.
- CodeQL run 743: still in progress at the time of this entry.
- Vercel Preview remains blocked by the team's build-rate limit. No merge or Production deployment was performed.


## Historical storefront restore validation hardening — 2026-11-10

### Audit finding
- The version-history list and “restore to draft” workflow already existed; the earlier audit note that no restore UI existed was stale and has been superseded by the 2026-11-07 implementation.
- The existing restore handler checked only the top-level arrays/object. It did not validate duplicate/empty category or banner IDs, category parent references, banner destination protocols, or site-setting length limits before putting a stored snapshot into editor state.

### Correction
- Added `normalizeRestorableStorefrontSnapshot` to validate and copy historical snapshots before any editor state is changed.
- Validation now checks section types and supported counts, category IDs/names/parent hierarchy, banner IDs/titles/subtitles and HTTP(S)-only destinations, and the same site-setting length bounds used by publish validation.
- The restore handler now fails closed with a clear message if validation fails. Valid versions still load only into the draft editor, require confirmation, and are never published automatically.
- Added four regression tests covering valid non-mutating restore, duplicate category IDs, unsafe banner destinations, oversized settings, invalid parent references, and malformed sections.

### Data safety
- No historical versions, storefront config rows, Storage objects, orders, products, or customer data were changed.
- Live `storefront_versions` and `storefront_config` row counts remain 0 at the time of the read-only check. The existing admin-only SELECT policy remains in place; no database permissions or policies were modified.
- Existing append-only transactional publish RPC remains unchanged.


### Verification — historical restore hardening
- Build check run 1151: passed; `npm test` reported 212 tests, 0 failures; Vite production build completed.
- Dependency security audit run 747: passed.
- CodeQL run 748: completed successfully.
- The Vercel Preview check remains blocked by the existing build-rate limit; no Preview or Production deployment was made.
- PR #87 remains Draft and unmerged.


## Storefront and product media upload / metadata integrity audit — 2026-11-10

### Code-path review
- Reviewed the storefront category/banner upload flow in `src/App.jsx` and product image upload/save/cleanup flow in `src/components/AdminDashboardPro.jsx`.
- Storefront uploads accept only JPEG, PNG, WEBP, or GIF data URLs, verify file signatures, enforce a 5 MiB per-image limit, use cryptographically random non-overwrite Storage paths, and require an authenticated primary-admin session.
- A new storefront Storage object is added to the rollback list immediately after Storage confirms the upload and before the metadata insert. The `storefront_media` row is then inserted with the path, public URL, file name, MIME type, byte size, folder, visibility, and creator ID.
- If the metadata insert fails, the outer save/publish flow attempts to remove the just-uploaded object and its metadata. If the config/publish request outcome is ambiguous, the code intentionally retains uploaded assets rather than risk deleting files referenced by a transaction that may have committed.
- Product uploads use separate product-owned paths and do not use `storefront_media`; they preserve existing product image URLs and track newly uploaded photos for rollback if the product write definitely fails.

### Live read-only database and Storage inspection
- `storefront-media` contains 12 objects (2,413,683 bytes total). All 12 are JPEGs and each is below the 5 MiB bucket limit; all observed paths are under `products/<product-id>/`, not the storefront categories/banners folders.
- The live `public.storefront_media` table contains 0 rows. This is consistent with the observed object inventory: there are no category/banner objects in this bucket requiring storefront-editor metadata rows. Product image paths are represented on product rows and order snapshots, not in `storefront_media`.
- The live products table has 8 rows with a non-empty main image; 2 of those main image URLs point to the managed `storefront-media` bucket. The Storage inventory was retained unchanged; no files, metadata, products, orders, or settings were modified.
- The metadata table has a unique constraint on `storage_path`, non-empty path/URL checks, a non-negative size check, and a foreign key to Auth users with `ON DELETE SET NULL` for `created_by`.
- RLS policies are scoped to the fixed primary-admin user and trusted `app_metadata.role = 'admin'` for metadata insert/update/delete and Storage object upload/update/delete. Metadata reads are public only for rows marked `is_public = true`, otherwise admin-only. No policy or bucket configuration was changed.

### Findings and decision
- No broken upload/metadata ordering or unsafe rollback path was found in the reviewed storefront flow. It fails closed on upload/metadata errors and avoids deleting assets when the database transaction outcome is uncertain.
- The current 0-row metadata count is not evidence of missing product metadata; the 12 live objects are product images, which intentionally use product-row references instead of the storefront metadata table.
- No destructive cleanup was attempted. The remaining 10 objects beyond the two managed main-image references may include gallery or historical/test references; they are intentionally retained until a complete reference audit can prove they are unused.
- No code or database change was required in this stage. No Preview or Production deployment was performed; PR #87 remains Draft and unmerged.


## Product-image historical-reference audit and legacy-message cleanup guard — 2026-11-10

### Live read-only reference audit
- Inspected all 12 objects in `storefront-media` against current product main-image URLs, product galleries, order item image snapshots, checkout request/result JSON, legacy `messages.image`, support-ticket text, storefront draft/published configuration, and immutable storefront version snapshots.
- 4 Storage objects are directly referenced by product main-image/gallery URLs. 8 objects have no direct URL reference in the inspected records.
- Of those 8 unreferenced objects, 6 are in two product folders whose product IDs no longer exist in the current products table; 2 are extra historical files in a folder for a product that still exists. No assumption was made that these files are safe to delete: all 12 remain untouched.
- The live orders table contains one order line item without an image snapshot. Its product still exists and has a current image. Existing cleanup logic recognizes order items without image snapshots and retains the entire affected product image set to preserve the historical order detail fallback.
- No current product-bucket URL was found in legacy message image fields, support-ticket text, checkout JSON, or storefront configuration/version snapshots. Storefront config/version tables currently contain no rows.

### Code hardening
- Extended product image cleanup's reference scan to include every paginated legacy `messages.image` reference before deleting product-owned Storage paths.
- The message reference query uses the same authenticated, paginated read helper as the other reference sources. If the query fails, the cleanup remains fail-closed and does not delete images.
- Added `collectReferencedLegacyMessageImageUrls` and a regression test covering valid URL retention and ignoring blank/data-image values.

### Verification and safety
- Ran the isolated Node test file for `productImageCleanup`: 6 tests passed, 0 failed.
- Full repository test suite and Vite production build were not run on this latest commit; no GitHub Actions run was surfaced for this commit. The Vercel status remains blocked by the existing 24-hour build-rate limit.
- No Storage objects, metadata, products, orders, messages, support tickets, or storefront configuration were modified. No orphan image was deleted.
- No Preview or Production deployment was performed. PR #87 remains Draft and unmerged.


## Support conversation and attachment persistence audit — 2026-11-10

### Live read-only findings
- `public.messages` (14 rows), `public.support_tickets` (3 rows), and `public.support_ticket_messages` (5 rows) have RLS enabled. Legacy chat rows are readable/updatable/deletable only by the fixed primary admin identity plus trusted `app_metadata.role='admin'`; support tickets permit validated public INSERT and admin-only SELECT/UPDATE/DELETE; support conversation messages have admin-only direct SELECT and are read/written for customers through narrowly scoped private RPCs.
- Existing ticket history is intact: 3 ticket headers and 5 thread messages were found. No ticket or message rows were changed.
- The only live Storage bucket remains `storefront-media`; it is public for product images and contains 12 objects. There is no live `support-attachments` bucket, and Supabase reports zero deployed Edge Functions. Therefore the attachment migration and `support-attachments` Edge Function in this Draft PR are staged only; customer support photo upload is not active in Production yet.
- The staged attachment design uses a private bucket, 5 MiB cap, JPEG/PNG/WEBP signature validation, ticket-scoped random paths, ticket authorization, signed URLs with 10-minute expiry, and a restrictive Storage policy denying direct anon/authenticated access. Existing support messages remain readable through the legacy RPC until the additive attachment RPC migration is installed.

### Reliability correction
- Found a failure-mode risk in `supabase/functions/support-attachments/index.ts`: after the Storage upload, an RPC error caused immediate object deletion. If the RPC committed but its response was lost, this could leave a persisted message pointing to a deleted photo.
- Changed the error path to query the message table by the exact attachment path before cleanup. If the committed row is found and matches the ticket/request IDs, the function returns the verified saved result. If the reference query itself fails, it retains the object and returns a retryable 503. It removes the object only after a successful read proves no message references it; cleanup failure is logged and does not affect message data.
- Added `canRemoveSupportAttachmentAfterFailedSave` and a regression test for successful absence checks, existing references, and uncertain verification failures.

### Verification and release safety
- Live schema/policy/function inventory was read-only. No migration was applied, no Edge Function deployed, and no Storage bucket/object or customer record was created, changed, or deleted.
- The attachment migration remains staged and must be reconciled with live migration history before the combined release; do not manually create the bucket or deploy the function independently.
- Automated verification for this correction is pending; no full repository test suite/build is claimed in this entry.
- PR #87 remains Draft and unmerged. No Preview or Production deployment was performed.


### Follow-up verification — support attachment staging and release gate — 2026-11-10

- Rechecked the live Supabase migration history: the latest applied migration is `20261110133651`; the staged support attachment migration `20261110155000_support_ticket_attachments` and read-receipt migration `20261110153000_support_ticket_read_receipts` are not applied.
- Confirmed the live schema does not yet contain the attachment columns on `support_ticket_messages`; the only live bucket is public `storefront-media` (12 objects). The private `support-attachments` bucket is absent and the deployed Edge Function inventory is empty.
- Rechecked the staged Edge Function configuration: `verify_jwt = false` is intentional for guest ticket access, while the function performs its own ticket-token/account/admin authorization before upload or signing. Direct Storage access is designed to be denied; image URLs are short-lived signed URLs (10 minutes).
- Re-ran an isolated Node 22.16.0 verification harness for the fetched support attachment/thread helper logic and regression scenarios: 11 tests passed, 0 failed. This is focused helper verification only; it is not the full repository test suite or a full Edge Function integration test.
- No migration was applied, no Edge Function deployed, and no bucket or Storage object created. All 3 support tickets, 5 thread messages, and 14 legacy messages remain unchanged.
- Decision: keep the attachment migration and function staged for the combined release; do not deploy either independently. Before release, apply the migration and deploy the function as one coordinated step, then verify guest/account/admin access, signed URL expiry, and upload retry/idempotency against a non-production test ticket.
- PR #87 remains Draft and unmerged. No Preview or Production deployment was performed.


## Storefront product-detail modal CSS audit — 2026-11-10

### Static stylesheet measurements
- Reviewed the complete current `src/index.css` from the audit branch: 438,879 characters, 9,631 lines, 202 media-query blocks, and 6,726 `!important` declarations.
- The product-detail modal surface is spread across multiple distant stylesheet sections. Static selector occurrence counts: `.gs-product-modal` 9, `.gs-product-dialog` 16, `.gs-product-modal-header` 12, `.gs-product-modal-body` 18, `.gs-product-detail-image` 10, `.gs-product-modal-cta` 13, and `.gs-product-modal-purchase-bar` 7.
- The same modal rules are restated at multiple later source positions, including desktop layout, 760/767/700/640px mobile breakpoints, and the final small-screen responsive block. Later declarations intentionally override earlier ones; simple deduplication or moving rules could change the cascade.

### Behavior and risk review
- The current modal layout uses a flex-column dialog, a separately scrolling modal body, and a purchase bar/CTA kept in the dialog's flex flow (the stable layout section explicitly resets positioning to `relative`). This overlap-prevention behavior must not be lost during consolidation.
- Mobile rules also use dynamic viewport units, safe-area insets, wrapping labels/prices, and narrow-screen overrides. These must remain intact for iOS and small screens.
- No definite functional CSS defect could be established from static source inspection alone. The multiple overrides are a maintainability risk, not proof that the current rendered modal is broken.

### Decision and verification boundary
- No CSS declaration was removed, reordered, or rewritten in this pass. Consolidating this surface without a current desktop/mobile browser baseline and visual regression check could reintroduce previously reported button clipping/positioning problems.
- No test suite, Vite build, or browser visual test was run for this documentation-only audit entry.
- No application code, product data, customer data, orders, messages, or Storage objects were changed. No Preview or Production deployment was performed.
- Next scoped review: product catalogue cards and category/filter layout. Keep each CSS consolidation isolated and require CI build plus desktop/mobile visual comparison before treating it as complete.
- PR #87 remains Draft and unmerged.


## Storefront catalogue, category and filter audit — 2026-11-10

### Static review
- Reviewed `src/components/StoreView.jsx` (1,303 lines) and the full current `src/index.css`.
- CSS selector/class occurrence counts in the stylesheet: `.gs-category-grid` 19, `.gs-category-card` 92, `.gs-category-photo` 13, `.gs-subcategory-panel` 12, `.gs-subcategory-chip` 11, `.gs-filter-panel` 100, `.gs-catalog-controls` 58, `.gs-price-filter` 52, `.gs-sort-control` 27, `.gs-catalog-product-grid` 26, `.gs-catalog-product-card` 14, `.gs-catalog-product-media` 26, `.gs-catalog-product-info` 30, and `.gs-catalog-product-cta` 24. These are source occurrence counts, not rendered element counts.
- Category and subcategory selection, category counts, breadcrumbs, price range, sorting, empty state, and pagination are all wired in the component.
- Verified static safeguards: changing category/subcategory/price/sort resets page to 1; negative price input is rejected; min > max is detected and produces an alert; page size is 12; pagination controls have disabled states and `aria-current`; category cards support Enter/Space keyboard activation.
- Mobile filter styling has a dedicated <=760px layout, with a <=380px compact override. Product cards switch to a two-column grid at <=760px and use min-width:0 / bounded CTA styles to reduce overflow risk.

### Identified accessibility concern (not changed in this pass)
- Product media container at StoreView.jsx around lines 750–788 has an `onClick` and pointer cursor but is a plain `div` without keyboard activation or button semantics. It also contains separate wishlist and comparison buttons. Simply adding `role=button`/tabIndex to this parent would create nested interactive controls and is not a safe fix. The product title and CTA button provide separate ways to open the detail view, but the clickable image area itself is not keyboard-operable. A future isolated refactor should make the image action accessible without nesting interactive elements.

### Decision and verification boundary
- No catalogue/filter logic or CSS was changed. Static review did not establish a confirmed visual overflow defect; rendered desktop/mobile comparison is unavailable because the current Preview build is blocked by the Vercel Free-plan build-rate limit.
- No test suite, build, or browser visual test was run for this documentation-only pass.
- No products, categories, stock, orders, customer messages, or Storage objects were modified.
- No Preview or Production deployment was performed. PR #87 remains Draft and unmerged.
- Next review: catalogue card accessibility and category image handling, followed by shared responsive layout rules. Preserve all existing card actions and data.


## Catalogue image accessibility fix and category-image pipeline audit — 2026-11-10

### Fix applied
- Replaced the product-media wrapper's non-semantic click handler with a dedicated native `button type="button"` covering the image area. It has an accessible name containing the product name and visible keyboard-focus styling.
- The image/fallback artwork is marked decorative and does not intercept pointer events. The hover overlay no longer intercepts clicks.
- Wishlist and comparison buttons remain separate sibling controls above the image-open button; their actions and accessible labels are preserved. This avoids nested interactive elements.
- Added `tests/catalogueImageAccessibility.test.js` with structural assertions for the native button, accessible name, focus style, decorative image, and preserved wishlist/comparison actions.

### Category image pipeline review
- Admin category image upload validates JPEG/PNG/WEBP/GIF signatures and the 5 MiB limit before creating a data URL; FileReader errors and invalid data URLs are handled.
- Editing initializes image state from the current category image, so saving a category name/icon does not silently blank its existing photo.
- Storefront draft save and publish both validate category snapshots and route data URLs through the shared upload helper, which rechecks MIME/signature/size, uses random non-overwrite Storage paths, tracks uploaded assets, and persists public URLs into the snapshot.
- Existing HTTP(S) category image URLs are retained; unsupported protocols are rejected. Category cards use the admin-provided image first and the existing category-name fallback otherwise.
- No category image, Storage object, category, product, order, or message was changed during this audit.

### Verification boundary
- Static source assertions confirmed the new product image button is present, the old clickable wrapper is absent, focus styling and accessible name are present, and wishlist/comparison controls remain in the media region.
- The added Node test file was reviewed but could not be executed in this environment; no full `npm test`, build, or browser/keyboard test is claimed.
- No Preview or Production deployment. PR #87 remains Draft and unmerged.
- Next audit stage: shared responsive rules and focus/hover behavior across category tiles and product cards, without broad CSS consolidation.


## Catalogue responsive and focus-state audit — 2026-11-10

- Narrowed catalogue image-area direct-button CSS sizing to `button[aria-pressed]` so only wishlist/compare actions receive circular control dimensions; the full-image detail button retains full-area sizing and keyboard focus.
- Removed the product-title heading click handler; image and CTA buttons remain the detail-opening controls. Category-card focus-visible and product CTA focus-visible rules already exist.
- Responsive grid rules cover five desktop, three medium, two mobile columns and single-result layout. Category image validation/upload pipeline was reviewed in the prior entry.
- Static checks only; no Node test/build/browser verification is claimed. No data or deployments changed. PR #87 remains Draft and unmerged.


## Catalogue breakpoint cascade audit — 2026-11-10

- Found the final mobile-polish block used selectors with lower specificity than earlier `.geostore-fashion-store .geostore-storefront ...` rules. Its catalogue metadata, vendor/rating, price, CTA, and category-card styles therefore could not reliably override the earlier storefront rules.
- Raised those final-block selectors to the existing storefront scope and matched the category tile's actual `h4` heading (the prior selector targeted `h3`, which the tile markup does not contain).
- Raised the <=380px product-grid and product-info selectors to the same specificity as the earlier narrow-screen rules so the intended 9px grid gap and 8px inline padding can take effect.
- No broad CSS cleanup; only the final mobile-polish selectors were corrected. This is a source-level cascade correction, not a claim of verified rendered appearance.
- Added targeted assertions for the final-block selectors. No build or browser visual test was run; no product, category, order, message, stock, or Storage data changed. No deployment; PR #87 remains Draft and unmerged.

## Wishlist and product comparison audit — 2026-11-10

- Confirmed wishlist and comparison collections are isolated by guest/user storage keys; account switches save the outgoing collection and load the next owner's collection. Legacy unscoped values are migrated to the guest key without deleting the source key.
- Collection sanitization removes malformed entries and duplicate/empty IDs; wishlist is capped at 100 and comparison at 4. Public-facing views resolve saved IDs against the current published catalogue, so saved snapshots do not control displayed price, image, or stock.
- Fixed a comparison-modal defect: products with custom variants or size/color inventory could not be added to cart from the comparison view because no variant selector was present. The modal now offers only validated in-stock variants and passes the selected variant ID, size/color, current price, and stock into the existing cart validator. The action is disabled when no valid variant or no stock is available.
- Corrected stock-state presentation: zero stock is now shown as unavailable (not green/in-stock), and the cart action is disabled for unavailable products.
- Storage remains browser-local and account-scoped; it is not cross-device/server wishlist synchronization. No Supabase tables, product/order/message/stock records, or Storage objects were changed.
- Static source assertions verified all expected patch anchors and resulting JSX control paths. Full Node suite, production build, and browser interaction test were not run in this environment.
- No Preview or Production deployment. PR remains Draft and unmerged; cumulative release is awaiting explicit user approval.

- Follow-up verification: comparison now also requires explicit legacy size and/or color selection when a product exposes option lists without a size/color inventory matrix. Eleven targeted static source assertions passed on the final comparison component. This is source-level verification only; CI is still running and no local full test/build result is claimed.

## Product ratings and customer reviews audit — 2026-11-10

- Confirmed there is no product-review table in the live Supabase schema and no review-specific Storage bucket. Customer reviews currently live only in browser localStorage under `geostore_product_reviews`; the admin panel has no central review moderation/inbox. Reviews therefore do not synchronize between devices or customers and are not centrally moderated. This limitation is disclosed next to the form in Georgian, English, and Russian.
- Hardened local review submission: author is capped at 80 characters, review text at 1,200 characters, rating must be an integer from 1 to 5, review images are capped at 1 MB and checked as real image data URLs, and no more than 100 reviews may be added per product.
- Review writes now happen before UI state changes. If browser storage is unavailable or quota is exceeded, the form reports the failure instead of showing a success-like state. Removed the silent mount-time localStorage rewrite, so malformed legacy storage is not automatically overwritten.
- Existing local review records are preserved when adding a new review; malformed per-product collections fail closed instead of being replaced. Added focused Node tests for validation, image checks, legacy-data preservation, review limits, and storage failures.
- No database migration was applied, no Supabase tables/buckets/policies were created or modified, and no product/order/message/customer data or Storage objects were changed. Centralized server-side review submission, moderation, and image storage remain a separate staged implementation requirement; no cross-device synchronization is claimed.
- No Preview or Production deployment. PR remains Draft and unmerged; cumulative release awaits explicit user approval.


## Centralized product reviews architecture audit — 2026-11-10

- Rechecked the live Supabase schema: there is no `public.product_reviews` table and no review-specific Storage bucket. The live catalogue uses text product IDs (`public.products.id`); any future review relation must preserve that exact type and must not cascade-delete review history when a product is removed.
- Confirmed the storefront still reads and writes `geostore_product_reviews` in browser localStorage. The current review form and product-card average are therefore device-local only; the admin panel has no review queue or moderation controls. No server synchronization is implemented or claimed.
- Confirmed the existing primary-admin authorization pattern in live RLS policies and privileged RPCs: `auth.uid() = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'` AND `auth.jwt()->'app_metadata'->>'role' = 'admin'`. Future moderation operations must reuse this exact check; an authenticated session alone is not sufficient. Do not use user-editable `user_metadata` for authorization.
- Confirmed the existing `private` schema contains deny-by-default rate-limit storage and that support attachments use a private Storage bucket, strict MIME/size/path validation, server-side authorization, and short-lived signed access rather than unrestricted public uploads. These are the safer established patterns to adapt for review submissions and photos.
- Security design required before implementation:
  - Add an additive `product_reviews` table referencing `products(id)` with `ON DELETE RESTRICT`, status constrained to `pending | approved | rejected`, bounded author/comment fields, integer rating 1–5, optional account UUID, server timestamps, and a server-generated review ID. Never accept a client-supplied approval status, verified-purchase claim, or moderation actor.
  - Enable RLS and explicitly grant only the minimum required table privileges. Supabase's 2026-10-30 Data API exposure change means a new public table must not be assumed automatically exposed; any explicit exposure must be intentional and paired with RLS.
  - Public catalogue reads must expose approved reviews only. New submissions must enter as pending. Public clients must not be able to approve, reject, enumerate pending reviews, or update moderation fields.
  - Moderation must use a narrowly scoped private-schema RPC or equivalent server-side path with the exact existing primary-admin identity check, explicit execute grants, fixed search_path, and an audit-log entry. Do not add a broadly callable SECURITY DEFINER function in the exposed public schema.
  - Review photos must use server-validated image signatures, a strict byte limit, opaque product-scoped paths, and a private bucket or another access-controlled delivery design. Do not permit arbitrary anonymous Storage object writes. Add rate limiting for anonymous submissions using a private hashed-key design; do not store raw IP addresses.
  - Rating averages and counts must be computed from approved rows only. Review listing must be paginated and product-scoped.
  - Existing localStorage reviews are legacy browser data. Do not silently import, overwrite, or delete them; provide a deliberate migration/import path that can preserve records and identify their unverified legacy origin.
- Live database inspection was read-only. No table, policy, function, bucket, Storage object, review, product, order, message, or customer record was created, changed, or deleted.
- The local environment does not have the Supabase CLI installed. Per the Supabase migration workflow, no hand-invented migration filename was created and no migration was applied. A migration must be generated with `supabase migration new` in a Supabase CLI-enabled project environment before implementation proceeds.
- No Preview or Production deployment. PR #87 remains the cumulative Draft audit PR and must not be merged or deployed before explicit user approval.


## Supabase CLI environment issue resolved — 2026-11-10

- The local execution container has no outbound DNS/network access, so direct npm/official-binary installation was not possible there. Resolved this without changing the user's machine or adding persistent tooling dependencies to the application.
- Used a temporary GitHub Actions workflow on the audit branch to install the official Supabase CLI v3.1.0 via `supabase/setup-cli@v3`, verified `supabase --version`, and ran the required `supabase migration new product_reviews` command successfully.
- The CLI generated `supabase/migrations/20261110194917_product_reviews.sql`. The workflow was then removed and its duplicate empty migration stub was deleted; only the single CLI-generated migration scaffold remains.
- The migration file is intentionally still empty. No SQL has been written into it yet, no migration has been applied, no Supabase branch/database/bucket/function/policy was created or changed, and no Production data was touched.
- The temporary workflow was removed from the repository after successful CLI execution; no ongoing automation or new app dependency remains.
- The earlier note that the CLI was unavailable is superseded by this resolution. The CLI setup blocker is now resolved; implementation can proceed in the generated migration file on the audit branch only.


## Product reviews database foundation staged — 2026-11-10

- Filled the CLI-generated migration `supabase/migrations/20261110194917_product_reviews.sql` with an additive schema foundation. The filename was generated by the official Supabase CLI v3.1.0 using `supabase migration new product_reviews`; it was not hand-invented.
- The staged table uses the existing text `products.id` type and `ON DELETE RESTRICT` so product deletion cannot erase review history. It constrains author names to 80 characters, review text to 1,200 characters, ratings to integer values 1–5, and moderation state to pending/approved/rejected.
- RLS permits public reads only for approved reviews attached to published products. A minimal `anon` column grant for `products.is_published` was added because the review RLS policy checks that field; the existing products RLS policy continues to hide unpublished products.
- Public Data API roles receive only the review display/moderation columns. Author account UUID and moderator UUID remain ungranted. Direct anon/authenticated INSERT, UPDATE, and DELETE are not granted; trusted server-side code will create pending reviews.
- Added a private, fixed-search-path SECURITY DEFINER moderation function and a public SECURITY INVOKER wrapper. Both are execute-restricted; the private function verifies the exact existing primary-admin UUID and `app_metadata.role = admin`, locks the review row, permits only approve/reject, and records moderation through the existing private admin activity logger.
- The new product foreign key also means product deletion will be blocked while reviews exist. The admin delete RPC/UI still needs a clear, friendly “review history exists” message; that is a tracked follow-up, not a reason to weaken the foreign key.
- Static source assertions on the staged migration checked the table, foreign-key protection, bounds, pending default, published/approved RLS, exact admin identity and app_metadata guard, restricted moderation grants, private audit logging, and invoker wrapper. This is source-level validation only; no live migration, SQL parser, local Postgres, or database integration test was run.
- Still not implemented: trusted review-submission Edge Function and anonymous rate limiting, private review-image bucket/upload and signed image delivery, admin review inbox UI, storefront server read/submit integration, approved-only rating aggregation, and deliberate legacy localStorage import. Existing browser reviews remain untouched and no cross-device sync is claimed yet.
- The migration remains staged on the audit branch only. No Supabase migration was applied; no table, policy, function, bucket, Storage object, product, order, message, or customer record was changed in Production. No Preview or Production deployment.


## Product review submission service staged — 2026-11-11

- Added the staged `product-reviews` Edge Function. It accepts guest submissions but validates any supplied signed-in session with Supabase Auth; the exact primary-admin identity and `app_metadata.role` check is reserved for access to pending-review images. Client-supplied status, moderator, account ID, and verified-purchase claims are ignored.
- Server validation enforces a published product ID, author name 1–80 characters, review text 1–1,200 characters, integer rating 1–5, UUID request key, JSON request size cap, and JPEG/PNG/WebP image signature plus a 1 MB maximum.
- Submission is idempotent through a unique `submission_key`; on ambiguous insert outcomes the function checks the durable row before cleanup. Uploaded files are retained if persistence verification is uncertain.
- Added HMAC-SHA256 rate-limit keys derived from the server secret. The staged migration adds a private hashed-key table and an atomic database-backed limiter: 5 submissions/hour per IP and 3/hour per authenticated account. Raw IPs and account IDs are not stored in the rate-limit table; missing IP for a guest fails closed.
- Added a private `product-review-images` Storage bucket with a 1 MB MIME allowlist and no anonymous/authenticated Storage object policies. The Edge Function signs only paths that exist in the review table; public callers may sign approved images only, while the exact primary admin may sign pending/rejected review images. Signed URLs expire after 10 minutes.
- Extended the already CLI-generated, still-unapplied product-review migration with the idempotency key, rate-limit storage/function, and private bucket declaration. No new migration filename was invented.
- Added Node tests for payload bounds, rating validation, MIME/signature checks, image size, opaque image paths, and client IP extraction. The focused helper suite ran under Node 22.16.0: 10/10 tests passed. This is not the full repository suite; Edge Function runtime, Supabase SQL parser, and database integration remain to be verified.
- The migration and Edge Function are staged on the audit branch only. No migration was applied, no Edge Function was deployed, no Storage bucket/object or live database record was created or changed, and no Preview or Production deployment occurred.


## 404 repository-path correction and product-review migration repair — 2026-11-11

- Corrected the GitHub repository owner used by the maintenance workflow: the canonical repository is `chixradzezauri-design/geostore`. Previous requests omitted the `za` sequence in the owner and therefore returned 404. This was a tooling/repository-address typo, not a missing project file.
- Re-read the exact audit-branch migration `supabase/migrations/20261110194917_product_reviews.sql`. The private rate-limit function had a truncated regular-expression condition and the remainder of its body was duplicated after the bucket declaration.
- Replaced the damaged function section with one complete, atomic upsert-based rate limiter. It now validates the 64-character HMAC hash and rejects null/out-of-range attempt and time-window arguments before writing. Removed the duplicate function/bucket SQL tail.
- Added source-structure regression tests for the migration so the truncated condition, duplicate function definition, and duplicate bucket declaration are detected by the repository test suite.
- The corrected migration remains staged on the audit branch. It has **not** been applied to Supabase; no live table, policy, function, bucket, Storage object, product, order, message, customer or review data was changed. No Preview or Production deployment occurred.


## Product reviews storefront/admin integration boundary audit — 2026-11-11

- Re-read the staged product-review migration, Edge Function, validation helper, storefront review form, and admin dashboard on the current Draft PR head.
- The staged server layer is present: bounded review validation, verified optional user sessions, pending-by-default inserts, HMAC-keyed atomic rate limiting, private image bucket declaration, and short-lived signed image URLs. Moderation uses the fixed primary-admin UUID plus trusted `app_metadata.role = 'admin'` and writes to the existing admin activity log.
- Confirmed the storefront is not yet connected to that service: `StoreView.jsx` still initializes `allReviews` from `geostore_product_reviews`, persists new reviews to localStorage, and displays the device-local storage notice. Its displayed count/list still come from that local collection.
- Confirmed `AdminDashboardPro.jsx` has no product-review fetch, moderation action, or review inbox. The database moderation RPC exists only in the staged migration; it is not exposed through an admin UI yet.
- Live read-only verification confirms `public.product_reviews` is absent, the `product-review-images` bucket is absent, and Supabase reports no deployed Edge Functions. Therefore the staged Edge Function and migration are not active in Production.
- Important release dependency: the new Edge Function must be deployed only after the matching migration has been applied, and the storefront/admin UI must not assume the new table or function exists before that release sequence. Existing localStorage reviews must remain readable and must not be silently deleted or auto-imported.
- No code, migration, database, policy, bucket, Storage object, product, order, message, customer, or review data was changed in this audit step. No Edge Function was deployed. No Preview or Production deployment occurred.
- Verification is source review plus read-only live schema/function inventory only; no local SQL parser, Edge runtime integration test, full repository test suite, or browser test is claimed.
- PR #87 remains Draft and unmerged; cumulative release still requires explicit user approval.

## Product review image persistence recovery fix — 2026-11-11

### Finding
- In the product-review Edge Function's image-upload path, an insert can commit while its response is lost. The follow-up idempotency lookup then finds the persisted review, but the previous recovery branch unconditionally deleted the newly uploaded image.
- When the persisted review referenced that exact image path, this could leave a pending review with a broken private image reference.

### Correction
- The recovery lookup now also selects `image_path`.
- Added `canRemoveReviewImageAfterFailedInsert`: cleanup is permitted only after a successful verification proves the uploaded path is not referenced by the persisted row, or proves no row exists. Verification errors and incomplete lookup rows fail closed.
- Storage cleanup errors are logged and do not replace the verified review result.
- Added regression tests for referenced images, unreferenced images, idempotent replay with a different path, verification failure, and incomplete lookup data.

### Safety and verification
- Updated the staged Edge Function, validation helper, and focused Node test file on the audit branch only.
- No migration was applied; no Edge Function was deployed; no Storage object or database row was changed. No customer review, order, product, message, or other production data was touched.
- Tests have been added but have not yet been executed in this environment; no test pass or build success is claimed.
- PR #87 remains Draft and unmerged. No Preview or Production deployment was initiated.


## Product review API adapter preparation — 2026-11-11

- Added `src/utils/productReviewsApi.js` as a separate, testable adapter for the staged product-review service. It reads only approved rows for one product, maps the database fields to the existing storefront review shape, and requests short-lived image URLs through the Edge Function's `sign-images` action.
- The adapter never turns private Storage paths into public URLs. If signing is temporarily unavailable, review text remains readable and the image is omitted rather than exposing the opaque path.
- Added a submission adapter that validates the existing review fields and sends submissions only through the `product-reviews` Edge Function with a cryptographically random UUID idempotency key. It returns moderation state explicitly and does not insert pending reviews into the public list.
- Added focused Node tests for approved-only query filters, private image signing/failure behavior, database errors, secure submission payloads, pending moderation state, invalid input, and cryptographic request IDs.
- This is preparation only: `StoreView.jsx` is not yet switched to the adapter. Existing browser-local reviews remain untouched and readable; no automatic import or deletion is introduced.
- The migration remains unapplied and the Edge Function remains undeployed. No live database, Storage, customer, review, order, product, or message data changed. No Preview or Production deployment occurred.
- Tests have been added but not executed; no test/build success is claimed. PR #87 remains Draft and unmerged.


## Storefront product review Supabase integration — 2026-11-11

- Connected `StoreView.jsx` to the staged product-review API adapter. Product detail views load server-approved reviews; catalogue ratings and counts combine approved server reviews with pre-existing browser-local legacy reviews.
- Existing `geostore_product_reviews` localStorage data remains readable and is not rewritten, automatically imported, or deleted.
- New submissions go through the Edge Function. Pending reviews are not optimistically inserted into the public list; the form confirms moderation-pending status only after server acceptance. Form content remains when submission fails.
- Added localized loading, submission, and error states in Georgian, English, and Russian, plus duplicate-submit protection.
- The integration is staged only. The matching database migration and Edge Function have not been deployed; no production review, order, product, message, or Storage data was changed. No Preview or Production deployment occurred.
- Source commit: `55ca262bbe7a912044799768388812ae785e57cf`. Tests/build have not been executed for this stage. PR #87 remains Draft and unmerged.


## Admin product-review moderation panel — 2026-11-11

- Added a dedicated admin navigation entry and review queue for pending, approved, rejected, and all reviews.
- Admin review records are loaded through Supabase RLS; approval/rejection uses the database `admin_moderate_product_review` RPC, which enforces the primary-admin identity and writes the existing admin activity log.
- Private review image paths are never rendered directly. The admin requests short-lived signed URLs in batches of at most 40, matching the Edge Function bound.
- Review moderation state updates locally only after the RPC succeeds; errors remain visible and do not falsely mark a review as moderated.
- Staged on the audit branch only. The migration and Edge Function remain undeployed; no production data or Storage objects were changed. No Preview or Production deployment occurred. Tests/build have not been executed for this stage.
- Source commit: `2666dc91616cf6464212ec66686b31571da0d07d`. PR #87 remains Draft and unmerged.


## Product-review CI failure diagnosis and test-fixture correction — 2026-11-11

- Inspected failed GitHub Actions run `42964305403`: 247 of 248 tests passed; the sole failure was `tests/productReviewsApi.test.js` test "rejects invalid review input and unconfirmed server responses".
- Root cause was an incomplete mock in the test itself: it omitted the `from()` method required by the adapter's initial client-interface guard. The assertion expected rating validation, but the mock failed earlier with "review service unavailable".
- Corrected the mock to provide `from()`, allowing the intended invalid-rating, invalid-image, and unconfirmed-response assertions to execute. No production application code or data was changed by this correction.
- Supabase production inspection confirms `public.product_reviews` and its moderation RPCs are not installed yet. This is expected for the staged release; no migration was applied.
- Security review: admin data reads remain behind the primary-admin RLS policy; approve/reject calls use the RPC that checks the fixed admin UUID and trusted `app_metadata.role`. Image signing is limited to approved reviews for non-admin users and to 40 paths per request.
- Test correction commit: `adce1a8396ff0d6dd5d26862125149b575d4ecb7`. Re-run of CI is pending; no build success is claimed.


### CI rerun result — 2026-11-11

- Re-ran the cancelled Build check for test-fix commit `adce1a8396ff0d6dd5d26862125149b575d4ecb7`.
- Confirmed automated tests: **248 passed, 0 failed**.
- Confirmed production build: **1547 modules transformed; build completed successfully in 3.93 seconds**.
- This verifies the application source at the test-fix commit. The subsequent branch-head changes are audit-log documentation only; no application source changed after the successful test/build.


## Product-review moderation pagination hardening — 2026-11-11

### Finding
- The admin review queue used an un-ranged Supabase SELECT. Supabase applies a configured maximum-row response cap to such queries, so a growing review table could silently omit older reviews from the moderation queue and its filter counts.

### Correction
- Added a bounded, deterministic paginated loader (500 rows per request, maximum supported page size 1,000) ordered by creation time and stable review ID.
- The admin queue now loads all pages before updating its visible review list. A page error fails the load and surfaces the existing error state rather than presenting a partial result as complete.
- Private image signing remains batched at no more than 40 paths per Edge Function request; no raw Storage paths are rendered.

### Verification and safety
- Added focused tests for multi-page retrieval, stable ordering, empty tables, database errors, and invalid page sizes.
- This is a source-only change on the Draft audit branch. No Supabase migration, Edge Function, live review/order/product/message data, Storage object, or SSO setting was changed.
- No Preview or Production deployment was initiated. PR #87 remains Draft and unmerged; release still requires the user's explicit approval.


## Product-review moderation session isolation — 2026-11-11

### Finding
- The moderation queue's asynchronous list/image-signing requests and moderation actions did not use the admin session epoch already used by other private admin data flows. A request started before logout could finish afterward and repopulate review state or show stale moderation feedback.

### Correction
- Review loading and moderation actions now capture the current admin-session epoch and discard results/errors/loading updates if the user logs out or the session epoch changes.
- Private review rows, signed image URLs, moderation progress and errors are cleared when the admin session ends.
- Existing database-side fixed-admin UUID plus trusted app_metadata role checks remain authoritative; this change adds frontend stale-response isolation only.

### Verification and safety
- Added a focused predicate test for active, logged-out and stale-session requests.
- No database schema, live data, Storage objects, SSO configuration, or Production deployment was changed.
- PR #87 remains Draft and unmerged; all work remains staged for the single combined release.


## Admin activity-log session isolation — 2026-11-11

### Finding
- The server-backed activity-log write helper could finish after an administrator logged out and still append its response to the component's activity-log state or display a stale error from the previous session.
- The write helper also did not reject invocation when the admin session was already inactive.

### Correction
- Activity-log writes now require an active admin session, capture the current session epoch, and re-check it after retrieving request headers and after the server response.
- Results and errors from an older session are discarded. This is frontend state isolation; the server-side admin identity and role checks remain authoritative.

### Safety and verification
- Updated only the audit-branch admin component and this audit log. No order, message, product, customer, review, or other production data was changed.
- No Supabase schema/function, Storage object, SSO setting, Preview deployment, or Production deployment was changed.
- Source-level replacement was checked for a single exact match before creating the commit. Automated tests/build and browser behavior have not yet been verified for this change.
- PR #87 remains Draft and unmerged; all changes remain staged for the single combined release.


### Additional stale-callback hardening — 2026-11-11

- Checking the captured `adminLoggedIn` prop alone was insufficient for callbacks retained by a timer or Realtime subscription: an old callback could run after logout, capture the incremented epoch, and incorrectly treat that epoch as its own.
- Private async loaders for expenses, support tickets/threads, legacy messages and activity logs now consult the synchronously updated `adminSessionAccessRef.current` as well as their captured epoch. Product-review fetch/moderation predicates and activity-log writes use the same live session ref.
- Support-thread finalizers now avoid changing loading state or scheduling a Realtime follow-up after the session has ended.
- This is client-side stale-request isolation only. Supabase RLS and trusted server-side admin identity checks remain the security boundary. No data or server configuration was changed.


## Admin mutation UI session guards — 2026-11-11

### Finding
- The repository path lookup had been retried with a mistyped owner slug in the previous turn. The canonical repository is `chixradzezauri-design/geostore`; using the exact owner slug restored access to the branch and source file.
- Several mutation handlers could still update private admin UI, show stale alerts, or clear busy indicators after logout while an already-started request was completing.

### Correction
- Added a captured admin-session epoch and live-session guard to expense deletion, support-ticket status changes and replies, order-status changes, cancelled-order reactivation, and order admin-note saves.
- Each handler now checks the live session after awaited network/auth work before applying UI state, reporting errors, or clearing busy state. The in-flight server request is not falsely described as cancelled: if it was already accepted, its server-side transaction may complete, while the stale client response is ignored.
- Existing idempotency identifiers for support replies are retained if the session ends before the UI confirms completion, allowing a later safe retry without intentionally creating a duplicate.

### Safety and verification
- Only the audit-branch admin component and this audit log were changed. No database, Storage, production orders, messages, products, or deployment settings were modified.
- No destructive operation was performed. Automated tests/build and browser verification are pending for this commit.
- PR #87 remains Draft and unmerged; no Production deployment was triggered.


### Expense creation session guard — 2026-11-11

- Extended the same live-session/epoch protection to expense creation, including the idempotency verification path used after an uncertain network result.
- If logout occurs while the insert or verification is pending, the handler does not clear the stable pending request ID or alter the next session's form/list state. This preserves safe retry/reconciliation behavior without claiming the database request was cancelled.


## Product mutation session isolation — 2026-11-11

### Finding
- Product delete, publish toggle, quick price/cost/stock update, full product create/edit, and flash-sale actions lacked a consistent live admin-session check around awaited requests.
- A logout during an upload or database request could allow stale product state, alerts, or busy indicators to be written into a later admin session.

### Correction
- Added live admin-session and epoch guards to those mutation handlers.
- Product create/edit checks the session after each awaited image upload and before starting the database RPC. If logout occurs before the database write, uploaded unreferenced images continue through the existing safe cleanup path. Once a database write may have started, existing safeguards retain uploaded assets and do not claim rollback.
- Product deletion keeps its existing database-first and reference-aware image cleanup behavior; the UI response is ignored if the session changes.
- Publish, quick-edit and flash-sale handlers suppress stale UI changes and feedback after logout. Existing compare-and-set filters and server-side RPCs remain intact.

### Safety and verification
- No product, stock, order, message, Storage object, or database record was manually changed during this audit.
- Automated tests/build and browser verification are pending for this commit.
- PR #87 remains Draft and unmerged; Production deployment was not triggered.


### Logout cleanup for mutation busy states — 2026-11-11

- Reset transient busy indicators for expense save, order-note save, order reactivation, flash sale, product publication, order status, and support-ticket status on logout.
- Clear the ticket-status in-flight guard set on logout so a stale request cannot leave a future admin session's ticket controls permanently disabled.
- Added a final live-session check after the flash-sale refresh attempt so its warning/success feedback cannot leak into a later session.


## Category and product image reader session isolation — 2026-11-11

### Finding
- Category image selection and product gallery image selection validated and decoded files asynchronously without checking whether the initiating admin session was still active.
- A FileReader or image validation operation started before logout could therefore update category/product editor state after a later login.

### Correction
- Added live admin-session and epoch checks to category image validation, FileReader load/error callbacks, product gallery validation, and the completed multi-file read before updating React state.
- Stale callbacks now return without changing the editor or showing alerts in a later session. The selected file input is still cleared as before; existing image validation and file-count/size limits are unchanged.

### Safety and verification
- No image was uploaded, deleted, or modified in Storage during this audit step.
- No products, categories, orders, messages, or database rows were changed.
- Automated tests/build and browser verification are pending for this commit.
- PR #87 remains Draft and unmerged; Production deployment was not triggered.


## Admin image-reader session isolation — 2026-11-11

### Finding
- Category image selection and product gallery image selection use asynchronous file validation and FileReader callbacks. A callback retained across logout could otherwise write an old session's image data into a later admin session.

### Correction
- Category image selection now captures the current admin-session epoch, checks the live session after asynchronous validation, and checks again inside FileReader load/error callbacks before updating state or showing feedback.
- Product gallery selection now checks the same live-session/epoch pair before processing, after validation, and after all FileReader promises complete. Late callbacks are ignored after logout.
- Removed a redundant duplicate live-session guard from the category handler without changing its behavior.

### Safety and verification
- These guards prevent stale client-side callbacks from modifying a later admin session; they do not claim to cancel browser file reads already in progress.
- No product, category, image, Storage object, order, message, database row, or production setting was changed.
- Build check, Dependency security audit, CodeQL, and Vercel status were successful for the preceding image-reader guard commit. The follow-up cleanup commit will receive its own checks.
- PR #87 remains Draft and unmerged. No Production deployment was triggered.


## Storefront media save/publish session isolation — 2026-11-11

### Finding
- Admin storefront draft-save and publish handlers uploaded category/banner images and then continued toward database writes without fencing every asynchronous boundary against logout or a subsequent admin session.
- A stale completion could update the new session's draft state, show obsolete alerts, or clear a busy lock belonging to a newer operation.

### Correction
- Both handlers now capture the existing admin access epoch and re-check the live admin session after Auth retrieval, after every category/banner upload, and immediately before the draft/publish database request.
- Successful server responses are recorded as committed before the session check, so images referenced by a committed draft/publish are retained even if the admin logs out before the UI response is processed.
- Stale responses no longer update draft/public React state or show alerts in a later session. Error/finally handlers only alter the captured session's UI locks.
- Logout explicitly resets storefront busy flags and locks; the epoch fence prevents an older request's finally block from interfering with a later login.

### Safety and verification
- Existing transactional publish RPC and ambiguous-outcome asset-retention rules are preserved. No claim is made that an already-sent database request can be cancelled or rolled back.
- No storefront image was uploaded/deleted, no category/banner/config/version row was changed, and no production data or deployment setting was modified.
- Build, CodeQL, Dependency Security Audit, and Vercel checks will be evaluated for this commit after it is pushed.
- PR #87 remains Draft and unmerged; Production deployment is deferred until the full admin audit is complete and the user explicitly approves the combined release.


### Follow-up boundary verification — 2026-11-11

- Moved publish-request header acquisition ahead of the final live-session check. The publish RPC is now marked as started and sent only after asynchronous Auth-header retrieval completes and the captured admin session is still current.
- This closes the last await gap between the final session fence and the transactional publish request.


## Banner editor and ordering — 2026-11-11

### Finding
- The admin banner panel supported adding and deleting banners, but did not expose editing or ordering controls.

### Correction
- Added in-place banner editing while retaining the original banner ID and any existing image when the image field is left blank.
- The 20-banner limit applies only to new banners, not edits.
- Added adjacent up/down ordering controls. Reordering swaps complete banner records, preserving IDs, image references, links, and other fields.
- Added accessible labels and boundary-disabled states for ordering and edit/delete controls.
- Editing remains a draft operation; publication still requires the existing explicit storefront publish action.

### Safety
- No existing banner records, images, Storage objects, storefront settings, versions, orders, or messages were changed during implementation.
- No database migration or Production deployment is required for these client-side draft controls.
- PR #87 remains Draft and unmerged; the combined release remains deferred until the full admin audit is complete and the user explicitly approves it.


## Ambiguous Storage upload response cleanup — 2026-11-11

### Finding
- Product and storefront image uploads previously added a new Storage path to their cleanup tracking only after the browser received a successful HTTP response.
- If Storage completed an upload but the browser lost the response (for example, a transient network failure), the client could not distinguish that outcome from a rejected upload. The newly created object could therefore remain untracked.
- Product images also had a narrow session-transition gap: a successful upload returned to the caller, but logout was checked before the caller added the URL to its cleanup list.

### Correction
- Storefront image upload now computes its unique public URL before sending the Storage request. If the request throws without a definitive HTTP response, the path is added to the existing guarded cleanup list before the error is rethrown.
- Successful storefront uploads are tracked immediately after the successful Storage response and before metadata insertion or any further asynchronous boundary.
- Product image upload now accepts the existing per-save cleanup list and records the unique image URL both on an ambiguous network failure and immediately after a successful Storage response.
- The product editor therefore has the URL available for its existing reference-aware cleanup if logout occurs before the database write starts.
- Definitive non-success HTTP responses are not treated as successful uploads and are not blindly deleted; existing cleanup remains restricted to validated product-owned paths or managed storefront folders.
- Existing ambiguous database-write protection remains unchanged: once a product/draft/publish request may have reached the database, the uploaded assets are retained rather than risking deletion of referenced images.

### Safety and verification
- This is a client-side failure-path correction only. No Storage objects, product rows, categories, banners, orders, messages, or database settings were changed.
- Existing MIME/signature/size validation, cryptographically random paths, ownership checks, reference scans, and metadata cleanup rules are preserved.
- Runtime/build/CI verification will be recorded against the resulting branch commit; this change is not considered Production-released.
- PR #87 remains Draft and unmerged. Combined release remains deferred until the full admin audit is complete and the user explicitly approves it.

## Customer broadcast notification audit — 2026-11-11

### Finding
- The AdminDashboardPro `handleSendBroadcast` handler writes records only to browser-local `localStorage` under `geostore_broadcasts`. It does not call Supabase or any delivery service.
- The admin UI accurately labels this as a device-local test notification and explicitly warns that customers do not receive it. This warning must remain until real delivery is implemented.
- The customer notification center in `App.jsx` currently reads only the authenticated user's order notifications through `get_my_order_notifications`, subscribes to `order_notifications`, and marks those order notifications read through `mark_my_order_notifications_read`.
- `Modals.jsx` renders notification title/body from order-status translations. It does not currently support administrator-authored announcement title/body records.
- Therefore the admin broadcast composer and the customer notification center are separate features today. There is no evidence in the audited client code that an admin broadcast reaches another account or device.

### Safe implementation boundary
- Do not relabel the existing localStorage test save as a sent/published announcement, and do not remove its warning until server-side delivery is live.
- A real broadcast feature needs a server-authorized write path (admin authorization checked server-side; no service-role secret in the browser), persistent announcement records, recipient-scoped read state, and customer retrieval restricted to the signed-in account.
- Customer UI must render announcement title/body as text (not HTML), preserve the existing order-notification rendering, and merge both notification types without changing the existing order-read RPC semantics.
- Realtime should be an optimization with a safe refresh/poll fallback; authorization and recipient scoping must be enforced by database policies/RPCs, not by client filters alone.
- Before enabling the new composer, deploy its migration and server function atomically with the matching frontend. Keep the existing local test behavior available until the backend path is verified; do not silently migrate or delete existing `geostore_broadcasts` browser data.
- Audience definition, guest-user behavior, scheduling/expiry, and whether announcements should be global or targeted must be decided before implementation. Do not assume that every registered account should receive every message.

### Scope and safety
- This stage is an audit finding and implementation boundary only; no broadcast was sent, no customer or admin data was modified, and no database schema or settings were changed.
- Existing order notifications, support tickets/messages, local test notification records, and customer accounts remain untouched.
- PR #87 remains Draft and unmerged. No Production deployment; the combined release remains deferred until the full admin audit is complete and the user explicitly approves it.

### Product decision — selectable announcement recipients — 2026-11-11

- The administrator must explicitly choose one of two audiences for each in-app announcement: all registered customer accounts, or a manually selected subset of registered accounts.
- The manual audience picker must support searching and multi-select. No recipients are preselected by default.
- Before dispatch, show the exact recipient count and require explicit confirmation. If dispatch fails, keep the announcement draft and selected audience so the administrator can retry safely.
- Resolve recipients to immutable Supabase Auth user IDs on the server. Do not use email addresses as recipient identifiers and do not expose the Auth user directory directly to the browser.
- The server-side directory and dispatch actions must verify the existing primary-admin identity and trusted `app_metadata.role = 'admin'`; service-role credentials must remain server-side.
- Persist a recipient snapshot at dispatch time. Accounts registered later must not receive previously sent announcements automatically.
- Initial scope is registered authenticated customer accounts only. Guest checkout contacts, email, and SMS delivery are out of scope.
- Each recipient has an independent read state. Existing order notifications and their read RPC semantics remain unchanged.
- Keep the existing device-local `geostore_broadcasts` test data and warning until the persistent server-backed flow is released atomically with its migration and Edge Function.
- This is a product decision and implementation specification only. No announcement was sent, no customer data or database schema was changed, and no migration or Edge Function was deployed.
- PR #87 remains Draft and unmerged; no Production deployment is authorized.

## Announcement audience validation foundation — 2026-11-11

- Added `src/utils/announcementAudience.js` to normalize the explicit `all` and `selected` audience modes before a future server request.
- `selected` mode requires at least one syntactically valid UUID, trims and lowercases IDs, and removes duplicates. `all` mode deliberately discards any stale selected IDs.
- Added focused Node tests for explicit mode selection, duplicate normalization, empty/invalid recipients, and malformed payloads.
- This helper is client-side input hygiene only; it is not an authorization boundary. The future Edge Function must independently verify the primary admin, validate every Auth user ID against the server-side directory, and snapshot recipients transactionally.
- No UI was connected to this helper yet; the existing device-local test composer and its warning remain unchanged. No customer data, database schema, Auth users, or Storage objects were modified.
- Test execution and build verification have not been run in this remote-only editing step. No migration or Edge Function was created or deployed.
- PR #87 remains Draft and unmerged; no Production deployment.

## Server-side announcement recipient directory — 2026-11-11

- Added the read-only `admin-announcements` Edge Function action `list-recipients`. It requires a valid bearer token and independently verifies the user with Supabase Auth before checking both the fixed primary-admin UUID and trusted `app_metadata.role = 'admin'`.
- The function uses the server-only service key to call Auth Admin `listUsers`; no service-role credential or direct Auth directory access is exposed to the browser. Auth results are paginated (up to 100 pages of 1,000) and the function fails closed rather than returning a silently truncated directory.
- The browser-facing projection contains only Auth user ID, email (nullable), creation timestamp (nullable), and a display label. It excludes the primary admin, any other account with trusted admin role, anonymous accounts, malformed IDs, phone numbers, and user metadata.
- The function has no write/dispatch action and does not read or change customer order, message, product, support, or notification data. The existing localStorage broadcast test composer remains unchanged; no customer receives a message from this endpoint.
- Added unit tests for privileged/anonymous account exclusion, minimal field projection, no-email labels, pagination, Auth failures, malformed pages, and page-cap truncation safety.
- Added explicit `verify_jwt = false` only because the function performs its own server-side `auth.getUser(token)` validation and primary-admin authorization; the service key remains server-side. CORS is not treated as an authorization boundary.
- No database schema or Auth accounts were changed. No migration or Edge Function was deployed. Isolated Node tests for recipient projection and pagination passed: 6/6 on Node 22.16.0 using a temporary test harness. The repository declares Node 24.x, so this does not replace repository CI; the full test suite/build and Edge Function Deno compile/runtime verification remain pending.
- PR #87 remains Draft and unmerged; no Preview or Production deployment was requested or performed.

## Admin announcement audience picker UI — 2026-11-11

- Added an admin-only audience selection panel to the existing broadcast composer: all registered Auth accounts or individually selected accounts.
- Added an explicit server-directory load/refresh action using the protected `admin-announcements` Edge Function, searchable by display label, email, or immutable Auth user ID; individual accounts can be checked and cleared.
- The panel displays the loaded audience count for the all-users mode and the exact currently selected account count for selected mode. It clears private directory data and selected IDs on admin logout, ignores responses from stale admin sessions, and removes selections that are no longer present after refresh.
- The UI prominently states that this is audience preview only. The existing localStorage test-save action and its device-local warning are unchanged; no real customer notification is sent and no confirmation/send workflow is activated before persistent notification storage and transactional dispatch exist.
- The recipient directory Edge Function is not deployed yet, so loading will remain unavailable until the combined backend release. No customer data, Auth users, database schema, orders, messages, or Storage objects were changed.
- No full project test/build or browser verification was performed in this remote editing step. PR #87 remains Draft and unmerged; no Preview or Production deployment.

## Announcement dispatch validation and idempotency design — 2026-11-11

### Security review

- Re-inspected the staged `admin-announcements` Edge Function. Its only accepted action remains `list-recipients`; it independently validates the bearer using Supabase Auth `getUser(token)` and requires both the fixed primary-admin UID and trusted `app_metadata.role = 'admin'`.
- The function does not yet implement dispatch and cannot send announcements. It does not write to the database or modify customers.
- Confirmed the recipient directory helper excludes the primary admin, other trusted admins, anonymous accounts, and malformed Auth IDs; it paginates and fails closed on an Auth error or page cap.
- Added `supabase/functions/admin-announcements/validation.js` as isolated server-side input validation groundwork: mandatory UUID idempotency request ID; title 1–120 characters; body 1–5,000 characters; non-empty plain text; explicit `all` or `selected` mode; selected recipient UUID validation; duplicate rejection; maximum 500 selected IDs; strict rejection of selected IDs in all-users mode.
- Added `tests/adminAnnouncementDispatchValidation.test.js` for valid normalization, all-users mode, missing idempotency key, malformed mode/content, size/control-character bounds, malformed/duplicate/oversized audience, and input immutability.
- Expanded `docs/ANNOUNCEMENT_NOTIFICATION_SCHEMA_PLAN.md` with the idempotent dispatch contract: persist a unique request ID and server-computed canonical payload digest in the same transaction; same key/same payload returns the original result; same key/different payload returns conflict; concurrent retries must converge via database uniqueness/locking.

### Important boundaries

- The validation helper is not wired into the Edge Function yet; no dispatch action exists. The helper validates input shape only and does not prove that selected IDs are valid customer accounts. The eventual server function must resolve each ID against Auth Admin immediately before the atomic dispatch.
- Idempotency is a design requirement, not yet implemented in a database. No migration or table has been created.
- Automated tests were added but not executed in the repository's declared Node 24 environment. No Deno compile/runtime, full build, or browser test was performed.
- No database table, policy, function, grant, Auth account, order, message, support ticket, notification row, or Storage object was changed. No announcement was sent.
- PR #87 remains Draft and unmerged. No Preview/Production deployment was triggered. Combined release remains deferred until the full audit is complete and the user explicitly approves it.



## Announcement canonical digest groundwork — 2026-11-11

- Added `supabase/functions/admin-announcements/digest.js`: computes a server-side SHA-256 digest over a versioned canonical payload containing normalized title/body, explicit audience mode, and the exact resolved Auth UID snapshot.
- Recipient IDs are validated, lowercased, deduplicated, and sorted before hashing. Selected mode requires the server-resolved UID set to exactly match the validated selection; all-users mode hashes the directory snapshot so retries cannot silently drift to a changed audience.
- Added `tests/adminAnnouncementDispatchDigest.test.js` covering order-independent digests, changed title/body/mode/audience, all-users snapshot changes, and invalid/duplicate/empty/oversized/mismatched recipient sets.
- This helper is not connected to the Edge Function or persistent idempotency storage. It does not independently resolve or authorize Auth accounts and cannot prevent duplicate dispatch until the unique-key transaction and matching database migration exist.
- No database changes, Auth changes, notification writes, customer sends, deployment, or Production changes. PR #87 remains Draft and unmerged. No Preview build was triggered.


## Announcement trusted recipient resolution — 2026-11-11

- Added `supabase/functions/admin-announcements/resolve-dispatch-recipients.js` for server-only Auth Admin audience resolution.
- Selected IDs are individually verified via `getUserById` with a hard concurrency cap of 10; missing IDs, mismatched IDs, anonymous accounts, admins, and other ineligible accounts are rejected.
- All-users mode uses the paginated Auth Admin directory snapshot and excludes the primary admin, admin-role users, and anonymous users through the existing recipient eligibility helper.
- Added `tests/adminAnnouncementDispatchRecipientResolution.test.js` for selected lookup, invalid/ineligible accounts, bounded concurrency, pagination, and fail-closed conditions.
- The helper returns only Auth UIDs. It is not wired into the endpoint and does not send or persist anything.
- No database changes, Auth changes, customer sends, deployment, or Production changes. PR #87 remains Draft and unmerged.


## Announcement dispatch transaction contract — 2026-11-11

- Specified the database idempotency record and single-transaction dispatch algorithm in `docs/ANNOUNCEMENT_NOTIFICATION_SCHEMA_PLAN.md`.
- The contract binds each request UUID to one canonical server-computed digest and trusted creator. Matching retries return the original announcement ID/count; a changed payload or creator conflicts.
- Defined unique-key serialization for concurrent retries and all-or-nothing rollback of the idempotency row, announcement, and full recipient snapshot.
- Explicitly separated Edge Function Auth Admin eligibility checks from database UUID/duplicate/count validation. The database must not treat a UUID as proof that an account is eligible.
- Defined the private RPC privilege boundary and required concurrency, rollback, idempotency, RLS-isolation, and grant tests before enabling dispatch.
- Documentation only. The environment has no Supabase CLI and no repository checkout, so no correctly generated migration file could be created. No live SQL, database migration, RPC, Edge Function send action, customer notification, or deployment was performed. Existing orders, messages, products, and notification records were untouched. PR #87 remains Draft and unmerged.


## Announcement live schema preflight — 2026-11-11

- Performed read-only inspection of the connected Supabase project: ACTIVE_HEALTHY, PostgreSQL 17.11, us-west-2.
- Confirmed no announcement-specific table, function, or RLS policy exists in `public` or `private`; no announcement migration is present in remote migration history (latest applied version: `20261110133651`, `admin_update_product_with_stock`).
- Confirmed `private` schema already exists, and `public.order_notifications` is a separate order-status notification system. Both remain untouched; the planned announcement recipient/read-state model must be separate.
- Recorded the verified preflight and migration prerequisites in `docs/ANNOUNCEMENT_NOTIFICATION_SCHEMA_PLAN.md`.
- Checked the working environment: Supabase CLI and a local repository checkout are unavailable. No timestamp was fabricated and no migration file was created. No SQL/DDL, database write, Auth change, notification send, or deployment was performed. Existing orders, messages, products, support records, and order notifications remain untouched. PR #87 remains Draft and unmerged.


## Existing order-notification access pattern review — 2026-11-11

- Read-only inspected current `order_notifications` RLS and the `get_my_order_notifications` / `mark_my_order_notifications_read` RPC definitions and grants.
- Confirmed customer reads and updates are scoped to `recipient_user_id = auth.uid()`; private implementations reject unauthenticated callers and use an empty `search_path`; public wrappers are invoker SQL wrappers.
- Recorded this as a compatibility reference only. Announcement dispatch remains server-only, while announcement customer RPCs require independent least-privilege and ownership review. No order-notification objects or data were modified.


## Customer announcement read / mark-read access contract — 2026-11-11

- Defined bounded, authenticated, recipient-owned announcement retrieval with deterministic keyset pagination on `(sent_at, id)`; caller-supplied recipient IDs are not accepted.
- Defined idempotent single-announcement mark-read behavior, preserving the original `read_at` timestamp and returning no information about another customer's recipient row.
- Documented the least-privilege function boundary: no direct customer table access; invoker public wrappers; narrowly scoped private implementations only where required, with strict `auth.uid()` checks, empty `search_path`, fully qualified names, and minimum EXECUTE grants.
- Explicitly preserved existing order notification tables/RPCs and local-only `geostore_broadcasts` data. Added cross-account isolation, pagination, unauthenticated, idempotency, and direct-table-access test gates.
- Reassessed the workspace blocker: Supabase MCP inspection is available; local CLI/repository checkout are still absent, and npm registry access failed with DNS `EAI_AGAIN`. No CLI was installed, no timestamp fabricated, and no Production SQL/DDL or database branch was created. No customer notifications were sent. PR #87 remains Draft and unmerged.



## Read-only RLS, table grants, and RPC boundary audit — 2026-11-11

- Rechecked live RLS policies for orders, order notifications, products, support tickets/messages, and Storefront Studio tables. RLS is enabled on all inspected tables; `order_notifications` also has FORCE RLS.
- Direct order reads are restricted by the primary-admin UID plus `app_metadata.role = 'admin'`; authenticated direct order writes are not granted. Customer notification SELECT is scoped to `recipient_user_id = auth.uid()`; notification writes are not granted directly.
- Product policies retain separate responsibilities: primary admin can manage all products; anonymous/authenticated visitors can SELECT only published products. The advisor's multiple-permissive-policy warning is a query-planning/performance concern, not evidence of an access bypass. Do not merge policies without preserving both paths and the restricted-column grants.
- Support ticket/message direct SELECT has no customer-wide policy; admin-only ticket/message reads remain distinct from guest/customer RPC access. Public wrapper functions for guest support are executable by anon/authenticated, while their private SECURITY DEFINER implementations use empty search_path and validate ticket ownership through primary-admin identity, authenticated customer identity/email, or the ticket's hashed access token before reading or writing messages. This is an intentional guest-support capability, not permission to read arbitrary tickets. Keep these guards and rate limits intact; any future changes require adversarial token/IDOR tests.
- Storefront Studio tables have RLS enabled. Public media SELECT is conditioned on `is_public = true`; private media and version/config management are admin-scoped. Anonymous direct SELECT grant on `storefront_media` is therefore constrained by RLS, not unrestricted.
- Five unused-index notices remain informational; usage counters were zero at inspection time. No index was dropped because a zero counter alone does not prove an index is unnecessary.
- Security advisor still reports Supabase Auth leaked-password protection disabled. No Auth setting was changed in this stage; enablement is deferred to a separately reviewed configuration change.
- Read-only inspection only: no SQL/DDL writes, policy/grant/function changes, customer-data changes, or deployment. Existing orders, messages, products, and Storage objects remain untouched. PR #87 remains Draft and unmerged.


## Read-only privileged RPC and checkout integrity audit — 2026-11-11

- Reviewed live definitions, grants, and execution context for the critical private RPCs covering order creation, order status/cancellation/reactivation, customer order history/tracking, product create/update/delete, and variant stock updates.
- All inspected privileged private implementations use an empty `search_path` and fully qualified table/function references. Admin mutation RPCs validate both the fixed primary-admin UID and trusted `app_metadata.role = 'admin'`; their public wrappers are invoker wrappers, not SECURITY DEFINER endpoints. Anonymous EXECUTE is denied for admin product/order mutation RPCs.
- Order checkout is intentionally callable by anon for guest checkout. The RPC validates the JSON object, required fields, nonempty item array, per-line product IDs and quantities, size/color/custom-variant bounds, add-on boolean types, gift-message limits, and guest/authenticated identity consistency. It recalculates product/variant prices, coupon discount and delivery fee server-side; locks product rows, checks stock, and atomically decrements stock and inserts the order. Request-key/advisory-lock replay handling preserves idempotency. Database triggers additionally bind authenticated orders to `auth.uid()`, validate guest email, reject unpublished products, and create order notifications.
- Customer order history RPC filters by `auth.uid()` and strips purchase-cost/vendor/profit fields from returned line items. Public order tracking requires both order ID and normalized phone and applies separate hashed 10-attempt/15-minute rate limits; returned fields are limited to tracking summary rather than customer address/contact details.
- Order status mutation locks the order row, validates allowed transitions, restores stock once on cancellation, and prevents backward transitions after dispatch/delivery. Reactivation requires the fixed admin identity, recent password authentication, a previously restored/deducted stock record, valid item snapshots, and an atomic stock re-deduction. Product update locks the existing row and uses it as the base so omitted fields remain intact; variant updates validate IDs/counts/stock bounds. Product deletion refuses to remove products referenced by historical order snapshots.
- Hardening follow-up identified (not confirmed exploit): checkout does not visibly impose explicit application-level maximum lengths on order ID/customer name/phone/address, nor a maximum number of cart lines. Existing API/request limits may constrain payload size, but explicit field/array bounds should be considered in a compatibility-safe follow-up. Do not add limits without first checking existing legitimate order data and frontend constraints.
- No live function, grant, policy, trigger, table, or customer row was changed. No test order was created. Existing orders, stock, products, and messages remain untouched. PR #87 remains Draft and unmerged.


## Read-only checkout pricing, coupons, and delivery-fee audit — 2026-11-11

- Re-reviewed the live `private.create_order_with_stock` calculation path. Client-supplied totals/prices are not trusted: server reloads product and selected-variant prices, checks stock under row locks, computes fixed gift-wrap/warranty add-ons, looks up delivery fee from `public.store_delivery_fees`, and computes coupon discount from the active server-side coupon row. The final total is calculated server-side and stored with the order snapshot.
- Delivery region is allowlisted to `tbilisi`, `bigCities`, or `other`; the lookup must find a fee row. Current live configuration has exactly three unique region rows, fees 0/10/15 GEL, no negative fee, and no unknown region. Primary-admin-only RLS controls writes; public read is intentional for checkout display.
- Coupon lookup normalizes the submitted code to uppercase/trimmed form and requires `active = true`; minimum order is checked against server-calculated subtotal. Coupon rows are uniquely indexed by code; live data currently contains one coupon with 10% discount and zero minimum order, with no out-of-range discount or negative minimum. Primary-admin-only RLS controls insert/update/delete; public read exposes active coupons only.
- Hardening opportunity: the live coupon table has no CHECK constraints enforcing `0 <= discount_percent <= 100` or `min_order_gel >= 0`; delivery-fee table has no explicit nonnegative-fee CHECK constraint or allowlisted-region CHECK constraint. Current rows are valid and admin writes are RLS-protected, so this is defense-in-depth rather than a demonstrated exploit. Add constraints only after confirming admin form validation and migration compatibility; do not modify current live data in this audit.
- The checkout RPC validates line quantity (1–100), option identifier lengths, add-on boolean types, and gift-message length (240); it still lacks explicit bounds on the number of line items and on order ID/name/phone/address lengths. Treat this as a follow-up validation task and preserve existing legitimate checkout compatibility.
- No database changes, coupon/fee edits, test orders, stock changes, policy changes, or deployment were performed. Existing orders and checkout snapshots remain intact. PR #87 remains Draft and unmerged.


## Admin coupon and delivery-fee UI audit — 2026-11-11

- Inspected the restored audit-branch versions of `src/components/AdminDashboardPro.jsx`, `src/utils/deliveryFeeSafety.js`, its unit tests, and the parent pricing fetch/checkout checks in `src/App.jsx`.
- Coupon creation validates normalized code format (3–64 uppercase Latin letters/digits/underscore/hyphen), discount 0.01–100% with at most two decimal places, and minimum order 0–1,000,000,000 GEL with at most two decimals. Duplicate normalized codes are rejected in the UI and the database unique index remains the race-safe backstop. Creation is sent to Supabase; deletion requests a representation and confirms a row was actually deleted before updating UI state.
- Current coupon panel supports create and delete; no edit/deactivate action is exposed in this screen. Existing historical order snapshots are not rewritten by coupon deletion.
- Delivery fee editor keeps raw text drafts and uses `parseDeliveryFeeDrafts`: all three regions are required, blank/negative/malformed values and more than two decimal places are rejected, while zero is valid. Save upserts the three allowed region keys and verifies the exact three returned database rows and amounts before updating shared state. A failed save leaves the prior confirmed values intact.
- Parent storefront fetch loads only active coupons and the three delivery rows from Supabase; checkout refreshes both datasets immediately before submission and blocks submission if either authoritative request fails or the displayed pricing changed. Server checkout RPC remains the final pricing authority.
- No live coupon, delivery fee, order, product, stock, or customer data was changed. No deployment or merge was performed.
- Repository integrity correction: a prior docs-only commit had accidentally replaced the audit branch tree (3 files). Restored the complete 216-entry tree from its last full parent and reapplied the two current audit documents. Verified `src/App.jsx`, `src/components/AdminDashboardPro.jsx`, both audit documents are present; PR #87 remains Draft/unmerged. New repair commit: `823e1f20376dcde67fba4dba64448ea5b2e28a20`.


## Admin product category-change and variant-stock preservation audit — 2026-11-11

- Reviewed `src/components/AdminDashboardPro.jsx`, `src/utils/productCategories.js`, `src/utils/productValidation.js`, and `src/utils/productFormSafety.js` for product create/edit behavior, category-specific fields, size/color inventory, custom variants, and input bounds.
- Confirmed category-specific fields exist for clothing, shoes, laptops, and phones; other categories (including accessories) receive the general attributes panel. Product price, purchase cost, stock, option counts/lengths, gallery count/size, custom variant count, and per-variant stock have client-side bounds; privileged server RPC remains authoritative.
- Found a silent data-loss risk: changing the category of an existing clothing/shoes product rebuilt the size/color matrix from an empty variant list, replacing existing matching variant IDs and resetting their stock. Switching to a non-size/color category silently discarded the matrix from the update payload. Historical order references remain protected by the database RPC, but unreferenced existing stock could have been lost without an explicit warning.
- Fixed `handleCategoryChange`: matching size/color combinations now retain their existing IDs and stock. When an existing product's category change would remove any matrix variants, the admin receives a confirmation showing the number of affected variants and their combined stock; cancel leaves the category and inventory state unchanged. Existing order-referenced variants remain protected by the server-side update RPC.
- Verified the updated source contains the preservation path, removal warning, cancellation guard, and applies state only after confirmation. No product records, stock, images, orders, or customer data were changed. No production deployment or merge.
- Commit: `351fc07ee21dd4a600765a6b2ce042c81cb55477`; PR #87 remains Draft/unmerged.


## Product image gallery, Storage access, and deletion-safety audit — 2026-11-11

- Re-reviewed the admin product gallery flow, `handleImageChange`, `handleEditProduct`, `handleSaveProduct`, upload tracking, and guarded image cleanup in `src/components/AdminDashboardPro.jsx`; also inspected `src/utils/imageSafety.js` and `src/utils/productImageCleanup.js`.
- Confirmed gallery edits load the existing gallery (falling back to the legacy main image when no gallery exists); users remove individual images explicitly. The editor requires at least one remaining photo, caps the gallery at 10, validates JPG/PNG/WEBP/GIF file signatures, and limits each file to 5 MB. New Storage paths are unique and product-scoped; failed/ambiguous uploads are tracked for guarded cleanup, while images are retained if the product-save request may have committed.
- Confirmed old-photo cleanup is fail-closed: it checks other product galleries, historical order snapshots, storefront draft/published configs and version snapshots, and legacy message images. It only deletes decoded paths inside the current product's own folder; read failures or incomplete scans stop deletion. Order snapshots without their own image preserve the catalogue image fallback.
- Read-only live Storage inspection confirmed bucket `storefront-media` is public for storefront image delivery, has a 5 MiB object limit, and allows only `image/jpeg`, `image/png`, `image/webp`, and `image/gif`. INSERT/UPDATE/DELETE Storage policies are restricted to the fixed primary-admin Auth UID and `app_metadata.role = admin`; no broad client write policy was found. Public bucket access is intentional for public product photos.
- Read-only product-row check found 8 products; all 8 have a main image and a gallery, and each main image is present in its gallery. No existing product image/gallery mismatch was found.
- No image objects, product records, orders, policies, or bucket settings were changed. No automated browser/build test was run. No production deployment or merge. PR #87 remains Draft and unmerged.


## Storefront image loading and mobile gallery audit — 2026-11-11

- Inspected `src/components/StoreView.jsx` and relevant product gallery CSS. Before the fix, the six storefront `<img>` elements had no `onError` handling; a broken or unsafe product/banner URL could leave an empty image area.
- Added a shared `StorefrontImage` component that accepts only HTTP(S) image URLs via `isSafeImageUrl`, resets its failure state when the source changes, and renders a caller-provided fallback after an image load error. Applied it to the hero/banner image, flash-sale product image, catalogue product image, product detail stage, and gallery thumbnails. Existing product names, image URLs, gallery ordering, and modal interactions remain unchanged.
- Static source verification after commit confirms 5 shared safe-image component instances, URL guard, `onError` fallback, and no remaining direct dynamic `<img>` tags for product/banner/gallery URLs. Mobile gallery continues to use horizontal overflow scrolling; thumbnails remain real buttons with `aria-pressed`.
- Existing product photo source records were not rewritten. No Storage objects, product rows, order snapshots, or customer data were modified. Browser/device visual testing and build/test execution were not performed in this stage; the fallback behavior is source-verified only.
- No Production deployment or merge. PR #87 remains Draft and unmerged.


## Category, banner, and customer-review image audit — 2026-11-11

- Extended the shared storefront image guard to category tiles and customer review photos in `src/components/StoreView.jsx`. The all-categories editorial tile and admin-provided category images now use the same HTTP(S)-validated image component and render a neutral fallback if loading fails; category image URLs are no longer interpolated into CSS `backgroundImage` strings.
- Customer review images now use the shared load-error fallback. The component explicitly permits legacy local base64 review photos only when `isValidImageDataUrl` validates their MIME type, base64 encoding, size, and image signature; server-signed HTTPS review image URLs remain supported. This preserves legacy local reviews without allowing arbitrary data URLs.
- Published banner images already used the safe component from the previous stage; confirmed they remain guarded. Product card/detail images remain guarded as well.
- Source verification confirms category background URL interpolation removed, category tiles use safe image loading, review photos use the validated data-URL exception, and image load failures render a fallback. No category/banner/review source records, image files, Storage objects, orders, or customer records were modified.
- No browser visual test, automated test suite, or build was run. No Production deployment or merge. PR #87 remains Draft and unmerged.


## Admin order-details modal mobile scrolling and safe-area audit — 2026-11-11

- Inspected the complete order-details modal in `src/components/AdminDashboardPro.jsx` and its responsive rules in `src/index.css`.
- Found a genuine mobile layout risk: both the full-screen overlay and the modal itself had vertical scrolling enabled. On short screens this could create competing nested scroll areas and make the bottom actions harder to reach; the overlay also used fixed 8px padding without accounting for iPhone safe-area insets.
- Changed the overlay to clip outer scrolling so the modal is the single vertical scroll container. Added momentum scrolling and scroll containment to the modal, safe-area-aware top/right/bottom/left padding on narrow screens, and constrained modal height to the available inner viewport.
- Added min-width and wrapping safeguards to the header/customer details, and a minimum 44px touch height for the print/close footer actions. Existing order data, item rendering, note-saving, invoice printing, and close handlers are unchanged.
- Source edits were committed to the audit branch. This is source-level verification only: no physical-device/browser visual test, automated test suite, or build was run. No orders, customers, products, stock, or production data were changed. No Production deployment or merge; PR #87 remains Draft/unmerged.


## Order invoice/PDF rendering audit — 2026-11-11

- Inspected the full `handlePrintInvoice` implementation in `src/components/AdminDashboardPro.jsx`, including order/customer fields, item images, item prices, checkout breakdown, generated HTML, and print-window lifecycle.
- Found a price-field compatibility gap: invoice line items read `priceGEL` or `price`, but not the existing `price_gel` alias; the legacy summary row also read only `totalGEL`. Added the supported aliases so invoices do not silently show zero when those persisted shapes are supplied.
- Corrected two JSX-only `className` attributes embedded in the generated HTML string to ordinary HTML spans.
- Improved invoice layout for narrow screens and print/PDF: responsive header and typography, long text wrapping, fixed-layout table cells, contained item photos, repeating table headers, page-break protection, print margins, and print color adjustment.
- Removed the fixed 500 ms print-and-immediate-close sequence. The invoice now waits for available document fonts and item images (with a bounded 5-second wait per pending image), invokes print after assets settle, and closes the invoice window after the browser's `afterprint` event. Failed images do not block printing.
- Static source checks confirmed the price aliases, HTML corrections, responsive/print rules, image/font readiness, and after-print close behavior. No actual PDF was generated and no browser/device print dialog was tested; automated tests/build were not run in this stage.
- No order, customer, product, image, stock, or production data was changed. No Production deployment or merge; PR #87 remains Draft/unmerged.


## Order CSV export completeness and data-safety audit — 2026-11-11

- Rechecked the order CSV export against the order-search fields, order-detail modal, and invoice item-price handling. Found that the export omitted customer surname, city, region, postal code, item SKU, per-item unit/line prices, gift options/message, and product-photo references even though some of those fields were visible elsewhere in the admin panel.
- Expanded the CSV columns to include surname, city, region, postal code, detailed item information (SKU, variant, size, color, quantity, unit price and line total), gift-wrap/warranty flags and gift message. Added the customer-email alias customer_email and the existing surname/zip aliases.
- Added a separate product-photo URL column containing only distinct HTTPS URLs resolved through the existing order-image resolver. Inline base64/data URLs are deliberately excluded so CSV files do not balloon with embedded image data; CSV stores links, not the actual photos.
- Preserved Georgian UTF-8 BOM, semicolon-delimited quoted cells, CRLF line endings, escaping, and the existing formula-injection guard. The export still uses the complete filteredOrders collection (all matching rows, not only the current pagination page) and retains the selected status/search/date filters.
- Static source assertions passed for the new fields, aliases, safe HTTPS-only image links, item-price aliases, and full filtered-result export. No live CSV was generated or opened in Excel/LibreOffice, and no automated build/test or browser test was run.
- No orders, customers, product records, stock, Storage objects, or production data were changed. No Production deployment or merge; PR #87 remains Draft/unmerged.


## Order CSV value validation and formula-injection hardening — 2026-11-11

- Hardened the shared CSV cell sanitizer to recognize leading Unicode whitespace, Unicode format characters, BOM, tabs and other control/space characters before spreadsheet formula prefixes (`=`, `+`, `@`, and non-numeric `-`). Plain negative decimal values remain numeric-looking text and are not unnecessarily prefixed.
- Order export now flags invalid/missing line quantities instead of silently substituting quantity 1, and only calculates a line total when both unit price and quantity are valid.
- Delivery fee export now validates the explicit checkout snapshot (`checkoutBreakdown.deliveryGEL`, `checkout_breakdown.delivery_gel`, or `checkout_result.delivery_gel`) and legacy delivery text from all supported address aliases. Invalid or unavailable amounts are marked `შესამოწმებელია` instead of being silently exported as 0.00 GEL. A genuine explicit zero remains valid.
- Static source checks passed for the Unicode formula guard, negative-decimal allowlist, invalid quantity and delivery flags, address aliases, unit-price aliases, and complete filtered-order export. No real CSV was downloaded/opened in spreadsheet software; no browser test or full build was run.
- No order/customer/product/stock/Storage records were changed. No Production deployment or merge; PR #87 remains Draft/unmerged.

## Order list and CSV dataset alignment audit — 2026-11-11

- Compared the order filter derivation, result count, pagination, rendered order cards, and CSV export. Confirmed the count and CSV both use the same canonical `filteredOrders` collection; the UI intentionally renders only the current five-row page while the CSV exports every matching row.
- Found that the order cards displayed only legacy `date`, `totalGEL`, `customerName`, `phone`, `address`, and `adminNote` fields, while filtering/export already supported additional persisted aliases. Updated the visible order card to use the corresponding `created_at/createdAt/date`, `totalGEL/total_gel/total`, customer-name, phone, address, and admin-note aliases, with a neutral placeholder when a value is absent.
- Kept search, status, date filters, sort order, pagination, CSV columns, and export scope unchanged. No order records or other production data were changed.
- Source-level verification is still required after this edit; no browser test, spreadsheet round-trip, automated test suite, or full build has been run in this stage.
- No Production deployment or merge. PR #87 remains Draft/unmerged.

## Order date-filter timezone and sort compatibility audit — 2026-11-11

- Reviewed the order date parser and sort key against date-picker behavior and supported legacy timestamp fields.
- Found that the parser extracted the leading YYYY-MM-DD from every ISO timestamp, effectively filtering by the timestamp's UTC date rather than the browser's local calendar date. For timestamps close to midnight, this could place an order on the wrong day relative to the admin date picker.
- Updated parsing so date-only ISO strings and dotted DD.MM.YYYY strings remain validated as calendar dates, while timestamp strings are parsed and converted to the browser's local calendar date.
- Expanded the deterministic newest-first sort fallback to support `statusChangedAt`, `createdAt`, and legacy `date` aliases as well as the snake_case fields. Equal timestamps retain a deterministic descending ID tie-break.
- Search/status/date predicates, canonical filtered result set, page size, and full-filter CSV export remain unchanged. No order records or production data were changed.
- Source verification and a real timezone/browser test are still required; no full build or automated test suite was run in this stage.
- No Production deployment or merge; PR #87 remains Draft/unmerged.


## Order details modal field compatibility audit — 2026-11-11

- Compared the admin order-detail modal with the canonical order CSV export, invoice renderer, and shared order item normalizer.
- Found that the modal omitted customer delivery city, region, and postal code; used only legacy phone/address/date keys; omitted the `product_sku` alias; and resolved item prices in a different precedence order from CSV/invoice. Gift options/messages also only displayed snake_case fields.
- Updated the modal to support `created_at/createdAt/date`, `phone/customer_phone`, `address/delivery_address/shipping_address`, city/region/postal-code fields, SKU aliases, camelCase and snake_case gift options/messages, and consistent `priceGEL/price_gel/price` precedence. Invalid/empty quantities now display the safe default rather than arbitrary truthy values.
- Kept existing order snapshots, customer/order records, item totals, financial breakdown, admin notes, invoice flow, and CSV export unchanged. No database or production data was modified.
- Static source checks passed for the new aliases and price precedence. No browser/modal interaction test, PDF test, automated suite, or full build was run; therefore visual rendering and runtime behavior remain unverified.
- No Production deployment or merge; PR #87 remains Draft/unmerged.


## Order modal and invoice legacy snapshot parity — 2026-11-11

- Continued the order-detail consistency audit after comparing the modal, CSV export, invoice renderer, and shared order-item normalizer.
- Found that invoice output did not consistently support legacy aliases for order date, customer phone/address, product name/SKU, and camelCase gift options/messages. The detail modal and invoice also read checkout breakdowns only from the camelCase object shape.
- Updated invoice rendering to use the same order date, phone, address, city, region, postal-code, product-name/SKU, and gift-field aliases supported by the admin detail/export paths. All newly rendered text continues through HTML escaping.
- Added a defensive checkout-breakdown resolver for camelCase and snake_case snapshot shapes, validating all subtotal/discount/delivery values before rendering. The invoice and detail modal now use the same normalized breakdown; malformed or incomplete breakdowns fall back to the existing total-only view rather than throwing or displaying invalid amounts.
- Preserved existing order records, item snapshots, totals, CSV export, admin notes, and stock. No database or production data was modified.
- Source changes were committed to the audit branch. Static source verification and runtime/build/browser/PDF checks remain to be completed; no claim of visual or print validation is made.
- No Production deployment or merge; PR #87 remains Draft/unmerged.


## Customer contact and delivery detail completeness — 2026-11-11

- Audited customer contact and delivery fields across the admin order card, full-detail modal, invoice, and CSV export.
- Fixed omissions: surname now appears as its own field in the full-detail modal and invoice, and is included alongside the customer's name on the order card. Order cards now include customer email and the full address components (street/address, city, region, postal code) when present.
- CSV phone export now accepts the legacy `customer_phone` alias as well as `phone`.
- Existing field aliases and HTML escaping are retained. Missing optional contact/address fields display a neutral fallback rather than fabricating values.
- No order/customer records, database schema, inventory, or production data changed.
- Source and audit-log changes are on the existing audit branch. Runtime/build/browser verification remains outstanding; no Production deployment or merge. PR #87 remains Draft/unmerged.


## Payment status and delivery-fee traceability audit — 2026-11-11

- Compared the live `public.orders` schema, live `private.create_order_with_stock(jsonb)` implementation, checkout request/response mapping in `src/App.jsx`, and the admin order modal, invoice, and CSV export.
- Confirmed the live orders table has no `payment_method` or `payment_status` columns. The checkout RPC accepts no payment-provider/method fields and returns no payment authorization/capture state. The storefront checkout code contains no payment-method selection or payment-provider flow. Therefore the existing order status is an order-fulfilment status only and must not be interpreted as proof of payment. No payment was fabricated or marked paid.
- Confirmed the current checkout RPC calculates the delivery fee server-side from `public.store_delivery_fees` and persists the resulting amount in `checkout_result.delivery_gel`, alongside subtotal, discount, and total. The admin loader maps that persisted snapshot to `checkoutBreakdown`; the modal and invoice render the validated breakdown. The CSV uses the persisted breakdown and a legacy address-text fallback, otherwise flags delivery as requiring review.
- Improved traceability without changing checkout/payment behavior or database schema: the order modal and invoice now explicitly state that payment method/status are not stored and that order status is not payment confirmation; the modal flags orders without a persisted delivery breakdown; the order CSV now has explicit payment-method and payment-status columns marked “სისტემაში არ ინახება” rather than leaving the absence ambiguous.
- No order/customer/payment/stock records or database schema were changed. No payment provider was configured, no test order was placed, and no Production deployment or merge occurred. PR #87 remains Draft/unmerged. Browser, PDF, spreadsheet, and full-build verification remain outstanding.


## Order fulfillment status, transition guards, and delivery tracking audit — 2026-11-11

- Compared the admin status-change handler and controls with the live `public.admin_update_order_status(text,text)` wrapper, `private.admin_update_order_status(text,text)` implementation, and all non-internal triggers on `public.orders`.
- Confirmed the server validates the five supported Georgian states, locks the target order row, rejects backward transitions from shipped/delivered states, prevents direct reactivation of cancelled orders, and restores stock only once during eligible cancellation. Reactivation remains a separate password-reauthenticated flow with server-side guards. No stock or order records were modified.
- Confirmed `orders_set_status_changed_at` writes server-side `now()` whenever the status actually changes. The existing timestamp migration is present on the audit branch and the live trigger is installed; historical rows may legitimately have NULL timestamps and the analytics layer explicitly falls back to creation time.
- Confirmed status-change notifications are emitted by the existing after-update trigger for linked authenticated customer accounts; guest orders have no Auth user ID and do not receive account notifications. Existing notification rows were not modified.
- Confirmed the customer tracking UI reports manual admin status progress and explicitly states that courier GPS/live map tracking is not connected. It does not claim real-time courier location. Existing tracking lookup protections/rate limiting were left unchanged.
- Read-only live aggregate check returned one existing cancelled order and no orders with a missing status-change timestamp; no customer-identifying data was queried. No test order or status mutation was performed.
- No code/schema changes were needed in this stage: server-side timestamping, transition protections, cancellation stock restoration, and tracking limitations are already implemented. No Production deployment or merge occurred. PR #87 remains Draft/unmerged. Browser interaction and end-to-end notification delivery remain untested.

## Customer order history and notification completeness audit — 2026-11-11

- Completed a read-only comparison of the live order-history and notification RPCs, RLS, grants, triggers, Realtime publication, supporting indexes, and the audit-branch customer frontend in `src/App.jsx`.
- Confirmed `get_my_orders()` selects only rows whose immutable `orders.user_id` equals `auth.uid()`, returns `status_changed_at`, and removes purchase-cost, vendor, supplier, margin, and profit keys from item JSON before returning customer history. A partial index supports the user/date/ID order-history lookup.
- Confirmed the notification getter returns only the current user's latest 100 rows ordered newest-first; the mark-read RPC updates only unread rows belonging to `auth.uid()`. The public wrappers are SECURITY INVOKER, while the private SECURITY DEFINER implementations check the authenticated UID. EXECUTE grants are restricted to authenticated users for these RPCs.
- Confirmed `order_notifications` has RLS and FORCE RLS enabled, its only authenticated SELECT policy is `auth.uid() = recipient_user_id`, and authenticated table grants include SELECT only. Recipient/time indexing and the unique order/event key are present.
- Confirmed the order INSERT and status-change triggers create notifications only when an order is bound to an authenticated `user_id`; guest orders are intentionally excluded. The trigger's unique `(order_id,event_key)` key prevents duplicate insert events for the same key. No notifications were sent or modified.
- Confirmed the customer frontend clears private order/notification state on account changes, guards asynchronous responses against owner changes, retains last successful snapshots on transient errors, coalesces concurrent refreshes, subscribes to the recipient-filtered Realtime notification stream, refreshes on subscription, polls every 30 seconds, and refreshes when the page becomes visible. Order history is refreshed while the profile tab is active and on the customer-order-updated event.
- Live read-only aggregate checks found one existing guest order, zero Auth-linked orders, and zero order-notification rows. Thus no live registered-customer notification could be exercised without creating a test order; no test order was created.
- No functional or database defect was proven in this stage, so no application or schema change was made. End-to-end delivery and browser interaction remain untested.
- Corrected the GitHub repository owner spelling used for audit operations to `chixradzezauri-design` (the previously mistyped owner caused the 404 responses). Re-fetched the existing audit log and confirmed PR #87 is still open, Draft, and unmerged. No Production deployment or merge occurred.

## Guest order tracking lookup and rate-limit security audit — 2026-11-11

- Compared the live `public.lookup_order_for_tracking(text,text)` wrapper and `private.lookup_order_for_tracking(text,text)` implementation with the customer frontend request/response handling, private rate-limit table, RLS, grants, indexes, constraints, and order status triggers.
- Confirmed the public wrapper is SECURITY INVOKER with an empty search_path; the lookup implementation is SECURITY DEFINER in the non-exposed private schema with an empty search_path. The RPC is callable by anon/authenticated as intended for guest order tracking; the private helper requires the same EXECUTE grant for the wrapper to invoke it. The private rate-limit table has RLS enabled, an explicit deny policy for anon/authenticated, and no table grants to those API roles.
- Confirmed lookup inputs are length-bounded before normalization; order IDs are normalized to uppercase and constrained to 6–64 characters of A–Z, digits, underscore, or hyphen; phone input is normalized to digits and constrained to 9–15 digits. The database compares both normalized values and returns NULL for non-matches, avoiding a separate order-ID/phone mismatch disclosure.
- Confirmed separate hashed buckets are maintained for phone and order code, each limited to 10 attempts per 15-minute window; raw phone/order values are not stored. Expired buckets older than one hour are cleaned during lookups. A unique key prevents concurrent duplicate bucket rows; attempts and bucket type have CHECK constraints. Live aggregate inspection found only two existing buckets, none in the current 15-minute window, and a maximum recorded attempt count of one. No bucket hashes or customer values were retrieved.
- Confirmed successful responses contain only tracking essentials: order ID, total, fulfillment status, Tbilisi-local order date, and a concise product/variant/quantity summary. They do not return customer name, email, full address, payment credentials, supplier data, or internal cost/profit fields. Existing status transition triggers remain active and were not changed.
- The current design has one availability-hardening consideration: phone and order-code buckets are global per target value, not additionally scoped to a verified requester/source. A party who knows a target phone/order code could consume its 10-attempt allowance and temporarily block legitimate lookups for that target. Adding a source-based bucket requires a trusted proxy/IP identity and verification of the hosting header contract; blindly trusting a client-supplied IP header would create a spoofable bypass. This was recorded as a follow-up hardening item, not changed without a verified trusted source.
- No live lookup was performed against a real customer order, no rate-limit counters were incremented, and no order/customer data was changed. No application or schema defect was proven in this stage; no code/schema changes were made. Browser end-to-end guest tracking remains untested.
- No Production deployment or merge. The combined audit PR remains Draft/unmerged.

## Checkout/order input validation audit — 2026-11-11

- Compared the storefront checkout validation helpers and request builder with the live public.create_order_with_stock(jsonb) wrapper and private.create_order_with_stock(jsonb) implementation.
- Confirmed the server enforces a JSON payload ceiling of 65,536 bytes; order ID format/length; customer name length 2–100; final address length 3–300; phone input length and normalized digit count 9–15; email fields at most 254 characters; coupon code at most 64; delivery region at most 32; and 1–50 product lines. The server also validates each raw line before aggregation, item IDs/options, quantity 1–100, add-on boolean types, gift-message length 240, and the requirement that a gift message accompanies gift wrap.
- Confirmed checkout prices, add-on charges, coupon discount, delivery fee, product/variant availability, and stock deduction are recalculated/checked by the database under row locks. The browser's supplied total/price is not authoritative. The frontend also checks 1–50 lines, per-product aggregate quantity, item ID/variant lengths, add-on types, and contact-field lengths/format.
- Found and fixed a client/server boundary mismatch: the form previously validated only the customer's typed address (up to 300 characters), then appended the delivery region and fee before sending it. The resulting persisted address could exceed the server's 300-character limit and be rejected despite passing frontend validation. src/App.jsx now constructs the exact final delivery address before contact validation, validates that final value, and sends the same validated string to the RPC. Added a regression test in tests/checkoutValidation.test.js for a long address whose delivery suffix pushes it over the server limit.
- Identified a remaining server-side hardening gap: the RPC limits email fields by length but does not independently enforce email syntax or ensure an authenticated customer's customer_email matches the JWT email. The browser currently validates email syntax and derives the registered account email from the Auth session, but direct RPC callers can bypass browser validation. The database also checks phone digit count after stripping non-digits without enforcing the same allowed-character set as the frontend. These are backend validation improvements requiring a reviewed SQL migration; no live database function/schema was changed in this stage.
- No order was submitted, no customer/order/stock data was read beyond schema/function definitions or modified, and no production test was performed. Automated tests/build and browser checkout remain unexecuted because this session has no checked-out repository/runtime test environment; the new regression test is staged but not claimed as passed.
- No Production deployment or merge. The combined audit PR remains Draft/unmerged.

## Checkout replay/idempotency and concurrent stock atomicity audit — 2026-11-11

- Compared the storefront retry fingerprint/order-ID lifecycle and `groupCheckoutItems` helper with the live `private.create_order_with_stock(jsonb)` transaction, the public RPC wrapper, `public.orders` primary key, and stock update statements.
- Confirmed the browser builds a SHA-256 fingerprint from normalized customer/contact identity, the grouped product/variant quantities and options, coupon code, and delivery region. It reuses a pending secure 128-bit `ORD-` identifier only for an exact fingerprint match, stores the digest/ID pair in sessionStorage when Web Crypto is available, and retains the in-memory retry reference if storage is unavailable. Secure random generation fails closed if cryptographic randomness is unavailable.
- Confirmed the database takes `pg_advisory_xact_lock(hashtextextended(order_id, 0))`, then reads the matching order `FOR UPDATE`. If the order already exists, it compares customer name, phone, address, user/customer email, and the canonical checkout request (including grouped product/variant quantities, selected size/color, coupon, delivery region, and selected add-ons). An identical retry returns the stored checkout result with `idempotent_replay=true`; reuse of the same ID with changed details is rejected. A missing stored result is rejected for support review rather than deducting stock again.
- Confirmed `public.orders.id` is the primary key. No separate unique index on `checkout_request` is required for this ID-keyed replay design because the transaction-scoped advisory lock serializes calls for the same order ID and the primary key prevents duplicate order rows.
- Confirmed the RPC locks each product row with `SELECT ... FOR UPDATE` in deterministic product/variant order before checking stock and prices. Stock deduction uses conditional updates that require sufficient current stock; variant stock is updated within the product's JSON variant array while the product row lock is held. The RPC checks that exactly one row was updated and raises an exception otherwise. PostgreSQL statement/transaction atomicity means a later failure, including order insert failure, rolls back earlier stock updates and does not leave a partial order.
- Confirmed API roles have only SELECT table-level access to `public.orders`; checkout writes are routed through the public SECURITY INVOKER wrapper to the private SECURITY DEFINER implementation. The private function has an empty search_path. No direct table-write privilege was introduced.
- No production checkout, duplicate submission, concurrent order, or stock mutation was performed. Therefore concurrency behavior was verified from the live function definition and database constraints, not by a destructive or production test. No functional defect was proven and no code/schema change was needed in this stage.
- No Production deployment or merge. The combined audit PR remains Draft/unmerged.

## Server-side checkout email and phone validation hardening review — 2026-11-11

- Re-read the live `public.create_order_with_stock(jsonb)` wrapper and `private.create_order_with_stock(jsonb)` implementation, plus the audit-branch `src/utils/checkoutValidation.js` and the checkout request path.
- Confirmed the public wrapper currently bounds the payload to 65,536 bytes; validates order ID, customer name, address, phone length/digit count, email field lengths, item count/shape, and option/add-on limits; then delegates to the private transaction. The private implementation normalizes `customer_email` by trimming and lowercasing, and for authenticated orders checks `user_email` against the JWT email case-insensitively. The private function is SECURITY DEFINER with an empty search_path; the public wrapper has an empty search_path.
- Confirmed the storefront phone format is intentionally compatible with Georgian/international input: optional leading plus, ASCII digits, parentheses, spaces, and hyphens, with 9–15 digits after removing separators. The public SQL wrapper currently strips every non-digit character before checking digit count, so it can accept arbitrary punctuation/letters mixed into an otherwise valid digit string. This is a confirmed client/server validation mismatch.
- Confirmed the SQL wrapper only enforces a 254-character maximum for `customer_email` and `user_email`; it does not validate email syntax. The browser helper uses a conservative basic email shape check. The private function checks the authenticated `user_email` against the JWT but does not independently bind the persisted `customer_email` field to that same verified JWT email. This leaves direct RPC callers able to bypass browser email syntax validation and, for authenticated requests, potentially supply a different customer contact email.
- Guest checkout compatibility: the frontend currently requires an email for guests, but the database currently permits an empty `customer_email`. Do not make guest email mandatory in the database without checking older clients/integrations and confirming the final compatibility contract; keep existing guest order records untouched.
- Recommended narrow backend migration (not applied): (1) reject phone characters outside the storefront's accepted set before digit normalization, while preserving optional leading plus and existing Georgian phone formats; (2) apply a conservative SQL email-shape check after trim/lowercase, with the existing 254-character ceiling and no attempt at full RFC validation; (3) for authenticated users, require normalized `customer_email` to equal the verified JWT email (or derive the persisted contact email from that claim), while preserving guest behavior. Keep the current wrapper/private function security model, empty search_path, transaction logic, replay checks, stock locks, and order snapshots unchanged.
- No customer/order rows, Auth users, phone/email values, stock, or schema were changed. No production checkout was submitted. No migration file was created because the Supabase CLI is unavailable in this environment and the Supabase workflow requires creating migration files with `supabase migration new`; inventing a timestamp or manually fabricating a migration filename would risk migration-history inconsistency. The live migration history was inspected read-only; latest applied version is `20261110133651`.
- The required SQL behavior still needs a reviewed migration created through the Supabase CLI, compatibility tests for guest and authenticated checkout, and verification against a local/staging database before it is included in the combined release. Frontend unit tests, build, and browser checkout were not run in this stage.
- No Production deployment or merge. The combined audit PR remains Draft/unmerged.

## Checkout RPC JSON field-type and malformed-input audit — 2026-11-11

- Re-inspected the live public checkout wrapper and private implementation, including the exact JSONB field extraction and database-side validation paths. The wrapper correctly limits payload size, order ID shape, line count, gift/add-on types, and delegates to the private function, which validates each raw quantity before aggregation and uses server-side product prices/stock.
- Confirmed a second input-validation gap: order-level `customer_name`, `phone`, and `address` are read with JSONB `->>` text coercion but their JSON types are not required to be strings. The phone validator also removes every non-digit character before checking digit count.
- Read-only SQL reproductions showed the live validation expressions accept all of these malformed shapes at the field-validation layer: a numeric JSON phone containing 9–15 digits; an object-valued phone whose serialized text contains 9–15 digits; a numeric customer name with 2–100 digits; and an array-valued address whose serialized text is 3–300 characters. These are not valid storefront form payloads, but direct callers of the public RPC can submit them. This is a confirmed server-side type-validation defect, not a claim that a fraudulent order was inserted.
- Narrow remediation: require JSONB `string` type for `customer_name`, `phone`, `address`, and any optional text identity/contact fields before applying text checks; keep existing length limits and accepted Georgian phone character set; reject malformed values before invoking the private function. Apply equivalent defensive checks inside the private implementation as well, so its SECURITY DEFINER body is safe if called by another privileged database path in future. Keep guest checkout compatibility and all stock, pricing, idempotency, and order-snapshot behavior unchanged.
- The private implementation already checks raw item quantity syntax/range before integer casts, limits individual quantities to 1–100, and limits the public wrapper to 1–50 item rows. It locks products and computes prices/stock server-side. No evidence in this pass justified changing those paths.
- Read-only SQL only; no RPC was invoked with test data, no order was created, and no customer/order/product/stock/Auth data was modified. No migration was applied or staged: this needs a reviewed migration created through the Supabase CLI, with the earlier email/phone hardening combined carefully and tested for guest/authenticated paths. No automated tests, build, or browser checkout were run.
- No Production deployment or merge. PR #87 remains Draft/unmerged.


## Preview white-screen regression fix and CI verification — 2026-11-12
- Confirmed the blank-screen root cause in `src/App.jsx`: the `adminLoggedIn` state was referenced in an effect dependency array before its `const useState` declaration, triggering a temporal-dead-zone ReferenceError during initial render. Moved the state declaration above the effect; no duplicate declaration remains.
- Commit: `c30ee3c6d61d3a7fe484e6c8d14c1570f0a5ba44` on `fix/admin-panel-audit-2026-11-10`.
- User confirmed the new Preview renders successfully in their browser. Vercel deployment `dpl_GHhF61vmn5pJKLRG1aZMa8HhrVAf` is `READY`; this is Preview only.
- GitHub Actions for this commit: Build check passed, with 280 tests passed and 0 failed; dependency security audit passed; CodeQL analysis passed. Vercel commit status passed.
- A GitHub API 404 was caused by using an incorrectly spelled repository owner in earlier requests. Repeating the requests with the canonical repository full name `chixradzezauri-design/geostore` returned the PR, commit status, workflow runs, and job logs successfully. Do not use the misspelled owner in subsequent calls.
- No Production deployment or merge performed. PR #87 remains Draft/unmerged while the broader audit and remaining remediation work continue.


## Product variant validation: client/server parity review — 2026-11-12
- Traced the admin product-save path in `src/components/AdminDashboardPro.jsx`: product creation calls `admin_save_product`; editing calls `admin_update_product_with_stock`. The browser runs `validateProductVariants` and `validateSizeColorInventoryVariants` before either request.
- The client validator limits the list to 50, validates object shape, unique non-empty IDs, names, bounded prices and integer stock. The size/color validator also checks complete matrix coverage, unique size/color pairs, allowed dimensions and `size_color` type. Existing unit tests cover the principal client-side invalid cases.
- This browser validation is not a server security boundary. The earlier live SQL review confirmed the privileged creation RPC does not independently enforce every variant object's shape, unique IDs and unique normalized size/color pairs before INSERT; the UPDATE trigger also lacks duplicate-ID and duplicate-combination rejection. Checkout's ID-based selection and stock mutation make duplicate IDs a data-integrity risk. Current live rows were clean; no malformed rows or stock mismatches were found.
- Required remediation remains server-side and must cover INSERT and UPDATE through one shared validator, while retaining existing stock-preservation, order-history protection and aggregate-stock synchronization behavior. Add regression tests for duplicate IDs, duplicate normalized pairs, malformed JSON shapes, bounds and valid legacy variants.
- No product/order/stock data was changed and no RPC was invoked with test data. No migration was created or applied in this stage: Supabase CLI is unavailable in the working environment, and the project migration must be generated and reviewed with the CLI before release. Do not substitute a hand-invented migration timestamp.
- No Production deployment or merge. PR #87 remains Draft/unmerged pending the combined audit release.


## Server-side product variant integrity validation — staged 2026-11-12
- Generated migration filename with Supabase CLI 3.1.0: \`20261112061816_product_variant_integrity_validation.sql\`. Staged on the audit branch; it has NOT been applied to the live Supabase project.
- Adds a private server-side validator for product variant arrays: object shape; text IDs/names; bounded unique IDs; numeric price syntax/range and max two decimal places; integer stock 0–1,000,000; supported variant type; valid size/color strings; allowed dimensions; unique normalized size/color pairs; complete size/color matrix coverage; maximum 50 variants; and mutual exclusion of size/color matrices and custom variants.
- Reworks the existing stock-preservation trigger to validate on both INSERT and UPDATE, and when size/color dimensions are changed. It keeps the existing order-history deletion/reuse guards and preserves existing variant stock except during the established explicit stock-adjustment path. JSON null variant arrays are normalized to empty arrays before the aggregate-stock trigger runs.
- Retains the existing aggregate stock trigger and trigger ordering; no change to checkout pricing, stock deduction, order snapshots, or customer data.
- Local isolated PostgreSQL compatibility tests using PGlite executed the migration against minimal products/orders tables and exercised valid custom variants, complete size/color matrices, duplicate IDs, duplicate normalized pairs, incomplete matrices, malformed shapes, invalid price precision, fractional stock, mixed variant types, INSERT and UPDATE trigger rejection, stock preservation, aggregate-stock synchronization, JSON-null normalization, and order-history variant deletion protection. All 16 checks passed. This is isolated local validation, not a live database test.
- Read-only live data audit: 8 products; zero invalid variant-array shapes, invalid dimension-array shapes, non-object variants, invalid IDs/names/prices/stock, duplicate IDs, mixed custom/size-color products, duplicate size/color combinations, or out-of-list size/color values. The 5 existing size/color products have complete matrices (8, 10, 10, 12, and 12 combinations); the one custom-variant product has 3 variants. No product/order/stock rows were changed.
- The migration is staged for combined release only. No live SQL migration, Production deployment, or PR merge was performed. PR #87 remains Draft/unmerged pending full audit completion and explicit release approval.

## Announcement dispatch and live Supabase security re-check — 2026-11-12

### Live database and deployment findings (read-only)

- Reconfirmed the connected Supabase project is `xmtnszxtnfxnrojionoa`, PostgreSQL 17.11, ACTIVE_HEALTHY.
- Live migration history currently ends at `20261110133651_admin_update_product_with_stock`. The product variant integrity migrations staged on this GitHub branch are not yet applied to the live database.
- Live schema contains the existing order, order-notification, legacy message, support-ticket, product, coupon, delivery-fee, and storefront tables. The inspected public/private tables all have RLS enabled. `public.order_notifications` also has FORCE ROW LEVEL SECURITY.
- Live row counts from the schema inventory include 1 order, 14 legacy messages, 3 support tickets, and 8 products. These records were not read individually or modified.
- No `announcements`, `announcement_recipients`, or announcement dispatch/idempotency table or RPC exists in the live schema. No announcement migration is present in live migration history.
- Supabase reports zero deployed Edge Functions in the connected project. Therefore the repository's `admin-announcements` source is not deployed there; no announcement dispatch endpoint is live.
- The current repository Edge Function source only accepts `list-recipients`. The recipient-resolution, payload-validation and digest helpers are staged but are not wired to a transactional send action. A real send endpoint must not be added until its atomic DB RPC and idempotency schema are created and reviewed together.
- The live Auth configuration advisor reports `auth_leaked_password_protection` WARN: leaked-password protection is disabled. The connected Supabase toolset in this session exposes no Auth password-security settings update action; no unsupported workaround was attempted. Remediation URL: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- The performance advisor reports five unused indexes and one `multiple_permissive_policies` warning on `public.products` SELECT: `Admin can read all products` and `Public can read published products`. The two policies are intentional for distinct audiences; merging them requires a careful policy rewrite and role-behavior regression checks. No policy/index was changed based on the advisor alone.
- Read-only policy inspection confirms the reviewed public/private tables have RLS enabled; primary-admin policies use the trusted admin UID and `app_metadata.role` checks. Customer order-notification SELECT remains scoped to `auth.uid() = recipient_user_id`.

### Remediation decision / next steps

1. Keep announcement dispatch unavailable until the migration is generated through the Supabase CLI workflow and includes dedicated announcement, recipient-snapshot, and idempotency objects plus a single atomic server-only dispatch RPC.
2. Wire the Edge Function to Auth Admin recipient resolution and the transactional RPC only after the schema is available in a local/staging database; test retry, conflict, concurrency, rollback, and cross-account isolation before deployment.
3. Enable Supabase Auth leaked-password protection through the supported project Auth settings when the setting is accessible. Do not weaken password rules or implement a client-side substitute.
4. Treat unused-index and duplicate-permissive-policy advisor notices as optimization candidates only; preserve current access semantics and verify actual query usage before any change.

### Verification boundary

- Read-only live Supabase migration, table, policy, Edge Function inventory, and advisor checks only.
- No database DDL, grants, policies, indexes, Auth settings, Auth users, Edge Functions, customer/order/message/product rows, or Storage objects were changed.
- No announcement was sent. No build, automated test, Vercel deployment, Production deployment, or PR merge was run.
- PR #87 remains open and Draft; all remediation remains staged for the combined release after full audit and explicit approval.

## Order RPC and deletion-permission verification — 2026-11-12

### Live Supabase checks (read-only; current catalog)

- Rechecked the live `public.orders` table after reviewing the repository's `20261107084940_harden_order_status_stock_transitions.sql` migration.
- `public.orders` has RLS enabled. The only live table-level client grant returned for `anon`/`authenticated` was authenticated SELECT; there is no authenticated or anon table-level DELETE, INSERT, or UPDATE grant. Authenticated order-note updates are intentionally column-scoped in the existing policy/grant setup and the dedicated RPC is the supported write path.
- The current live role grant inventory shows no authenticated DELETE grant on `public.orders`; the earlier audit note that authenticated DELETE was granted is stale and must not be relied upon. The live migration `20261107084940_harden_order_status_stock_transitions` includes `REVOKE DELETE ON TABLE public.orders FROM PUBLIC, anon, authenticated` and drops the admin delete policy.
- Live order status trigger `orders_guard_status_transition` is present alongside the stock-restoration, notification, ownership, and status-timestamp triggers.
- Live private status RPCs `private.admin_update_order_status` and `private.admin_reactivate_cancelled_order` are SECURITY DEFINER with an empty search_path. Both enforce the primary administrator Auth UUID and `app_metadata.role='admin'`. Reactivation additionally requires a password-auth AMR event within five minutes, locks the target order, validates stock/item snapshots, adjusts base or custom-variant stock atomically, and then changes the order status.
- The live status RPC wrappers in `public` are SECURITY INVOKER with an empty search_path. Their execute grants are restricted to authenticated/service_role; the private status implementations are executable by authenticated (plus postgres; status update also service_role), while their internal admin identity checks remain mandatory.
- `public.create_order_with_stock` remains callable by anon/authenticated for guest/authenticated checkout. Its live wrapper validates request object/size, order ID, customer/address/phone/email bounds, item array/count, selected option lengths, and add-on field types before delegating to the private transactional checkout RPC.
- The live order migration ledger currently contains 85 applied entries and ends at `20261110133651_admin_update_product_with_stock`. The order status hardening migration `20261107084940` is already applied; do not replay it or manually repair migration history.
- No order row, stock value, order notification, customer record, grant, policy, trigger, function, or migration ledger entry was modified during this check.

### Conclusion

The current live order table grants and RPC authorization do not support the previously noted authenticated-delete concern; that note is corrected here. The main order status-transition and atomic stock safeguards are present in the live catalog. Remaining release work is migration/source-history reconciliation and controlled non-production regression testing, not an immediate production SQL patch.

### Verification boundary

- Read-only SQL catalog queries and migration inventory only.
- No synthetic/test orders, status changes, stock changes, database writes, deployment, or merge.
- PR #87 remains Draft/open pending completion of the audit and explicit release approval.

## Support conversations, legacy chat and admin activity audit — 2026-11-12

### Live-vs-staged migration reconciliation (read-only live inspection)

- Live Supabase migration history currently ends at `20261110133651_admin_update_product_with_stock`. The support hardening migrations dated 2026-11-10 in this branch are not applied to the live database.
- Live `public.support_tickets` has RLS enabled, but the current catalog still contains the `Admin can delete support tickets` DELETE policy and an `authenticated | DELETE` table grant. The staged migration `20261110152001_prevent_support_ticket_deletion.sql` removes that policy and revokes the direct DELETE grant. Until that migration is applied through the approved combined release, the primary admin can still delete support-ticket records. This is a live data-retention gap, not a claim that arbitrary customers can delete tickets.
- Live `public.messages` (legacy chat) still has `Admin can delete chat messages` and `Admin can update chat messages` policies and authenticated DELETE/UPDATE grants. The staged migration `20261110151000_prevent_legacy_chat_message_mutation.sql` removes those policies and revokes those direct grants. Until applied, the admin role can still edit/delete legacy chat history.
- Live `public.support_ticket_messages` has RLS enabled and authenticated SELECT only; message writes are through the RPCs. Its admin read policy is restricted to the configured primary admin. The support ticket table INSERT policy validates initial ticket field lengths, initial status, and prevents clients from setting admin reply/customer identity/access-token hash.
- Live support message RPCs include the idempotent reply implementation. The current deployed catalog does not include the staged attachment-aware/read-receipt RPCs; the live Edge Function inventory is empty, so the repository's `support-attachments` Edge Function is not deployed. Attachment upload and signed URL retrieval are therefore not available in the live project until the combined release deploys the function and applies its matching migration.
- The staged support attachment migration makes the bucket private, restricts direct client access, validates attachment path/MIME/size and binds uploads to the authorized ticket before recording the message. It must be deployed together with its Edge Function; do not apply one without the other.
- The staged support read-receipt migration adds nullable read timestamps and an admin-only unread-count RPC. Historical read state remains NULL; it does not falsely mark existing messages as read.
- The private `admin_activity_log` and `support_intake_rate_limits` tables/functions are present in the live database from migration `20261107085444_secure_support_intake_and_persist_admin_activity`. They are in the private schema, have RLS enabled, and direct grants are revoked. Admin activity write/list functions require the configured primary admin UUID and `app_metadata.role='admin'`; listing is capped at 200 rows.
- No rows in `messages`, `support_tickets`, `support_ticket_messages`, or `private.admin_activity_log` were selected for content or changed. No delete/update/insert, migration, policy, grant, bucket, or Edge Function operation was performed.

### Required staged release actions

1. Apply the existing staged legacy chat immutability and support-ticket deletion-protection migrations in the correct migration order; do not manually delete or rewrite existing records.
2. Apply support read receipts and support attachment schema only as part of the paired release with the `support-attachments` Edge Function.
3. Deploy and verify the Edge Function before enabling the UI path for attachment uploads; use private storage and signed URLs only.
4. Regression-test admin/customer/guest access boundaries, duplicate request replay, attachment mismatch rejection, and history retention against a non-production database before Production release.

### Verification boundary

- Live Supabase catalog, migration ledger, RLS policies, grants, routines, and Storage policy inventory were inspected read-only.
- No live database or Storage objects, messages, support tickets, admin activity, users, or deployment settings were modified.
- The two retention gaps above remain staged for the already-approved combined-release workflow; no Production deployment or PR merge.
- PR #87 remains Draft/open pending completion of the audit and explicit release approval.

## Customer account ownership and support access-control audit — 2026-11-12

### Live Supabase checks (read-only)

- `private.get_my_orders()` returns only rows where `orders.user_id = auth.uid()`. Its JSON item projection removes purchase cost, vendor, supplier, margin, profit and related internal fields before returning customer history.
- `private.get_my_order_notifications()` requires a signed-in user and filters strictly by `recipient_user_id = auth.uid()`; results are limited to the latest 100 notifications.
- `private.mark_my_order_notifications_read()` requires authentication and updates only unread rows owned by the current `auth.uid()`.
- The corresponding public wrappers are SECURITY INVOKER with an empty search_path; the private implementations are SECURITY DEFINER with an empty search_path.
- Support conversation read/reply RPCs check the configured primary admin identity or customer ownership by `customer_user_id`, verified signed-in email, or a 64-character access token whose SHA-256 digest matches the stored token hash. Replies are row-locked and idempotent by request UUID; replaying a request with different ticket/sender/message content is rejected.
- The live legacy `messages` table still has authenticated UPDATE/DELETE grants and admin-only update/delete policies. The staged migration `20261110151000_prevent_legacy_chat_message_mutation.sql` is required to remove these mutation paths.
- The live `support_tickets` table still has an authenticated DELETE grant and admin-only DELETE policy. The staged migration `20261110152001_prevent_support_ticket_deletion.sql` is required to protect support history from deletion.
- Live support admin replies currently set the ticket status to `მოგვარებული`; the staged migration `20261110154000_fix_support_admin_reply_status.sql` adjusts the status handling. This remains a live-vs-staged difference until the migration is released.
- No cross-user order/notification query, token brute-force, synthetic support ticket, or write test was performed against Production. No user, order, message, ticket, notification, or permission was modified.

### Findings and action

- No cross-account data exposure was identified in the inspected customer order/notification RPC definitions.
- Existing staged migrations already address the two support-history deletion/editing risks and the admin-reply status mismatch. No duplicate or conflicting SQL patch was added.
- Apply the existing migrations only in the approved combined release, then verify access boundaries with separate test accounts in a non-production project.

### Verification boundary

- Read-only function-definition, RLS policy, table grant, and migration inventory inspection.
- No live data mutation, migration application, Auth configuration change, deployment, or PR merge.
- PR #87 remains Draft/open pending completion of audit and explicit release approval.

## Product variants, size/color inventory and payload validation audit — 2026-11-12

### Live database reconciliation (read-only)

- Live catalog currently contains 8 products; 6 have non-empty variant arrays and 0 have malformed non-array variant payloads.
- Live `public.products` has two relevant triggers: `preserve_product_variant_stock` (BEFORE UPDATE OF variants) and `zz_sync_size_color_aggregate_stock` (BEFORE INSERT OR UPDATE OF variants, stock). The live preservation trigger retains stock for existing variant IDs and prevents removing/reusing variant IDs referenced by order snapshots.
- The staged migration `20261112061816_product_variant_integrity_validation.sql` is not applied to live Supabase. It adds strict variant ID/name/price/stock validation, duplicate ID and duplicate size/color-pair rejection, allowed size/color matching, full matrix coverage, and a trigger that also validates available_sizes/available_colors changes. Until release, these stricter checks are not enforced live.
- The staged migration `20261112063136_product_base_payload_validation.sql` is not applied live. It validates product base fields, numeric price/stock bounds, unique tags, size/color list shape, gallery limits and required image values at the admin RPC boundary. It also preserves creation-only semantics and uses the locked existing product row for updates.
- Live migration history ends at `20261110133651_admin_update_product_with_stock`; both 2026-11-12 product validation migrations remain staged. Do not manually insert migration history or apply them without the paired source release.
- Source-level review confirms the client-side parsers reject malformed optional money and stock quantities; public product cache removes purchase-cost fields and filters unpublished products; image cleanup helpers retain image URLs referenced by other products, order snapshots, storefront data, and legacy messages.
- The referenced test paths `tests/productFormSafety.test.js`, `tests/publishedProducts.test.js`, and `tests/productImageCleanup.test.js` are not present at those exact paths in this branch. This is a test-path discovery gap, not evidence that tests passed; locate the actual test files before claiming coverage.
- No product names, stock values, prices, image URLs, order item snapshots, or customer data were read for this check. No product, variant, stock, trigger, function, table, or migration was modified.

### Findings / action

- No live malformed variant container was detected in the 8-row catalog inventory.
- A meaningful validation gap remains between staged branch migrations and the live database. The existing migrations should be included in the combined release and tested against a copy of current product/variant data before Production.
- The live stock-preservation trigger is present, so existing variant stock is protected during ordinary variant edits. The stricter size/color combination and base payload checks are not yet live.
- No new code patch was justified from read-only inspection; avoid applying stricter validation before checking all current products against its constraints to prevent blocking legitimate legacy product edits.

### Verification boundary

- Live migration ledger, product counts/JSON container shapes, trigger definitions, and source files inspected read-only.
- No live data writes, migration application, product edit, stock adjustment, Storage cleanup, deployment, or merge.
- PR #87 remains Draft/open pending completion of audit and explicit release approval.

## Product creation/edit workflow audit — 2026-11-12

### Source review and finding

- Reviewed the admin product editor's category defaults, category-specific fields, size/color matrix, custom variants, image selection, and create/update RPC payloads.
- Confirmed the editor includes separate clothing and footwear size/color fields, phone memory/RAM/model/chipset/display/OS fields, laptop CPU/RAM/SSD/GPU/model/display/OS fields, and generic accessory material/compatibility fields.
- Confirmed product edits call the atomic `admin_update_product_with_stock` RPC, omit the potentially stale base-stock value, and send only explicitly changed variant quantities to the stock batch operation. Product creation uses the creation-only `admin_save_product` RPC.
- **Fixed category-change cancellation inconsistency:** previously, the editor updated the category and size/color draft fields before asking for confirmation to discard existing size/color inventory rows. If the administrator cancelled, the old inventory matrix remained while the category and draft fields had already changed. The confirmation now runs before any editor state is changed; cancelling leaves category, option drafts, and inventory rows untouched.
- Existing product image selections are loaded into the editor from the saved gallery or main image. The save path retains the existing image selection unless the administrator explicitly removes/replaces it; the save path still requires at least one valid image and preserves newly uploaded files when the database result is ambiguous.

### Verification boundary

- Source-level review only for this step. No production product, variant, stock, image, order, or customer data was changed.
- The category-change fix was committed to the audit branch. Automated tests and a full build have not yet been run for this new commit.
- No Supabase migration was applied, no Storage object was deleted, no Production deployment was made, and PR #87 remains Draft/unmerged pending completion of the audit and explicit release approval.

## Product category classification and storefront option audit — 2026-11-12

### Findings and changes

- Centralized category classification for clothing, footwear, phones, laptops, and accessories in `src/utils/productCategories.js`, with Georgian, English and Russian name support.
- Fixed a category-name collision: categories such as `ტელეფონის აქსესუარები`, `Phone Accessories`, and `Laptop Accessories` previously matched the phone/laptop keyword checks and could show device-specific memory or hardware fields. Accessory classification now takes precedence.
- Updated the admin product editor to use the shared classifiers both when choosing default options and when rendering category-specific fields.
- Updated the storefront to treat the saved product category as authoritative for phone/laptop option prompts. A product title such as “iPhone case” no longer makes a generic accessory appear as a phone with selectable storage capacity.
- Added regression tests for Georgian, English and Russian device categories and for accessory/device keyword collisions.
- Confirmed source-level mapping for the technical specification panel: model, CPU, RAM, storage, GPU, display size, OS, material and durability are loaded from the product row and rendered in the product detail view. Variant-aware products show their own variant price and stock; selected size/color or custom-variant identifiers are passed into the cart payload.
- For phones/laptops, the generic capacity/configuration list is a descriptive selector when no custom price/stock variants are configured. Different prices or independent stock by capacity/configuration should be represented using the existing custom-variant editor, which exposes per-option price and stock.

### Verification boundary

- Source changes and regression tests were committed to the audit branch; the new tests and full project build have not yet been executed in this session.
- No live product, variant, stock, order, customer, image, or Storage data was changed.
- No Supabase migration was applied, no Production deployment was made, and PR #87 remains Draft/unmerged pending completion of the audit and explicit release approval.


## Critical support-ticket authorization NULL-logic defect — 2026-11-12

### Live finding (read-only)

- Re-inspected the live SECURITY DEFINER support RPCs and their effective EXECUTE privileges. The legacy private implementations private.get_support_ticket_messages, private.add_support_ticket_message, and private.add_support_ticket_message_idempotent are executable by both anon and authenticated through the public RPC wrappers.
- These functions computed v_is_customer using an expression that can evaluate to SQL NULL when there is no authenticated UID and no valid guest access token. The guard IF NOT (v_is_admin OR v_is_customer) then also evaluates to NULL; PL/pgSQL does not enter the denial branch for a NULL IF condition. This means the intended authorization denial is not fail-closed for an anonymous caller who knows a ticket ID.
- The same unsafe guard was present in the staged read-receipt and attachment RPC definitions. This corrects the earlier support-access note above: the prior source-level review did not account for SQL three-valued logic, and the live support RPC authorization boundary is not safe until the corrective migration is applied.
- This was established by read-only function-definition/privilege inspection and a SQL truth-table check. No unauthorized read or write attempt was made against Production.

### Staged remediation on PR #87

- Updated 20261110154000_fix_support_admin_reply_status.sql to harden the idempotent reply RPC and redefine the legacy get_support_ticket_messages and add_support_ticket_message implementations with explicit IS NOT TRUE authorization checks. The public wrappers and their existing signatures remain unchanged. Legacy admin replies now also remain in მუშავდება rather than being incorrectly marked resolved.
- Updated 20261110153000_support_ticket_read_receipts.sql so read-receipt access rejects NULL authorization and the unread-count RPC requires both the fixed primary-admin UID and trusted app_metadata.role = 'admin'.
- Updated 20261110155000_support_ticket_attachments.sql so both attachment upload-message and attachment-history RPCs explicitly deny NULL authorization results.
- Added tests/supportTicketAuthorization.test.js to guard all six staged customer/admin support RPC definitions against reintroduction of the NULL-permissive authorization pattern.
- Latest branch CI: 287/287 automated tests passed, production build passed, dependency security audit passed, and the Vercel Preview status is successful. CodeQL was still running at the time of this entry.

### Production safety boundary

- The corrective SQL is staged on the existing audit branch only. It has NOT been applied to live Supabase; the live authorization defect therefore remains until this migration is explicitly approved and applied.
- No ticket, message, order, user, product, stock, Storage object, RLS policy, or live database function was changed in this step. No Production deployment or PR merge occurred.
- PR #87 remains Draft/open. Obtain explicit approval before applying the corrective migration or releasing the combined branch.


## Product creation NOT NULL defaults — 2026-11-12

### Finding

- The live products table defines both is_featured and is_published as NOT NULL. is_featured defaults to false and is_published defaults to true.
- AdminDashboardPro's new-product payload sends is_featured but omits is_published.
- Both the live private.admin_save_product implementation and the staged payload-validation migration used jsonb_populate_record(NULL::public.products, p_product || jsonb_build_object('created_at', now())) followed by INSERT of the complete composite row. This explicitly supplies NULL for omitted columns and bypasses the table default, so new product creation can fail on the is_published NOT NULL constraint.
- This was confirmed by comparing the exact live RPC definition, the product form payload, and information_schema column defaults. No product creation request or test mutation was sent to Production.

### Staged correction

- Updated 20261112063136_product_base_payload_validation.sql so the creation RPC supplies safe defaults for omitted booleans: is_featured=false and is_published=true. Explicit false values remain false; explicit true values remain true.
- Added tests/productCreationDatabaseDefaults.test.js to protect the creation defaults and explicit boolean preservation.
- The migration and test are staged on the existing audit branch. The correction is not applied to Production. Existing products, orders, stock, and images remain untouched.


## Update — 2026-11-12: admin order detail field preservation
- Corrected the repository owner spelling used by the GitHub API client calls. The canonical repository is `chixradzezauri-design/geostore`; the earlier misspelled owner caused 404 responses when retrieving source files. Repository metadata, branch and PR are now reachable using the exact owner.
- Found a data-mapping defect in `src/App.jsx`: the admin order fetch mapper rebuilt a reduced object and discarded additional database columns. The order detail modal already supports optional fields such as customer surname, city, region, postal code, and alternate delivery-address fields, but those fields could never reach it.
- Fixed the mapper to preserve the complete original order row first, then apply the existing normalized UI fields. This does not change database records, order creation, stock, or customer data.
- Added `tests/adminOrderDetailsPreservation.test.js` to prevent regression.
- Change is staged on the existing audit branch only. No Production deployment, database migration, or PR merge.


## Update — 2026-11-12: order image snapshot verification
- Rechecked the deployed Production function `private.create_order_with_stock(jsonb)` and live migration history. Migration `20261108231918_order_item_image_snapshot` is applied in Production.
- The deployed function stores the product image, full gallery, size, color, custom variant identity/name, add-ons, and purchase/vendor/category snapshot. The earlier minimal `create_order_with_stock` definition was superseded by this later migration; it is not the current Production implementation.
- Read-only audit of existing order lines found one legacy item without its own historical image/gallery snapshot. Its product still exists in the catalogue and has an image, so the admin detail resolver can fall back to that image. No historical order row was rewritten because the current catalogue image cannot be guaranteed to be the exact image shown at purchase time.
- Added `tests/orderItemImageSnapshot.test.js` to cover normalization, server snapshot fields, and the admin historical-image/catalogue-fallback order.
- Authentication audit: verified the auth state listener, server-verified session restore with race protection, admin role check, duplicate-submit lock, and mobile account dialog scroll/height constraints. No new defect was confirmed in this pass; no auth code changed.


## Update — 2026-11-12: support conversation persistence and synchronization audit

### Read-only Production verification

- Compared the admin and customer support flows in `AdminDashboardPro.jsx`, `App.jsx`, `supportThreadApi.js`, and the support attachment Edge Function with the live Supabase schema and RPC definitions.
- Confirmed the customer support form uses the idempotent ticket-creation RPC and retains the same ticket ID, guest access token, and request ID for retries after an uncertain network result.
- Confirmed customer replies and admin replies use the idempotent message RPC. Admin ticket lists and selected threads refresh through Realtime subscriptions, with a 15-second polling/visibility recovery path. Legacy `messages` are separately read through Realtime plus the same recovery polling.
- Live data integrity checks: 3 tickets, 5 thread messages, and 14 legacy messages. All 3 tickets have their original customer message represented in the thread; saved legacy reply fields match an admin thread message; no orphan thread messages, duplicate non-null request IDs, or blank thread messages were found.
- The live `support_tickets` and `support_ticket_messages` tables have RLS enabled. Direct INSERT privileges are not granted to anon or authenticated roles; the supported submission path is through the restricted RPCs.
- No support ticket, message, user, or attachment was created, edited, deleted, or otherwise mutated during this audit.

### Release dependencies verified

- The live database currently has the base support threading and idempotent text-message RPCs, but it does not yet have the read-receipt RPCs/columns or attachment columns, private Storage bucket, and attachment RPCs from the staged additive migrations.
- The client helper intentionally falls back to the legacy thread RPC when the attachment-aware RPC is absent, and treats missing read-receipt RPCs as an optional feature. This preserves text conversation access while the combined release is pending.
- Consequently, unread badges and support-photo attachments must not be represented as live/available until the corresponding migrations and the `support-attachments` Edge Function are deployed together with the matching frontend.
- The previously recorded live authorization NULL-logic issue and incorrect admin-reply status behavior remain covered by the staged corrective migration; they were not reclassified as newly discovered findings in this pass.

### Verification and safety boundary

- Current PR #87 head: `d3ef61464679ca3c16d66dc3b3cd6ca4a887499b`. Build check, Dependency Security Audit, and CodeQL all completed successfully for this exact commit.
- No new code defect was confirmed in the message persistence/synchronization pass, so no message-handling source code was changed.
- This audit-log update is documentation-only on the existing audit branch. No Production migration, deployment, PR merge, or live data mutation occurred.


## Update — 2026-11-12: live support attachment deployment check

- Rechecked the actual Supabase Edge Function deployment list for project `xmtnszxtnfxnrojionoa`: it currently returns an empty list. In particular, `support-attachments` is not deployed.
- The matching source exists at `supabase/functions/support-attachments/index.ts`, but source in GitHub is not a deployed runtime. The frontend calls `/functions/v1/support-attachments` for both upload and signed-image URL actions, so those attachment actions cannot work in the current Production environment.
- The live public schema contains only `support_tickets` and `support_ticket_messages` among support-related tables. The live `support_ticket_messages` table does not yet have the attachment columns required by the staged attachment RPC/function. The live function list also does not contain `add_support_ticket_attachment_message` or `get_support_ticket_messages_with_attachments`.
- The existing frontend fallback intentionally keeps text-only threads readable through `get_support_ticket_messages`; missing read-receipt RPCs remain optional. This does not make photo attachments available.
- This is a release-readiness dependency, not a newly discovered text-message persistence defect. Do not deploy the Edge Function alone: first reconcile and apply the complete ordered attachment migration/bucket/RPC set, then deploy the matching Edge Function and frontend together, followed by an authenticated end-to-end verification.
- No Edge Function, migration, bucket, ticket, message, or other Production data was changed. No deployment or PR merge occurred.
- Rechecked PR #87 immediately before this documentation update: it was Draft/open at head `6e5309c1a4a00c6859d1a87d4e930120e50a030b`; Build check, Dependency Security Audit, and CodeQL had all completed successfully for that exact head. This status predates the documentation-only commit below and must be rechecked for the new head.


## Update — 2026-11-12: support attachment release compatibility review

- Reviewed the staged attachment migration, attachment Edge Function, frontend helper, admin integration, tests, and `supabase/config.toml` together.
- Confirmed the function's `verify_jwt = false` setting is intentional and the function performs its own Auth `getUser()` validation for account sessions plus ticket-scoped hashed guest-token validation. The private bucket uses short-lived signed URLs; direct anon/authenticated Storage access is denied by a restrictive bucket policy.
- Confirmed the migration and Edge Function agree on the bucket name, 5 MB limit, JPEG/PNG/WebP MIME types, ticket-scoped object path, RPC argument names, and attachment metadata columns. The function checks that a signed object path is referenced by a message for the same ticket before generating a signed URL.
- Confirmed the frontend fallback only treats a genuinely missing attachment-aware RPC as a reason to call the legacy text RPC; authorization and other errors are not silently downgraded. Existing text-only threads therefore remain readable before the additive migration is installed.
- Existing tests cover supported file validation, private upload request construction, signed URL retrieval, 100-path batching, legacy text-RPC fallback, and fail-closed cleanup after uncertain persistence results.
- No additional source defect was confirmed in this compatibility pass. The remaining blocker is deployment ordering, not a code mismatch: apply the additive read-receipt and attachment migrations (including the private bucket/RPCs), deploy the Edge Function with the matching config/dependency, and release the frontend together. Do not deploy the function by itself.
- No Production migration, Storage bucket/policy, Edge Function, ticket, message, or object was changed. No deployment or PR merge occurred.

## Update — 2026-11-12: migration order, Production privileges, and release safety review

- Compared the live Supabase migration history with every staged migration after the current Production head. The live history currently ends at `20261110133651_admin_update_product_with_stock`; the later branch migrations are not applied.
- Confirmed the support feature migrations depend on earlier staged changes and must not be cherry-picked or run individually. The ordered pending sequence is:
  1. `20261110140000_include_variant_details_in_order_tracking.sql`
  2. `20261110145000_preserve_live_stock_during_product_edit.sql`
  3. `20261110150000_keep_support_tickets_in_progress_after_admin_reply.sql`
  4. `20261110151000_prevent_legacy_chat_message_mutation.sql`
  5. `20261110152000_restrict_product_and_storefront_deletes.sql`
  6. `20261110152001_prevent_support_ticket_deletion.sql`
  7. `20261110153000_support_ticket_read_receipts.sql`
  8. `20261110154000_fix_support_admin_reply_status.sql`
  9. `20261110155000_support_ticket_attachments.sql`
  10. `20261110194917_product_reviews.sql`
  11. `20261112061816_product_variant_integrity_validation.sql`
  12. `20261112063136_product_base_payload_validation.sql`
- Production privilege inspection confirmed that authenticated users currently retain direct UPDATE/DELETE grants on legacy `messages`, DELETE on `products`, DELETE on `storefront_config`, and DELETE on `support_tickets`. The staged hardening migrations revoke these unused direct mutation paths and remove the corresponding permissive delete policies; intended admin workflows remain through the protected server-side functions. No rows are deleted by these migrations.
- Production support tables both have RLS enabled. `support_ticket_messages` currently exposes SELECT to authenticated users only through its admin policy; direct anon/authenticated INSERT is not granted. Ticket creation and replies continue through the validated RPC path. The live ticket DELETE policy and authenticated DELETE grant are still present until migration `20261110152001` is applied.
- The attachment migration is additive: it adds nullable metadata columns/indexes, configures the bucket as private with a 5 MB image allowlist, installs a restrictive policy denying direct access to that bucket, and adds ticket-authorized RPCs. It does not delete or rewrite existing ticket/message/object rows. Bucket upsert changes bucket settings only and preserves existing objects.
- The product variant integrity migration replaces the validation/stock-preservation trigger function and recreates its trigger; it does not backfill or delete product rows. The following base-payload migration updates the protected admin save/update functions. Both must be applied after the earlier staged product stock migration so the final function definitions are not overwritten by an older version.
- Release recommendation: reconcile and apply the entire pending migration sequence in timestamp order as one controlled release, then deploy the matching `support-attachments` Edge Function and frontend. Run authenticated admin/customer/guest verification only after the schema and function versions match. Do not deploy the Edge Function alone or apply only the last attachment migration.
- This was a read-only Production review. No SQL migration was applied, no table privilege/policy was changed, no bucket or Edge Function was created, and no Production data was mutated. PR #87 remains Draft/open; no merge or deployment was performed.
- CI was rechecked against exact PR head `37525d4091cd48d1b3a49014358dcc9df3c7a649`: Build, Dependency Audit, and CodeQL all completed successfully. This review is documentation-only on the existing audit branch.

## Update — 2026-11-12: product reviews and variant-integrity migration audit

### Product reviews
- Reviewed the complete `20261110194917_product_reviews.sql` migration, `product-reviews` Edge Function, validation helper, customer/admin API helpers, and existing review tests.
- Confirmed review submissions are server-written only through the Edge Function; public/authenticated roles have no direct INSERT/UPDATE/DELETE grant or write policy on `product_reviews`. Public reads are limited to approved reviews for published products; the primary admin can read the moderation queue and change status through an identity-checked RPC.
- Confirmed author and moderator UUID columns are deliberately excluded from public column-level SELECT grants. The private rate-limit table has no anon/authenticated table privileges; only the service role can invoke its rate-limit RPC. Review image objects use a private bucket and short-lived signed URLs; the Edge Function verifies that each requested path belongs to a stored review and that non-admin readers request approved reviews only.
- The review table's product foreign key uses `ON DELETE RESTRICT`, protecting review history from catalogue deletion. The migration creates the bucket only if it does not already exist. Read-only Production inspection confirms `product_reviews` and `product-review-images` are not yet present, so there is no existing bucket configuration conflict to reconcile.
- Existing automated tests cover review input validation, MIME/signature checks, image size/path validation, idempotency behavior, private image signing, admin pagination, moderation session freshness, and fail-closed image cleanup after uncertain persistence.
- No additional review migration or Edge Function defect was confirmed in this pass.

### Product variant integrity
- Reviewed `20261112061816_product_variant_integrity_validation.sql` against the product editor payload, stock RPCs, order snapshots, and frontend variant utilities.
- Confirmed the admin editor itself prevents combining size/color inventory matrices with custom variants; the SQL validator enforces the same rule. The frontend utility's mixed-array test exercises defensive reading of legacy/malformed data and does not represent a saveable admin form state.
- Confirmed the migration validates JSON array/object shapes, unique IDs and size/color pairs, allowed option membership, complete matrix coverage, supported variant types, price/stock bounds, and a maximum of 50 variants. The preservation trigger keeps existing stock for retained IDs and blocks removal/reuse of custom variant IDs referenced by historical order lines. Explicit stock changes are marked transaction-locally by the existing stock RPCs so the trigger does not overwrite the requested inventory update.
- Read-only Production checks found 8 products, all with array-shaped variants and size/color lists; no malformed/null variant payloads were found. All six products with non-empty variant arrays passed the expected matrix-size, unique-ID, and unique-pair checks. Existing live hoodie matrix is 4 sizes × 3 colors = 12 unique rows; sample clothing/shoe matrices and laptop custom variants also match the validator's rules.
- Reviewed `20261112063136_product_base_payload_validation.sql` with the actual admin save payload: the editor sends non-empty gallery images, arrays for tags/sizes/colors, and the optional text/specification fields in the expected formats. The explicit `is_featured` / `is_published` defaults remain covered by the separate regression test.
- No new source defect was confirmed. The review migration, private bucket, variant trigger, and base-payload function remain staged only; no live rows, privileges, triggers, functions, or Storage objects were changed.

### Verification boundary
- This was a source review plus read-only Production schema/data inspection. No Production mutation, migration application, Edge Function deployment, or frontend deployment occurred.
- Existing automated test files were reviewed, but no new test run is claimed for this documentation update. The latest documentation-only branch head does not yet have a CI workflow run visible; the previous successful CI result must not be attributed to this newer commit.

## Update — 2026-11-12: release preflight and migration-history reconciliation

- Rechecked the canonical repository and PR #87. The PR is still open, Draft, and unmerged; the current audit head before this note was `37c7b6963642364fb91abfc2b0d625067fe42c50`.
- Current-commit GitHub checks were all completed successfully: Install dependencies and build, Audit npm dependencies, CodeQL, Analyze JavaScript, and Vercel Preview Comments. This confirms the repository checks for this commit; it does not replace a Production deployment or live end-to-end checkout/support test.
- Compared the two commits currently on `main` but not in the audit branch. They add `src/utils/deliveryFeeSafety.js` and `tests/deliveryFeeSafety.test.js`; both files have identical blob SHAs on `main` and the audit branch, so their content is already present and no file-copy change is required. Git ancestry still reports the audit branch two commits behind `main`; keep this visible as a branch synchronization item before final merge.
- Re-read the live Supabase migration history. It ends at `20261110133651_admin_update_product_with_stock`, matching the prior audit. No duplicate version IDs were found in the live migration history.
- Reconciled the repository migration directory against the live history: the 12 migrations after the live endpoint remain pending and must be applied in strict timestamp order as one coordinated release sequence, not cherry-picked.
- Reviewed the pending migration statements for data-loss risk. The `DELETE FROM` statements found in the order-tracking and product-review migrations only prune expired private rate-limit rows; they do not delete orders, products, customer messages, support tickets, reviews, or inventory. The `DROP POLICY` statements replace/restrict access policies; the variant migration replaces its validation trigger. No destructive user/business-data rewrite was identified in this pass.
- The migration sequence still requires the dependent support-attachments Edge Function and frontend to be released in the documented order. No migration was applied, no Edge Function was deployed, and no Production data or Storage object was modified during this preflight.
- Release gate remains: synchronize branch ancestry safely, complete final combined regression review, and obtain explicit user approval before any Production migration, deployment, or PR merge.

## Correction — 2026-11-12: complete migration source/history drift

- A full comparison of all SQL filenames against the live Supabase migration ledger found a broader drift than the initial endpoint-only check:
  - Repository audit branch: 91 SQL migration files.
  - Live Supabase migration ledger: 93 version records; latest remains `20261110133651_admin_update_product_with_stock`.
  - 25 live version records have no same-version SQL file in the current repository.
  - 19 repository migration files have no matching version/name in the live ledger. Of these, 12 are the intended post-endpoint release sequence; 7 are earlier migrations whose status must be reconciled before any migration push.
  - One repository file, `20261107181500_skip_custom_variant_products_in_flash_sales.sql`, matches a live migration name recorded under a different version, `20261107135028`. Do not apply it as a second copy without resolving this version mismatch.
- Read-only checks show that several earlier migration effects are already present in Production despite missing matching ledger entries: order-tracking rate-limit RLS is enabled; custom-variant checkout and product stock-preservation functions/triggers exist; admin product listing is deterministic; support-ticket Realtime publication is enabled; and anonymous/authenticated callers cannot directly INSERT into orders or write the ticket status column.
- Two earlier validation triggers are not present in Production: `orders_validate_item_variants` and `validate_order_checkout_input_before_insert`; their corresponding trigger functions are also absent. The checkout RPC currently validates selected size/color and order line quantities, and direct INSERT privileges on `orders` are revoked, so the absent triggers are not a direct REST insert bypass. They remain unapplied defense-in-depth migrations and require separate compatibility review.
- The migration source/history is not yet a reproducible one-to-one record of the live database. Representative missing historical SQL paths returned no GitHub path history, so their original migration text cannot safely be reconstructed from the current repository alone.
- Release block: do not run a blanket `supabase db push` or apply the 12 newer migrations until the missing historical SQL, earlier unrecorded migrations, and alternate-version migration are mapped and an explicit safe migration plan is approved. No Production SQL, schema, rows, Storage objects, or deployments were changed during this reconciliation.

## Update — 2026-11-12: historical migration source recovery and live authorization audit

- Searched retained Git branches for the 25 live migration records whose SQL source is absent from the current audit branch. Historical source material was recovered for 15 related migrations from `maintenance/checkout-migration-fix-2026-11-06` and overlapping security/audit branches. Their historical filenames use different timestamps from the live ledger, so they are evidence for review only—not safe files to copy into the current migration directory or re-run.
- Recovered source files cover the original stock automation, order-security hardening, coupon/delivery-fee admin policies, cancellation-after-dispatch protection, RPC search-path lockdown, admin reactivation AMR, order status timestamps, product purchase-cost restrictions, admin product CRUD, immutable admin UID binding, order-note RPC, and public order-tracking payload hardening.
- Historical source review identified why timestamp/name reconciliation matters: early versions used email-based admin checks (including an intermediate misspelled email variant) and older checkout/order-write implementations. Later migrations replace these with the immutable admin Auth UID and current private-schema RPC implementation. Do not restore or replay the earlier versions.
- Read-only Production authorization inspection:
  - Products RLS restricts admin read/insert/update/delete to the primary admin UID plus trusted `app_metadata.role=admin`; public SELECT is limited by `is_published=true`.
  - Orders SELECT/UPDATE policies are bound to the primary admin UID and admin role. Direct order UPDATE table privilege and direct admin_note column UPDATE privilege are false; the admin note RPC remains executable to authenticated callers but validates the fixed admin identity inside its SECURITY DEFINER implementation.
  - Anonymous SELECT of `products.purchase_cost` is not granted. Authenticated column privilege exists, but effective row access remains governed by the primary-admin RLS policies.
  - Authenticated role currently has DELETE grants/policies on products, storefront_config, storefront_media, and support_tickets; each existing DELETE policy is restricted to the primary admin UID and admin role. Pending hardening migrations remove unnecessary direct-delete paths; no delete was performed.
  - Anonymous order-tracking RPC execute privilege remains enabled by design; its function requires both order ID and normalized phone and returns a constrained tracking payload.
  - Storefront tables, media bucket, coupons and delivery-fee tables/policies exist in Production. The legacy `flash_sales` table and `product-review-images` bucket do not exist; do not assume either object is required by the current implementation without tracing frontend and Edge Function references.
- This pass is read-only. No missing migration was reconstructed or added, no SQL was executed to change schema/data/permissions, and no deployment or merge occurred. The 25 historical ledger gaps remain a release-blocking provenance issue until each is mapped to its exact applied SQL or verified equivalent and the migration baseline is safely reconciled.


## Update — 2026-11-12: extended historical branch search

- Rechecked the 25 missing live migration versions against additional retained branches covering admin authentication, checkout/idempotency, support backend, storefront studio, product/vendor management, order tracking, and security hardening.
- No exact same-version SQL filename was found for the 25 missing version IDs in the additional branch trees inspected. Several branches contain related SQL with different timestamps or earlier implementation names; these remain historical evidence only and cannot safely be copied or replayed.
- The known alternate-version case remains `20261107135028` in Production versus repository file `20261107181500_skip_custom_variant_products_in_flash_sales.sql`. Its name correspondence does not establish byte-for-byte or semantic equivalence.
- Updated the source-gap count from 24 to 25 consistently. No migration source was fabricated, no SQL was applied, and no Production schema/data/permissions or deployment state was changed.
- Release remains blocked until the exact applied SQL for each missing ledger record is recovered from a trusted source (for example, migration artifact/backup or a reviewed database definition diff), or a documented baseline strategy is approved. Do not manufacture placeholder migration files or run a blanket migration push.


## Update — 2026-11-12: complete retained-branch version-ID scan

- Rebuilt the missing-version list directly from the current Production `schema_migrations` ledger and the audit branch migration directory, using exact version IDs rather than guessed/representative timestamps.
- Scanned all 100 branches returned by the repository's GitHub branches endpoint, checking each branch tree for the 25 exact missing Production version IDs.
- No exact-version SQL file was found in any of the 100 branch trees. The only related filename encountered was `20261107135028_skip_custom_variant_products_in_flash_sales.sql`, which is the same migration name recorded in Production under version `20261107135028`; it does not resolve any of the other 24 missing-version source files.
- This confirms that the exact original SQL for the 25 missing ledger entries is not recoverable from the currently retained branch trees. Earlier related SQL files with different timestamps remain non-equivalent evidence and must not be copied or replayed as substitutes.
- Next safe provenance route is to obtain the original migration artifacts from the developer/CI migration archive or reconstruct equivalence from a complete, reviewed Production schema/function/policy/trigger diff plus source history. Until then, the migration baseline remains release-blocking. No migration, schema, row, privilege, Storage object, or deployment was changed.


## Update — 2026-11-12: Production product-creation RPC parity check

- Compared the live Production definitions of `private.admin_save_product` and `private.admin_update_product_with_stock` with the staged migration `20261112063136_product_base_payload_validation.sql`.
- Confirmed a live product-creation failure path: Production `products.is_published` is `NOT NULL DEFAULT true`, but the current `private.admin_save_product` uses `jsonb_populate_record(NULL::public.products, ...)` without explicitly supplying `is_published`. For JSON record population, an omitted key becomes NULL rather than invoking the table default. The admin create payload omits `is_published`, so product creation can fail the NOT NULL constraint. The same live function also omits the explicit `is_featured` default handling.
- The staged migration `20261112063136_product_base_payload_validation.sql` contains the reviewed correction: preserve explicit boolean values while defaulting omitted `is_featured` to false and `is_published` to true. It also adds trusted server-side base-payload validation and calls it from both create and update RPCs.
- The staged regression test `tests/productCreationDatabaseDefaults.test.js` checks both omitted-field defaults and preservation of explicit false values. This was a source-level inspection only; no local test run or Production write was performed in this pass.
- Production remains unchanged. The correction is staged in the audit branch only and must not be treated as deployed until the release migration is safely reconciled and explicitly approved.


## Update — 2026-11-12: public catalogue exposure and test-product visibility

- Read-only Production checks confirm the public product catalogue has an RLS SELECT policy limited to `is_published = true` and anonymous column-level SELECT grants for catalogue fields. Anonymous SELECT is not granted for `purchase_cost` or the internal `is_published` flag.
- Production currently contains 8 products: 2 published and 6 unpublished. All 6 product names matching the test/demo/sample markers are unpublished; 0 test-named products are publicly eligible under the current RLS predicate.
- This verifies the current effective catalogue visibility and test-product hiding state, but does not recover the exact historical SQL source for the missing catalogue migrations. No product rows, grants, policies, or schema were changed.


## Update — 2026-11-12: order history, admin synchronization, and guest tracking audit

- Read-only Production integrity review: one order exists and is cancelled; its stock deduction and restoration timestamps are both present. No cancelled order remains without stock restoration, no active order has restored stock, and its order item array is non-empty and structurally valid. The notification table currently has zero rows; this is consistent with the only existing order being a legacy cancelled order, so no notification delivery failure is inferred from this count alone.
- The one legacy order line has no saved image/gallery URL in its historical snapshot. The existing admin detail resolver explicitly prefers saved image/gallery and then falls back to the matching current catalogue product image/gallery. No historical order line was rewritten because a current catalogue image cannot prove what the item looked like at the time of purchase.
- Reviewed the current admin order loader: it fetches all pages in stable order (1,000 rows per page, bounded at 100,000), preserves the complete database row before normalizing UI fields, refreshes through authenticated REST after Realtime events, and keeps a 15-second recovery refresh. Customer order history is owner-scoped through `private.get_my_orders`, strips procurement/cost/vendor/margin fields, preserves the last successful snapshot on transient failures, and refreshes on profile view/visibility plus the customer notification event.
- Reviewed customer order notifications: fetch is user-scoped; Realtime listens only to that user's `recipient_user_id`, with a 30-second recovery refresh. Read receipts call the authenticated `mark_my_order_notifications_read` RPC. Admin note writes use a SECURITY DEFINER function with empty search_path and a fixed primary-admin UID plus trusted app-metadata role check; direct order/admin-note updates remain restricted.
- Confirmed the current Production guest tracking RPC validates both order ID and normalized phone, uses hashed per-phone/per-order rate-limit buckets, and returns a constrained summary. However, the live function omits the selected size/color and custom variant name from the summary, even though the order snapshot stores these fields in camelCase. The staged migration `20261110140000_include_variant_details_in_order_tracking.sql` fixes the summary without exposing internal procurement fields.
- Added regression coverage in `tests/orderTrackingVariantDetails.test.js` to ensure the staged RPC summary includes product name, custom variant, selected size/color and quantity, excludes cost/vendor/profit/margin/supplier fields, and is displayed by the tracking modal. Source-level review only; test execution is still pending.
- No order, notification, product, stock, or customer data was changed. No Production function, migration, deployment, or merge was performed.


## Update — 2026-11-12: admin guest-order email display correction

- During the order-detail UI review, found that the admin order mapper fell back to the literal database sentinel `user_email = 'guest'` when a guest checkout had no optional contact email. The order detail and invoice could therefore display the word “guest” as if it were an email address.
- Corrected the mapper to prefer `customer_email`, then a real non-sentinel authenticated email, and otherwise leave the contact email blank so the existing “not provided” UI fallback is shown. No order records or checkout behavior were changed.
- Added a regression assertion to `tests/adminOrderDetailsPreservation.test.js`. Test execution is pending CI.


## Update — 2026-11-12: support conversations and legacy message retention

- Read-only Production inventory: `public.messages` contains 14 legacy conversation records (all 14 have text; 2 have image references); `public.support_tickets` contains 3 tickets and `public.support_ticket_messages` contains 5 thread messages. All 3 tickets have at least one thread message. Realtime publication is enabled for all three tables.
- Confirmed the current admin interface only reads legacy `messages`; it has no edit/delete workflow. The support-ticket admin interface updates ticket status through PATCH and sends replies through the dedicated RPC; it has no ticket deletion workflow. Product-image cleanup also reads legacy message image references before deleting Storage objects, so read access must remain available.
- Production still grants the authenticated role UPDATE and DELETE on legacy `messages`, and DELETE on `support_tickets`, with admin-only RLS policies. These capabilities are not used by the current UI. The staged additive migrations `20261110151000_prevent_legacy_chat_message_mutation.sql` and `20261110152001_prevent_support_ticket_deletion.sql` safely remove only these unused direct mutation paths while preserving SELECT, support replies, status PATCH, and image-reference reads. No records or message images are deleted.
- Found a live SQL three-valued-logic authorization defect in the Production support RPCs: the guard `IF NOT (v_is_admin OR v_is_customer)` can evaluate to NULL when an anonymous caller attempts to access a ticket linked to an authenticated customer, causing the denial branch to be skipped. The staged migration `20261110154000_fix_support_admin_reply_status.sql` corrects the relevant legacy RPCs with explicit `IS NOT TRUE` checks; the read-receipt and attachment migrations apply the same fail-closed pattern. Regression coverage already checks all six SECURITY DEFINER support functions. The live Production functions remain unchanged until the migration is approved and applied.
- The 3 existing legacy support tickets have no `customer_user_id`, `access_token_hash`, or `request_id`; their server-side records are visible in the admin history, but the newer secure customer-reopen flow cannot verify ownership using those missing fields. Do not fabricate or backfill access tokens: that could grant the wrong person access. Existing ticket/message rows remain intact.
- Added regression tests to `tests/supportTicketAuthorization.test.js` confirming the legacy messages table is read-only without breaking admin reads, and support-ticket deletion is revoked while status updates remain available. These tests are committed to the audit branch; CI execution is pending.
- No Production data, policy, grant, function, Storage object, or deployment was changed in this pass.
