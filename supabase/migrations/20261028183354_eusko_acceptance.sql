-- Pending authorization. Prices and commission currency remain EUR.
alter table public.uzta_producers add column eusko_notes boolean not null default false,add column eusko_digital boolean not null default false;
alter table public.uzta_orders add column payment_preference text check(payment_preference in ('EUR','EUSKO')),
 add column eusko_notes_accepted boolean not null default false,add column eusko_digital_accepted boolean not null default false,
 add constraint uzta_order_eusko_preference check(payment_preference is distinct from 'EUSKO' or eusko_notes_accepted or eusko_digital_accepted);
-- Existing reservations keep NULL preference: no claim about how they were paid.
create function uzta_private.reserve_order_payment(p_id uuid,p_slot uuid,p_items jsonb,p_message text,p_preference text)
returns uuid language plpgsql security definer set search_path='' as $$
declare prior public.uzta_orders; farm public.uzta_producers; result uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_id is null or p_preference is null or p_preference not in ('EUR','EUSKO') then raise exception 'Invalid preference'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into prior from public.uzta_orders where id=p_id;
 if found then
  if prior.customer_id<>auth.uid() then raise exception 'Reservation identifier unavailable' using errcode='42501'; end if;
  return prior.id;
 end if;
 select p.* into farm from public.uzta_producers p join public.uzta_pickup_slots s on s.producer_id=p.id where s.id=p_slot for share of p;
 if not found then raise exception 'Producer unavailable'; end if;
 if p_preference='EUSKO' and not(farm.eusko_notes or farm.eusko_digital) then raise exception 'Eusko not accepted'; end if;
 result:=uzta_private.reserve_order(p_id,p_slot,p_items,p_message);
 update public.uzta_orders set payment_preference=p_preference,eusko_notes_accepted=farm.eusko_notes,eusko_digital_accepted=farm.eusko_digital where id=result;
 return result;
end;$$;
revoke all on function uzta_private.reserve_order_payment(uuid,uuid,jsonb,text,text) from public,anon;
grant execute on function uzta_private.reserve_order_payment(uuid,uuid,jsonb,text,text) to authenticated;
-- A separate endpoint preserves unambiguous compatibility with existing clients.
create function public.uzta_reserve_order_payment(p_id uuid,p_slot uuid,p_items jsonb,p_message text,p_preference text) returns uuid
language sql security invoker set search_path='' as $$select uzta_private.reserve_order_payment(p_id,p_slot,p_items,p_message,p_preference);$$;
revoke all on function public.uzta_reserve_order_payment(uuid,uuid,jsonb,text,text) from public,anon;
grant execute on function public.uzta_reserve_order_payment(uuid,uuid,jsonb,text,text) to authenticated;
-- Reuse the protected administrator allowlist prepared by the commissions migration.
create function uzta_private.eusko_adoption() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not uzta_private.commission_is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 return(select jsonb_build_object('total',count(*)filter(where eusko_notes or eusko_digital),'notes',count(*)filter(where eusko_notes),'digital',count(*)filter(where eusko_digital)) from public.uzta_producers);
end;$$;
revoke all on function uzta_private.eusko_adoption() from public,anon;
grant execute on function uzta_private.eusko_adoption() to authenticated;
create function public.uzta_eusko_adoption() returns jsonb language sql stable security invoker set search_path='' as $$select uzta_private.eusko_adoption();$$;
revoke all on function public.uzta_eusko_adoption() from public,anon;
grant execute on function public.uzta_eusko_adoption() to authenticated;
