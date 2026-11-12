# GEOSTORE Customer Account, Profile & Authentication Audit — 2026-11-12

Repository: `chixradzezauri-design/geostore`
Branch: `fix/admin-panel-audit-2026-11-10`
Audited branch HEAD before this report: `af5d33884259cbf845740eef14d7f7fc8d9e8caa`

## Scope and method

Read-only Production Supabase inspection and source review of `src/App.jsx`, `src/components/AdminDashboardPro.jsx`, `src/utils/authSafety.js`, the current migration tree, public table grants/policies, and database functions referencing Auth identity. No Production rows, schema, privileges, Auth users, or Storage objects were changed.

## Findings

1. **No standalone public customer/profile table exists.** Production's public base tables are `expenses`, `messages`, `order_notifications`, `orders`, `products`, `store_coupons`, `store_delivery_fees`, `storefront_config`, `storefront_media`, `storefront_versions`, `support_ticket_messages`, and `support_tickets`. No `profiles`, `customers`, `user_profiles`, or customer-address/cart table exists in the current public schema.
2. **Auth core tables are not directly granted to client roles.** The Production grant inspection returned no direct `anon` or `authenticated` grants on `auth.users`, `auth.identities`, `auth.sessions`, or `auth.refresh_tokens`.
3. **The frontend does not implement account deletion or privileged Auth administration.** `src/App.jsx` contains no `supabase.auth.admin`, `deleteUser`, or profile-table access. Its only `auth.updateUser` call updates the current user's password; sign-out calls are ordinary session sign-outs.
4. **Admin CRM user controls are browser-local records, not Auth account controls.** VIP, block-label, CRM note/discount, and CRM delete handlers call `persistAdminLocalCollection`, which saves to `window.localStorage`. The UI explicitly explains that the list is stored only in the current browser and does not create a Supabase account or grant roles/access. The delete confirmation explicitly says it removes only the local CRM record and does not delete the Supabase Auth account or orders. This is not cross-device CRM synchronization; that is a current functional limitation, not a server-account deletion defect.
5. **Order ownership binding is server-side and identity-bound.** Production's `private.bind_order_to_auth_user()` is `SECURITY DEFINER` with an empty `search_path`. Guest orders get `user_id = NULL`; for signed-in orders it requires a non-null `auth.uid()`, verifies the order email against the JWT email, and sets `user_id` to the authenticated UID. This preserves the customer/order identity link.
6. **Admin identity checks remain anchored to the trusted primary Auth UID.** Frontend admin recognition checks both `app_metadata.role = 'admin'` and the fixed primary-admin UID. Admin-facing server functions found in the Production function inventory are security-definer functions; the inspected identity-sensitive paths use the fixed UID and trusted app metadata. No client-side account deletion path was found.
7. **Auth restore race guard exists.** `src/utils/authSafety.js` rejects stale `getUser()` restoration results when a newer auth event has advanced the restore version.

## Conclusion

No verified Production defect requiring an Auth-account/profile migration was found in this audit. Existing Auth accounts and order ownership links should be preserved; no account deletion, profile rewrite, or speculative schema addition is justified.

The CRM list's browser-local storage behavior should remain clearly labelled until a separately designed, server-backed CRM synchronization feature is implemented with explicit ownership, RLS, and migration safeguards.

## Release / safety status

This report is documentation-only on the audit branch. No Production migration, Auth mutation, data edit, deployment, PR merge, or promotion was performed. The audit branch was also verified to contain both the order-history-aware product deletion guard migration (`20261112133000_guard_legacy_order_product_references.sql`) and the direct authenticated product-delete revoke migration (`20261112140000_revoke_direct_product_delete.sql`); neither was applied to Production.
