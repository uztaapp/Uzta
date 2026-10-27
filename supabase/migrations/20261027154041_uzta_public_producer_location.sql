-- Approximate producer location only. Never stores the buyer's search coordinates.
alter table public.uzta_producers
 add column public_latitude numeric(5,2),
 add column public_longitude numeric(6,2),
 add constraint uzta_public_position_pair check ((public_latitude is null)=(public_longitude is null)),
 add constraint uzta_public_latitude_range check (public_latitude between -90 and 90),
 add constraint uzta_public_longitude_range check (public_longitude between -180 and 180);
