begin;
alter table public.support_ticket_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_mime_type text,
  add column if not exists attachment_size bigint;
create unique index if not exists support_ticket_messages_attachment_path_uidx
  on public.support_ticket_messages (attachment_path) where attachment_path is not null;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('support-attachments','support-attachments',false,5242880,array['image/jpeg','image/png','image/webp']::text[])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp']::text[];
drop policy if exists "Deny direct support attachment access" on storage.objects;
create policy "Deny direct support attachment access" on storage.objects as restrictive
for all to anon,authenticated using(bucket_id <> 'support-attachments') with check(bucket_id <> 'support-attachments');

create or replace function private.add_support_ticket_attachment_message(
 p_ticket_id text,p_message text,p_access_token text,p_request_id uuid,
 p_attachment_path text,p_attachment_mime_type text,p_attachment_size bigint
) returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
 v_ticket public.support_tickets%rowtype;
 v_existing public.support_ticket_messages%rowtype;
 v_is_admin boolean; v_is_customer boolean;
 v_message text:=btrim(coalesce(p_message,'')); v_sender_role text; v_sender_name text;
 v_message_id bigint; v_created_at timestamptz; v_inserted boolean:=false;
begin
 if p_request_id is null then raise exception 'შეტყობინების მოთხოვნის იდენტიფიკატორი სავალდებულოა.'; end if;
 if length(v_message)>4000 then raise exception 'შეტყობინება მაქსიმუმ 4000 სიმბოლო უნდა იყოს.'; end if;
 if p_attachment_path is null or split_part(p_attachment_path,'/',1) is distinct from p_ticket_id
   or cardinality(string_to_array(p_attachment_path,'/'))<>2
   or split_part(p_attachment_path,'/',2) !~ '^[0-9a-f-]{36}[.](jpg|png|webp)$'
   or p_attachment_mime_type is null
   or p_attachment_mime_type not in ('image/jpeg','image/png','image/webp')
   or p_attachment_size is null
   or p_attachment_size not between 1 and 5242880
   or (p_attachment_mime_type='image/jpeg' and split_part(p_attachment_path,'.',2)<>'jpg')
   or (p_attachment_mime_type='image/png' and split_part(p_attachment_path,'.',2)<>'png')
   or (p_attachment_mime_type='image/webp' and split_part(p_attachment_path,'.',2)<>'webp') then
   raise exception 'ფოტოს მონაცემები არასწორია.';
 end if;
 select t.* into v_ticket from public.support_tickets t where t.id=p_ticket_id for update;
 if not found then raise exception 'მხარდაჭერის მოთხოვნა ვერ მოიძებნა.'; end if;
 v_is_admin:=coalesce(auth.jwt()->'app_metadata'->>'role','')='admin'
   and auth.uid()='1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid;
 v_is_customer:=(v_ticket.customer_user_id is not null and auth.uid()=v_ticket.customer_user_id)
   or (auth.uid() is not null and v_ticket.email is not null and lower(v_ticket.email)=lower(coalesce(auth.jwt()->>'email','')))
   or (coalesce(p_access_token,'') ~ '^[A-Fa-f0-9]{64}$' and v_ticket.access_token_hash is not null
     and v_ticket.access_token_hash=encode(extensions.digest(lower(p_access_token),'sha256'),'hex'));
 if v_is_admin is not true and v_is_customer is not true then raise exception 'მიმოწერაში ფოტოს დამატების უფლება არ გაქვთ.' using errcode='42501'; end if;
 if not exists(select 1 from storage.objects o where o.bucket_id='support-attachments' and o.name=p_attachment_path) then
   raise exception 'ატვირთული ფოტო ვერ მოიძებნა.';
 end if;
 v_sender_role:=case when v_is_admin then 'admin' else 'customer' end;
 v_sender_name:=case when v_is_admin then 'GEOSTORE' else v_ticket.customer_name end;
 insert into public.support_ticket_messages(ticket_id,ticket_ref,sender_role,sender_name,message,request_id,attachment_path,attachment_mime_type,attachment_size)
 values(p_ticket_id,p_ticket_id,v_sender_role,v_sender_name,coalesce(nullif(v_message,''),'📷 ფოტო'),p_request_id,p_attachment_path,p_attachment_mime_type,p_attachment_size)
 on conflict(request_id) where request_id is not null do nothing returning id,created_at into v_message_id,v_created_at;
 v_inserted:=found;
 if not v_inserted then
   select m.* into v_existing from public.support_ticket_messages m where m.request_id=p_request_id;
   if not found or v_existing.ticket_ref is distinct from p_ticket_id or v_existing.sender_role is distinct from v_sender_role
     or v_existing.message is distinct from coalesce(nullif(v_message,''),'📷 ფოტო')
     then
     raise exception 'ეს მოთხოვნის იდენტიფიკატორი უკვე გამოყენებულია სხვა შეტყობინებისთვის.';
   end if;
   v_message_id:=v_existing.id; v_created_at:=v_existing.created_at;
 else
   if v_is_admin then update public.support_tickets set reply=coalesce(nullif(v_message,''),'📷 ფოტო'),status='მუშავდება' where id=p_ticket_id;
   else update public.support_tickets set status='ღია' where id=p_ticket_id; end if;
 end if;
 return jsonb_build_object('message_id',v_message_id,'ticket_id',p_ticket_id,'sender_role',v_sender_role,'created_at',v_created_at,'idempotent_replay',not v_inserted);
