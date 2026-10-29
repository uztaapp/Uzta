-- Prepared recovery only. Requires authorization before execution in production.
-- Disable the frontend flag too. Preserve all cancelled orders, stock and audit traces.
begin;
revoke execute on function public.uzta_cancel_order(uuid) from public,anon,authenticated;
revoke execute on function uzta_private.cancel_order(uuid) from public,anon,authenticated;
commit;
