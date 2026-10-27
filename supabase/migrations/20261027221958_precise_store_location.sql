-- Preserve the owner's chosen public entrance with six decimal places.
alter table public.uzta_producers
  alter column public_latitude type numeric(9,6),
  alter column public_longitude type numeric(9,6);
