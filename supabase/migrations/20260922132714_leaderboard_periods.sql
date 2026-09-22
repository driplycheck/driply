-- Рейтинг по периодам: неделя / месяц (по Москве, сброс в понедельник и 1-го числа) / всё время.
-- Только чтение: очки периода = сумма голосов за образы автора с начала периода.
-- rank_delta — сколько мест человек поднялся за последние 24 часа (минус — опустился);
-- null, если сутки назад очков не было: место среди нулей ничего не значит.
create or replace function public.leaderboard(p_period text default 'all', p_tid bigint default 0, p_limit int default 50)
returns json
language sql
stable
security definer
set search_path to 'public'
as $$
  with b as (
    select
      case p_period
        when 'week'  then date_trunc('week',  now() at time zone 'Europe/Moscow') at time zone 'Europe/Moscow'
        when 'month' then date_trunc('month', now() at time zone 'Europe/Moscow') at time zone 'Europe/Moscow'
      end as since,
      case p_period
        when 'week'  then (date_trunc('week',  now() at time zone 'Europe/Moscow') + interval '1 week')  at time zone 'Europe/Moscow'
        when 'month' then (date_trunc('month', now() at time zone 'Europe/Moscow') + interval '1 month') at time zone 'Europe/Moscow'
      end as reset_at,
      date_trunc('day', now() at time zone 'Europe/Moscow') at time zone 'Europe/Moscow' as day_start
  ),
  recv as (
    select p.user_id,
      sum(v.amount) filter (where b.since is null or v.created_at >= b.since) as period_score,
      sum(v.amount) filter (where v.created_at >= now() - interval '24 hours'
                              and (b.since is null or v.created_at >= b.since)) as last24,
      sum(v.amount) filter (where v.created_at >= b.day_start) as today
    from votes v
    join posts p on p.id = v.post_id
    cross join b
    group by p.user_id
  ),
  scored as (
    select u.id, u.telegram_id, u.username, u.display_name, u.avatar_url, u.hide_username,
      case when b.since is null then u.style_score else coalesce(r.period_score, 0) end as score,
      coalesce(r.last24, 0) as last24,
      coalesce(r.today, 0) as today
    from users u
    cross join b
    left join recv r on r.user_id = u.id
  ),
  ranked as (
    select s.*,
      row_number() over (order by s.score desc, s.id) as rank,
      row_number() over (order by s.score - s.last24 desc, s.id) as prev_rank
    from scored s
  ),
  main_style as (
    select distinct on (p.user_id) p.user_id, st.name_ru, st.name_en
    from posts p
    join styles st on st.id = p.style_id
    where not p.hidden
    group by p.user_id, st.id, st.name_ru, st.name_en
    order by p.user_id, count(*) desc, max(p.created_at) desc
  )
  select json_build_object(
    'period', coalesce(nullif(p_period, ''), 'all'),
    'reset_at', (select reset_at from b),
    'items', coalesce((
      select json_agg(json_build_object(
        'id', r.id,
        'username', case when r.hide_username then null else r.username end,
        'display_name', r.display_name,
        'avatar_url', r.avatar_url,
        'style_score', r.score,
        'rank', r.rank,
        'rank_delta', case when r.score - r.last24 > 0 then r.prev_rank - r.rank end,
        'style', case when ms.user_id is null then null
                      else json_build_object('name_ru', ms.name_ru, 'name_en', ms.name_en) end
      ) order by r.rank)
      from ranked r
      left join main_style ms on ms.user_id = r.id
      where r.rank <= greatest(1, least(p_limit, 100))
        and (p_period = 'all' or r.score > 0)
    ), '[]'::json),
    'me', (
      select json_build_object('id', r.id,
                               'rank', case when r.score > 0 then r.rank end,
                               'score', r.score,
                               'rank_delta', case when r.score > 0 and r.score - r.last24 > 0 then r.prev_rank - r.rank end,
                               'today', r.today)
      from ranked r
      where p_tid <> 0 and r.telegram_id = p_tid
    )
  );
$$;

revoke all on function public.leaderboard(text, bigint, int) from public;
grant execute on function public.leaderboard(text, bigint, int) to anon, authenticated, service_role;
