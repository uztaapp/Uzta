-- Refuse rollback while products use a newly introduced category. No data deletion.
begin;
lock table public.uzta_products in share row exclusive mode;
do $$ begin if exists(select 1 from public.uzta_products where category not in ('Verduras','Frutas','Huevos','Lácteos','Miel','Otros')) then raise exception 'Products use expanded categories; rollback refused'; end if; end $$;
alter table public.uzta_products drop constraint uzta_products_category_check, add constraint uzta_products_category_check check(category in ('Verduras','Frutas','Huevos','Lácteos','Miel','Otros'));
commit;
