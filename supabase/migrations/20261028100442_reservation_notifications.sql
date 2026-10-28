-- No backfill. Notifications commit or roll back with the existing order operation.
create table public.uzta_notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id),
 order_id uuid not null references public.uzta_orders(id) on delete cascade,
 kind text not null check (kind in ('new_reservation','registered','confirmed','prepared','cancelled','completed')),
 audience text not null check (audience in ('buyer','seller')),
 created_at timestamptz not null default now(),
 read_at timestamptz,
 unique(order_id,recipient_id,kind)
);
create index uzta_notifications_unread on public.uzta_notifications(recipient_id,created_at desc,id) where read_at is null;
alter table public.uzta_notifications enable row level security;
revoke all on public.uzta_notifications from anon,authenticated;
grant select on public.uzta_notifications to authenticated;
create policy uzta_notifications_read_own on public.uzta_notifications for select to authenticated
 using (recipient_id=(select auth.uid()));

-- Private trigger function: clients cannot create notifications or select a recipient.
create function uzta_private.notify_order_change() returns trigger language plpgsql security definer set search_path='' as $$
declare seller uuid; event text;
begin
 select owner_id into seller from public.uzta_producers where id=new.producer_id;
 if tg_op='INSERT' then
  insert into public.uzta_notifications(recipient_id,order_id,kind,audience) values
   (seller,new.id,'new_reservation','seller'),(new.customer_id,new.id,'registered','buyer') on conflict do nothing;
 elsif old.status is distinct from new.status then
  event := case new.status
   when 'Completado' then 'completed' when 'Completada' then 'completed'
   when 'Confirmado' then 'confirmed' when 'Confirmada' then 'confirmed'
   when 'Preparado' then 'prepared' when 'Preparada' then 'prepared'
   when 'Cancelado' then 'cancelled' when 'Cancelada' then 'cancelled' else null end;
  if event is not null then
   insert into public.uzta_notifications(recipient_id,order_id,kind,audience)
    values(new.customer_id,new.id,event,'buyer') on conflict do nothing;
   if seller <> new.customer_id then
    insert into public.uzta_notifications(recipient_id,order_id,kind,audience)
     values(seller,new.id,event,'seller') on conflict do nothing;
   end if;
  end if;
 end if;
 return new;
end;
$$;
revoke all on function uzta_private.notify_order_change() from public,anon,authenticated;
create trigger uzta_order_notifications after insert or update of status on public.uzta_orders
 for each row execute function uzta_private.notify_order_change();

create function uzta_private.read_notification(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 update public.uzta_notifications set read_at=coalesce(read_at,now()) where id=p_id and recipient_id=auth.uid();
 if not found then raise exception 'Notification unavailable' using errcode='42501'; end if;
end;
$$;
revoke all on function uzta_private.read_notification(uuid) from public,anon;
grant execute on function uzta_private.read_notification(uuid) to authenticated;
create function public.uzta_read_notification(p_id uuid) returns void language sql security invoker set search_path='' as $$select uzta_private.read_notification(p_id);$$;
revoke all on function public.uzta_read_notification(uuid) from public,anon;
grant execute on function public.uzta_read_notification(uuid) to authenticated;
-- Existing order status constraints, stock functions and order RLS are unchanged.
