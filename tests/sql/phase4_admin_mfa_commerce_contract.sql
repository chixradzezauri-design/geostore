-- Minimal isolated guard fixture following 4AN/4AO. These stub tables only
-- support PL/pgSQL declaration types; NOT full marketing business integration.
create table private.marketing_campaigns(id uuid);
create table private.marketing_campaign_revisions(id uuid);
create table private.marketing_campaign_preflights(id uuid);
create table private.marketing_template_versions(id uuid);
-- Unexecuted later SQL expressions intentionally reference full production
-- tables/functions not present here. Only guard and early validation exercised.
set check_function_bodies=off;
\ir phase4_admin_mfa_commerce_original_fixture.sql
reset check_function_bodies;
revoke all on function private.admin_apply_flash_sale(numeric,text,integer) from public,anon;
grant execute on function private.admin_apply_flash_sale(numeric,text,integer) to authenticated;
revoke all on function private.admin_create_flash_sale(numeric,text,integer) from public,anon;
grant execute on function private.admin_create_flash_sale(numeric,text,integer) to authenticated;
revoke all on function private.check_admin_marketing_campaign(uuid,bigint,uuid) from public,anon;
grant execute on function private.check_admin_marketing_campaign(uuid,bigint,uuid) to authenticated;
revoke all on function private.read_admin_marketing_campaigns(uuid) from public,anon;
grant execute on function private.read_admin_marketing_campaigns(uuid) to authenticated;
revoke all on function private.read_admin_marketing_preflights(uuid,uuid) from public,anon;
grant execute on function private.read_admin_marketing_preflights(uuid,uuid) to authenticated;
revoke all on function private.read_admin_marketing_segments() from public,anon;
grant execute on function private.read_admin_marketing_segments() to authenticated;
revoke all on function private.read_admin_marketing_templates(uuid) from public,anon;
grant execute on function private.read_admin_marketing_templates(uuid) to authenticated;
revoke all on function private.save_admin_marketing_campaign(uuid,uuid,bigint,text,text,text,text,text,timestamp with time zone) from public,anon;
grant execute on function private.save_admin_marketing_campaign(uuid,uuid,bigint,text,text,text,text,text,timestamp with time zone) to authenticated;
revoke all on function private.save_admin_marketing_template(uuid,uuid,bigint,text,jsonb) from public,anon;
grant execute on function private.save_admin_marketing_template(uuid,uuid,bigint,text,jsonb) to authenticated;
-- The two-argument sale delegate mirrors the inspected live definition.
create function private.admin_apply_flash_sale(p_discount_percent numeric,p_category text)
returns integer language sql security definer set search_path=''
as $delegate$ select private.admin_apply_flash_sale(p_discount_percent,p_category,12) $delegate$;
revoke all on function private.admin_apply_flash_sale(numeric,text) from public,anon;
grant execute on function private.admin_apply_flash_sale(numeric,text) to authenticated;
begin;
set local check_function_bodies=off;
\ir ../../release/phase4-admin-mfa-commerce-draft.sql
commit;
set role authenticated;
do $checks$
declare owner_id text:='1060de3d-d28a-45f8-9a64-5e0368cffc4b'; valid_claims jsonb;
begin
 valid_claims:=jsonb_build_object('sub',owner_id,'aal','aal2','app_metadata',jsonb_build_object('role','admin'));
 perform set_config('request.jwt.claims',(valid_claims||'{"aal":"aal1"}'::jsonb)::text,false);
 begin perform private.admin_apply_flash_sale(10,'fixture',12);raise exception 'AAL1 allowed commerce RPC 1';exception when insufficient_privilege then null;end;
 begin perform private.admin_create_flash_sale(10,'fixture',60);raise exception 'AAL1 allowed commerce RPC 2';exception when insufficient_privilege then null;end;
 begin perform private.check_admin_marketing_campaign(null,null,null);raise exception 'AAL1 allowed commerce RPC 3';exception when insufficient_privilege then null;end;
 begin perform private.read_admin_marketing_campaigns(null);raise exception 'AAL1 allowed commerce RPC 4';exception when insufficient_privilege then null;end;
 begin perform private.read_admin_marketing_preflights(null,null);raise exception 'AAL1 allowed commerce RPC 5';exception when insufficient_privilege then null;end;
 begin perform private.read_admin_marketing_segments();raise exception 'AAL1 allowed commerce RPC 6';exception when insufficient_privilege then null;end;
 begin perform private.read_admin_marketing_templates(null);raise exception 'AAL1 allowed commerce RPC 7';exception when insufficient_privilege then null;end;
 begin perform private.save_admin_marketing_campaign(null,null,null,null,null,null,null,null,null);raise exception 'AAL1 allowed commerce RPC 8';exception when insufficient_privilege then null;end;
 begin perform private.save_admin_marketing_template(null,null,null,null,null);raise exception 'AAL1 allowed commerce RPC 9';exception when insufficient_privilege then null;end;
 begin perform private.admin_apply_flash_sale(10,'fixture');raise exception 'AAL1 allowed commerce RPC 10';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims',jsonb_set(valid_claims,'{sub}',to_jsonb('00000000-0000-4000-8000-000000000001'::text))::text,false);
 begin perform private.admin_create_flash_sale(10,'fixture',60);raise exception 'Staff elevated';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims',valid_claims::text,false);
 -- AAL2 reaches the pre-existing early input validation; never execute writes here.
 begin perform private.admin_apply_flash_sale(0,'fixture',12);raise exception 'Invalid payload accepted 1';exception when invalid_parameter_value then null;end;
 begin perform private.admin_create_flash_sale(0,'fixture',60);raise exception 'Invalid payload accepted 2';exception when invalid_parameter_value then null;end;
 begin perform private.check_admin_marketing_campaign(null,null,null);raise exception 'Invalid payload accepted 3';exception when invalid_parameter_value then null;end;
 begin perform private.save_admin_marketing_campaign(null,null,null,null,null,null,null,null,null);raise exception 'Invalid payload accepted 4';exception when invalid_parameter_value then null;end;
 begin perform private.save_admin_marketing_template(null,null,null,null,null);raise exception 'Invalid payload accepted 5';exception when invalid_parameter_value then null;end;
