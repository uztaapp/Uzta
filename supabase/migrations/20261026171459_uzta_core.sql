-- UZTA independent core. No accounts, credentials, examples, jobs or remote endpoints.
-- The web app remains offline until a separate local adapter is implemented.
create schema if not exists uzta_private;
revoke all on schema uzta_private from public;
grant usage on schema uzta_private to authenticated;

create table public.uzta_profiles (
 user_id uuid primary key references auth.users(id),
 display_name text not null check (length(trim(display_name)) between 1 and 100),
 location text not null default '' check (length(location) <= 200),
 language text not null default 'es' check (language = 'es'),
 created_at timestamptz not null default now()
);
create table public.uzta_producers (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 name text not null check (length(trim(name)) between 1 and 100),
 location text not null check (length(trim(location)) between 1 and 200),
 description text not null default '' check (length(description) <= 2000),
 ecological boolean not null default false,
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create index uzta_producers_owner_idx on public.uzta_producers(owner_id);
create table public.uzta_products (
 id uuid primary key default gen_random_uuid(),
 producer_id uuid not null references public.uzta_producers(id),
 name text not null check (length(trim(name)) between 1 and 100),
 price_cents integer not null check (price_cents between 1 and 1000000),
 unit text not null check (unit in ('kg','docena','unidad')),
 category text not null check (category in ('Verduras','Frutas','Huevos','Lácteos','Miel','Otros')),
 stock_units integer not null default 0 check (stock_units between 0 and 100000),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create index uzta_products_producer_idx on public.uzta_products(producer_id);
create table public.uzta_pickup_slots (
 id uuid primary key default gen_random_uuid(),
 producer_id uuid not null references public.uzta_producers(id),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 active boolean not null default true,
 check (ends_at > starts_at)
);
create index uzta_slots_producer_start_idx on public.uzta_pickup_slots(producer_id, starts_at);
create table public.uzta_orders (
 id uuid primary key,
 customer_id uuid not null references auth.users(id),
 producer_id uuid not null references public.uzta_producers(id),
 producer_name text not null,
 pickup_starts_at timestamptz not null,
 pickup_ends_at timestamptz not null,
 message text not null default '' check (length(message) <= 1000),
 status text not null default 'Pendiente' check (status in ('Pendiente','Completado')),
 total_cents bigint not null default 0 check (total_cents >= 0),
 created_at timestamptz not null default now(),
 check (pickup_ends_at > pickup_starts_at)
);
create index uzta_orders_customer_created_idx on public.uzta_orders(customer_id, created_at desc);
create index uzta_orders_producer_created_idx on public.uzta_orders(producer_id, created_at desc);
create table public.uzta_order_items (
 order_id uuid not null references public.uzta_orders(id),
 product_id uuid not null references public.uzta_products(id),
 product_name text not null,
 unit text not null,
 unit_price_cents integer not null check (unit_price_cents > 0),
 quantity integer not null check (quantity between 1 and 100000),
 line_cents bigint generated always as (unit_price_cents::bigint * quantity) stored,
 primary key (order_id,product_id)
);
create index uzta_order_items_product_idx on public.uzta_order_items(product_id);
create table public.uzta_favorites (
 user_id uuid not null references auth.users(id),
 product_id uuid not null references public.uzta_products(id),
 primary key(user_id,product_id)
);
create index uzta_favorites_product_idx on public.uzta_favorites(product_id);

alter table public.uzta_profiles enable row level security;
alter table public.uzta_producers enable row level security;
alter table public.uzta_products enable row level security;
alter table public.uzta_pickup_slots enable row level security;
alter table public.uzta_orders enable row level security;
alter table public.uzta_order_items enable row level security;
alter table public.uzta_favorites enable row level security;

revoke all on public.uzta_profiles, public.uzta_producers, public.uzta_products,
 public.uzta_pickup_slots, public.uzta_orders, public.uzta_order_items,
 public.uzta_favorites from public, anon, authenticated;
grant select,insert,update on public.uzta_profiles to authenticated;
grant select,insert,update on public.uzta_producers, public.uzta_products, public.uzta_pickup_slots to authenticated;
grant select on public.uzta_producers, public.uzta_products, public.uzta_pickup_slots to anon;
grant select on public.uzta_orders, public.uzta_order_items to authenticated;
grant select,insert,delete on public.uzta_favorites to authenticated;

create policy uzta_profiles_read on public.uzta_profiles for select to authenticated using (user_id=(select auth.uid()));
create policy uzta_profiles_insert on public.uzta_profiles for insert to authenticated with check (user_id=(select auth.uid()));
create policy uzta_profiles_update on public.uzta_profiles for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy uzta_producers_read on public.uzta_producers for select to anon, authenticated using (active or owner_id=(select auth.uid()));
create policy uzta_producers_insert on public.uzta_producers for insert to authenticated with check (owner_id=(select auth.uid()));
create policy uzta_producers_update on public.uzta_producers for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy uzta_products_read on public.uzta_products for select to anon, authenticated using (exists(select 1 from public.uzta_producers p where p.id=producer_id and ((p.active and uzta_products.active) or p.owner_id=(select auth.uid()))));
create policy uzta_products_insert on public.uzta_products for insert to authenticated with check (exists(select 1 from public.uzta_producers p where p.id=producer_id and p.owner_id=(select auth.uid())));
create policy uzta_products_update on public.uzta_products for update to authenticated using (exists(select 1 from public.uzta_producers p where p.id=producer_id and p.owner_id=(select auth.uid()))) with check (exists(select 1 from public.uzta_producers p where p.id=producer_id and p.owner_id=(select auth.uid())));
create policy uzta_slots_read on public.uzta_pickup_slots for select to anon, authenticated using (exists(select 1 from public.uzta_producers p where p.id=producer_id and ((p.active and uzta_pickup_slots.active and starts_at>now()) or p.owner_id=(select auth.uid()))));
create policy uzta_slots_insert on public.uzta_pickup_slots for insert to authenticated with check (exists(select 1 from public.uzta_producers p where p.id=producer_id and p.owner_id=(select auth.uid())));
create policy uzta_slots_update on public.uzta_pickup_slots for update to authenticated using (exists(select 1 from public.uzta_producers p where p.id=producer_id and p.owner_id=(select auth.uid()))) with check (exists(select 1 from public.uzta_producers p where p.id=producer_id and p.owner_id=(select auth.uid())));
create policy uzta_orders_read on public.uzta_orders for select to authenticated using (customer_id=(select auth.uid()) or exists(select 1 from public.uzta_producers p where p.id=producer_id and p.owner_id=(select auth.uid())));
create policy uzta_items_read on public.uzta_order_items for select to authenticated using (exists(select 1 from public.uzta_orders o where o.id=order_id));
create policy uzta_favorites_read on public.uzta_favorites for select to authenticated using (user_id=(select auth.uid()));
create policy uzta_favorites_insert on public.uzta_favorites for insert to authenticated with check (user_id=(select auth.uid()));
create policy uzta_favorites_delete on public.uzta_favorites for delete to authenticated using (user_id=(select auth.uid()));

-- Inventory and order writes must be atomic. The definer implementation is private,
-- checks auth.uid(), fixes search_path, and accepts no client prices or owner IDs.
create function uzta_private.reserve_order(p_id uuid,p_slot uuid,p_items jsonb,p_message text)
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
  if not found or not product.active or product.producer_id<>farm.id or product.stock_units<item.quantity then raise exception 'Product unavailable'; end if;
  update public.uzta_products set stock_units=stock_units-item.quantity where id=product.id;
  insert into public.uzta_order_items(order_id,product_id,product_name,unit,unit_price_cents,quantity)
  values(p_id,product.id,product.name,product.unit,product.price_cents,item.quantity);
  total:=total+product.price_cents::bigint*item.quantity;
 end loop;
 update public.uzta_orders set total_cents=total where id=p_id;
 return p_id;
end;
$$;
revoke all on function uzta_private.reserve_order(uuid,uuid,jsonb,text) from public,anon;
grant execute on function uzta_private.reserve_order(uuid,uuid,jsonb,text) to authenticated;
create function public.uzta_reserve_order(p_id uuid,p_slot uuid,p_items jsonb,p_message text default '')
returns uuid language sql security invoker set search_path='' as $$select uzta_private.reserve_order(p_id,p_slot,p_items,p_message);$$;
revoke all on function public.uzta_reserve_order(uuid,uuid,jsonb,text) from public,anon;
grant execute on function public.uzta_reserve_order(uuid,uuid,jsonb,text) to authenticated;

create function uzta_private.complete_order(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 update public.uzta_orders o set status='Completado'
 where o.id=p_id and exists(select 1 from public.uzta_producers p where p.id=o.producer_id and p.owner_id=auth.uid());
 if not found then raise exception 'Reservation unavailable'; end if;
end;
$$;
revoke all on function uzta_private.complete_order(uuid) from public,anon;
grant execute on function uzta_private.complete_order(uuid) to authenticated;
create function public.uzta_complete_order(p_id uuid) returns void
language sql security invoker set search_path='' as $$select uzta_private.complete_order(p_id);$$;
revoke all on function public.uzta_complete_order(uuid) from public,anon;
grant execute on function public.uzta_complete_order(uuid) to authenticated;
