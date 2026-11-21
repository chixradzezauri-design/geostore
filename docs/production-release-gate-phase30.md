# GEOSTORE — Phase 30 Production release compatibility preflight

**Snapshot:** 2026-11-21 (read-only inspection). This is a release **hold**, not approval to publish.

## Exactly what will change

| Source | Git commit | Environment |
|---|---|---|
| Last observed Vercel Production | `c6a9308f04edd894729f22db1331b413fc9fdf0f` | `production`, READY |
| Current `main` at audit | `0ca3ff5c5e88093e784f6d6d77ad1f6617c819e8` | GitHub baseline, **2 commits ahead** of deployed Production |
| Draft PR #146 at Phase 29 | `66b8de14b2f5d9841acb3d9b01c358cc6c3506b6` | Preview READY, **not production** |

`main` was not behind the PR when inspected. The difference from deployed Production to `main` is **25 files over 2 commits**, including the responsive Chromium smoke workflow, storefront editor/draft publication controls, replenishment concurrency controls, layout changes and *two migration files*. The PR adds further responsive design, finance read/write integrity, and session protection. Recalculate exact SHAs immediately before an approved release; do not treat this audit as an evergreen deployment status.

## Already applied database prerequisites (verified read-only)

The connected Supabase project's migration history has both:
- `20261120122908_replenishment_optimistic_concurrency`.
- `20261120124250_storefront_publish_concurrency_safe_compat`.

The **live** PostgreSQL catalog confirms:
- `public.admin_save_inventory_replenishment_setting` has original **4** and version-checked **5** argument overloads; both are `SECURITY INVOKER`. The private implementations are `SECURITY DEFINER` with fixed search path. Anonymous `EXECUTE` is disabled; authenticated `EXECUTE` remains granted.
- `public.publish_storefront_config` has original **2** and version-checked **3** argument overloads, with the same public-invoker/private-definer separation and anonymous execution restrictions.
- New client code sends `p_expected_updated_at` for replenishment saves and `p_expected_draft_updated_at` for storefront publication. Existing old Production clients may still send legacy argument sets.

**Do not drop or revoke the legacy RPC overloads in Phase 30.** The older versions remain last-write-wins until all clients using them are retired. Therefore version checks are not yet a universal cross-device guarantee. The eventual revocation requires a separately reviewed migration *after* client rollout, verification of old-client retirement, and explicit approval.

## Pre-release execution sequence

1. **Refresh the baselines:** recheck GitHub `main`, Draft PR HEAD, current Vercel Production SHA, and the exact SHA of the Vercel Preview. Production SHA must not be inferred from GitHub `main`. Record any new drift.
2. **Validate the release delta:** review the entire `Production → main → PR HEAD` set, including the two baseline commits, and confirm the live SQL signatures/privileges above still match the client calls. A successful front-end build alone does not validate RPC compatibility.
3. **Run exact-HEAD CI:** all Node tests, Vite production build, CodeQL, dependency audit, and real SPA responsive Chromium smoke; capture checks attached to the final SHA. The standard smoke covers a *logged-out storefront* and synthetic admin layout, not authenticated owner/finance/staff workflows.
4. **Auth + permission E2E (still blocked):** in an explicitly authorized **non-production** test environment, use owner + permitted staff + denied staff identities to validate order and expense reads/writes, role revocation, token refresh, account switching, optimistic concurrency from two browser sessions, and rollback of any test records. The observed `admin_staff_members` table had **0 rows** at the previous audit; do not create accounts or mutate Production merely to clear this gate.
5. **Publishing / stock two-client E2E:** while one authenticated device edits a storefront draft or replenishment row, use another authenticated device to save a competing revision. Confirm SQLSTATE `40001` and the UI's conflict guidance. Validate post-refresh consistency without silent last-write-wins through the **new** RPC.
6. **Approval and release:** only after exact-target verification, live test results and explicit user authorization, decide whether to merge PR #146 and deploy. Do **not** merge or deploy merely because these static or mocked tests passed.
7. **Post-deploy smoke:** inspect the **Production** Vercel deployment record to confirm its exact commit/target, check the public storefront on phone/tablet/desktop, test authenticated owner dashboard load (including the historic `staffList` crash regression), order status controls, visual-editor persistence, stock and finance flows with approved test data.
8. **Rollback gate:** if Production fails, choose a previously known-good Vercel deployment and confirm server RPC overload compatibility first. Never automatically roll back or delete applied SQL migrations; restore the prior UI version only under user approval and explicit impact assessment.

## Limits of this checkpoint

Phase 29's 822/822 automated tests and Preview prove code/build smoke only. Real Supabase signed-in owner/staff E2E, concurrent two-device workflow, and the final Production target remain **not verified**. Read-only database queries were used in Phase 30; no production data, schema, credentials, membership or deployed alias was changed.
