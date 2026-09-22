-- Аналитика воронки: события пишет только service_role (через quick-handler и бота).

create table if not exists public.events (
  id bigserial primary key,
  user_id bigint references public.users(id) on delete set null,
  tid bigint,
  kind text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security; -- политик нет: с клиента события не читаются и не пишутся
create index if not exists events_kind_created_idx on public.events (kind, created_at desc);
create index if not exists events_user_idx on public.events (user_id);

-- Supabase по умолчанию выдаёт права на новые таблицы anon/authenticated — забираем
revoke all on table public.events from anon, authenticated;
-- лишние права на существующих таблицах (через PostgREST не эксплуатируются, но им там не место)
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;

create or replace function public.track_event(p_tid bigint, p_kind text, p_meta jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_uid bigint;
begin
  if p_kind is null or p_kind = '' or length(p_kind) > 40 then return; end if;
  select id into v_uid from users where telegram_id = p_tid;
  insert into events (user_id, tid, kind, meta)
  values (v_uid, p_tid, p_kind, coalesce(p_meta, '{}'::jsonb));
end;
$$;

revoke all on function public.track_event(bigint, text, jsonb) from public, anon, authenticated;
grant execute on function public.track_event(bigint, text, jsonb) to service_role;

-- Что смотреть: select * from analytics_daily; select * from analytics_activation;
create or replace view public.analytics_daily as
select
  d::date as day,
  (select count(*) from events e where e.kind = 'bot_start' and e.created_at::date = d::date) as bot_starts,
  (select count(*) from events e where e.kind = 'app_open' and e.created_at::date = d::date) as app_opens,
  (select count(*) from users u where u.created_at::date = d::date) as new_users,
  (select count(*) from posts p where p.created_at::date = d::date) as posts,
  (select count(distinct p.user_id) from posts p where p.created_at::date = d::date) as posting_users,
  (select count(*) from votes v where v.created_at::date = d::date) as votes
from generate_series(current_date - 29, current_date, interval '1 day') d
order by day desc;

create or replace view public.analytics_activation as
with u as (
  select
    users.id,
    users.created_at,
    (select min(p.created_at) from posts p where p.user_id = users.id) as first_post,
    (select min(v.created_at) from votes v where v.voter_id = users.id) as first_vote
  from users
)
select
  count(*) as users,
  count(*) filter (where first_post is not null) as posted,
  count(*) filter (where first_vote is not null) as voted,
  count(*) filter (where first_post is not null and first_post < created_at + interval '1 day') as posted_first_day,
  round(100.0 * count(*) filter (where first_post is not null) / nullif(count(*), 0), 1) as posted_pct
from u;

revoke all on table public.analytics_daily, public.analytics_activation from anon, authenticated;
