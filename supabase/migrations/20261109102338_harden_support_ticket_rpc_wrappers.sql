-- Keep SECURITY DEFINER implementations in the non-exposed private schema.
-- Public RPCs are SECURITY INVOKER wrappers only.
REVOKE ALL ON FUNCTION private.create_support_ticket(text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.get_support_ticket_messages(text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.add_support_ticket_message(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA private TO anon,authenticated;
GRANT EXECUTE ON FUNCTION private.create_support_ticket(text,text,text,text,text,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION private.get_support_ticket_messages(text,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION private.add_support_ticket_message(text,text,text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.create_support_ticket(p_id text,p_customer_name text,p_email text,p_subject text,p_message text,p_access_token text)
RETURNS jsonb LANGUAGE sql SET search_path='' AS $$
 SELECT private.create_support_ticket(p_id,p_customer_name,p_email,p_subject,p_message,p_access_token);
$$;
CREATE OR REPLACE FUNCTION public.get_support_ticket_messages(p_ticket_id text,p_access_token text DEFAULT NULL)
RETURNS TABLE(id bigint,sender_role text,sender_name text,message text,created_at timestamptz)
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT * FROM private.get_support_ticket_messages(p_ticket_id,p_access_token);
$$;
CREATE OR REPLACE FUNCTION public.add_support_ticket_message(p_ticket_id text,p_message text,p_access_token text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SET search_path='' AS $$
 SELECT private.add_support_ticket_message(p_ticket_id,p_message,p_access_token);
$$;
REVOKE ALL ON FUNCTION public.create_support_ticket(text,text,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_support_ticket_messages(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_support_ticket_message(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_support_ticket(text,text,text,text,text,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_support_ticket_messages(text,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.add_support_ticket_message(text,text,text) TO anon,authenticated;
