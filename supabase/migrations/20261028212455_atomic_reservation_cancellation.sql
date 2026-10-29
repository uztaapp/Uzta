-- Pending production authorization. No historical status, stock or price is changed.
alter table public.uzta_orders drop constraint uzta_orders_status_check;
alter table public.uzta_orders add constraint uzta_orders_status_check check(status in ('Pendiente','Completado','Cancelado')),
 add column cancelled_at timestamptz,add column cancelled_by uuid references auth.users(id),
 add constraint uzta_cancel_trace check((status='Cancelado' and cancelled_at is not null and cancelled_by is not null) or (status<>'Cancelado' and cancelled_at is null and cancelled_by is null));
create function uzta_private.cancel_order(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare o public.uzta_orders;owner uuid;item record;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select * into o from public.uzta_orders where id=p_id for update;
 if not found then raise exception 'Reservation unavailable' using errcode='42501';end if;
 select owner_id into owner from public.uzta_producers where id=o.producer_id for share;
 if auth.uid() is distinct from o.customer_id and auth.uid() is distinct from owner then raise exception 'Reservation unavailable' using errcode='42501';end if;
 if o.status='Cancelado' then return;end if;
 if o.status<>'Pendiente' then raise exception 'Completed reservation cannot be cancelled';end if;
 if auth.uid() is distinct from owner and o.pickup_starts_at<=now() then raise exception 'Buyer cancellation deadline passed';end if;
 -- Same deterministic product lock order as reserve_order. Never silently truncate stock.
 for item in select product_id,quantity from public.uzta_order_items where order_id=o.id order by product_id loop
  perform id from public.uzta_products where id=item.product_id for update;
  if not found then raise exception 'Inventory item unavailable';end if;
  update public.uzta_products set stock_units=stock_units+item.quantity where id=item.product_id;
 end loop;
 update public.uzta_orders set status='Cancelado',cancelled_at=now(),cancelled_by=auth.uid() where id=o.id;
end;$$;
revoke all on function uzta_private.cancel_order(uuid) from public,anon;
grant execute on function uzta_private.cancel_order(uuid) to authenticated;
create function public.uzta_cancel_order(p_id uuid) returns void language sql security invoker set search_path='' as $$select uzta_private.cancel_order(p_id);$$;
revoke all on function public.uzta_cancel_order(uuid) from public,anon;
grant execute on function public.uzta_cancel_order(uuid) to authenticated;
-- Completion and cancellation serialize on the same order; a cancelled order cannot complete.
create or replace function uzta_private.complete_order(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare o public.uzta_orders;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select * into o from public.uzta_orders where id=p_id for update;
 if not found or not exists(select 1 from public.uzta_producers p where p.id=o.producer_id and p.owner_id=auth.uid()) then raise exception 'Reservation unavailable' using errcode='42501';end if;
 if o.status='Completado' then return;end if;
 if o.status<>'Pendiente' then raise exception 'Cancelled reservation cannot complete';end if;
 update public.uzta_orders set status='Completado' where id=o.id;
end;$$;
