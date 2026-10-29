-- Prepared only: requires separate authorization before production application.
-- Reuses producers and private Supabase Storage; no products/orders are changed.
alter table public.uzta_producers add column cover_path text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('uzta-producer-covers','uzta-producer-covers',false,500000,array['image/webp']) on conflict(id) do nothing;
do $$ begin
 if not exists(select 1 from storage.buckets where id='uzta-producer-covers' and not public and file_size_limit=500000 and allowed_mime_types=array['image/webp']) then raise exception 'Cover bucket settings do not match';end if;
 if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='storage' and c.relname='objects' and c.relrowsecurity) then raise exception 'Storage RLS must be enabled';end if;
end $$;
create policy uzta_covers_insert_owned on storage.objects for insert to authenticated
with check(bucket_id='uzta-producer-covers'
 and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
 and split_part(name,'/',1)=(select auth.uid())::text
 and split_part(name,'/',2)=split_part(name,'/',3)
 and split_part(name,'/',4) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'
 and exists(select 1 from public.uzta_producers p where p.id::text=split_part(storage.objects.name,'/',2) and p.owner_id=(select auth.uid())));
create policy uzta_covers_read_owned_or_published on storage.objects for select to anon,authenticated
using(bucket_id='uzta-producer-covers' and (
 (split_part(name,'/',1)=(select auth.uid())::text and exists(select 1 from public.uzta_producers p where p.id::text=split_part(storage.objects.name,'/',2) and p.owner_id=(select auth.uid())))
 or exists(select 1 from public.uzta_producers p where p.cover_path=storage.objects.name and p.active)
));
-- Immutable objects: replacement uses a new name; removal clears the reference.
create function uzta_private.validate_cover() returns trigger language plpgsql set search_path='' as $$
begin
 if new.cover_path is null then return new;end if;
 if new.owner_id is distinct from auth.uid()
 or new.cover_path not like new.owner_id::text||'/'||new.id::text||'/'||new.id::text||'/%'
 or new.cover_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
 or split_part(new.cover_path,'/',4) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'
 or not exists(select 1 from storage.objects o where o.bucket_id='uzta-producer-covers' and o.name=new.cover_path)
 then raise exception 'Invalid producer cover' using errcode='42501';end if;
 return new;
end;$$;
revoke all on function uzta_private.validate_cover() from public,anon,authenticated;
create trigger uzta_cover_reference before insert or update of cover_path,owner_id,id on public.uzta_producers for each row execute function uzta_private.validate_cover();
