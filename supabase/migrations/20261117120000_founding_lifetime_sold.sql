-- Founding Lifetime ($129) is limited to the first 100 purchases.
-- profiles RLS is select-own, so the client cannot count rows itself; this
-- function returns only the count. A purchased Lifetime row always has a
-- paddle_customer_id (set by the paddle-webhook edge function on
-- transaction.completed); the founders' own accounts were set by hand and
-- have none, so they do not use up places.
create or replace function public.founding_lifetime_sold()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.profiles
  where tier = 'lifetime' and paddle_customer_id is not null;
$$;

revoke all on function public.founding_lifetime_sold() from public;
revoke all on function public.founding_lifetime_sold() from anon;
grant execute on function public.founding_lifetime_sold() to authenticated;
