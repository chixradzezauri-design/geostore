# GEOSTORE Design System 2.0 — staged roadmap

## Goals
Improve design consistency and readability at phone (320–430px), tablet (640–1024px) and desktop (1024–1440px) widths without losing any existing functionality, saved storefront/admin visual editor settings, or production data.

## Phase 1 — compact surfaces, mobile text and keyboard UX (this Draft PR)
- Add a small standalone `src/designSystemV2.css` imported **after** legacy styles.
- Define spacing/focus tokens scoped to the existing storefront and admin shells; do not hard-code global palette/typography.
- Compact the read-only operational KPI and command panel surfaces without changing state or handler logic.
- Make long translated menu labels, header search and announcement copy shrink safely on narrow screens.
- Keyboard `Escape` closes the storefront menu and restores focus to the menu button.
- Add six Node regression tests and extended Chromium smoke coverage.
- New styles intentionally **do not** override visual-editor properties addressed by `data-visual-editor-target`.

## Planned phases (not implemented yet)
1. Product detail presentation: **Stage 2 in progress** — responsive gallery, readable mobile options, visible purchase CTA, accessible labelled modal with Escape/focus recovery. Inventory validation and cart handlers unchanged.
2. Cart and checkout: **Stage 3 in progress** — enlarge quantity controls, compact cart summary/coupon layout, constrain checkout modal on phone, improve checkout error semantics and keep ≥16px mobile inputs. Order/price/payment RPC logic unchanged.
3. Legacy CSS extraction: **Stage 4 first pass** — move the compact responsive compatibility tail from `index.css` into `responsiveCompatibility.css` at the exact original import order (no cascade reordering), with mobile/desktop browser QA. Continue isolated sections only after tests.
4. Runtime performance: **Stage 4 first pass** — stop the storefront-wide Flash Sale 1-second rerender when no promotion is active, correctly wake future scheduled sales, pause hidden tabs and resume on visibility.
5. Image loading: **Stage 5 first pass** — convert category decoration from CSS backgrounds to native lazy/async images with unchanged hover crop/overlay; show accessible cart/wishlist placeholders on failed image URLs. Remove only byte-for-byte adjacent duplicate CSS declarations. Web Vitals and SEO still require measured field baselines.
6. Admin operations: **Stage 6 first pass** — improve existing product-list quick edit accessibility, readable buttons, mobile controls and pagination without changing save/publish authorization. Existing CSV exports remain. Bulk actions and permissions require separate server-side safety checks.

## Acceptance and release rules
- Existing frontend/admin behavior, saved presets, Supabase rows and RLS must remain intact.
- `npm test`, production build, CodeQL, dependency audit and the responsive Chromium workflow should pass at the exact PR SHA.
- Browser and authenticated admin/editor checks are separate gates. Automated unauthenticated tests are not evidence of permission-protected flows.
- Keep this PR **Draft** and separate from completed PR #145. Do not merge or deploy it until separately reviewed and authorized; Vercel quota may prevent fresh previews.


## Phase 6 — admin product operations, first pass
- Ensure price, cost, stock and product-specific icon actions have meaningful accessible names; make edit/delete actions readable with text.
- Organize existing product-row quick actions into two columns at 381–639px and one column on ultra-narrow 320–380px phones, preserving the older responsive safety layout; stock/publish span full width in the two-column mode.
- Keep numeric inputs legible on iOS, preserve 44px touch targets and protect long names and SKUs from forcing horizontal overflow.
- Add a targeted Node regression test. No database, RLS, payment, cart, save or publication workflow changes.
- Verify CI and authenticated admin editor workflow before any merge; avoid inferring authenticated coverage from public browser smoke.


## Phase 7 — order operations first pass
- Reuse the already-tested `getPaginationItems` bounded page-number window for order pages, instead of rendering one button for every page. Existing five-order page size and page-by-status memory are unchanged.
- Label order search, grouped status filters and order-specific detail/invoice controls; expose pressed filter state to assistive technology.
- Add scoped, responsive touch-height rules for order filters, status controls, action buttons and pagination; keep phone search inputs at 16px to avoid Safari focus zoom.
- Add Node regressions and a Chromium fixture exercising these controls at 320–1440px.
- Out of scope: status transitions, reactivation rules, stock restoration, invoices, exports, Supabase data, customer data, RLS, payment handling or publication.
- Require exact-HEAD build and Chromium success plus authenticated admin validation before release.

