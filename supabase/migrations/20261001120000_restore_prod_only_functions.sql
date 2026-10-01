-- Четыре функции жили только в живой базе: их применяли руками и не положили в репозиторий.
-- Сверено с продом один в один (pg_get_functiondef), поэтому применение ничего не меняет —
-- это снимок того, что уже работает. Нужно, чтобы базу можно было поднять с нуля:
-- без agent_stats слепнет аналитик и половина кнопок бота, без mod_* не работает модерация,
-- описанная в CLAUDE.md, без first_drip_left отваливается счётчик мест в приветствии бота.
--
-- rls_auto_enable сюда намеренно не входит: это служебная функция самой Supabase, не наша.

-- Сколько осталось мест в статусе first drip. Читают и бот, и приложение,
-- поэтому доступна публичным ролям: наружу уходит только число.
create or replace function public.first_drip_left()
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select greatest(0, 50 - (select count(distinct user_id)::int from posts))
$$;

-- Согласиться с жалобой: скрыть пост и закрыть все жалобы на него.
create or replace function public.mod_uphold(p_report_id bigint)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_post bigint; v_target bigint;
begin
  select post_id, target_uid into v_post, v_target from reports where id = p_report_id;
  if v_target is null and v_post is null then
    return json_build_object('ok', false, 'error', 'report_not_found');
  end if;

  if v_post is not null then
    update posts set hidden = true where id = v_post;
    update reports set status = 'reviewed', reviewed_at = now()
      where post_id = v_post and status = 'pending';
  else
    update reports set status = 'reviewed', reviewed_at = now()
      where id = p_report_id;
  end if;

  return json_build_object('ok', true, 'post_hidden', v_post);
end; $$;

-- Отклонить жалобу как необоснованную.
create or replace function public.mod_dismiss(p_report_id bigint)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update reports set status = 'dismissed', reviewed_at = now()
    where id = p_report_id and status = 'pending';
  if not found then
    return json_build_object('ok', false, 'error', 'not_pending');
  end if;
  return json_build_object('ok', true);
end; $$;

