-- Рейтинг сообщает, с какого момента считает период.
-- Повод: 1 октября вкладка «Месяц» оказалась пустой в обоих режимах — месяц обнулился в полночь,
-- а последний голос был 30 сентября. Данные верные, но экран выглядел сломанным,
-- потому что сказать «с такого-то числа пока пусто» было нечем.

-- Сигнатура та же, поэтому замена на месте: удалять функцию не нужно и опасно —
-- на время удаления рейтинг у живых людей отвечал бы ошибкой.
create or replace function public.leaderboard(
  p_period text default 'all',
  p_tid bigint default 0,
  p_limit int default 50,
  p_mode text default 'received'
)
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
  -- сколько человеку отдали: голоса за его образы
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
  -- сколько человек отдал сам
  give as (
    select v.voter_id as user_id,
      sum(v.amount) filter (where b.since is null or v.created_at >= b.since) as period_score,
      sum(v.amount) filter (where v.created_at >= now() - interval '24 hours'
                              and (b.since is null or v.created_at >= b.since)) as last24,
      sum(v.amount) filter (where v.created_at >= b.day_start) as today
    from votes v
    cross join b
    group by v.voter_id
  ),
  agg as (
    select * from recv where p_mode is distinct from 'given'
    union all
    select * from give where p_mode = 'given'
  ),
  scored as (
    select u.id, u.telegram_id, u.username, u.display_name, u.avatar_url, u.hide_username,
      case when b.since is null
           then (case when p_mode = 'given' then u.given_score else u.style_score end)
           else coalesce(a.period_score, 0) end as score,
      coalesce(a.last24, 0) as last24,
      coalesce(a.today, 0) as today
    from users u
    cross join b
    left join agg a on a.user_id = u.id
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
    'mode', case when p_mode = 'given' then 'given' else 'received' end,
    -- начало периода: без него на первое число месяца экран выглядит сломанным,
    -- хотя он просто пуст — сказать «с 1 октября голосов не было» можно только зная дату
    'since', (select since from b),
    'reset_at', (select reset_at from b),
    'items', coalesce((
      select json_agg(json_build_object(
        'id', r.id,
        'username', case when r.hide_username then null else r.username end,
        'display_name', r.display_name,
        'avatar_url', r.avatar_url,
        -- в режиме «отдано» здесь лежит отданное; ключ общий, чтобы не плодить ветки в интерфейсе
        'style_score', r.score,
        'rank', r.rank,
        'rank_delta', case when r.score - r.last24 > 0 then r.prev_rank - r.rank end,
        'style', case when ms.user_id is null then null
                      else json_build_object('name_ru', ms.name_ru, 'name_en', ms.name_en) end
      ) order by r.rank)
      from ranked r
      left join main_style ms on ms.user_id = r.id
      where r.rank <= greatest(1, least(p_limit, 100))
        -- в доске щедрости нули прячем всегда: «отдал 0» — это не место в рейтинге
        and ((p_period = 'all' and p_mode is distinct from 'given') or r.score > 0)
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

revoke all on function public.leaderboard(text, bigint, int, text) from public;
grant execute on function public.leaderboard(text, bigint, int, text) to anon, authenticated, service_role;
