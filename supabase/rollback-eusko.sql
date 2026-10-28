begin;
do $$begin if exists(select 1 from public.uzta_producers where eusko_notes or eusko_digital) or exists(select 1 from public.uzta_orders where payment_preference is not null) then raise exception 'Export Eusko preferences before rollback'; end if;end;$$;
drop function public.uzta_reserve_order_payment(uuid,uuid,jsonb,text,text);
drop function public.uzta_eusko_adoption();
drop function uzta_private.reserve_order_payment(uuid,uuid,jsonb,text,text);
drop function uzta_private.eusko_adoption();
alter table public.uzta_orders drop constraint uzta_order_eusko_preference,drop column payment_preference,drop column eusko_notes_accepted,drop column eusko_digital_accepted;
alter table public.uzta_producers drop column eusko_notes,drop column eusko_digital;
commit;
