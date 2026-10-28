-- Pending authorization. No existing order, product or profile rows are changed.
create table public.uzta_reviews (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null unique references public.uzta_orders(id) on delete restrict,
 buyer_id uuid not null references auth.users(id) on delete restrict,
 producer_id uuid not null references public.uzta_producers(id) on delete restrict,
 rating smallint not null check(rating between 1 and 5),
 comment text not null default '' check(char_length(comment)<=300),
 comment_hidden boolean not null default false,
 created_at timestamptz not null default now()
);
create index uzta_reviews_producer on public.uzta_reviews(producer_id,created_at desc,id);
alter table public.uzta_reviews enable row level security;
revoke all on public.uzta_reviews from public,anon,authenticated;
grant select on public.uzta_reviews to authenticated;
create policy uzta_reviews_own on public.uzta_reviews for select to authenticated using(buyer_id=(select auth.uid()));
-- Moderation uses the existing trusted Supabase administration access, never client metadata.
grant select,update(comment_hidden) on public.uzta_reviews to service_role;

create function uzta_private.submit_review(p_order uuid,p_rating integer,p_comment text) returns void
language plpgsql security definer set search_path='' as $$
declare o public.uzta_orders; seller uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_rating is null or p_rating not between 1 and 5 or p_comment is null or char_length(p_comment)>300 then
  raise exception 'Invalid review' using errcode='22023';
 end if;
 select * into o from public.uzta_orders where id=p_order for share;
 if not found or o.customer_id is distinct from auth.uid() or o.status<>'Completado' then
  raise exception 'Completed buyer reservation required' using errcode='42501';
 end if;
 select owner_id into seller from public.uzta_producers where id=o.producer_id for share;
 if seller is null or seller=auth.uid() then raise exception 'Self review forbidden' using errcode='42501'; end if;
 insert into public.uzta_reviews(order_id,buyer_id,producer_id,rating,comment)
 values(o.id,auth.uid(),o.producer_id,p_rating,btrim(p_comment));
end; $$;
revoke all on function uzta_private.submit_review(uuid,integer,text) from public,anon;
grant execute on function uzta_private.submit_review(uuid,integer,text) to authenticated;
create function public.uzta_submit_review(p_order uuid,p_rating integer,p_comment text) returns void
language sql security invoker set search_path='' as $$ select uzta_private.submit_review(p_order,p_rating,p_comment); $$;
revoke all on function public.uzta_submit_review(uuid,integer,text) from public,anon;
grant execute on function public.uzta_submit_review(uuid,integer,text) to authenticated;

-- Only aggregate values and anonymous public comments leave these private readers.
create function uzta_private.review_summaries(p_ids uuid[]) returns table(producer_id uuid,average numeric,total bigint)
language sql stable security definer set search_path='' as $$
 select r.producer_id,round(avg(r.rating),2),count(*) from public.uzta_reviews r
 where r.producer_id=any(p_ids[1:200]) group by r.producer_id;
$$;
create function uzta_private.review_comments(p_producer uuid) returns table(id uuid,rating smallint,comment text,created_at timestamptz)
language sql stable security definer set search_path='' as $$
 select r.id,r.rating,r.comment,r.created_at from public.uzta_reviews r
 where r.producer_id=p_producer and not r.comment_hidden and r.comment<>''
 order by r.created_at desc,r.id limit 10;
$$;
revoke all on function uzta_private.review_summaries(uuid[]),uzta_private.review_comments(uuid) from public;
grant usage on schema uzta_private to anon,authenticated;
grant execute on function uzta_private.review_summaries(uuid[]),uzta_private.review_comments(uuid) to anon,authenticated;
create function public.uzta_review_summaries(p_ids uuid[]) returns table(producer_id uuid,average numeric,total bigint)
language sql stable security invoker set search_path='' as $$ select * from uzta_private.review_summaries(p_ids); $$;
create function public.uzta_review_comments(p_producer uuid) returns table(id uuid,rating smallint,comment text,created_at timestamptz)
language sql stable security invoker set search_path='' as $$ select * from uzta_private.review_comments(p_producer); $$;
revoke all on function public.uzta_review_summaries(uuid[]),public.uzta_review_comments(uuid) from public;
grant execute on function public.uzta_review_summaries(uuid[]),public.uzta_review_comments(uuid) to anon,authenticated;
