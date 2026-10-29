-- PREPARED ONLY. Apply with separate authorization after reviewing existing owners/admins.
create table public.uzta_producer_applications(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
 applicant_name text not null,activity_name text not null check(length(trim(activity_name)) between 1 and 100),
 locality text not null check(length(trim(locality)) between 1 and 200),production_type text not null check(length(trim(production_type)) between 1 and 100),
 description text not null check(length(trim(description)) between 1 and 2000),
 status text not null default 'pending' check(status in ('pending','approved','rejected','revoked')),
 created_at timestamptz not null default now(),decided_at timestamptz,decided_by uuid references auth.users(id),reason text not null default '' check(length(reason)<=300),legacy boolean not null default false
);
create unique index uzta_one_producer_application on public.uzta_producer_applications(user_id) where status in ('pending','approved','revoked');
create index uzta_producer_application_status on public.uzta_producer_applications(status,created_at);
alter table public.uzta_producer_applications enable row level security;
revoke all on public.uzta_producer_applications from public,anon,authenticated;
grant select on public.uzta_producer_applications to authenticated;
create policy uzta_application_read on public.uzta_producer_applications for select to authenticated using(user_id=(select auth.uid()) or (select uzta_private.commission_is_admin()));
-- Existing producer accounts retain access; shops/products/orders are not rewritten.
insert into public.uzta_producer_applications(user_id,applicant_name,activity_name,locality,production_type,description,status,decided_at,legacy)
select distinct on(p.owner_id) p.owner_id,coalesce(nullif(pr.display_name,''),p.name),p.name,p.location,'Existente',p.description||case when p.description='' then 'Productor existente' else '' end,'approved',now(),true
from public.uzta_producers p left join public.uzta_profiles pr on pr.user_id=p.owner_id order by p.owner_id,p.created_at;
create function uzta_private.producer_approved(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$select p_user is not null and exists(select 1 from public.uzta_producer_applications where user_id=p_user and status='approved');$$;
revoke all on function uzta_private.producer_approved(uuid) from public;
grant usage on schema uzta_private to anon;
grant execute on function uzta_private.producer_approved(uuid) to anon,authenticated;
create function uzta_private.producer_access() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('approved',uzta_private.producer_approved(auth.uid()),'admin',case when auth.uid() is null then false else uzta_private.commission_is_admin() end,'status',(select status from public.uzta_producer_applications where user_id=auth.uid() order by created_at desc,id desc limit 1));$$;
revoke all on function uzta_private.producer_access() from public,anon;grant execute on function uzta_private.producer_access() to authenticated;
create function public.uzta_producer_access() returns jsonb language sql stable security invoker set search_path='' as $$select uzta_private.producer_access();$$;
revoke all on function public.uzta_producer_access() from public,anon;grant execute on function public.uzta_producer_access() to authenticated;
create function uzta_private.request_producer(p_activity text,p_locality text,p_type text,p_description text) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();newid uuid;
begin
 if actor is null then raise exception 'Authentication required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,3));
 if exists(select 1 from public.uzta_producer_applications where user_id=actor and status in ('pending','approved','revoked')) then raise exception 'Application already active';end if;
 if p_activity is null or p_locality is null or p_type is null or p_description is null then raise exception 'Missing application fields';end if;
 insert into public.uzta_producer_applications(user_id,applicant_name,activity_name,locality,production_type,description)
 values(actor,coalesce((select display_name from public.uzta_profiles where user_id=actor),'Cuenta'),trim(p_activity),trim(p_locality),trim(p_type),trim(p_description)) returning id into newid;return newid;
end;$$;
revoke all on function uzta_private.request_producer(text,text,text,text) from public,anon;grant execute on function uzta_private.request_producer(text,text,text,text) to authenticated;
create function public.uzta_request_producer(p_activity text,p_locality text,p_type text,p_description text) returns uuid language sql security invoker set search_path='' as $$select uzta_private.request_producer(p_activity,p_locality,p_type,p_description);$$;
revoke all on function public.uzta_request_producer(text,text,text,text) from public,anon;grant execute on function public.uzta_request_producer(text,text,text,text) to authenticated;
create function uzta_private.review_producer(p_id uuid,p_action text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare r public.uzta_producer_applications;
begin
 if not uzta_private.commission_is_admin() then raise exception 'Admin required' using errcode='42501';end if;
 select * into r from public.uzta_producer_applications where id=p_id for update;
 if not found then raise exception 'Application unavailable';end if;
 if not ((p_action in ('approved','rejected') and r.status='pending') or (p_action='revoked' and r.status='approved') or (p_action='approved' and r.status='revoked')) then raise exception 'Invalid transition';end if;
 update public.uzta_producer_applications set status=p_action,decided_at=now(),decided_by=auth.uid(),reason=coalesce(p_reason,'') where id=p_id;
end;$$;
revoke all on function uzta_private.review_producer(uuid,text,text) from public,anon;grant execute on function uzta_private.review_producer(uuid,text,text) to authenticated;
create function public.uzta_review_producer(p_id uuid,p_action text,p_reason text default '') returns void language sql security invoker set search_path='' as $$select uzta_private.review_producer(p_id,p_action,p_reason);$$;
revoke all on function public.uzta_review_producer(uuid,text,text) from public,anon;grant execute on function public.uzta_review_producer(uuid,text,text) to authenticated;
create policy uzta_producers_approved_insert on public.uzta_producers as restrictive for insert to authenticated with check ((select uzta_private.producer_approved(auth.uid())));
create policy uzta_producers_approved_update on public.uzta_producers as restrictive for update to authenticated using ((select uzta_private.producer_approved(auth.uid()))) with check ((select uzta_private.producer_approved(auth.uid())));
create policy uzta_products_approved_insert on public.uzta_products as restrictive for insert to authenticated with check ((select uzta_private.producer_approved(auth.uid())));
create policy uzta_products_approved_update on public.uzta_products as restrictive for update to authenticated using ((select uzta_private.producer_approved(auth.uid()))) with check ((select uzta_private.producer_approved(auth.uid())));
create policy uzta_pickup_slots_approved_insert on public.uzta_pickup_slots as restrictive for insert to authenticated with check ((select uzta_private.producer_approved(auth.uid())));
create policy uzta_pickup_slots_approved_update on public.uzta_pickup_slots as restrictive for update to authenticated using ((select uzta_private.producer_approved(auth.uid()))) with check ((select uzta_private.producer_approved(auth.uid())));
create policy uzta_producer_public_approval on public.uzta_producers as restrictive for select to anon,authenticated using(owner_id=(select auth.uid()) or uzta_private.producer_approved(owner_id));
create policy uzta_product_public_approval on public.uzta_products as restrictive for select to anon,authenticated using(exists(select 1 from public.uzta_producers p where p.id=producer_id and (p.owner_id=(select auth.uid()) or uzta_private.producer_approved(p.owner_id))));
create policy uzta_slot_public_approval on public.uzta_pickup_slots as restrictive for select to anon,authenticated using(exists(select 1 from public.uzta_producers p where p.id=producer_id and (p.owner_id=(select auth.uid()) or uzta_private.producer_approved(p.owner_id))));
create policy uzta_order_producer_approval on public.uzta_orders as restrictive for select to authenticated using(customer_id=(select auth.uid()) or ((select uzta_private.producer_approved(auth.uid())) and exists(select 1 from public.uzta_producers p where p.id=producer_id and p.owner_id=(select auth.uid()))));
create policy uzta_storage_approved_insert on storage.objects as restrictive for insert to authenticated with check(bucket_id not in ('uzta-product-photos','uzta-producer-covers') or (select uzta_private.producer_approved(auth.uid())));
create policy uzta_storage_public_approval on storage.objects as restrictive for select to anon,authenticated using(bucket_id not in ('uzta-product-photos','uzta-producer-covers') or split_part(name,'/',1)=coalesce((select auth.uid())::text,'') or exists(select 1 from public.uzta_producers p where p.id::text=split_part(storage.objects.name,'/',2) and uzta_private.producer_approved(p.owner_id)));
-- Definer RPCs remain unchanged: authorization is enforced inside their transaction.
create function uzta_private.guard_order_producer() returns trigger language plpgsql security definer set search_path='' as $$
declare owner uuid;
begin
 select owner_id into owner from public.uzta_producers where id=new.producer_id;
 if not uzta_private.producer_approved(owner) and (tg_op='INSERT' or (new.status is distinct from old.status and (new.status='Completado' or new.customer_id is distinct from auth.uid()))) then raise exception 'Producer access unavailable' using errcode='42501';end if;
 return new;
end;$$;
revoke all on function uzta_private.guard_order_producer() from public,anon,authenticated;
create trigger uzta_order_producer_guard before insert or update on public.uzta_orders for each row execute function uzta_private.guard_order_producer();
