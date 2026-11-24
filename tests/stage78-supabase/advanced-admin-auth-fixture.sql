-- Only inside disposable Stage78 local stack. No production connections.
\set ON_ERROR_STOP on
CREATE TABLE IF NOT EXISTS private.admin_customer_crm_profiles (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 is_vip boolean NOT NULL DEFAULT false,
 is_blocked boolean NOT NULL DEFAULT false
);
ALTER TABLE private.admin_customer_crm_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.admin_customer_crm_profiles FROM PUBLIC,anon,authenticated;