end;
$function$;

create or replace function public.add_support_ticket_attachment_message(
 p_ticket_id text,p_message text,p_access_token text,p_request_id uuid,
 p_attachment_path text,p_attachment_mime_type text,p_attachment_size bigint
) returns jsonb language sql set search_path to ''
as $function$ select private.add_support_ticket_attachment_message(p_ticket_id,p_message,p_access_token,p_request_id,p_attachment_path,p_attachment_mime_type,p_attachment_size); $function$;

create or replace function private.get_support_ticket_messages_with_attachments(p_ticket_id text,p_access_token text default null)
returns table(id bigint,sender_role text,sender_name text,message text,created_at timestamptz,attachment_path text,attachment_mime_type text,attachment_size bigint)
language plpgsql security definer set search_path to ''
as $function$
declare v_ticket public.support_tickets%rowtype; v_is_admin boolean; v_is_customer boolean;
begin
 select t.* into v_ticket from public.support_tickets t where t.id=p_ticket_id;
 if not found then raise exception 'მხარდაჭერის მოთხოვნა ვერ მოიძებნა.'; end if;
 v_is_admin:=coalesce(auth.jwt()->'app_metadata'->>'role','')='admin' and auth.uid()='1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid;
 v_is_customer:=(v_ticket.customer_user_id is not null and auth.uid()=v_ticket.customer_user_id)
   or (auth.uid() is not null and v_ticket.email is not null and lower(v_ticket.email)=lower(coalesce(auth.jwt()->>'email','')))
   or (coalesce(p_access_token,'') ~ '^[A-Fa-f0-9]{64}$' and v_ticket.access_token_hash is not null
     and v_ticket.access_token_hash=encode(extensions.digest(lower(p_access_token),'sha256'),'hex'));
 if v_is_admin is not true and v_is_customer is not true then raise exception 'მიმოწერის ნახვის უფლება არ გაქვთ.' using errcode='42501'; end if;
 return query select m.id,m.sender_role,m.sender_name,m.message,m.created_at,m.attachment_path,m.attachment_mime_type,m.attachment_size
 from public.support_ticket_messages m where m.ticket_ref=p_ticket_id order by m.created_at,m.id;
end;
$function$;

create or replace function public.get_support_ticket_messages_with_attachments(p_ticket_id text,p_access_token text default null)
returns table(id bigint,sender_role text,sender_name text,message text,created_at timestamptz,attachment_path text,attachment_mime_type text,attachment_size bigint)
language sql set search_path to ''
as $function$ select * from private.get_support_ticket_messages_with_attachments(p_ticket_id,p_access_token); $function$;

revoke all on function private.add_support_ticket_attachment_message(text,text,text,uuid,text,text,bigint) from public;
grant execute on function private.add_support_ticket_attachment_message(text,text,text,uuid,text,text,bigint) to anon,authenticated;
revoke all on function public.add_support_ticket_attachment_message(text,text,text,uuid,text,text,bigint) from public;
grant execute on function public.add_support_ticket_attachment_message(text,text,text,uuid,text,text,bigint) to anon,authenticated;
revoke all on function private.get_support_ticket_messages_with_attachments(text,text) from public;
grant execute on function private.get_support_ticket_messages_with_attachments(text,text) to anon,authenticated;
revoke all on function public.get_support_ticket_messages_with_attachments(text,text) from public;
grant execute on function public.get_support_ticket_messages_with_attachments(text,text) to anon,authenticated;
commit;