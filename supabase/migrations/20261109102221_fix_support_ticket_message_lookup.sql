-- Fix ticket lookup ambiguity and keep the selected ticket row explicit.
CREATE OR REPLACE FUNCTION private.get_support_ticket_messages(p_ticket_id text,p_access_token text DEFAULT NULL)
RETURNS TABLE(id bigint,sender_role text,sender_name text,message text,created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_ticket public.support_tickets%rowtype; v_is_admin boolean; v_is_customer boolean;
BEGIN
 SELECT t.* INTO v_ticket FROM public.support_tickets AS t WHERE t.id=p_ticket_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'მხარდაჭერის მოთხოვნა ვერ მოიძებნა.'; END IF;
 v_is_admin:=coalesce(auth.jwt()->'app_metadata'->>'role','')='admin'
 AND auth.uid()='1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid;
 v_is_customer:=(v_ticket.customer_user_id IS NOT NULL AND auth.uid()=v_ticket.customer_user_id)
 OR (auth.uid() IS NOT NULL AND v_ticket.email IS NOT NULL
 AND lower(v_ticket.email)=lower(coalesce(auth.jwt()->>'email','')))
 OR (coalesce(p_access_token,'') ~ '^[A-Fa-f0-9]{64}$' AND v_ticket.access_token_hash IS NOT NULL
 AND v_ticket.access_token_hash=encode(extensions.digest(lower(p_access_token),'sha256'),'hex'));
 IF NOT(v_is_admin OR v_is_customer) THEN
 RAISE EXCEPTION 'მიმოწერის ნახვის უფლება არ გაქვთ.' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT m.id,m.sender_role,m.sender_name,m.message,m.created_at
 FROM public.support_ticket_messages AS m
 WHERE m.ticket_ref=p_ticket_id ORDER BY m.created_at,m.id;
END; $$;
