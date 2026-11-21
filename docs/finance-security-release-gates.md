# GEOSTORE — Finance security release gates (Draft PR #146, Phase 27)

This checklist describes **live steps not yet executed**. Node test fixtures, CI, Vercel Preview and SQL migration source review cannot substitute for authenticated Supabase RLS testing. No secrets or test-user passwords belong in CI logs.

## Environment and prerequisites

- Keep PR #146 **draft and unmerged** until explicit separate approval. Use the same tested commit for preview; no Production writes for test preparation.
- Read-only Supabase `list_tables` on 2026-11-21 reported `public.expenses` RLS enabled and `public.admin_staff_members` with **0 rows**. This is a snapshot, not a guarantee about future memberships. An actual staff account must be created/verified using the existing owner invitation flow **only with owner approval and in a safe test environment**.
- Use a disposable test environment or approved non-production tenant with two distinct authenticated users: primary owner and verified staff member with `expenses=true`. Also have a third staff member without that permission, if available.
- Prepare a single uniquely tagged, non-sensitive expense row. Note its ID and initial count; do not write any test expenses to the existing production database without explicit permission.

## Mandatory authenticated manual/E2E scenarios

1. **Owner:** call `has_staff_permission('expenses')`, read paginated ledger, add one expense, verify exactly one inserted row, export CSV, delete the specific row, verify exactly one deleted row and refreshed zero delta.
2. **Permitted staff:** confirm the same permitted actions via own real login and data API bearer; check that `admin_staff_members.is_active` and the email verification gates work.
3. **Denied/anonymous staff:** verify `has_staff_permission('expenses')` returns false or is denied; GET must not disclose rows, POST/DELETE must not modify rows; a filtered HTTP 200 `[]` is **not** proof of an empty ledger.
4. **Revocation during read:** start an intentionally delayed page request, revoke `expenses` through authorized admin workflow, then confirm the final permission check rejects the snapshot and clears private data. Check next refresh/focus.
5. **Revocation before write:** after client preflight, revoke `expenses`; the request must be denied by current server-side policy, without creating or deleting a row. If an earlier write already reached the server, investigate its actual commit independently; browser cleanup cannot undo it.
6. **Token rotation:** while signed in as the *same* staff user, refresh the Supabase token between initial and final CSV/write checks; ensure permission re-verification uses the **new token**. If revoked, neither CSV download nor write should proceed.
7. **Account switch/unmount:** start delayed ledger/CSV/write callbacks under staff A, switch to staff B or owner, and assert no response from A appears in B's panel. A request already dispatched to the server must still be reconciled by server ID, never assumed rolled back.
8. **Partial response and network failure:** simulate malformed JSON, 401/403, 5xx, permission RPC failure, full-page pagination cap, and lost write acknowledgment. Never report `expensesReady=true` or re-submit an ambiguous expense without reconciliation.
9. **Report integrity:** exercise zero, duplicate-ID, non-numeric amount, incomplete order COGS, unreconciled order split, and long multi-page history; keep gross/net profit unknown when required.
10. **Cleanup:** delete test records in the authorized environment, remove temporary staff permissions/accounts if created with approval, confirm original baseline, and record test results, redacted evidence, commit SHA and date.

## Release decision

Require all four exact-HEAD GitHub workflows to pass, a completed authenticated owner/staff matrix above, confirmed Vercel target environment, and explicit separate approval to merge or deploy. Never log user passwords, bearer tokens, service-role keys or private expense descriptions in test output.

## Phase 28 — orders are also a confirmed-finance prerequisite

- Require one complete authenticated paginated order read for the same mounted user ID; verify `has_staff_permission('orders')` both before and after pagination and reject duplicate/missing IDs before publishing.
- A previous successful snapshot must be marked **unverified** if a later order refresh fails; do not show it as confirmed turnover/profit or allow financial CSV until reconciliation succeeds again.
- Confirm the persisted raw order total is preserved alongside the normalized UI value. Invalid raw currency must not pass reconciliation merely because display normalization converted it to zero.
- Test multi-page token refresh, switching principal, revoked orders permission with RLS-filtered HTTP 200 [], timeouts, partial pages and restoration of a verified snapshot after retry.
