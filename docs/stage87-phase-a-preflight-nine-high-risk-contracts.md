# Stage87 — Live Phase A catalog preflight + nine-high-risk source/entrypoint parity

**NOT RELEASE-READY. Production unchanged. No paid staging. This work uses no paid staging environment.** Draft PR #149 only. Captured 2026-11-23.

## What was checked read-only on actual Production

\`release/stage87-read-only-phase-a-preflight.sql\` is a single **SELECT** over migration history, system catalogs, columns and privilege metadata. It returned the verified history MD5 \`4f09258df9fbd7b415cc2d3dc5ffbe6f\`, **135 applied migrations**, and **0 of 4 staged Phase A/B files applied**.

All **17** required \`public.orders\` columns match the exact types expected by the three Phase A preflight SQL blocks. Orders RLS is enabled; the staff table, \`auth.uid()\`, and current invoker/public and definer/private checkout, customer order history, and staff-permission functions exist, with metadata hashes exactly matching Stage81's read-only snapshot. Two planned additive public ledger/image-reference projection RPCs are **not** yet present, as expected before Phase A.

**Security finding:** \`authenticated\` still has direct raw \`public.orders\` SELECT and SELECT of \`items\`, \`checkout_result\`, and \`checkout_request\` (while \`anon\` does not have table SELECT). These are **finance-bearing snapshots**; the Stage87 result explicitly marks access as open. **Phase A** leaves this legacy compatibility open for old admin sessions and is **not** the complete privacy fix. **Phase B** must revoke the raw columns only **after** the new admin frontend has deployed and been verified READY, with stale tabs handled. Nothing was changed live.

## All nine HIGH historical SQL differences mapped to current entrypoints

For all **9 HIGH** executable-token-different historical migration files from Stage86, \`release/stage87-high-risk-live-boundary-matrix.json\` maps original file and applied-SQL MD5/Git blob SHA to **18 unique current Production routines** and their current source MD5, \`SECURITY DEFINER/INVOKER\` and \`anon\`/\`authenticated\` EXECUTE grants. A fresh read-only pg_catalog query compared all 18 fields to Stage82's pinned effective-schema result without drift. The groups cover:
- checkout stock, variant history, add-on pricing and idempotency;
- protected cancelled-order reactivation and administrative identity/AMR;
- order notification owner event function and public invoker wrapper;
- support ticket creation/messages and public/private permission wrappers;
- inventory replenishment settings, including optimistic concurrency overloads.

This is **current runtime-API metadata and partial signed local tests**, NOT historical stored SQL semantic equivalence. The nine HIGH source divergences remain flagged \`HISTORICAL_SOURCE_UNRECONCILED_DO_NOT_REPLAY\`; Stage86 separately pins the other one MEDIUM and one LOW difference. Neither local SQL source nor previously applied SQL history was rewritten.

## New automatic release blocker

\`scripts/stage87PhaseAPreflightHighRiskGate.mjs --verify-pinned\` runs offline in Stage52's free isolated PostgreSQL CI. It cryptographically pins both JSON files' exact Git blob SHA, cross-checks Stage72/81/82/86, 17 order columns, 10 RPC preflight entries, historic SQL risk matrix, all 18 current function MD5/grants, and the exact four Phase A/B SQL Git blobs. Any unapproved drift causes a nonzero exit code. It also supports three explicitly exported **fresh read-only SQL metadata** inputs to detect live function/schema/history changes. It never contacts Supabase itself, changes metadata, runs migrations, merges the PR or deploys Production.

The free local Supabase GoTrue/Auth/PostgREST CI suite currently has **203** signed/authenticated commerce, role, stock, notification and status checks. Stage86 passed **1026/1026** Node tests and all 7 CI workflows. Those signed tests still use a **synthetic subset**, not a complete **full-schema** Production clone; support owner/token pathways, concurrent transactions, every real RLS policy and 11 historical SQL divergences remain open.

**Not permission to release:** a passing current catalog preflight shows Phase A's major *catalog prerequisites match*, not that the actual Phase A transaction, browser cutover or Phase B revocation is safe in the real environment. Release order remains **Phase A** (three reviewed files, controlled verification), then new frontend READY, then **Phase B** (one revocation file, after stale sessions addressed). No blind \`supabase db push\`, no migration history repair or old SQL replay. **Production unchanged**.
