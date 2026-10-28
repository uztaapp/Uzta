-- Pending authorization. Existing reservation snapshots and RLS stay unchanged.
alter table public.uzta_products add column availability text not null default 'available',add column expected_available_on date;
update public.uzta_products set availability='sold_out' where stock_units=0;
alter table public.uzta_products add constraint uzta_product_availability check(
 availability in ('available','upcoming','sold_out') and
 (availability<>'available' or stock_units>0) and
 (availability<>'sold_out' or stock_units=0) and
 (availability='upcoming' or expected_available_on is null));
-- Non-seasonal availability always follows stock, including the last reserved unit.
create function uzta_private.normalize_availability() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.availability is null or new.availability not in ('available','upcoming','sold_out') then raise exception 'Invalid availability'; end if;
 if new.availability<>'upcoming' then
  new.availability:=case when new.stock_units>0 then 'available' else 'sold_out' end;
  new.expected_available_on:=null;
 end if;
 return new;
end;$$;
revoke all on function uzta_private.normalize_availability() from public,anon,authenticated;
create trigger uzta_product_availability before insert or update of availability,stock_units,expected_available_on on public.uzta_products
 for each row execute function uzta_private.normalize_availability();
-- Only the availability predicate is added to the existing atomic, idempotent RPC.
create or replace function uzta_private.reserve_order(p_id uuid,p_slot uuid,p_items jsonb,p_message text)
returns uuid language plpgsql security definer set search_path='' as $$
declare
 actor uuid := auth.uid();
 existing public.uzta_orders%rowtype;
 slot public.uzta_pickup_slots%rowtype;
 farm public.uzta_producers%rowtype;
 product public.uzta_products%rowtype;
 item record;
 total bigint := 0;
begin
 if actor is null then raise exception 'Authentication required'; end if;
 if p_id is null or p_slot is null then raise exception 'Missing reservation identifier'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into existing from public.uzta_orders where id=p_id;
 if found then
  if existing.customer_id<>actor then raise exception 'Reservation identifier unavailable'; end if;
  return existing.id;
 end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'Invalid items'; end if;
 if jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Invalid number of items'; end if;
 if length(coalesce(p_message,''))>1000 then raise exception 'Message too long'; end if;
 if exists(select 1 from jsonb_to_recordset(p_items) as x(product_id uuid,quantity integer) group by product_id having count(*)>1) then raise exception 'Duplicate product'; end if;
 select * into slot from public.uzta_pickup_slots where id=p_slot for share;
 if not found or not slot.active or slot.starts_at<=now() then raise exception 'Pickup slot unavailable'; end if;
 select * into farm from public.uzta_producers where id=slot.producer_id for share;
 if not found or not farm.active then raise exception 'Producer unavailable'; end if;
 insert into public.uzta_orders(id,customer_id,producer_id,producer_name,pickup_starts_at,pickup_ends_at,message)
 values(p_id,actor,farm.id,farm.name,slot.starts_at,slot.ends_at,coalesce(p_message,''));
 -- A deterministic row order prevents deadlocks between baskets sharing products.
 for item in select * from jsonb_to_recordset(p_items) as x(product_id uuid,quantity integer) order by product_id loop
  if item.product_id is null or item.quantity is null or item.quantity not between 1 and 100000 then raise exception 'Invalid quantity'; end if;
  select * into product from public.uzta_products where id=item.product_id for update;
  if not found or not product.active or product.availability<>'available' or product.producer_id<>farm.id or product.stock_units<item.quantity then raise exception 'Product unavailable'; end if;
  update public.uzta_products set stock_units=stock_units-item.quantity where id=product.id;
  insert into public.uzta_order_items(order_id,product_id,product_name,unit,unit_price_cents,quantity)
  values(p_id,product.id,product.name,product.unit,product.price_cents,item.quantity);
  total:=total+product.price_cents::bigint*item.quantity;
 end loop;
 update public.uzta_orders set total_cents=total where id=p_id;
 return p_id;
end;
$$;
