-- Pending authorization. No backfill, no payments and no invoices.
create table if not exists uzta_private.commission_admins(user_id uuid primary key references auth.users(id));
create table uzta_private.commission_config(singleton boolean primary key default true check(singleton),rate_bps integer not null default 0 check(rate_bps between 0 and 10000),commercial_reviewed boolean not null default false);
insert into uzta_private.commission_config values(true,0,false);
create table uzta_private.commission_rates(id uuid primary key default gen_random_uuid(),rate_bps integer not null,actor_id uuid not null references auth.users(id),created_at timestamptz not null default now());
revoke all on uzta_private.commission_admins,uzta_private.commission_config,uzta_private.commission_rates from public,anon,authenticated;
alter table uzta_private.commission_admins enable row level security;
alter table uzta_private.commission_config enable row level security;
alter table uzta_private.commission_rates enable row level security;
create or replace function uzta_private.commission_is_admin() returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and exists(select 1 from uzta_private.commission_admins where user_id=auth.uid());$$;
revoke all on function uzta_private.commission_is_admin() from public,anon;
grant execute on function uzta_private.commission_is_admin() to authenticated;
create or replace function public.uzta_commission_access() returns boolean language sql stable security invoker set search_path='' as $$select uzta_private.commission_is_admin();$$;
revoke all on function public.uzta_commission_access() from public,anon;
grant execute on function public.uzta_commission_access() to authenticated;

create table public.uzta_sales(
 id uuid primary key default gen_random_uuid(),order_id uuid not null unique references public.uzta_orders(id) on delete restrict,
 seller_id uuid not null references auth.users(id),producer_id uuid not null references public.uzta_producers(id),
 completed_at timestamptz not null default now(),gross_cents bigint not null check(gross_cents>=0),currency text not null default 'EUR' check(currency='EUR'),
 rate_bps integer not null check(rate_bps between 0 and 10000),commission_cents bigint not null check(commission_cents>=0 and commission_cents<=gross_cents),
 seller_net_cents bigint not null check(seller_net_cents=gross_cents-commission_cents),declared_at timestamptz
);
create index uzta_sales_seller_date on public.uzta_sales(seller_id,completed_at desc);
create table public.uzta_commission_events(
 id uuid primary key, sale_id uuid not null references public.uzta_sales(id) on delete restrict,
 kind text not null check(kind in ('collect','adjust','void')),amount_cents bigint not null,
 reference text not null default '' check(char_length(reference)<=300),actor_id uuid references auth.users(id),created_at timestamptz not null default now(),
 check((kind='collect' and amount_cents>0) or (kind='adjust' and amount_cents<>0) or (kind='void' and amount_cents=0))
);
create index uzta_commission_events_sale on public.uzta_commission_events(sale_id,created_at);
create unique index uzta_commission_one_void on public.uzta_commission_events(sale_id) where kind='void';
alter table public.uzta_sales enable row level security;
alter table public.uzta_commission_events enable row level security;
revoke all on public.uzta_sales,public.uzta_commission_events from public,anon,authenticated;
grant select on public.uzta_sales,public.uzta_commission_events to authenticated;
create policy uzta_sales_read on public.uzta_sales for select to authenticated using(seller_id=(select auth.uid()) or (select uzta_private.commission_is_admin()));
create policy uzta_commission_events_read on public.uzta_commission_events for select to authenticated using(exists(select 1 from public.uzta_sales s where s.id=sale_id));

-- The existing completion transaction writes an immutable snapshot at the rate then in force.
create function uzta_private.record_completed_sale() returns trigger language plpgsql security definer set search_path='' as $$
declare bps integer; seller uuid;
begin
 if new.status='Completado' and (tg_op='INSERT' or old.status is distinct from new.status) then
  select rate_bps into bps from uzta_private.commission_config where singleton for share;
  select owner_id into seller from public.uzta_producers where id=new.producer_id;
  insert into public.uzta_sales(order_id,seller_id,producer_id,gross_cents,rate_bps,commission_cents,seller_net_cents)
   values(new.id,seller,new.producer_id,new.total_cents,bps,floor((new.total_cents::numeric*bps+5000)/10000)::bigint,new.total_cents-floor((new.total_cents::numeric*bps+5000)/10000)::bigint)
   on conflict(order_id) do nothing;
 elsif new.status in ('Cancelado','Cancelada') and (tg_op='INSERT' or old.status is distinct from new.status) then
  perform id from public.uzta_sales where order_id=new.id for update;
  insert into public.uzta_commission_events(id,sale_id,kind,amount_cents,reference,actor_id)
   select gen_random_uuid(),s.id,'void',0,'Reservation cancelled',auth.uid() from public.uzta_sales s where s.order_id=new.id
   on conflict(sale_id) where kind='void' do nothing;
 end if;
 return new;
end;$$;
revoke all on function uzta_private.record_completed_sale() from public,anon,authenticated;
create trigger uzta_completed_sale after insert or update of status on public.uzta_orders for each row execute function uzta_private.record_completed_sale();

