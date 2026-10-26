-- Preserve the existing approved "Mostrar en inicio" product setting.
alter table public.uzta_products add column if not exists featured boolean not null default true;
