# Stage88 — Signed staff CRM/support RLS and legacy/new admin Phase B compatibility

**NOT RELEASE-READY. Production unchanged. No paid staging.** Draft PR #149 only, 2026-11-24.

## Effective Production support/staff access matrix

A read-only \`pg_catalog\` + \`pg_policies\` SELECT (no customer, support message or auth.users row data) confirms **five RLS-enabled** tables: \`admin_staff_members\`, \`admin_staff_pending_invites\`, \`messages\`, \`support_tickets\`, \`support_ticket_messages\`. The two staff account/permission tables have forced RLS and no direct authenticated/anon SELECT/UPDATE/DELETE. CRM messages and support tickets/messages allow authenticated table SELECT only through distinct RLS policies; anonymous SELECT is not granted.

The **seven active policies** include exactly six original staff-permission-specific CRM/support policies for SELECT/UPDATE/DELETE operations, plus the pre-existing guest validated ticket submission INSERT policy. Their \`pg_policies\` expression hashes are frozen read-only, along with **16 current support/permission public/private RPC definitions**, \`SECURITY DEFINER/INVOKER\`, search_path and role EXECUTE grants. The public support endpoints remain SECURITY INVOKER delegates to restricted private functions. Anonymous support-ticket token-gated RPCs are intentionally still executable; this does not itself prove their *customer access-token* authorization logic.

All support-related current MD5s match the already frozen Stage82 effective-function baseline. \`release/stage88-live-support-staff-surface.json\` and a separately pinned file SHA prevent drift. The source query is \`release/stage88-read-only-support-staff-surface.sql\` and returns metadata only.

## Free signed Auth/PostgREST RLS rehearsal

\`scripts/stage88ExtractStaffSupportPolicies.mjs\` extracts six **source-verbatim CREATE POLICY/DROP POLICY statements** from \`20261117231534_staff_crm_support_permissions.sql\`; no historic dynamic function-redefinition DO block is replayed. The statements are installed on synthetic \`messages\`, \`support_tickets\` and \`support_ticket_messages\` tables in the existing disposable Supabase Auth/PostgREST CI.

The new \`scripts/stage88SignedSupportStaffHttp.mjs\` creates only disposable synthetic, signed Supabase Auth accounts. It verifies:
- CRM-only users can read/update/delete CRM messages and **cannot** read/update support tickets;
- support-only users can read/update support tickets and read support-ticket messages but **cannot** see/edit CRM messages;
- orders-only, no-staff and inactive-staff identities cannot see CRM/support data;
- server-only staff grant records cannot be queried or self-mutated from signed browser role tokens;
- changing a staff user's permission \`support→crm\` or setting \`is_active=false\` via trusted local service role immediately changes requests made with the **same previously issued signed JWT**;
- **Phase B** explicitly rejects legacy \`orders?select=*\` (old production frontend), but permits the new \`admin_order_ledger_page\` for valid orders staff and excludes support-only staff.

The last item is a *release-order requirement*: **Phase A** installs the three redaction/projection SQL changes while old frontend compatibility remains; the new frontend must be deployed and verified READY; only then may **Phase B** revoke old raw finance-bearing order snapshots, with stale loaded tabs handled. Reversing the order breaks existing admin sessions. The current branch's \`src/App.jsx\` uses the verified paginated ledger loader, \`src/components/AdminDashboardPro.jsx\` uses the order image-reference RPC and server-authorized staff Edge Function. Their entrypoints have a static fail-closed source gate against newly reintroducing direct raw orders SELECT.

## What remains unsafe to assume

The local support fixture is deliberately **not full-schema**, and does not replay actual customer ownership, message author token hashes or the exact live support RPC writers. Those require additional authenticated guest/customer/support E2E checks against a more complete schema. Stage87's **9 HIGH** executable-token historical SQL divergences, overall **11** differences and the seven older unmatched files remain unresolved. Stage78–85 currently passed **203** local Auth/PostgREST tests; this stage adds separate signed CRM/support and Phase B checks without changing those already verified paths.

\`scripts/stage88SupportStaffLiveReleaseGate.mjs --verify-pinned\` is an **offline** release blocker that ties the live staff/support ACL snapshot, Stage82/87 source fingerprints, source-extracted policies, actual frontend use, and free signed local CI hooks. If policies, privileges, frontend endpoints or pinned metadata drift, tests fail. The gate does not perform migrations, alter production data or authorize release.

**Production unchanged:** no live SQL DDL/DML, no real user/customer/stock data, no GitHub PR merge, no Production Vercel deploy, and **no paid staging**. Pending new SQL is still strictly Phase A (3) → reviewed frontend READY → Phase B (1).
