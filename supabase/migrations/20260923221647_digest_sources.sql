-- Данные для напоминаний в боте. Считаем по Москве, уважаем настройки уведомлений.

-- Итог дня: кому сегодня накидали дрипов
create or replace function public.digest_daily()
returns json language sql stable security definer set search_path to 'public'
as $$
  with day_start as (
    select date_trunc('day', now() at time zone 'Europe/Moscow') at time zone 'Europe/Moscow' as ts
  ),
  week_start as (
    select date_trunc('week', now() at time zone 'Europe/Moscow') at time zone 'Europe/Moscow' as ts
  ),
  today as (
    select p.user_id, sum(v.amount)::int as drips
    from votes v join posts p on p.id = v.post_id cross join day_start d
    where v.created_at >= d.ts group by p.user_id
  ),
  week as (
    select p.user_id, sum(v.amount)::int as score
    from votes v join posts p on p.id = v.post_id cross join week_start w
    where v.created_at >= w.ts group by p.user_id
  ),
  ranked as (
    select user_id, score, row_number() over (order by score desc, user_id) as rank from week
  )
  select coalesce(json_agg(json_build_object('tid', u.telegram_id, 'drips', t.drips, 'rank', r.rank)), '[]'::json)
  from today t
  join users u on u.id = t.user_id
  left join ranked r on r.user_id = t.user_id
  where u.telegram_id is not null and public.should_notify(u.id, 'votes');
$$;

-- Утро понедельника: итог прошлой недели
create or replace function public.digest_weekly()
returns json language sql stable security definer set search_path to 'public'
as $$
  with bounds as (
    select (date_trunc('week', now() at time zone 'Europe/Moscow') - interval '1 week') at time zone 'Europe/Moscow' as from_ts,
           date_trunc('week', now() at time zone 'Europe/Moscow') at time zone 'Europe/Moscow' as to_ts
  ),
  last_week as (
    select p.user_id, sum(v.amount)::int as score
    from votes v join posts p on p.id = v.post_id cross join bounds b
    where v.created_at >= b.from_ts and v.created_at < b.to_ts group by p.user_id
  ),
  ranked as (
    select user_id, score, row_number() over (order by score desc, user_id) as rank from last_week
  )
  select coalesce(json_agg(json_build_object(
    'tid', u.telegram_id, 'rank', r.rank, 'score', r.score,
    'posted', exists (select 1 from posts p where p.user_id = u.id and p.hidden = false)
  )), '[]'::json)
  from users u
  left join ranked r on r.user_id = u.id
  where u.telegram_id is not null
    and public.should_notify(u.id, 'votes')
    and (r.rank is not null or exists (select 1 from posts p where p.user_id = u.id and p.hidden = false));
$$;

revoke all on function public.digest_daily() from public, anon, authenticated;
revoke all on function public.digest_weekly() from public, anon, authenticated;
grant execute on function public.digest_daily() to service_role;
grant execute on function public.digest_weekly() to service_role;
