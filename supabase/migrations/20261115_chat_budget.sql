begin;
grant select on table public.profile, public.achievements, public.schedule to service_role;
create table public.chat_daily_budget (
 day date primary key,
 requests integer not null check (requests between 1 and 100)
);
alter table public.chat_daily_budget enable row level security;
revoke all on table public.chat_daily_budget from anon, authenticated;
create function public.consume_chat_budget() returns boolean
language plpgsql security definer set search_path = '' as $$
declare used integer;
begin
 insert into public.chat_daily_budget(day, requests)
 values ((now() at time zone 'Asia/Ho_Chi_Minh')::date, 1)
 on conflict (day) do update set requests = public.chat_daily_budget.requests + 1
 where public.chat_daily_budget.requests < 100
 returning requests into used;
 return used is not null;
end;
$$;
revoke all on function public.consume_chat_budget() from public, anon, authenticated;
grant execute on function public.consume_chat_budget() to service_role;
commit;
