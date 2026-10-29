-- PREPARED ONLY: owner review required before production. No seed or historical updates.
create table public.uzta_markets (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 2 and 120),
 kind text not null check(kind in ('weekly','producers','craft','agricultural','special')),
 description text not null default '' check(length(description)<=2000), locality text not null check(length(trim(locality)) between 1 and 100),
 address text not null default '' check(length(address)<=250), region text not null check(region in ('Iparralde','Gipuzkoa','Bizkaia','Araba','Navarra')),
 latitude double precision check(latitude between -90 and 90),longitude double precision check(longitude between -180 and 180),
 timezone text not null default 'Europe/Madrid' check(timezone in ('Europe/Madrid','Europe/Paris')),
 categories text[] not null default '{}', status text not null default 'pending' check(status in ('pending','published','inactive')),
 source_url text check(source_url is null or source_url ~ '^https://[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(:[0-9]{1,5})?(/[^[:space:]]*)?$'),source_key text unique,source_updated_at timestamptz, source_license text not null default '',
 verified_at timestamptz, created_by uuid not null default auth.uid() references auth.users(id),updated_at timestamptz not null default now(),
 check((latitude is null)=(longitude is null)),check(status<>'published' or (verified_at is not null and source_url is not null and length(source_license)>0))
);
create index uzta_markets_area on public.uzta_markets(status,region,locality);
create table public.uzta_market_participations (
 id uuid primary key default gen_random_uuid(), market_id uuid not null references public.uzta_markets(id),producer_id uuid not null references public.uzta_producers(id),
 active boolean not null default true,own_production boolean not null check(own_production),production_kind text not null check(production_kind in ('farm','artisan')),
 pickup_enabled boolean not null default false,cutoff_minutes integer not null default 60 check(cutoff_minutes between 0 and 10080),
 unique(market_id,producer_id),unique(id,market_id)
);
create index uzta_market_participations_producer on public.uzta_market_participations(producer_id,active);
create table public.uzta_market_rules (
 id uuid primary key default gen_random_uuid(),market_id uuid not null references public.uzta_markets(id),participation_id uuid,
 frequency text not null check(frequency in ('once','weekly','monthly')),starts_on date not null check(starts_on between date '1900-01-01' and date '2100-12-31'),ends_on date check(ends_on between date '1900-01-01' and date '2100-12-31'),
 weekdays integer[] not null default '{}',ordinal integer check(ordinal between 1 and 5 or ordinal=-1),
 opens time check(opens<time '24:00' and extract(second from opens)=0),closes time check(closes<time '24:00' and extract(second from closes)=0),
 foreign key(participation_id,market_id) references public.uzta_market_participations(id,market_id),
 check(ends_on is null or ends_on>=starts_on),check(ends_on is null or ends_on<=starts_on+interval '10 years'),
 check(weekdays <@ array[0,1,2,3,4,5,6]),check(frequency='once' or cardinality(weekdays)>0),
 check(frequency<>'monthly' or (cardinality(weekdays)=1 and ordinal is not null)),
 check((opens is null and closes is null) or (opens is not null and closes is not null and closes>opens))
);
create index uzta_market_rules_range on public.uzta_market_rules(market_id,starts_on,ends_on);
create index uzta_market_rules_participation on public.uzta_market_rules(participation_id);
create table public.uzta_market_exceptions (
 id uuid primary key default gen_random_uuid(),market_id uuid not null references public.uzta_markets(id),participation_id uuid,
 day date not null check(day between date '1900-01-01' and date '2100-12-31'),cancelled boolean not null default true,opens time,closes time,
 foreign key(participation_id,market_id) references public.uzta_market_participations(id,market_id),
 check((opens is null and closes is null) or (opens is not null and closes is not null and closes>opens))
);
create unique index uzta_market_exceptions_day on public.uzta_market_exceptions(market_id,day) where participation_id is null;
create unique index uzta_market_participation_exceptions_day on public.uzta_market_exceptions(participation_id,day) where participation_id is not null;
create function uzta_private.market_owner(p uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.uzta_producers where id=p and owner_id=auth.uid() and uzta_private.producer_approved(owner_id));$$;
create function uzta_private.market_participant_owner(p uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.uzta_market_participations where id=p and uzta_private.market_owner(producer_id));$$;
revoke all on function uzta_private.market_owner(uuid),uzta_private.market_participant_owner(uuid) from public,anon;
grant execute on function uzta_private.market_owner(uuid),uzta_private.market_participant_owner(uuid) to authenticated;
alter table public.uzta_markets enable row level security;
alter table public.uzta_market_participations enable row level security;
alter table public.uzta_market_rules enable row level security;
alter table public.uzta_market_exceptions enable row level security;
revoke all on public.uzta_markets,public.uzta_market_participations,public.uzta_market_rules,public.uzta_market_exceptions from public,anon,authenticated;
grant select(id,name,kind,description,locality,address,region,latitude,longitude,timezone,categories,status,source_url,source_key,source_updated_at,source_license,verified_at,updated_at) on public.uzta_markets to anon,authenticated;
grant insert,update on public.uzta_markets to authenticated;
grant select on public.uzta_market_participations,public.uzta_market_rules,public.uzta_market_exceptions to anon,authenticated;
grant insert,update,delete on public.uzta_market_rules,public.uzta_market_exceptions to authenticated;
grant insert,update on public.uzta_market_participations to authenticated;
create function uzta_private.market_admin() returns boolean language plpgsql stable security definer set search_path='' as $$
begin if auth.uid() is null then return false;end if;return uzta_private.commission_is_admin();end;$$;
revoke all on function uzta_private.market_admin() from public;
grant execute on function uzta_private.market_admin() to anon,authenticated;
create policy uzta_markets_read on public.uzta_markets for select to anon,authenticated using(status='published' or created_by=auth.uid() or uzta_private.market_admin());
create policy uzta_markets_propose on public.uzta_markets for insert to authenticated with check(created_by=auth.uid() and (uzta_private.market_admin() or (status='pending' and verified_at is null and uzta_private.producer_approved(auth.uid()))));
create policy uzta_markets_admin on public.uzta_markets for update to authenticated using(uzta_private.market_admin()) with check(uzta_private.market_admin());
create policy uzta_market_participations_read on public.uzta_market_participations for select to anon,authenticated using(
 (active and exists(select 1 from public.uzta_markets m where m.id=market_id and m.status='published') and exists(select 1 from public.uzta_producers p where p.id=producer_id and p.active and uzta_private.producer_approved(p.owner_id))) or uzta_private.market_owner(producer_id) or uzta_private.market_admin());