### Phase 7 visual-editor precedence safety note
On phones (≤640px), the existing owner visual editor can set an operational input font smaller than Safari's 16px focus threshold via a highly specific `!important` rule. A targeted, equally specific responsive rule for order search and product quick-edit/search fields uses `max(16px, var(--admin-vd-inputFontSize-active, 16px))`, retaining any owner-selected size larger than 16px. Saved preferences, desktop typography, all other editor targets and server behavior are unchanged. Browser regression requires the real editor-enabled admin fixture to compute at least 16px.


## Phase 8 — support experience and mobile accessibility
- Status choices now expose their selected state; ticket identity is part of their accessible group label.
- Conversation visibility uses `aria-expanded` and references its labelled history region, without changing when support history is fetched.
- Per-ticket reply input/send actions are labelled for assistive technology; existing send eligibility, busy handling, and server functions are untouched.
- Narrow screens get scannable ticket text, scrollable status choices and 44px action targets, without overriding the visual editor's colors.
- Regression tests protect the new labels and existing reply/thread handlers.
- Release gates: exact-HEAD full Node tests and build, responsive Chromium, CodeQL and dependency audit; authenticated support and server-side permissions still need review before merging.


## Phase 9 — CRM customers, paginated mobile workspace
- The CRM customer list now shows 10 matching records per page, with bounded pagination, previous/next actions, and an accessible current-page indicator. Search resets to page 1; the list count and original joined Supabase/local CRM source are unchanged.
- Customer cards have responsive wrapping and 44px controls. VIP/CRM restriction/edit/local-only delete actions are now explicitly labelled (including icon-only actions), without altering existing handlers, server authorization, or CRM persistence.
- Preserve the existing notice that the CRM restriction marker is not an Auth account block. Never imply otherwise.
- A targeted Node regression and a Chromium fixture for 320–1440px phone/tablet/desktop widths validate the presentation. Live authenticated CRM actions and RLS must be reviewed separately before merge.
- Keep all stages in Draft PR #146; do not publish to main/Production until an independently confirmed release decision.


## Phase 10 — analytics and financial presentation
- Keep the owner's existing financial filters, revenue/profit/expense calculations, historical-data uncertainty warnings and CSV export handlers untouched.
- Add an explicit accessible name and label for the report period. Group period selection and CSV export into mobile-friendly 44px controls without changing their behavior.
- Make the eight read-only KPI figures and caveats adapt to available width; preserve existing visual editor-owned colors and content fields.
- Preserve every revenue trend data point while keeping densely labelled sales bars inside a keyboard-focusable, horizontally scrollable chart region, with accessible labels including period/revenue/order count. The graph never expands the page width.
- Extend the Node regression and Chromium fixture (320–1440px). Unauthenticated fixture tests are not evidence of real owner-only financial-data access or correct production figures.
- PR #146 stays Draft. Exact-HEAD CI and later authenticated owner review are required before any independently authorized production release.


## Phase 11 — financial breakdown and profitability detail
- The owner's income sources, categorized expense figures, five most recent expenses, product profitability and vendor profitability retain their existing datasets, labels, conditional unknown/estimated COGS warnings, currency computations and reporting-period behavior.
- Read-only financial rows use compact, responsive, overflow-safe grid layouts. Long Georgian names, expense descriptions and large GEL values can wrap instead of pushing the admin page off-screen; at ultra-narrow ≤380px widths rows stack to preserve legibility.
- Product and vendor profitability records now expose a distinct semantic article with its subject as an accessible label. Section regions have accessible names.
- Scoped CSS does not change saved visual-editor tokens, chart calculations, CSV export, Supabase data, permissions, financial logic or production.
- Node regression plus Chromium fixtures at 320–1440px check four panels, long labels, amount wrapping and narrow layout. Authentication and real financial source reconciliation remain a separate release gate. Keep PR #146 Draft.


