-- Отданные дрипы становятся видимой величиной.
--
-- Зачем: приложение держится на том, что люди голосуют друг за друга, но вознаграждалось
-- только получение. Человек, отдавший больше всех (19 голосов, 1750 дрипов), имел ноль очков
-- и стоял в рейтинге последним — по меркам продукта он был никем. Отдавать было невыгодно и
-- невидимо, поэтому 16 человек из 31 не проголосовали ни разу.
--
-- given_score — зеркало style_score: сколько человек отдал за всё время.
-- Денормализуем так же, как style_score: рейтинг и профиль читают одно поле, а не агрегат.

alter table public.users add column if not exists given_score bigint not null default 0;

-- Разовый пересчёт по уже отданным голосам: без него у всех был бы ноль,
-- и самые щедрые выглядели бы новичками.
update public.users u
set given_score = coalesce(g.total, 0)
from (select voter_id, sum(amount) as total from public.votes group by voter_id) g
where g.voter_id = u.id and u.given_score <> coalesce(g.total, 0);

-- Публичное поле: его видно в чужом профиле, в этом весь смысл.
grant select (given_score) on public.users to anon, authenticated;

-- cast_vote теперь ведёт обе стороны сделки: у голосующего растёт отданное,
-- у автора — очки стиля. Остальное тело без изменений.
create or replace function public.cast_vote(p_tid bigint, p_username text, p_avatar text, p_post bigint, p_amount integer)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_voter_id bigint;
  v_credits  int;
  v_author   bigint;
  v_new_score bigint;
  v_author_tid bigint;
  v_notify boolean;
  v_given bigint;
begin
  if p_amount not in (10, 50, 100) then raise exception 'INVALID_AMOUNT'; end if;

  insert into users (telegram_id, username, avatar_url)
  values (p_tid, p_username, p_avatar)
  on conflict (telegram_id) do update
    set username = excluded.username,
        avatar_url = coalesce(excluded.avatar_url, users.avatar_url)
  returning id, daily_credits into v_voter_id, v_credits;

  select user_id into v_author from posts where id = p_post;
  if v_author is null then raise exception 'POST_NOT_FOUND'; end if;
  if v_author = v_voter_id then raise exception 'CANNOT_VOTE_OWN'; end if;
  if v_credits < p_amount then raise exception 'NOT_ENOUGH_CREDITS'; end if;

  insert into votes (post_id, voter_id, amount) values (p_post, v_voter_id, p_amount);

  update users set daily_credits = daily_credits - p_amount,
                   given_score = given_score + p_amount
    where id = v_voter_id
    returning given_score into v_given;
  update posts set score = score + p_amount where id = p_post returning score into v_new_score;
  update users set style_score = style_score + p_amount where id = v_author;

  select telegram_id into v_author_tid from users where id = v_author;
  v_notify := public.should_notify(v_author, 'votes');

  return json_build_object(
    'new_score', v_new_score,
    'remaining_credits', v_credits - p_amount,
    'given_score', v_given,
    'author_tid', v_author_tid,
    'author_notify', v_notify,
    'voter_name', coalesce(p_username, 'Кто-то'),
    'amount', p_amount
  );
exception
  when unique_violation then raise exception 'ALREADY_VOTED';
end;
$function$;

revoke all on function public.cast_vote(bigint, text, text, bigint, integer) from public, anon, authenticated;
grant execute on function public.cast_vote(bigint, text, text, bigint, integer) to service_role;

-- Рейтинг получает вторую ось: кого поддержали и кто поддержал.
-- Старую трёхпараметровую версию убираем, иначе Postgres не сможет выбрать между ними.
-- Проверено: внутри базы leaderboard никто не вызывает, только фронт.
drop function if exists public.leaderboard(text, bigint, int);

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