create policy uzta_market_participations_create on public.uzta_market_participations for insert to authenticated with check(uzta_private.market_owner(producer_id) and exists(select 1 from public.uzta_markets m where m.id=market_id and m.status='published'));
create policy uzta_market_participations_change on public.uzta_market_participations for update to authenticated using(uzta_private.market_owner(producer_id) or uzta_private.market_admin()) with check(uzta_private.market_owner(producer_id) or uzta_private.market_admin());
create policy uzta_market_rules_read on public.uzta_market_rules for select to anon,authenticated using(exists(select 1 from public.uzta_markets m where m.id=market_id) and (participation_id is null or exists(select 1 from public.uzta_market_participations p where p.id=participation_id)));
create policy uzta_market_rules_manage on public.uzta_market_rules for all to authenticated using((participation_id is null and uzta_private.market_admin()) or uzta_private.market_participant_owner(participation_id)) with check((participation_id is null and uzta_private.market_admin()) or uzta_private.market_participant_owner(participation_id));
create policy uzta_market_exceptions_read on public.uzta_market_exceptions for select to anon,authenticated using(exists(select 1 from public.uzta_markets m where m.id=market_id) and (participation_id is null or exists(select 1 from public.uzta_market_participations p where p.id=participation_id)));
create policy uzta_market_exceptions_manage on public.uzta_market_exceptions for all to authenticated using((participation_id is null and uzta_private.market_admin()) or uzta_private.market_participant_owner(participation_id)) with check((participation_id is null and uzta_private.market_admin()) or uzta_private.market_participant_owner(participation_id));
-- Anon needs the private helpers for read policies; they only return booleans, never rows.
grant execute on function uzta_private.market_owner(uuid),uzta_private.market_participant_owner(uuid) to anon;
-- Serialize schedule/exception edits with preparation and final checkout. No change to cancellation.
create function uzta_private.lock_market_schedule() returns trigger language plpgsql security definer set search_path='' as $$
declare m uuid;p uuid;
begin
 if tg_op='DELETE' then m:=old.market_id;p:=old.participation_id;else m:=new.market_id;p:=new.participation_id;end if;
 if tg_op='UPDATE' and (new.market_id is distinct from old.market_id or new.participation_id is distinct from old.participation_id) then raise exception 'Schedule identity cannot change';end if;
 if p is not null then perform 1 from public.uzta_market_participations where id=p for update;end if;
 perform 1 from public.uzta_markets where id=m for update;
 if tg_op='DELETE' then return old;end if;return new;
