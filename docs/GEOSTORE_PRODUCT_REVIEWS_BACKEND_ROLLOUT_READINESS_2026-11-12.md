# GEOSTORE product reviews backend rollout readiness — 2026-11-12

## Stage purpose
Prepare the staged customer review/photo backend for a safe rollout without changing Production.

## Repository and staged dependencies
- Correct repository: `chixradzezauri-design/geostore`.
- Audit branch: `fix/admin-panel-audit-2026-11-10`.
- Review migration: `supabase/migrations/20261110194917_product_reviews.sql`.
- Edge Function entrypoint: `supabase/functions/product-reviews/index.ts`; validation dependency: `supabase/functions/product-reviews/validation.js`.
- Function config intentionally sets `verify_jwt = false` because guest reviews are supported; the handler validates any supplied bearer token with Auth `getUser()`, while anonymous submissions are subject to IP rate limiting. This is an intentional auth contract, not a reason to disable the handler's checks.
- No `deno.json` exists in the function directory or shared functions folder; the entrypoint uses a pinned `npm:@supabase/supabase-js@2.57.0` import and a local relative validation module. Deployment packaging must include both files.
- The migration's `products.id` and `products.is_published` assumptions match Production types (`text` and `boolean`). Its moderation activity-log dependency `private.write_admin_activity_log(text)` exists in Production, and service_role has USAGE on the private schema.
- Rate-limit table, review table and review bucket are deliberately absent in Production because the migration has not run.
- The Edge Function requires `SUPABASE_URL`, a service-role secret (`SUPABASE_SERVICE_ROLE_KEY` or the supported `SUPABASE_SECRET_KEYS` JSON mapping), and an anon/publishable key (`SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEYS` mapping). Secret values cannot be inspected through the available connected tools; presence and correctness remain an explicit deployment gate. Never put service-role credentials in frontend code or repository files.

## Production read-only checks
- Supabase project `xmtnszxtnfxnrojionoa` is ACTIVE_HEALTHY, PostgreSQL 17.11, us-west-2.
- No development branches currently exist.
- Edge Function list is empty.
- Production migration ledger does not contain `20261110194917`.
- The review table, private rate-limit table and review-image bucket are absent.
- Required migration dependencies checked: products table and expected column types exist; private admin activity logger exists; service_role private-schema USAGE exists.
- Security advisor currently reports leaked-password protection disabled. This is an existing Auth warning, unrelated to review deployment; it should be addressed separately by an authorized Auth settings change after review.

## Deployment blockers and safe path
1. No verified restorable backup/export is available in this working context. Do not apply schema changes to Production.
2. No isolated Supabase development branch exists. Creating one can incur hourly compute charges and requires the user's cost confirmation through the tool flow.
3. Required Edge Function secret presence/values cannot be inspected here; configure them securely in Supabase secrets, never commit them.
4. Validate migration and Edge Function in an isolated project first, including RLS, role grants, anonymous and authenticated review submission, rate limits, image upload/signing, moderation authorization, and idempotent retry behavior.
5. Coordinate frontend and backend release; deploy the migration and function as a matched unit only after backup, isolated validation, and explicit Production approval.
6. Do not use blanket `supabase db push`; do not merge PR or promote Preview without explicit approval.

## Security note
Guest review rate limiting relies on the trusted client-IP headers supplied by the edge proxy. The code prefers `cf-connecting-ip`, then `x-real-ip`, then the first `x-forwarded-for` value. Before Production launch, confirm the deployed Supabase edge ingress overwrites/trusts the selected headers and does not permit caller spoofing. If that cannot be guaranteed, replace this source with a trusted platform-provided client-IP mechanism or require authenticated submissions; do not assume the rate limit is effective solely because the helper unit test passes.

## Verification limits
No Production schema, data, Storage bucket/policy, Edge Function, secret, Auth setting, review, image, product, order or user record was changed. No Supabase branch was created, no tests/build/browser E2E/current-HEAD CI was run, and no migration or function was deployed. Existing source tests were inspected but not executed.

## Result
Backend prerequisites are partially understood and one migration dependency check passed. Safe rollout remains blocked by lack of a verified backup, isolated validation environment, and verified function secrets/trusted IP header contract. No code patch is justified until those environment-dependent assumptions can be validated.
