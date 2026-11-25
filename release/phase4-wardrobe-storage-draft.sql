-- 4AF: unapplied private wardrobe photo storage candidate.
-- Provision the private bucket via the Storage API before applying these policies.
-- Do not create or modify storage.objects rows directly on a hosted instance.
-- Required bucket: customer-wardrobe-private, public=false, file_size_limit=5242880,
-- allowed_mime_types=['image/jpeg','image/png','image/webp','image/gif'].
-- Fail closed if provisioning is missing or unsafe.
do $$ begin
 if not exists(select 1 from storage.buckets
   where id='customer-wardrobe-private' and public is false
     and file_size_limit=5242880
     and allowed_mime_types @> array['image/jpeg','image/png','image/webp','image/gif']::text[]
     and allowed_mime_types <@ array['image/jpeg','image/png','image/webp','image/gif']::text[])
 then raise exception 'Private wardrobe bucket not provisioned safely';end if;
end $$;
-- Restrictive boundary prevents unrelated permissive policies from widening
-- access to the new bucket. Other buckets remain unaffected.
create policy "Wardrobe private owner boundary" on storage.objects
 as restrictive for all to public
 using (bucket_id <> 'customer-wardrobe-private' or (
   (select auth.uid()) is not null
   and coalesce((select auth.jwt())->>'is_anonymous','false') <> 'true'
   and split_part(name,'/',1)=(select auth.uid())::text
   and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|png|webp|gif)$'
 ))
 with check (bucket_id <> 'customer-wardrobe-private' or (
   (select auth.uid()) is not null
   and coalesce((select auth.jwt())->>'is_anonymous','false') <> 'true'
   and split_part(name,'/',1)=(select auth.uid())::text
   and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}[.](jpg|png|webp|gif)$'
 ));
create policy "Wardrobe owner download" on storage.objects
 for select to authenticated using (
   bucket_id='customer-wardrobe-private' and split_part(name,'/',1)=(select auth.uid())::text
 );
create policy "Wardrobe owner upload" on storage.objects
 for insert to authenticated with check (
   bucket_id='customer-wardrobe-private' and split_part(name,'/',1)=(select auth.uid())::text
 );
-- No overwrite, move or delete granted by this draft. Need a separate
-- reference-aware deletion and quota lifecycle before rollout.
create policy "Wardrobe immutable update boundary" on storage.objects
 as restrictive for update to public
 using (bucket_id <> 'customer-wardrobe-private')
 with check (bucket_id <> 'customer-wardrobe-private');
create policy "Wardrobe immutable delete boundary" on storage.objects
 as restrictive for delete to public using (bucket_id <> 'customer-wardrobe-private');
