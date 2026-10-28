-- Before activation only, or export reviews first: rollback removes review data.
begin;
drop function public.uzta_submit_review(uuid,integer,text);
drop function public.uzta_review_summaries(uuid[]);
drop function public.uzta_review_comments(uuid);
drop function uzta_private.submit_review(uuid,integer,text);
drop function uzta_private.review_summaries(uuid[]);
drop function uzta_private.review_comments(uuid);
drop table public.uzta_reviews;
commit;
