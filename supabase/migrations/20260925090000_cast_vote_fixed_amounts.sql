-- Суммы голоса объявлены публично — 10, 50 или 100. Раньше это правило жило только
-- в интерфейсе, сервер принимал любое положительное число, и один голос мог унести весь баланс.
-- Здесь же актуальная версия cast_vote целиком.
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

  update users set daily_credits = daily_credits - p_amount where id = v_voter_id;
  update posts set score = score + p_amount where id = p_post returning score into v_new_score;
  update users set style_score = style_score + p_amount where id = v_author;

  select telegram_id into v_author_tid from users where id = v_author;
  v_notify := public.should_notify(v_author, 'votes');

  return json_build_object(
    'new_score', v_new_score,
    'remaining_credits', v_credits - p_amount,
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
