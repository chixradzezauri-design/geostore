# GEOSTORE staff authentication and authorization audit

## Verified live state — 2026-11-17

- The current admin employee list is stored only in browser `localStorage` under `geostore_staff_list`.
- The frontend admin gate checks both `app_metadata.role === 'admin'` and the fixed primary-admin Auth UUID. A normal customer account cannot enter the admin panel.
- Live Supabase contains 2 Auth users.
- No `public.user_roles`, `public.staff_members`, or authoritative employee-membership table exists.
- No Supabase Edge Functions are currently deployed.
- The live database has 27 RLS policies containing the primary-admin UUID and 23 public/private database functions whose authorization logic contains the same fixed UUID.
- The current server-side authorization is therefore genuinely owner-only; changing only the browser's localStorage or hiding/showing tabs would not grant safe employee access.

## Security design

1. Keep the fixed primary-admin identity as the immutable owner with all permissions.
2. Add an authoritative `public.admin_staff_members` table linked one-to-one to `auth.users(id)`. It stores a normalized email, display name, stable role slug, explicit module permissions, active/revoked state, inviter and timestamps.
3. Enable RLS and revoke all direct table access from `anon` and `authenticated`. Only the trusted server-side Edge Function/service role may manage employee rows.
4. Add server-side `public.has_staff_permission(permission)` and `public.get_my_admin_access()` functions. They resolve the current `auth.uid()` against the active membership row; browser state and user-editable metadata are never authoritative.
5. Add `manage-admin-staff` Edge Function. It verifies the caller's access token and exact primary-owner identity before using the server secret to invite Auth users, link an existing account, update role/permissions, list employees or revoke staff membership. The secret is never shipped to the browser.
6. Convert RLS policies and SECURITY DEFINER RPCs module by module. The permission check must be performed again by Postgres on every protected operation; hiding a tab is only a UI convenience.
7. Preserve owner-only actions where the impact is high: employee administration, account/security controls, order reactivation, and final storefront publication. Product purchase-cost access must remain separately protected from ordinary product editing.
8. Keep the old localStorage list as an explicitly untrusted migration source until each employee is successfully linked/invited. Never treat its role or permissions as effective access, and never silently delete it.

## Permission map

- `products`: catalog editing and inventory operations; purchase-cost visibility remains restricted to finance/owner.
- `orders`: order list and ordinary status/note operations; completed/cancelled reactivation remains owner-only.
- `analytics`: read-only aggregate views only; no raw PII or mutation grants by default.
- `expenses`: expense records and finance-only reporting.
- `crm`: customer management and legacy customer messages.
- `support`: support-ticket inbox and replies.
- `settings`: controlled store configuration, coupons and delivery settings; final storefront publication remains owner-only.

## Rollout sequence

- Stage 102: add the Auth-linked membership schema, server permission lookup functions and owner-only staff-management Edge Function. Do not grant any module data access yet.
- Stage 103: convert RLS policies and RPC authorization checks by module, retaining all existing customer/guest access rules and owner-only exceptions.
- Stage 104: connect the frontend login/session gate and employee panel to the new server API, add invitation status and explicit permission editing, and retain localStorage drafts for safe import.
- Stage 105: run negative/positive authorization tests for each permission, invitation lifecycle tests, revoked-session tests, CI and browser QA. Only then schedule the single combined Production rollout.

## Release boundary

This document records a read-only audit and a proposed staged implementation. No live Auth account, database row, RLS policy, schema, Edge Function or Production deployment was changed during the audit.