## Phase 12 — expense entry and calculator form polish
- The existing owner/staff expense entry form now has visible, connected category, GEL amount, date and description labels. Native amount constraints (0.01–1,000,000,000 with 2 decimal places), required date, and description length cap (300) mirror the **pre-existing** `handleAddExpense` validation, without changing POST/DELETE requests or server permissions. Existing error alerts and Supabase result handling are untouched.
- The existing four sales/profit calculator inputs now have native associated labels. No changes to `calcForm`, `calculatedSalesMetrics`, currency math, profit margins, or profitability rules.
- Form layout, minimum 44px touch targets, large-number result wrapping and mobile 16px focus-safe typography are scoped to the old selectors. On ≤380px phones, calculator fields and results stack to remain readable.
- Added Node assertions that the original mutation/calculation pathways remain present and a Chromium CSS fixture at 320–1440px to check control height, font size and horizontal overflow. Exact PR HEAD CI and authenticated admin/manual financial operations must be verified before merge.
- **No database, RLS, staff authorization, stored visual-editor changes, live expense write/delete operations, main branch or Production deployment.** Keep Draft PR #146 pending separate release approval.


## Phase 13 — expense ledger search and pagination
- The expenses history workspace now offers a client-side search across description, category, expense date and amount, plus a category selector derived from the complete fetched ledger. Clearing or changing filters resets the visible page to 1.
- Render up to 10 expense rows at a time with bounded accessible previous/next/page buttons. A clamped page index handles deleting an expense, background refreshes, and searches that shrink the result count. Empty matches have a separate explanatory message.
- Add a manual history-refresh control and an explicit filtered/total row count. Responsive mobile search controls and pager meet 44px touch targets, with search/select font ≥16px on phones; lengthy amounts can wrap without page overflow.
- Critically, `filteredExpenses` and `paginatedExpenses` are **render-only**. The original full `expenses` array, Supabase paginated ledger fetching, POST/DELETE handlers, financial rollups and CSV export remain untouched.
- Extend regression tests for expense array integrity/pagination and Chromium's 320–1440px fixture with a representative 10-row, long-amount expense ledger. Authenticated CRUD and server access remain a separate verification gate. Keep PR #146 Draft and do not deploy without specific release approval.


## Phase 14 — calculator hidden costs exposed
- Audit found a functional clarity gap in the existing sales/profit calculator: its `calcForm` and `calculatedSalesMetrics` already included eight parameters, but only four inputs were actually rendered. Hidden defaults (packagingCost=2, processingFee=2, otherExpenses=0 and quantity=1) affected displayed profit without being editable or visible.
- Keep all existing math and React state unchanged; expose all **four missing controlled inputs** in the same calculator. Show per-unit guidance for prices and costs, plus explicitly labelled total revenue, gross/net profit and existing margin/markup.
- Native numeric affordances, visible labels, responsive two-column grids (one column on ≤380px) and eight-field browser fixture cover the user interface without adding persisted settings or changing formulas.
- Calculation behavior stays: `grossProfit = (discountedPrice - pCost) * qty`; `netProfit = grossProfit - (ship + pack + proc + other) * qty`; no defaults or financial database rows changed.
- Build/Node regression + Chromium CSS fixture 320–1440px + CodeQL + dependency audit are required on the exact PR head. Authenticated calculator review is still required before a separately approved Production release.


## Phase 15 — verified expense ledger before finance reporting
- Financial integrity audit found a high-impact display hazard: `analyticsData` recomputed net profit from `expenses` even when the expense ledger had never finished loading, failed mid-pagination or was unavailable to the current session. A partial or empty ledger could display a misleadingly high "net profit" or produce incomplete financial CSVs.
- Add `expensesReady`, set only **after the full paginated Supabase ledger succeeds**. Reset verification on failed retrieval or lost expenses permission. Keep previous rows as before, but treat them as unverified rather than complete.
- An accessible analytics warning exposes incomplete expense history and any fetch error, with a retry action. Suppress the displayed expense total and net profit until the ledger is verified; guard all four CSV exports, and make existing AI summary/profit/expense answers explicitly disclose incomplete ledger coverage.
- Preserve the exact `analyticsData` calculations, gross profit/product margin logic, original ledger fetch pagination, row creation/deletion, report periods, owner visual design values and server permissions. Incomplete ledger records must never be silently presented as a confirmed profit.
- Regression protects success/error/permission transitions and CSV early guard. Chromium CSS fixture covers warning text and 44px retry button on 320–1440px screens. Exact-HEAD CI plus authenticated owner data-flow checks remain required before an approved production release.


