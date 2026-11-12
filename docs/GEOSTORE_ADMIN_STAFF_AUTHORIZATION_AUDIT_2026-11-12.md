# GEOSTORE Admin and Staff Authorization Audit — 2026-11-12

## Scope
Read-only inspection of the live Supabase authorization layer and the audit branch `fix/admin-panel-audit-2026-11-10`. No customer records or message contents were read. No Production schema, grants, policies, users, or data were changed.

## Repository
- Repository: `chixradzezauri-design/geostore`
- Branch: `fix/admin-panel-audit-2026-11-10`
- Audited starting HEAD: `dfe52e8714d36afdcc2e00efcf7f1621df2731d7`

## Findings

### 1. Administrative database functions
Ten live `private.admin_*` functions were enumerated. All ten are SECURITY DEFINER functions and all ten have an empty `search_path`. Each function body contains both the fixed primary-administrator UID check and the trusted `app_metadata.role = 'admin'` check.

The functions inspected cover flash sales, product deletion/listing/saving, order reactivation/note/status, and product variant stock operations.

### 2. Order-note authorization false positive resolved
A coarse static check initially marked `private.admin_save_order_note(text,text)` as lacking a NULL-safe check. Inspection of its full definition showed an explicit `auth.uid() IS NULL` rejection before comparing the UID and checking the trusted admin role. This is fail-closed; no defect was confirmed.

### 3. Public RPC wrappers
Matching `public.admin_*` wrappers are SECURITY INVOKER (not SECURITY DEFINER). The observed API grants include authenticated and service_role; anon was not present in the returned grants. The private implementations remain the privilege boundary and repeat the administrator authorization check.

### 4. Row-level security
The inspected sensitive public tables have RLS policies with UID and/or trusted-role predicates: expenses, messages, orders, products, coupons, storefront configuration, support ticket messages, and support tickets.

The private `admin_activity_log` table has a deny-API-roles policy and its observed table ACL is postgres-only. This is consistent with keeping the audit log inaccessible to ordinary API roles.

### 5. Staff/employee roles
This live database inspection did not identify a separate staff/employee role-management system. The existing administrator functions use a single fixed primary-admin identity plus trusted admin app metadata. Do not represent UI-only employee permission settings as real server-side authorization.

### 6. Remaining security notice
Supabase Security Advisor still reports `auth_leaked_password_protection` as WARN / externally facing. Remediation guidance: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Conclusion
No new bypass was confirmed in the inspected primary-admin RPC authorization layer. The earlier NULL-check concern in the order-note function was a static-check false positive. The main remaining gap for future CRM work is the absence of a verified server-side staff-role model; implement it only as a separate, carefully reviewed authorization design, without weakening the fixed primary-admin protections.

## Safety / release status
- Read-only Production inspection only.
- No test orders/messages or customer data mutations.
- No Production migration, deployment, merge, or restore.
- This report is committed only to the audit branch.
