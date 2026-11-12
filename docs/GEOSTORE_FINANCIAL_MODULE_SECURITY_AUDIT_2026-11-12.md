# GEOSTORE Financial Module Security Audit — 2026-11-12

## Scope and safety
Read-only inspection of Production financial table structure, RLS policies, grants, and audit-branch frontend/migration source. No customer/order contents were read. No Production data, schema, grants, policies, or Storage objects were changed. No test orders or expenses were created.

## Findings

### 1. Expenses are protected by primary-admin RLS
The `public.expenses` table has a single authenticated `ALL` policy requiring both the fixed primary administrator UID and trusted `app_metadata.role = 'admin'` in both USING and WITH CHECK. Authenticated has table privileges, but RLS remains the row-level gate. No anon grant was found.

### 2. Order financial totals are protected
The `orders` table exposes authenticated SELECT only at the table-grant level (plus service_role privileges). Its SELECT policy is restricted to the fixed primary administrator UID and trusted admin app_metadata role. No anon SELECT grant was found in the inspected grants.

### 3. Product purchase cost exposure — confirmed Production concern
Production has a broad table-level SELECT grant for authenticated on `public.products`. The public catalogue RLS policy permits published rows, so RLS alone does not hide individual columns such as `purchase_cost`. This can expose purchase cost to signed-in non-admin users who can read published products.

An audit-branch migration already exists to revoke broad SELECT and grant only the intended catalogue columns, leaving full admin product reads to the protected `admin_list_products` RPC. This migration is staged only; it has not been applied to Production.

### 4. Staged migration compatibility correction
Review of the migration showed it initially omitted `is_published` from its column-level SELECT grant. The storefront needs that column for the published-products filter / policy predicate. Applying the incomplete migration could break catalogue reads. I corrected the staged migration to include `is_published` while continuing to exclude `purchase_cost`.

Migration:
`supabase/migrations/20261112120000_restrict_authenticated_product_cost_select_again.sql`

### 5. Financial calculations
The admin dashboard calculates revenue, cost of goods, gross/net profit, expense totals, product/vendor profitability, and explicitly tracks unknown or estimated cost items. It does not present profit as complete where revenue or cost inputs are missing/estimated. This is safer than silently reporting an inaccurate profit figure.

### 6. Data model limits
The live `expenses` table contains category, amount, date, description, and created_at. The `products` table contains purchase_cost. The inspected schema does not show a dedicated, immutable accounting ledger or per-order item cost snapshot column in the base order columns; the dashboard can use order item JSON snapshots when present and otherwise falls back to current product cost as an estimate. Historical profitability should therefore remain clearly labelled estimated/unknown where snapshots are absent.

### 7. Existing security notice
Supabase Security Advisor continues to report `auth_leaked_password_protection` as WARN. Remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Conclusion
The main confirmed financial confidentiality issue is authenticated access to `products.purchase_cost` through the broad Production table SELECT grant. The audit-branch migration is intended to close it while retaining public catalogue fields; its missing `is_published` permission was corrected before release. The migration remains un-applied to Production pending the wider release blockers and explicit Production release approval.

## Release status
- Migration change is committed only to `fix/admin-panel-audit-2026-11-10`.
- No Production migration, deployment, merge, or data mutation.
- Do not run a blanket `supabase db push`.