end $checks$;
reset role;
do $verify$ begin
 if has_function_privilege('anon','private.admin_apply_flash_sale(numeric,text,integer)','EXECUTE') or not has_function_privilege('authenticated','private.admin_apply_flash_sale(numeric,text,integer)','EXECUTE') then raise exception 'RPC ACL changed';end if;
 if has_function_privilege('anon','private.admin_create_flash_sale(numeric,text,integer)','EXECUTE') or not has_function_privilege('authenticated','private.admin_create_flash_sale(numeric,text,integer)','EXECUTE') then raise exception 'RPC ACL changed';end if;
 if has_function_privilege('anon','private.check_admin_marketing_campaign(uuid,bigint,uuid)','EXECUTE') or not has_function_privilege('authenticated','private.check_admin_marketing_campaign(uuid,bigint,uuid)','EXECUTE') then raise exception 'RPC ACL changed';end if;
 if has_function_privilege('anon','private.read_admin_marketing_campaigns(uuid)','EXECUTE') or not has_function_privilege('authenticated','private.read_admin_marketing_campaigns(uuid)','EXECUTE') then raise exception 'RPC ACL changed';end if;
 if has_function_privilege('anon','private.read_admin_marketing_preflights(uuid,uuid)','EXECUTE') or not has_function_privilege('authenticated','private.read_admin_marketing_preflights(uuid,uuid)','EXECUTE') then raise exception 'RPC ACL changed';end if;
 if has_function_privilege('anon','private.read_admin_marketing_segments()','EXECUTE') or not has_function_privilege('authenticated','private.read_admin_marketing_segments()','EXECUTE') then raise exception 'RPC ACL changed';end if;
 if has_function_privilege('anon','private.read_admin_marketing_templates(uuid)','EXECUTE') or not has_function_privilege('authenticated','private.read_admin_marketing_templates(uuid)','EXECUTE') then raise exception 'RPC ACL changed';end if;
 if has_function_privilege('anon','private.save_admin_marketing_campaign(uuid,uuid,bigint,text,text,text,text,text,timestamp with time zone)','EXECUTE') or not has_function_privilege('authenticated','private.save_admin_marketing_campaign(uuid,uuid,bigint,text,text,text,text,text,timestamp with time zone)','EXECUTE') then raise exception 'RPC ACL changed';end if;
 if has_function_privilege('anon','private.save_admin_marketing_template(uuid,uuid,bigint,text,jsonb)','EXECUTE') or not has_function_privilege('authenticated','private.save_admin_marketing_template(uuid,uuid,bigint,text,jsonb)','EXECUTE') then raise exception 'RPC ACL changed';end if;
end $verify$;
\echo 'PASS phase4 commerce MFA isolated guard and early validation'