-- Готовые срезы статистики для агентов и кнопок бота. Произвольный SQL наружу не отдаём
-- намеренно: снаружи задаётся только имя среза и глубина в днях.
create or replace function public.agent_stats(p_name text, p_days integer)
returns json
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare d interval := make_interval(days => least(greatest(coalesce(p_days, 30), 1), 180));
begin
  if p_name = 'errors' then
    return (
      select coalesce(json_agg(json_build_object(
        'вид', kind, 'текст', msg, 'случаев', n, 'людей', ppl, 'последний_раз', last_at) order by n desc), '[]'::json)
      from (
        select kind, coalesce(meta->>'message', '—') as msg,
               count(*) n, count(distinct tid) ppl, max(created_at) last_at
        from events
        where kind in ('js_error', 'res_error', 'publish_failed') and created_at > now() - d
        group by kind, meta->>'message'
        order by count(*) desc limit 20
      ) t
    );

  elsif p_name = 'funnel' then
    return (
      select json_agg(json_build_object('шаг', шаг, 'людей', людей, 'событий', событий) order by ord)
      from (
        select 1 ord, 'открыл приложение' шаг, count(distinct tid) людей, count(*) событий from events where kind = 'app_open' and created_at > now() - d
        union all select 2, 'открыл композер', count(distinct tid), count(*) from events where kind = 'composer_opened' and created_at > now() - d
        union all select 3, 'нажал способ добавить фото', count(distinct tid), count(*) from events where kind = 'photo_way' and created_at > now() - d
        union all select 4, 'передумал в окне выбора', count(distinct tid), count(*) from events where kind = 'photo_cancelled' and created_at > now() - d
        union all select 5, 'добавил фото', count(distinct tid), count(*) from events where kind = 'photo_added' and created_at > now() - d
        union all select 6, 'выложил образ', count(distinct tid), count(*) from events where kind = 'post_created' and created_at > now() - d
      ) t
    );

  elsif p_name = 'exits' then
    return (
      select coalesce(json_agg(json_build_object('стадия', стадия, 'случаев', n, 'людей', ppl, 'секунд_в_среднем', sec)), '[]'::json)
      from (
        select coalesce(meta->>'stage', 'неизвестно') as стадия, count(*) n, count(distinct tid) ppl,
               round(avg((meta->>'sec')::numeric)) sec
        from events where kind = 'composer_closed' and created_at > now() - d
        group by 1
      ) t
    );

  elsif p_name = 'growth' then
    return json_build_object(
      'всего_юзеров', (select count(*) from users),
      'новых_за_период', (select count(*) from users where created_at > now() - d),
      'авторов_всего', (select count(distinct user_id) from posts),
      'постов_за_период', (select count(*) from posts where created_at > now() - d),
      'голосов_за_период', (select count(*) from votes where created_at > now() - d),
      'по_дням', (
        select coalesce(json_agg(json_build_object('день', день, 'новых', новых) order by день), '[]'::json)
        from (select date_trunc('day', created_at)::date день, count(*) новых from users where created_at > now() - d group by 1) t
      )
    );

  elsif p_name = 'retention' then
    return (
      select json_build_object(
        'заходили', count(*),
        'вернулись_на_другой_день', count(*) filter (where дней > 1),
        'дней_в_среднем', round(avg(дней), 2)
      )
      from (
        select tid, count(distinct created_at::date) дней
        from events where kind = 'app_open' and created_at > now() - d group by tid
      ) t
    );

  elsif p_name = 'content' then
    return json_build_object(
      'постов', (select count(*) from posts where created_at > now() - d),
      'с_вещами', (select count(distinct post_id) from post_items pi join posts p on p.id = pi.post_id where p.created_at > now() - d),
      'с_ценами', (select count(distinct post_id) from post_items pi join posts p on p.id = pi.post_id where p.created_at > now() - d and pi.price is not null),
      'стили', (
        select coalesce(json_agg(json_build_object('стиль', slug, 'постов', n) order by n desc), '[]'::json)
        from (select s.slug, count(*) n from posts p join styles s on s.id = p.style_id where p.created_at > now() - d group by s.slug) t
      )
    );

  elsif p_name = 'economy' then
    return json_build_object(
      'дрипов_на_руках', (select coalesce(sum(daily_credits), 0) from users),
      'очков_стиля_всего', (select coalesce(sum(style_score), 0) from users),
      'отдано_голосами_за_период', (select coalesce(sum(amount), 0) from votes where created_at > now() - d),
      'мест_first_drip_осталось', public.first_drip_left()
    );
  end if;

  return json_build_object('ошибка', 'неизвестный срез', 'доступны',
    json_build_array('funnel', 'exits', 'growth', 'retention', 'content', 'economy', 'errors'));
end $$;

-- Права как в проде. Модерация и статистика — только service_role: иначе любой мог бы
-- дёрнуть их по открытому ключу и скрывать чужие посты или читать цифры проекта.
revoke all on function public.mod_uphold(bigint) from public, anon, authenticated;
revoke all on function public.mod_dismiss(bigint) from public, anon, authenticated;
revoke all on function public.agent_stats(text, integer) from public, anon, authenticated;
grant execute on function public.mod_uphold(bigint) to service_role;
grant execute on function public.mod_dismiss(bigint) to service_role;
grant execute on function public.agent_stats(text, integer) to service_role;

grant execute on function public.first_drip_left() to anon, authenticated, service_role;

-- Перепись того, что реально есть в базе. Нужна, чтобы расхождение между продом и
-- репозиторием нельзя было не заметить: скрипт web/scripts/check-schema.mjs спрашивает
-- этот список и сравнивает с тем, что лежит в supabase/. Именно так четыре функции и
-- прожили в проде незамеченными — сверять их было нечем.
-- Наружу уходят только имена: ни тел функций, ни данных.
create or replace function public.schema_objects()
returns json
language sql
stable
security definer
set search_path to 'public'
as $$
  select json_build_object(
    'functions', (
      select coalesce(json_agg(proname order by proname), '[]'::json)
      from (select distinct p.proname from pg_proc p
            where p.pronamespace = 'public'::regnamespace and p.prokind = 'f') f
    ),
    'tables', (
      select coalesce(json_agg(tablename order by tablename), '[]'::json)
      from pg_tables where schemaname = 'public'
    ),
    'tables_without_rls', (
      select coalesce(json_agg(tablename order by tablename), '[]'::json)
      from pg_tables where schemaname = 'public' and not rowsecurity
    )
  )
$$;

revoke all on function public.schema_objects() from public, anon, authenticated;
grant execute on function public.schema_objects() to service_role;