end;$$;
revoke all on function uzta_private.lock_market_schedule() from public,anon,authenticated;
create trigger uzta_market_rules_lock before insert or update or delete on public.uzta_market_rules for each row execute function uzta_private.lock_market_schedule();
create trigger uzta_market_exceptions_lock before insert or update or delete on public.uzta_market_exceptions for each row execute function uzta_private.lock_market_schedule();
create function uzta_private.market_identity_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.producer_id is distinct from old.producer_id or new.market_id is distinct from old.market_id) then raise exception 'Participation identity cannot change';end if;
 return new;
end;$$;
revoke all on function uzta_private.market_identity_guard() from public,anon,authenticated;
create trigger uzta_market_identity before insert or update on public.uzta_market_participations for each row execute function uzta_private.market_identity_guard();
-- Local dates are converted with the market's IANA zone only when a concrete occurrence is requested.
create function uzta_private.market_day(p_market uuid,p_part uuid,p_day date) returns table(opens time,closes time) language sql stable security definer set search_path='' as $$
 select coalesce(e.opens,r.opens),coalesce(e.closes,r.closes) from public.uzta_market_rules r
 left join public.uzta_market_exceptions e on e.market_id=r.market_id and e.participation_id is not distinct from r.participation_id and e.day=p_day
 where r.market_id=p_market and r.participation_id is not distinct from p_part and p_day>=r.starts_on and (r.ends_on is null or p_day<=r.ends_on)
 and not coalesce(e.cancelled,false) and case r.frequency
 when 'once' then p_day between r.starts_on and coalesce(r.ends_on,r.starts_on)
 when 'weekly' then extract(dow from p_day)::int=any(r.weekdays)
 when 'monthly' then extract(dow from p_day)::int=any(r.weekdays) and ((r.ordinal=-1 and extract(month from p_day+7)<>extract(month from p_day)) or (r.ordinal>0 and ((extract(day from p_day)::int-1)/7+1)=r.ordinal)) end;
$$;
revoke all on function uzta_private.market_day(uuid,uuid,date) from public,anon,authenticated;
-- Obtain the intersection of market opening and seller presence, with a confirmed clock.
create function uzta_private.valid_market_clock(d date,t time,z text) returns boolean language sql stable set search_path='' as $$
 select ((d+t) at time zone z) at time zone z = d+t
 and (((d+t) at time zone z)+interval '1 hour') at time zone z <> d+t
 and (((d+t) at time zone z)-interval '1 hour') at time zone z <> d+t;
$$;
revoke all on function uzta_private.valid_market_clock(date,time,text) from public,anon,authenticated;
create function uzta_private.market_pickup_window(p_part uuid,p_day date) returns table(starts_at timestamptz,ends_at timestamptz) language sql stable security definer set search_path='' as $$
 select (p_day+greatest(m.opens,s.opens)) at time zone k.timezone,(p_day+least(m.closes,s.closes)) at time zone k.timezone
 from public.uzta_market_participations p join public.uzta_markets k on k.id=p.market_id
 cross join lateral uzta_private.market_day(k.id,null,p_day) m cross join lateral uzta_private.market_day(k.id,p.id,p_day) s
 where p.id=p_part and p.active and p.pickup_enabled and k.status='published' and m.opens is not null and m.closes is not null and s.opens is not null and s.closes is not null and greatest(m.opens,s.opens)<least(m.closes,s.closes) and uzta_private.valid_market_clock(p_day,greatest(m.opens,s.opens),k.timezone) and uzta_private.valid_market_clock(p_day,least(m.closes,s.closes),k.timezone);
