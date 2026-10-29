-- UZTA only, authorized producer avatar. No existing cover or product changes.
alter table public.uzta_producers add column avatar_path text;
create policy uzta_avatar_read_published on storage.objects for select to anon,authenticated using(bucket_id='uzta-producer-covers' and exists(select 1 from public.uzta_producers p where p.avatar_path=storage.objects.name and p.active));
create function uzta_private.validate_avatar() returns trigger language plpgsql set search_path='' as $$
begin
 if new.avatar_path is null then return new;end if;
 if new.owner_id is distinct from auth.uid()
 or new.avatar_path not like new.owner_id::text||'/'||new.id::text||'/'||new.id::text||'/%'
 or new.avatar_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
 or split_part(new.avatar_path,'/',4) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'
 or not exists(select 1 from storage.objects o where o.bucket_id='uzta-producer-covers' and o.name=new.avatar_path)
 then raise exception 'Invalid producer cover' using errcode='42501';end if;
 return new;
end;$$;
revoke all on function uzta_private.validate_avatar() from public,anon,authenticated;
create trigger uzta_avatar_reference before insert or update of avatar_path,owner_id,id on public.uzta_producers for each row execute function uzta_private.validate_avatar();
