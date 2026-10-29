-- Prepared rollback; never discard an existing cover or uploaded object.
begin;
do $$ begin
 if exists(select 1 from public.uzta_producers where cover_path is not null) or exists(select 1 from storage.objects where bucket_id='uzta-producer-covers') then raise exception 'Preserve existing covers before rollback';end if;
end $$;
drop trigger uzta_cover_reference on public.uzta_producers;
drop function uzta_private.validate_cover();
drop policy uzta_covers_insert_owned on storage.objects;
drop policy uzta_covers_read_owned_or_published on storage.objects;
alter table public.uzta_producers drop column cover_path;
delete from storage.buckets where id='uzta-producer-covers';
commit;
