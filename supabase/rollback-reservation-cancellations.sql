-- Never discard cancellation traces. Disable cancellationsReady first.
begin;
do $$begin if exists(select 1 from public.uzta_orders where status='Cancelado') then raise exception 'Export and retain cancellation history before rollback';end if;end;$$;
drop function public.uzta_cancel_order(uuid);
drop function uzta_private.cancel_order(uuid);
alter table public.uzta_orders drop constraint uzta_cancel_trace,drop constraint uzta_orders_status_check,drop column cancelled_at,drop column cancelled_by;
alter table public.uzta_orders add constraint uzta_orders_status_check check(status in ('Pendiente','Completado'));
create or replace function uzta_private.complete_order(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 update public.uzta_orders o set status='Completado'
 where o.id=p_id and exists(select 1 from public.uzta_producers p where p.id=o.producer_id and p.owner_id=auth.uid());
 if not found then raise exception 'Reservation unavailable'; end if;
end;
$$;

commit;