$$;
revoke all on function uzta_private.market_pickup_window(uuid,date) from public,anon,authenticated;
alter table public.uzta_pickup_slots add column market_participation_id uuid references public.uzta_market_participations(id),add column market_date date,add column market_label text,add column market_location jsonb,add column market_revision timestamptz;
create unique index uzta_market_slot_unique on public.uzta_pickup_slots(market_participation_id,market_date,starts_at,ends_at,market_revision) where market_participation_id is not null;
alter table public.uzta_orders add column pickup_slot_id uuid references public.uzta_pickup_slots(id),add column pickup_market jsonb;
-- Minimal compatible extension: persist the chosen slot, leaving stock/payment/idempotency unchanged.
do $patch$ declare definition text;begin
 definition:=pg_get_functiondef('uzta_private.reserve_order(uuid,uuid,jsonb,text)'::regprocedure);
 if position('pickup_starts_at,pickup_ends_at,message)' in definition)=0 or position($needle$coalesce(p_message,''));$needle$ in definition)=0 then raise exception 'Reserve function differs: review before activation';end if;
 definition:=replace(definition,'pickup_starts_at,pickup_ends_at,message)','pickup_starts_at,pickup_ends_at,message,pickup_slot_id)');
 definition:=replace(definition,$needle$coalesce(p_message,''));$needle$,$replacement$coalesce(p_message,''),slot.id);$replacement$);
 execute definition;
end;$patch$;
create function uzta_private.markets_enabled() returns boolean language sql stable set search_path='' as $$select true;$$;
revoke all on function uzta_private.markets_enabled() from public,anon,authenticated;
create function uzta_private.guard_market_order() returns trigger language plpgsql security definer set search_path='' as $$
declare s public.uzta_pickup_slots;p public.uzta_market_participations;m public.uzta_markets;w record;
begin
 select * into s from public.uzta_pickup_slots where id=new.pickup_slot_id;
 if s.market_participation_id is null then return new;end if;
 if not uzta_private.markets_enabled() then raise exception 'Market booking disabled';end if;
 if current_setting('uzta.market_checkout_slot',true) is distinct from s.id::text then raise exception 'Explicit market pickup confirmation required';end if;
 select * into p from public.uzta_market_participations where id=s.market_participation_id for share;
 select * into m from public.uzta_markets where id=p.market_id for share;
 if not uzta_private.producer_approved((select owner_id from public.uzta_producers where id=p.producer_id)) or not p.active or not p.pickup_enabled or m.status<>'published' or p.producer_id<>new.producer_id then raise exception 'Market pickup unavailable';end if;
 select * into w from uzta_private.market_pickup_window(p.id,s.market_date) where starts_at=new.pickup_starts_at and ends_at=new.pickup_ends_at limit 1;
 if not found or w.starts_at-make_interval(mins=>p.cutoff_minutes)<=now() then raise exception 'Market pickup unavailable or reservation deadline passed';end if;
 new.pickup_market:=jsonb_build_object('id',m.id,'name',m.name,'address',m.address,'locality',m.locality,'lat',m.latitude,'lng',m.longitude,'date',s.market_date,'timezone',m.timezone);
 return new;
end;$$;
revoke all on function uzta_private.guard_market_order() from public,anon,authenticated;
create trigger uzta_market_order_guard before insert on public.uzta_orders for each row execute function uzta_private.guard_market_order();
create function uzta_private.prepare_market_pickup(p_part uuid,p_day date) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.uzta_market_participations;m public.uzta_markets;w record;result uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select * into p from public.uzta_market_participations where id=p_part for share;
 select * into m from public.uzta_markets where id=p.market_id for share;
 if not found or not p.active or not p.pickup_enabled or m.status<>'published' then raise exception 'Market pickup unavailable';end if;
 if not uzta_private.markets_enabled() then raise exception 'Market booking disabled';end if;
 if p_day<(now() at time zone m.timezone)::date or p_day>(now() at time zone m.timezone)::date+90 then raise exception 'Date outside booking window';end if;
 select * into w from uzta_private.market_pickup_window(p.id,p_day) order by starts_at limit 1;
 if not found or w.starts_at-make_interval(mins=>p.cutoff_minutes)<=now() then raise exception 'Market pickup unavailable or reservation deadline passed';end if;
 if not exists(select 1 from public.uzta_producers x where x.id=p.producer_id and x.active and uzta_private.producer_approved(x.owner_id)) then raise exception 'Producer unavailable';end if;
 insert into public.uzta_pickup_slots(producer_id,starts_at,ends_at,market_participation_id,market_date,market_label,market_location,market_revision) values(p.producer_id,w.starts_at,w.ends_at,p.id,p_day,m.name,jsonb_build_object('id',m.id,'name',m.name,'address',m.address,'locality',m.locality,'lat',m.latitude,'lng',m.longitude,'date',p_day,'timezone',m.timezone),m.updated_at)
 on conflict(market_participation_id,market_date,starts_at,ends_at,market_revision) where market_participation_id is not null do nothing returning id into result;
 if result is null then select id into result from public.uzta_pickup_slots where market_participation_id=p.id and market_date=p_day and starts_at=w.starts_at and ends_at=w.ends_at and market_revision=m.updated_at;end if;
 return result;
