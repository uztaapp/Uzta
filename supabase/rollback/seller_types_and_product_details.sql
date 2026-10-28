-- Run only with explicit authorization, after disabling sellerTypesReady.
-- Refuse to discard any new seller classification or product description.
begin;
do $$ begin
 if exists(select 1 from public.uzta_producers where seller_type is not null)
 or exists(select 1 from public.uzta_products where description <> '') then
 raise exception 'New seller data exists. Keep columns and restore only the frontend, or export and review before rollback.';
 end if;
end $$;
drop trigger uzta_private_location on public.uzta_producers;
drop function public.uzta_normalize_private_location();
alter table public.uzta_producers drop column seller_type;
alter table public.uzta_products drop column description;
commit;
