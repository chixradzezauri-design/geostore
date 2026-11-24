-- Stage88: SELECT-only effective Production support/staff/CRM RLS and RPC surface.
-- No auth.users, customer/ticket/order/message rows or function SQL source exported.
SELECT jsonb_build_object(
 'tables',(
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name',n.nspname||'.'||c.relname,'rls',c.relrowsecurity,
    'forced',c.relforcerowsecurity,
    'anonSelect',has_table_privilege('anon',c.oid,'SELECT'),
    'authenticatedSelect',has_table_privilege('authenticated',c.oid,'SELECT'),
    'authenticatedUpdate',has_table_privilege('authenticated',c.oid,'UPDATE'),
    'authenticatedDelete',has_table_privilege('authenticated',c.oid,'DELETE')
  ) ORDER BY n.nspname,c.relname),'[]'::jsonb)
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname IN
   ('admin_staff_members','admin_staff_pending_invites','messages','support_tickets','support_ticket_messages')
   AND c.relkind IN ('r','p')
 ),
 'policies',(
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
   'table',schemaname||'.'||tablename,'name',policyname,
   'cmd',cmd,'roles',roles,
   'usingMd5',md5(coalesce(qual,'')),'checkMd5',md5(coalesce(with_check,''))
  ) ORDER BY tablename,policyname),'[]'::jsonb)
  FROM pg_policies WHERE schemaname='public' AND tablename IN
   ('admin_staff_members','admin_staff_pending_invites','messages','support_tickets','support_ticket_messages')
 ),
 'rpcs',(
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
   'sig',n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
   'md5',md5(pg_get_functiondef(p.oid)),
   'definer',p.prosecdef,
   'anon',has_function_privilege('anon',p.oid,'EXECUTE'),
   'authenticated',has_function_privilege('authenticated',p.oid,'EXECUTE'),
   'pathLocked',p.proconfig @> ARRAY['search_path=""']
  ) ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)),'[]'::jsonb)
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('public','private') AND p.proname IN
   ('has_staff_permission','get_support_ticket_messages','add_support_ticket_message',
    'get_support_ticket_unread_counts','mark_support_ticket_messages_read',
    'create_support_ticket','get_my_support_tickets','get_my_support_tickets_page')
 )
)::text AS snapshot;