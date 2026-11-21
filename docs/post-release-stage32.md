# GEOSTORE — post-Production release hardening (Stage 32)

## Verified production release

- Release PR #146 was squash-merged into GitHub `main` as commit `f348b73040b0d1c138b45b5a2f05aecc93a43a3b` after four successful PR-HEAD workflows.
- Vercel Production deployment `dpl_Avo6VUVNabrALUPC4JbMTRVuieq8` reached `READY` with target `production` and aliases `geostore.vercel.app`, `geostore-geo-store.vercel.app`, and `geostore-git-main-geo-store.vercel.app`.
- The older known-good Production deployment `dpl_AMVXnsAurVoDqL8HSrtDUhFK9aff` was retained. No rollback was performed.
- The Vercel runtime error/fatal log query returned no matching records in the short post-release interval, but a static React SPA can have client-side exceptions invisible to server runtime logs. A direct public browser visit could not be confirmed from this environment.
- Existing Supabase migrations remain as applied and legacy RPC overloads are intact for old browser clients. **Real signed-in owner/staff E2E is not certified by these facts.**

## Stage 32 — first independent enhancement after release

- New branch `feature/post-release-admin-gate-stage32-2026-11-21` starts from the **released** Git commit, not the older PR #146 feature branch.
- Extend the actual built-SPA Chromium smoke to navigate `?admin=secret` without an auth session at 375, 768 and 1440 px. This exercises the real lazy-loaded `AdminDashboardPro`, verifies the visible login-required fallback, rejects anonymous protected API requests and horizontal overflow, and catches uncaught runtime crashes such as the historic `staffList` error.
- This deliberately never signs in or sends writes and does not test owner/staff privileged workflows.

## Next accumulation (do not merge automatically)

Continue extending coverage of authorized admin dashboard operations in a **separate, isolated test environment with explicit approval** before enabling user-creation or real transaction tests. Also inspect compact admin typography/spacing and multi-device visual-editor persistence. Accumulate future fixes in this new Draft PR; merge and deploy only after the user approves the next release.
