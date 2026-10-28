-- No existing seller is classified automatically. Existing data remains compatible.
alter table public.uzta_producers add column seller_type text
 constraint uzta_seller_type_valid check (seller_type in ('professional','private'));
alter table public.uzta_products add column description text not null default ''
 constraint uzta_product_description_length check (char_length(description) <= 2000);

-- A direct REST request cannot persist a precise private-home coordinate.
-- No role, ownership or RLS change: this function executes with the caller's privileges.
create function public.uzta_normalize_private_location() returns trigger
 language plpgsql security invoker set search_path = pg_catalog as $$
begin
 if new.seller_type = 'private' then
   new.public_latitude := round(new.public_latitude, 2);
   new.public_longitude := round(new.public_longitude, 2);
 end if;
 return new;
end;
$$;
revoke all on function public.uzta_normalize_private_location() from public;
create trigger uzta_private_location before insert or update of seller_type,public_latitude,public_longitude
 on public.uzta_producers for each row execute function public.uzta_normalize_private_location();
