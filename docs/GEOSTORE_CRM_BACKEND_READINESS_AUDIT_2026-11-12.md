# GEOSTORE — CRM Backend Readiness Audit (2026-11-12)

## Scope
Read-only metadata inspection of Production database and audit-branch source at commit `2234961cecfc254246dda4dae686a06f10625b4f`. No customer rows, emails, phone numbers, message bodies, or Auth user records were queried. No Production changes were made.

## Production schema findings
- The inspected public/private schemas contain the operational tables `orders`, `messages`, `support_tickets`, and `support_ticket_messages`; all have RLS enabled.
- The inspected schema contains no `profiles`, `customers`, `customer_profiles`, `customer_addresses`, `user_profiles`, `admin_users`, `staff`, `staff_members`, `customer_crm`, or `crm_customers` table.
- `orders` already carries order-level customer contact fields and optional `user_id`; `support_tickets` carries ticket-level contact fields and optional `customer_user_id`. These are operational records, not a canonical CRM profile.
- The metadata search found no public/private function named for CRM, customer, staff, or user management; the only name match was the private `bind_order_to_auth_user()` function. This does not establish that no unrelated Auth endpoint exists; it establishes that no matching CRM RPC was found.
- No staff provisioning table or staff-management RPC was found in the inspected schema.

## Consequences
1. There is currently no server-side canonical CRM record to synchronize VIP status, admin notes, or customer discount settings across devices.
2. Do not build a customer directory by granting browser clients direct access to `auth.users` or by exposing a service-role key. Auth user administration must remain server-side.
3. Guest buyers and authenticated customers must be handled as separate identity cases until a verified matching rule exists. Do not merge records by phone/name alone.
4. Staff list entries and permission labels in localStorage are not real staff accounts and do not enforce authorization.

## Safe target architecture (proposal only)
- Introduce a dedicated customer CRM table with stable UUID, optional `auth_user_id`, guest identity reference only when verified, VIP flag, bounded discount, admin note, created/updated timestamps, and actor audit metadata.
- Enforce RLS with no direct browser write access. Expose narrowly scoped admin-only RPCs or a server-side Edge Function after validating the existing trusted admin identity model.
- Do not store or expose service-role credentials in frontend code.
- Keep actual Auth account suspension/ban distinct from a CRM-only marker. Require a separate, explicit workflow for account enforcement.
- Keep staff provisioning and role/permission enforcement separate from the local planning list.
- Before any migration, define a non-destructive migration/export plan for local CRM data. Browser-local rows cannot be extracted by a GitHub/Supabase server-side script; they remain on the user's device and require an explicit client-side export/import workflow if the user wants them preserved.
- Test with synthetic records in a safe non-Production environment; do not create test orders or messages in Production.

## Release gate
This is an audit and design proposal only. No table, function, policy, grant, Edge Function, frontend code, or customer data was changed. Existing 24 missing Production migration sources and the other previously documented release blockers remain unresolved. Do not merge, apply migrations, or deploy to Production as part of this stage.
