# GEOSTORE — Stage 53: release security preflight

**Status:** Draft PR #149 only; no Production database changes.

## Verified 2026-11-21 (read-only Supabase metadata)
- The public checkout RPC is SECURITY INVOKER and callable by anonymous and authenticated users.
- The private checkout implementation is SECURITY DEFINER, callable by both roles, and those roles have USAGE on the private schema so the public invoker wrapper can delegate to it. These grants **do not prove HTTP exposure**. Data API schema configuration is an independent boundary.
- SQL session inspection returned NULL for pgrst.db_schemas; it could not establish which schemas the running PostgREST service exposes.
- Supabase security advisor reports **Leaked Password Protection Disabled** (WARN). The storefront's client-side password checks do not replace server-side protection for other authentication clients. Enable/verify this in Supabase Auth settings before approving release: [official password-security guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- The security advisor also lists seven informational **RLS Enabled No Policy** findings, including internal admin/staff/flash-sale tables. RLS without policies normally denies direct reads. Verify the intended privileged RPC paths without adding permissive policies simply to silence an informational finding.

## New automated Production API boundary gate
The PR contains scripts/checkApiSchemaExposure.mjs and .github/workflows/stage53-api-schema-gate.yml.

The gate makes **two read-only GET requests** to the same catalogue endpoint, with limit=0 and the existing public browser/anon API key:
1. A public profile request must succeed to establish API health.
2. A private profile request must be rejected with **HTTP 406 and PostgREST code PGRST106**. If private is exposed, the response differs and the release gate fails. Unavailable APIs or ambiguous responses fail closed too.

The script does **not** invoke checkout or any other RPC, read customer records, create users, or modify stock. HTTP results are never written into the repository or displayed with authorization headers.

The [PostgREST schema documentation](https://docs.postgrest.org/en/stable/references/api/schemas.html) and [Supabase PostgREST error reference](https://supabase.com/docs/guides/api/rest/postgrest-error-codes) describe the header and error.

## Required before releasing accumulated changes
- [ ] Confirm Stage53 Data API gate passes against the **current read-only** API. Re-run immediately before deploying schema changes; fail on ambiguity.
- [ ] Enable and verify server-side leaked-password protection in connected Supabase project; the advisor currently reports it disabled. No Auth settings were changed here.
- [ ] Verify Stage51's public checkout redaction in an isolated full-schema Supabase staging environment, including replay, stock, RLS and authorized finance reports. Stage52's PostgreSQL contract uses a simulated private implementation.
- [ ] Ensure Stage51 migration is applied in the coordinated, explicitly authorized database/app release. **The live Production RPC may still expose internal purchase costs until then.**
- [ ] Validate real authenticated role boundaries and order/stock transactions with disposable staging-only fixtures.
- [ ] Perform real iPhone Safari UI/checkout QA; Playwright WebKit on Linux is not device testing.
- [ ] Review and explicitly approve merge/Production deployment. Keep PR #149 Draft until then.

Do not grant public or authenticated users SELECT on internal finance tables or expose private through PostgREST to work around access problems.
