-- All login state is private; only the Edge Function service role can call these RPCs.
create table public.login_attempts (bucket text primary key, window_start timestamptz not null default now(), attempts integer not null default 1);
create table public.login_challenges (nonce uuid primary key, used_at timestamptz not null default now());
alter table public.login_attempts enable row level security;
alter table public.login_challenges enable row level security;
revoke all on public.login_attempts, public.login_challenges from anon, authenticated;
create or replace function public.consume_login_attempt(p_bucket text, p_limit integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare count_now integer;
begin
  delete from public.login_attempts where window_start < now() - interval '1 day';
  insert into public.login_attempts as a (bucket) values (p_bucket)
  on conflict (bucket) do update set
    attempts = case when a.window_start < now() - interval '15 minutes' then 1 else a.attempts + 1 end,
    window_start = case when a.window_start < now() - interval '15 minutes' then now() else a.window_start end
  returning attempts into count_now;
  return count_now <= p_limit;
end;
$$;
create or replace function public.consume_login_challenge(p_nonce uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare inserted integer;
begin
  delete from public.login_challenges where used_at < now() - interval '5 minutes';
  insert into public.login_challenges (nonce) values (p_nonce) on conflict do nothing;
  get diagnostics inserted = row_count;
  return inserted = 1;
end;
$$;
revoke all on function public.consume_login_attempt(text,integer), public.consume_login_challenge(uuid) from public, anon, authenticated;
grant execute on function public.consume_login_attempt(text,integer), public.consume_login_challenge(uuid) to service_role;
