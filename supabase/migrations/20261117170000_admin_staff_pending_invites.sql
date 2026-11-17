-- Track invitations created by the owner so a partially completed
-- Auth invite can be safely recovered without linking unrelated unconfirmed users.
CREATE TABLE public.admin_staff_pending_invites (
  email text PRIMARY KEY,
  invitation_token uuid NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_staff_pending_invites_email_normalized
    CHECK (email = lower(btrim(email)))
);

ALTER TABLE public.admin_staff_pending_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_staff_pending_invites FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_staff_pending_invites FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.admin_staff_pending_invites TO service_role;

COMMENT ON TABLE public.admin_staff_pending_invites IS
  'Server-only recovery ledger for owner-created staff invitations that may need retry after a partial Auth/membership failure.';