end;$$;
revoke all on function uzta_private.prepare_market_pickup(uuid,date) from public,anon;
grant execute on function uzta_private.prepare_market_pickup(uuid,date) to authenticated;
create function public.uzta_prepare_market_pickup(p_part uuid,p_day date) returns uuid language sql security invoker set search_path='' as $$select uzta_private.prepare_market_pickup(p_part,p_day);$$;
revoke all on function public.uzta_prepare_market_pickup(uuid,date) from public,anon;
grant execute on function public.uzta_prepare_market_pickup(uuid,date) to authenticated;
-- Linked slots are generated by the guarded RPC, not editable client input.
create function uzta_private.guard_market_slot() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if (new.market_participation_id is not null or new.market_date is not null or new.market_label is not null or new.market_location is not null or new.market_revision is not null or (tg_op='UPDATE' and old.market_participation_id is not null)) and current_user not in ('postgres','supabase_admin','service_role') then raise exception 'Managed market slot';end if;
 return new;
end;$$;
revoke all on function uzta_private.guard_market_slot() from public,anon,authenticated;
create trigger uzta_market_slot_guard before insert or update on public.uzta_pickup_slots for each row execute function uzta_private.guard_market_slot();

create unique index uzta_market_name_locality_unique on public.uzta_markets(lower(regexp_replace(name,'[^[:alnum:]]','','g')),lower(trim(locality)));
create function uzta_private.write_market_rules(p_market uuid,p_part uuid,p_rules jsonb) returns void language plpgsql security definer set search_path='' as $$
declare r jsonb;
begin
 if jsonb_typeof(p_rules)<>'array' or jsonb_array_length(p_rules)>30 then raise exception 'Invalid recurrence rules';end if;
 delete from public.uzta_market_rules where market_id=p_market and participation_id is not distinct from p_part;
 for r in select value from jsonb_array_elements(p_rules) loop
 insert into public.uzta_market_rules(market_id,participation_id,frequency,starts_on,ends_on,weekdays,ordinal,opens,closes)
 values(p_market,p_part,r->>'frequency',(r->>'starts_on')::date,nullif(r->>'ends_on','')::date,coalesce(array(select jsonb_array_elements_text(r->'weekdays')::int),'{}'),nullif(r->>'ordinal','')::int,nullif(r->>'opens','')::time,nullif(r->>'closes','')::time);
 end loop;