create function uzta_private.commission_settings(p_rate integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare c uzta_private.commission_config;
begin
 if not uzta_private.commission_is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 select * into c from uzta_private.commission_config where singleton for update;
 if p_rate is not null then
  if p_rate not between 0 and 10000 or (p_rate>0 and not c.commercial_reviewed) then raise exception 'Commercial review required or invalid rate'; end if;
  if c.rate_bps<>p_rate then
   update uzta_private.commission_config set rate_bps=p_rate where singleton;
   insert into uzta_private.commission_rates(rate_bps,actor_id)values(p_rate,auth.uid());
   c.rate_bps:=p_rate;
  end if;
 end if;
 return jsonb_build_object('rate_bps',c.rate_bps,'commercial_reviewed',c.commercial_reviewed);
end;$$;
create function uzta_private.declare_sale(p_sale uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 update public.uzta_sales set declared_at=coalesce(declared_at,now()) where id=p_sale and seller_id=auth.uid();
 if not found then raise exception 'Sale unavailable' using errcode='42501'; end if;
end;$$;
create function uzta_private.commission_action(p_id uuid,p_sale uuid,p_kind text,p_amount bigint,p_reference text) returns void language plpgsql security definer set search_path='' as $$
declare s public.uzta_sales; e public.uzta_commission_events; effective bigint; collected bigint;
begin
 if not uzta_private.commission_is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if p_id is null or p_kind is null or p_amount is null or p_reference is null or char_length(p_reference)>300 then raise exception 'Invalid event'; end if;
 select * into s from public.uzta_sales where id=p_sale for update;
 if not found then raise exception 'Sale unavailable'; end if;
 select * into e from public.uzta_commission_events where id=p_id;
 if found then
  if e.sale_id is distinct from p_sale or e.kind is distinct from p_kind or e.amount_cents is distinct from p_amount or e.reference is distinct from btrim(p_reference) or e.actor_id is distinct from auth.uid() then raise exception 'Event identifier unavailable'; end if;
  return;
 end if;
 if exists(select 1 from public.uzta_commission_events where sale_id=p_sale and kind='void') then raise exception 'Sale voided'; end if;
 select s.commission_cents+coalesce(sum(amount_cents) filter(where kind='adjust'),0),coalesce(sum(amount_cents) filter(where kind='collect'),0) into effective,collected from public.uzta_commission_events where sale_id=p_sale;
 if p_kind='collect' then
  if p_amount<=0 or p_amount>effective-collected then raise exception 'Invalid collection amount'; end if;
 elsif p_kind='adjust' then
  if p_amount=0 or effective::numeric+p_amount not between collected and s.gross_cents or btrim(p_reference)='' then raise exception 'Invalid adjustment'; end if;
 elsif p_kind='void' then
  if p_amount<>0 or btrim(p_reference)='' then raise exception 'Void reason required'; end if;
 else raise exception 'Invalid event'; end if;
 insert into public.uzta_commission_events(id,sale_id,kind,amount_cents,reference,actor_id) values(p_id,p_sale,p_kind,p_amount,btrim(p_reference),auth.uid());
end;$$;
revoke all on function uzta_private.commission_settings(integer),uzta_private.declare_sale(uuid),uzta_private.commission_action(uuid,uuid,text,bigint,text) from public,anon;
grant execute on function uzta_private.commission_settings(integer),uzta_private.declare_sale(uuid),uzta_private.commission_action(uuid,uuid,text,bigint,text) to authenticated;
create function public.uzta_commission_settings(p_rate integer default null) returns jsonb language sql security invoker set search_path='' as $$select uzta_private.commission_settings(p_rate);$$;
create function public.uzta_declare_sale(p_sale uuid) returns void language sql security invoker set search_path='' as $$select uzta_private.declare_sale(p_sale);$$;
create function public.uzta_commission_action(p_id uuid,p_sale uuid,p_kind text,p_amount bigint,p_reference text) returns void language sql security invoker set search_path='' as $$select uzta_private.commission_action(p_id,p_sale,p_kind,p_amount,p_reference);$$;
revoke all on function public.uzta_commission_settings(integer),public.uzta_declare_sale(uuid),public.uzta_commission_action(uuid,uuid,text,bigint,text) from public,anon;
grant execute on function public.uzta_commission_settings(integer),public.uzta_declare_sale(uuid),public.uzta_commission_action(uuid,uuid,text,bigint,text) to authenticated;

-- Aggregates respect the same seller/admin RLS as the detail list, across all pages.
create function public.uzta_commission_summary(p_from timestamptz default null,p_to timestamptz default null,p_seller uuid default null)
returns table(seller_id uuid,seller_label text,currency text,completed_count bigint,declared_count bigint,gross_cents numeric,calculated_cents numeric,pending_cents numeric,collected_cents numeric)
language sql stable security invoker set search_path='' as $$
 select s.seller_id,coalesce(max(p.name),'Seller'),s.currency,count(*),count(*) filter(where s.declared_at is not null),
 sum(case when e.voided then 0 else s.gross_cents end),sum(case when e.voided then 0 else s.commission_cents+e.adjusted end),
 sum(case when e.voided then 0 else greatest(0,s.commission_cents+e.adjusted-e.collected) end),sum(e.collected)
 from public.uzta_sales s left join public.uzta_producers p on p.id=s.producer_id
 cross join lateral(select coalesce(sum(amount_cents)filter(where kind='adjust'),0) adjusted,coalesce(sum(amount_cents)filter(where kind='collect'),0) collected,coalesce(bool_or(kind='void'),false) voided from public.uzta_commission_events where sale_id=s.id)e
 where (p_from is null or s.completed_at>=p_from) and (p_to is null or s.completed_at<p_to) and (p_seller is null or s.seller_id=p_seller)
 group by s.seller_id,s.currency;
$$;
revoke all on function public.uzta_commission_summary(timestamptz,timestamptz,uuid) from public,anon;
grant execute on function public.uzta_commission_summary(timestamptz,timestamptz,uuid) to authenticated;
