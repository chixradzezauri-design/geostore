-- LOCAL disposable Postgres ONLY, run after signed Phase A HTTP checks.
\set ON_ERROR_STOP on
\ir ../../supabase/migrations/20261121213000_revoke_legacy_order_snapshot_reads.sql
NOTIFY pgrst, 'reload schema';
