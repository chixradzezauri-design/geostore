-- Stage 103D: CRM messages and support inbox permissions are checked by Postgres.
-- Customer/visitor ownership and access-token checks remain unchanged.

DROP POLICY IF EXISTS "Admin can read chat messages" ON public.messages;
CREATE POLICY "Staff with CRM permission can read chat messages"
  ON public.messages FOR SELECT TO authenticated
  USING (public.has_staff_permission('crm'));

DROP POLICY IF EXISTS "Admin can update chat messages" ON public.messages;
CREATE POLICY "Staff with CRM permission can update chat messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (public.has_staff_permission('crm'))
  WITH CHECK (public.has_staff_permission('crm'));

DROP POLICY IF EXISTS "Admin can delete chat messages" ON public.messages;
CREATE POLICY "Staff with CRM permission can delete chat messages"
  ON public.messages FOR DELETE TO authenticated
  USING (public.has_staff_permission('crm'));


DROP POLICY IF EXISTS "Admin can read support tickets" ON public.support_tickets;
CREATE POLICY "Staff with support permission can read support tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (public.has_staff_permission('support'));

DROP POLICY IF EXISTS "Admin can update support tickets" ON public.support_tickets;
CREATE POLICY "Staff with support permission can update support tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.has_staff_permission('support'))
  WITH CHECK (public.has_staff_permission('support'));

DROP POLICY IF EXISTS "Admins can read support ticket messages" ON public.support_ticket_messages;
CREATE POLICY "Staff with support permission can read support ticket messages"
  ON public.support_ticket_messages FOR SELECT TO authenticated
  USING (public.has_staff_permission('support'));


DO $staff_support_permissions$
DECLARE
  v_definition text;
  v_original text;
  v_signature text;
  v_signatures text[] := ARRAY[
    'private.add_support_ticket_message(text,text,text)',
    'private.add_support_ticket_message_idempotent(text,text,text,uuid)',
    'private.get_support_ticket_messages(text,text)',
    'public.get_support_ticket_status(text,text)',
    'public.mark_support_ticket_messages_read(text,text)'
  ];
BEGIN
  FOREACH v_signature IN ARRAY v_signatures LOOP
    v_definition := pg_get_functiondef(v_signature::regprocedure);
    v_original := v_definition;

    -- In these customer-facing RPCs the owner-only predicate determines
    -- whether the caller is acting as the support agent or as the customer.
    -- Replace only the exact owner-role clause; customer ownership/token
    -- checks remain untouched.
    v_definition := replace(
      v_definition,
      'coalesce(auth.jwt() -> ''app_metadata'' ->> ''role'', '''') = ''admin''',
      'true'
    );
    v_definition := replace(
      v_definition,
      'auth.uid() = ''1060de3d-d28a-45f8-9a64-5e0368cffc4b''::uuid',
      'public.has_staff_permission(''support'')'
    );

    IF v_definition = v_original THEN
      RAISE EXCEPTION 'Could not locate the support-agent authorization predicate in %.', v_signature;
    END IF;

    EXECUTE regexp_replace(v_definition, ';[[:space:]]*$', '');
  END LOOP;

  -- The unread-count endpoint has a standalone owner-only guard.
  v_definition := pg_get_functiondef('public.get_support_ticket_unread_counts()'::regprocedure);
  v_original := v_definition;
  v_definition := replace(
    v_definition,
    E'if auth.uid() is distinct from ''1060de3d-d28a-45f8-9a64-5e0368cffc4b''::uuid\n     or coalesce(auth.jwt() -> ''app_metadata'' ->> ''role'', '''') <> ''admin'' then',
    'if not public.has_staff_permission(''support'') then'
  );
  IF v_definition = v_original THEN
    RAISE EXCEPTION 'Could not locate get_support_ticket_unread_counts authorization guard.';
  END IF;
  EXECUTE regexp_replace(v_definition, ';[[:space:]]*$', '');
END;
$staff_support_permissions$;

-- The public visitor ticket INSERT policy and all customer ownership/token
-- checks are intentionally preserved.
