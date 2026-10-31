-- 0008_rate_limits
-- Fixed-window rate limiter for public endpoints (quote request, /q/<token> actions).
-- Key is a hash (e.g. sha256(ip + salt) + ':' + route), never a raw IP.
-- Called only by server code (service_role).

create table public.rate_limits (
  key           text not null,
  window_start  timestamptz not null,
  hits          integer not null default 0,
  primary key (key, window_start)
);
create index rate_limits_window_idx on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;
-- No policies: service_role only.

-- Returns true when the request is allowed (and counts it), false when over the limit.
create or replace function public.check_rate_limit(
  p_key text,
  p_window_seconds integer,
  p_max_hits integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  if p_window_seconds <= 0 or p_max_hits <= 0 or char_length(p_key) > 200 then
    raise exception 'invalid rate limit arguments' using errcode = '22023';
  end if;

  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;

  -- opportunistic cleanup of old windows (cheap, indexed)
  delete from public.rate_limits where window_start < now() - interval '1 day';

  return v_hits <= p_max_hits;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
