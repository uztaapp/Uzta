-- Prepared emergency recovery only. Never delete market/order history or reverse stock.
-- First disable marketsReady in the frontend. Requires authorized operator execution.
begin;
create or replace function uzta_private.markets_enabled() returns boolean language sql stable set search_path='' as $$select false;$$;
revoke execute on function public.uzta_prepare_market_pickup(uuid,date) from public,anon,authenticated;
revoke execute on function public.uzta_save_market(uuid,jsonb,jsonb) from public,anon,authenticated;
revoke execute on function public.uzta_save_market_participation(uuid,uuid,boolean,boolean,integer,text,jsonb) from public,anon,authenticated;
revoke execute on function public.uzta_save_market_exception(uuid,uuid,date,boolean,time,time) from public,anon,authenticated;
revoke execute on function public.uzta_reserve_market_order(uuid,uuid,jsonb,text,text) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
-- Existing market reservations remain readable, cancellable and collectable by the usual RPCs.