end;$$;
revoke all on function uzta_private.write_market_rules(uuid,uuid,jsonb) from public,anon,authenticated;
create function uzta_private.save_market(p_id uuid,p_data jsonb,p_rules jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;is_admin boolean:=uzta_private.market_admin();new_status text;
begin
 if auth.uid() is null or (not is_admin and not uzta_private.producer_approved(auth.uid())) then raise exception 'Producer or admin required' using errcode='42501';end if;
 if p_data is null or length(p_data::text)>15000 then raise exception 'Invalid market';end if;
 new_status:=case when is_admin then coalesce(p_data->>'status','pending') else 'pending' end;
 if p_id is not null then
 perform 1 from public.uzta_markets where id=p_id and (is_admin or (created_by=auth.uid() and status='pending')) for update;
 if not found then raise exception 'Market unavailable' using errcode='42501';end if;
 end if;
 if p_id is null then
 insert into public.uzta_markets(name,kind,description,locality,address,region,latitude,longitude,timezone,categories,status,source_url,source_key,source_updated_at,source_license,verified_at)
 values(p_data->>'name',p_data->>'kind',coalesce(p_data->>'description',''),p_data->>'locality',coalesce(p_data->>'address',''),p_data->>'region',nullif(p_data->>'latitude','')::double precision,nullif(p_data->>'longitude','')::double precision,coalesce(p_data->>'timezone','Europe/Madrid'),array(select jsonb_array_elements_text(p_data->'categories')),new_status,nullif(p_data->>'source_url',''),nullif(p_data->>'source_key',''),nullif(p_data->>'source_updated_at','')::timestamptz,coalesce(p_data->>'source_license',''),case when new_status='published' then now() end) returning id into result;
 else
 update public.uzta_markets set name=p_data->>'name',kind=p_data->>'kind',description=coalesce(p_data->>'description',''),locality=p_data->>'locality',address=coalesce(p_data->>'address',''),region=p_data->>'region',latitude=nullif(p_data->>'latitude','')::double precision,longitude=nullif(p_data->>'longitude','')::double precision,timezone=coalesce(p_data->>'timezone','Europe/Madrid'),categories=array(select jsonb_array_elements_text(p_data->'categories')),status=new_status,source_url=nullif(p_data->>'source_url',''),source_key=nullif(p_data->>'source_key',''),source_updated_at=case when p_data?'source_updated_at' then nullif(p_data->>'source_updated_at','')::timestamptz else source_updated_at end,source_license=coalesce(p_data->>'source_license',''),verified_at=case when new_status='published' then now() else verified_at end,updated_at=now() where id=p_id returning id into result;
 end if;
 perform uzta_private.write_market_rules(result,null,p_rules);return result;
end;$$;
revoke all on function uzta_private.save_market(uuid,jsonb,jsonb) from public,anon;
grant execute on function uzta_private.save_market(uuid,jsonb,jsonb) to authenticated;
create function public.uzta_save_market(p_id uuid,p_data jsonb,p_rules jsonb) returns uuid language sql security invoker set search_path='' as $$select uzta_private.save_market(p_id,p_data,p_rules);$$;
revoke all on function public.uzta_save_market(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.uzta_save_market(uuid,jsonb,jsonb) to authenticated;
create function uzta_private.save_market_participation(p_market uuid,p_producer uuid,p_active boolean,p_pickup boolean,p_cutoff integer,p_kind text,p_rules jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if auth.uid() is null or not (uzta_private.market_owner(p_producer) or uzta_private.market_admin()) then raise exception 'Producer required' using errcode='42501';end if;
 if not exists(select 1 from public.uzta_markets where id=p_market and status='published') then raise exception 'Market unavailable';end if;
 insert into public.uzta_market_participations(market_id,producer_id,active,own_production,production_kind,pickup_enabled,cutoff_minutes) values(p_market,p_producer,p_active,true,p_kind,p_pickup,p_cutoff)
 on conflict(market_id,producer_id) do update set active=excluded.active,production_kind=excluded.production_kind,pickup_enabled=excluded.pickup_enabled,cutoff_minutes=excluded.cutoff_minutes returning id into result;
 perform uzta_private.write_market_rules(p_market,result,p_rules);return result;
end;$$;
revoke all on function uzta_private.save_market_participation(uuid,uuid,boolean,boolean,integer,text,jsonb) from public,anon;
grant execute on function uzta_private.save_market_participation(uuid,uuid,boolean,boolean,integer,text,jsonb) to authenticated;
create function public.uzta_save_market_participation(p_market uuid,p_producer uuid,p_active boolean,p_pickup boolean,p_cutoff integer,p_kind text,p_rules jsonb) returns uuid language sql security invoker set search_path='' as $$select uzta_private.save_market_participation(p_market,p_producer,p_active,p_pickup,p_cutoff,p_kind,p_rules);$$;
revoke all on function public.uzta_save_market_participation(uuid,uuid,boolean,boolean,integer,text,jsonb) from public,anon;
grant execute on function public.uzta_save_market_participation(uuid,uuid,boolean,boolean,integer,text,jsonb) to authenticated;

-- Hide outdated generated slots from selection, while orders retain their immutable pickup snapshot.
create function uzta_private.market_slot_current(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.uzta_pickup_slots s join public.uzta_market_participations p on p.id=s.market_participation_id join public.uzta_markets m on m.id=p.market_id cross join lateral uzta_private.market_pickup_window(p.id,s.market_date) w where uzta_private.markets_enabled() and s.id=p_id and p.active and p.pickup_enabled and m.status='published' and s.starts_at=w.starts_at and s.ends_at=w.ends_at and s.starts_at-make_interval(mins=>p.cutoff_minutes)>now());
$$;
revoke all on function uzta_private.market_slot_current(uuid) from public;
grant execute on function uzta_private.market_slot_current(uuid) to anon,authenticated;
create policy uzta_market_current_slots on public.uzta_pickup_slots as restrictive for select to anon,authenticated using(market_participation_id is null or uzta_private.market_slot_current(id));

-- Parent locks precede rule/exception row locks; raw mutations cannot invert that order.
revoke insert,update,delete on public.uzta_market_rules,public.uzta_market_exceptions from authenticated;
create function uzta_private.save_market_exception(p_market uuid,p_part uuid,p_day date,p_cancelled boolean,p_opens time,p_closes time) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not ((p_part is null and uzta_private.market_admin()) or uzta_private.market_participant_owner(p_part) or uzta_private.market_admin()) then raise exception 'Market permission required' using errcode='42501';end if;
 if p_part is not null then perform 1 from public.uzta_market_participations where id=p_part and market_id=p_market for update;if not found then raise exception 'Participation unavailable';end if;end if;
 perform 1 from public.uzta_markets where id=p_market for update;if not found then raise exception 'Market unavailable';end if;
 if p_part is null then
 insert into public.uzta_market_exceptions(market_id,day,cancelled,opens,closes) values(p_market,p_day,p_cancelled,p_opens,p_closes)
 on conflict(market_id,day) where participation_id is null do update set cancelled=excluded.cancelled,opens=excluded.opens,closes=excluded.closes;
 else
 insert into public.uzta_market_exceptions(market_id,participation_id,day,cancelled,opens,closes) values(p_market,p_part,p_day,p_cancelled,p_opens,p_closes)
 on conflict(participation_id,day) where participation_id is not null do update set cancelled=excluded.cancelled,opens=excluded.opens,closes=excluded.closes;
 end if;
end;$$;
revoke all on function uzta_private.save_market_exception(uuid,uuid,date,boolean,time,time) from public,anon;
grant execute on function uzta_private.save_market_exception(uuid,uuid,date,boolean,time,time) to authenticated;
create function public.uzta_save_market_exception(p_market uuid,p_part uuid,p_day date,p_cancelled boolean,p_opens time,p_closes time) returns void language sql security invoker set search_path='' as $$select uzta_private.save_market_exception(p_market,p_part,p_day,p_cancelled,p_opens,p_closes);$$;
revoke all on function public.uzta_save_market_exception(uuid,uuid,date,boolean,time,time) from public,anon;
grant execute on function public.uzta_save_market_exception(uuid,uuid,date,boolean,time,time) to authenticated;

-- Explicit opt-in for updated clients; reuse the original atomic reservation/payment implementation.
create function uzta_private.reserve_market_order(p_id uuid,p_slot uuid,p_items jsonb,p_message text,p_preference text) returns uuid language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 if not exists(select 1 from public.uzta_pickup_slots where id=p_slot and market_participation_id is not null) then raise exception 'Market slot required';end if;
 perform set_config('uzta.market_checkout_slot',p_slot::text,true);
 return uzta_private.reserve_order_payment(p_id,p_slot,p_items,p_message,p_preference);
end;$$;
revoke all on function uzta_private.reserve_market_order(uuid,uuid,jsonb,text,text) from public,anon;
grant execute on function uzta_private.reserve_market_order(uuid,uuid,jsonb,text,text) to authenticated;
create function public.uzta_reserve_market_order(p_id uuid,p_slot uuid,p_items jsonb,p_message text default '',p_preference text default 'EUR') returns uuid language sql security invoker set search_path='' as $$select uzta_private.reserve_market_order(p_id,p_slot,p_items,p_message,p_preference);$$;
revoke all on function public.uzta_reserve_market_order(uuid,uuid,jsonb,text,text) from public,anon;
grant execute on function public.uzta_reserve_market_order(uuid,uuid,jsonb,text,text) to authenticated;