## Phase 16 — expense ledger refresh race protection
- Audit of finance operations found that the 15-second complete-ledger poll, manual refresh and in-flight expense create/delete requests could race. An older response could overwrite a more recent expense snapshot or mark an outdated ledger as verified.
- Maintain a monotonic `expenseFetchRequestRef` generation for every accepted request; inspect it together with the active admin session after each awaited network step, before applying a response or error. Stale successes and failures are discarded without changing the current ledger or verification state.
- Use `expenseFetchInFlightRef` to skip overlapping **timer** polls when a large ledger needs more than 15 seconds. User-triggered refreshes and post-mutation reconciliation can supersede an existing poll. The last request clears the in-flight flag in `finally`; teardown and logout invalidate previous fetches.
- After the server confirms expense creation/deletion, invalidate any older read, mark the local ledger *not yet verified*, show the existing immediate list update, then refresh the entire ledger from Supabase. Finance KPIs and CSV exports stay protected by the Phase 15 `expensesVerifiedForReports` gate until the authoritative reload finishes.
- Bound async mutation responses to the current admin session to prevent stale UI changes after logout. Revoke prior request generations on logout, missing permission and effect cleanup; leave server POST/DELETE payloads, financial formulas, staff permissions, saved visual-editor styles and Production unchanged.
- Node source regression verifies guarded request versions, non-overlapping polls, post-mutation invalidation and full-ledger reconciliation. Run exact-HEAD Build, CodeQL, dependency audit and Chromium regression before considering the Draft PR ready for authenticated manual verification and separate release approval.


## Phase 17 — finance ledger load-state clarity
- Audit found an expense-history UX correctness gap: when its initial Supabase request was still pending, the list displayed the same empty-state message as an authoritative confirmed zero-row ledger, and a refresh had no visible progress or last-confirmed timestamp.
- Track `expensesLoading` separately from `expensesReady`, plus `expensesLastVerifiedAt`. Set loading only for accepted latest full-ledger requests, clear it only for the active session and request generation, and record a local timestamp only after **every** ledger page successfully loads.
- The history now distinguishes loading, verified, refresh failure and stale cached rows. Only a completely verified zero-row ledger says there are no expenses. Previously retrieved rows remain visible during a failure but are labelled unverified, with the last successful check time.
- Owner analytics uses a polite status while the ledger is checking, escalating to an alert when there is a genuine error or missing permission; the verified-ledger gate continues to protect net-profit and CSV reports.
- The existing refresh and retry controls remain usable during a slow request so the administrator can supersede it, and show `aria-busy`. Mobile error retry is at least 44px with no horizontal clipping. No new network endpoints, mutations, calculations, Supabase schema or editor design overrides.
- Node regression covers loading generation cleanup, verified timestamp, honest empty state, retry controls and stale notice; Chromium fixture covers an in-progress sync and error-retry UI on 320–1440px. Authenticated Supabase owner testing is still needed before separately approved Production release.


## Phase 18 — expense mutation server acknowledgments
- Confirmed a real integrity risk: the expense creation handler previously treated any HTTP 2xx response as definitive proof that the intended record was saved. A duplicate click could submit the same expense twice, and an empty/malformed insert response still triggered a success alert.
- Both mutations are now serialized with a synchronous in-flight ref and versioned against the active admin session. The new expense save button and all delete controls are disabled while a mutation is pending, with inline accessible progress/confirmation/error feedback.
- Expense insertion uses PostgREST `Prefer: return=representation`; a 2xx status **alone is insufficient**. A pure validator requires exactly one returned row with matching id, amount, category, date and description. Failed, missing or conflicting acknowledgments never reset the draft or claim success. After an uncertain network result, the UI asks the operator to inspect the history before reattempting (avoids duplicate records).
- Expense deletion keeps its exact-row `return=representation` acknowledgment, now also validated by the same small dedicated module. A missing or mismatched row never removes the local item or claims success. Both operations reconcile the full ledger afterward, including uncertain network outcomes, and preserve the earlier incomplete-ledger guard for financial reports.
- Dedicated Node unit tests cover valid/malformed insert/delete server responses; source regressions protect request serialization, session cancellation, existing financial calculations and UI feedback. Responsive Chromium fixture includes status notices and disabled 44px buttons on 320–1440px.
- No Supabase schema, RLS, existing expense payload fields, owner visual editor configuration, main branch or Production changes. Authenticated owner/expense-manager CRUD validation remains a separate release gate; returned representations require the existing permitted finance read access.
