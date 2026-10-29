-- Authorized additive categories; no product records are rewritten.
alter table public.uzta_products
 drop constraint uzta_products_category_check,
 add constraint uzta_products_category_check check(category in ('Verduras','Frutas','Huevos','Lácteos','Pan','Carne','Aves','Miel','Aceite','Vino','Conservas','Plantas','Flores','Otros'));
