# GEOSTORE product purchase-cost privilege audit — 2026-11-12

## Scope
Read-only inspection of Production Supabase project `xmtnszxtnfxnrojionoa`, current audit-branch SQL, and product fetch paths in `src/App.jsx` and `src/components/AdminDashboardPro.jsx`.

No Production grants, rows, policies, migrations, or deployments were changed.

## Finding
Production currently grants table-level `SELECT` on `public.products` to `authenticated`. The row policy `Public can read published products` also applies to authenticated users. Although the `purchase_cost` column has no separate column-level SELECT grant, table-level SELECT implicitly grants access to every column.

The effective privilege checks confirmed:
- `authenticated` can SELECT `public.products`.
- `authenticated` can SELECT `public.products.purchase_cost`.
- `anon` cannot SELECT `purchase_cost`.
- `anon` and `authenticated` are not granted SELECT on `is_published` through the public catalogue field list.

This conflicts with the intent of the already-recorded migration `20261109152543_restrict_authenticated_product_cost_select`, whose source revokes table-level SELECT and grants only public catalogue columns.

## Compatibility review
- Storefront product loading in `src/App.jsx` selects an explicit public catalogue field list and does not request `purchase_cost`.
- Admin full product loading uses the protected `admin_list_products` RPC.
- Admin direct REST reads inspected use limited fields for image/gallery or stock/price comparisons.
- The corrective migration reasserts the intended column-level SELECT list for both `anon` and `authenticated`; it does not remove the protected admin RPC path.

## Staged remediation
Added:
`supabase/migrations/20261112120000_restrict_authenticated_product_cost_select_again.sql`

It revokes table-level SELECT from `anon` and `authenticated`, then grants SELECT only on the existing public catalogue fields. It does not modify any rows or product data.

## Release safety
The corrective migration is staged on `fix/admin-panel-audit-2026-11-10` only. It has **not** been applied to Production. Apply only after full release review and a recoverable backup/rollback plan. Do not apply unrelated migrations as a batch.
