# Order-note column privilege audit — 2026-11-07

## Live finding

A read-only PostgreSQL privilege check found:
- `authenticated` has no table-level UPDATE privilege on `public.orders`;
- `authenticated` does retain a column-level UPDATE grant on `public.orders.admin_note`;
- `anon` has no UPDATE privilege;
- the live `private.admin_save_order_note(text,text)` function is SECURITY DEFINER and checks both the configured admin UID and `app_metadata.role = 'admin'`;
- `AdminDashboardPro` already saves notes through `/rest/v1/rpc/admin_save_order_note`, not a direct table PATCH.

The remaining direct column grant is unnecessary and creates an alternate write path that bypasses the note RPC's validation/audit behavior.

## Staged correction

`supabase/migrations/20261107241000_revoke_direct_order_note_column_update.sql` contains:

```sql
REVOKE UPDATE (admin_note) ON TABLE public.orders FROM authenticated;
```

This does not affect the protected SECURITY DEFINER note RPC or service-role access. The migration is staged only and has not been applied to Supabase.

A regression test verifies the migration's column-level revoke and that the admin UI uses the protected RPC.

## Safety boundary

No live grants, order rows, or notes were changed. Apply only after the repository/live migration history is reconciled. No Vercel build or deployment was triggered.
