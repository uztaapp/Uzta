-- UZTA only. Private immutable image objects; no removal jobs or privileged keys.
alter table public.uzta_products add column photo_path text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('uzta-product-photos','uzta-product-photos',false,500000,array['image/webp'])
 on conflict(id) do nothing;
do $$ begin
 if not exists(select 1 from storage.buckets where id='uzta-product-photos' and not public and file_size_limit=500000 and allowed_mime_types=array['image/webp']) then
  raise exception 'UZTA photo bucket settings do not match; no existing bucket will be changed';
 end if;
 if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='storage' and c.relname='objects' and c.relrowsecurity) then
  raise exception 'Storage objects must already have RLS enabled';
 end if;
end $$;

create policy uzta_photos_insert_owned on storage.objects for insert to authenticated
 with check (bucket_id='uzta-product-photos'
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
 and split_part(name,'/',1)=(select auth.uid())::text
 and split_part(name,'/',4) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'
 and exists(select 1 from public.uzta_producers p where p.id::text=split_part(storage.objects.name,'/',2) and p.owner_id=(select auth.uid())));

create policy uzta_photos_read_owned_or_published on storage.objects for select to anon,authenticated
 using(bucket_id='uzta-product-photos' and (
  (split_part(name,'/',1)=(select auth.uid())::text and exists(select 1 from public.uzta_producers p where p.id::text=split_part(storage.objects.name,'/',2) and p.owner_id=(select auth.uid())))
  or exists(select 1 from public.uzta_products i join public.uzta_producers p on p.id=i.producer_id where i.photo_path=storage.objects.name and i.active and p.active)
 ));
-- Deliberately no UPDATE or DELETE policies. Replacements use fresh random names.
create function uzta_private.validate_product_photo() returns trigger language plpgsql
 set search_path='' as $$
declare owner uuid;
begin
 if new.photo_path is null then return new; end if;
 select p.owner_id into owner from public.uzta_producers p where p.id=new.producer_id;
 if owner is distinct from auth.uid() or owner is null
 or new.photo_path not like owner::text||'/'||new.producer_id::text||'/'||new.id::text||'/%'
 or new.photo_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
 or split_part(new.photo_path,'/',4) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'
 or not exists(select 1 from storage.objects o where o.bucket_id='uzta-product-photos' and o.name=new.photo_path)
 then raise exception 'Invalid product photograph' using errcode='42501'; end if;
 return new;
end $$;
create trigger uzta_product_photo_reference before insert or update of photo_path,producer_id,id
 on public.uzta_products for each row execute function uzta_private.validate_product_photo();
revoke all on function uzta_private.validate_product_photo() from public,anon,authenticated;
