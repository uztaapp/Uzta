-- Pending authorization. Product favorites are preserved in their existing table.
create table public.uzta_producer_favorites(
 user_id uuid not null references auth.users(id) on delete cascade,
 producer_id uuid not null references public.uzta_producers(id) on delete cascade,
 primary key(user_id,producer_id)
);
create index uzta_producer_favorites_producer on public.uzta_producer_favorites(producer_id);
alter table public.uzta_producer_favorites enable row level security;
revoke all on public.uzta_producer_favorites from public,anon,authenticated;
grant select,insert,delete on public.uzta_producer_favorites to authenticated;
create policy uzta_producer_favorites_read on public.uzta_producer_favorites for select to authenticated using(user_id=(select auth.uid()));
create policy uzta_producer_favorites_insert on public.uzta_producer_favorites for insert to authenticated with check(user_id=(select auth.uid()));
create policy uzta_producer_favorites_delete on public.uzta_producer_favorites for delete to authenticated using(user_id=(select auth.uid()));
-- Deletion of a target must not leave stale references or be blocked by favorites.
alter table public.uzta_favorites drop constraint uzta_favorites_product_id_fkey;
alter table public.uzta_favorites add constraint uzta_favorites_product_id_fkey foreign key(product_id) references public.uzta_products(id) on delete cascade;
