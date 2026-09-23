-- Модерация из приложения. Право проверяется в самой базе: только is_founder.
-- Вызывать может лишь service_role (через quick-handler с подписью Telegram).

create or replace function public.is_moderator(p_tid bigint)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select coalesce((select is_founder from users where telegram_id = p_tid), false);
$$;

create or replace function public.mod_queue(p_tid bigint)
returns json language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.is_moderator(p_tid) then raise exception 'FORBIDDEN'; end if;

  return coalesce((
    select json_agg(json_build_object(
      'report_id', q.report_id, 'reason', q.reason, 'created_at', q.created_at,
      'post_id', q.post_id, 'media_url', q.media_url, 'caption', q.caption,
      'post_hidden', q.post_already_hidden, 'target_uid', q.target_uid,
      'reported_name', coalesce(q.reported_name, '@' || q.reported_username),
      'reporter', q.reporter_username, 'reports_on_user', q.reports_on_this_user
    ) order by q.reports_on_this_user desc, q.created_at)
    from moderation_queue q
  ), '[]'::json);
end;
$$;

-- Действия: скрыть образ, отклонить жалобу, скрыть все образы автора
create or replace function public.mod_act(p_tid bigint, p_report_id bigint, p_action text)
returns json language plpgsql security definer set search_path to 'public'
as $$
declare v_target bigint; v_hidden int;
begin
  if not public.is_moderator(p_tid) then raise exception 'FORBIDDEN'; end if;

  if p_action = 'uphold' then
    return public.mod_uphold(p_report_id);
  elsif p_action = 'dismiss' then
    return public.mod_dismiss(p_report_id);
  elsif p_action = 'hide_author' then
    select target_uid into v_target from reports where id = p_report_id;
    if v_target is null then return json_build_object('ok', false, 'error', 'no_target'); end if;
    update posts set hidden = true where user_id = v_target and hidden = false;
    get diagnostics v_hidden = row_count;
    update reports set status = 'reviewed', reviewed_at = now()
      where target_uid = v_target and status = 'pending';
    return json_build_object('ok', true, 'hidden_posts', v_hidden);
  end if;

  return json_build_object('ok', false, 'error', 'unknown_action');
end;
$$;

revoke all on function public.is_moderator(bigint) from public, anon, authenticated;
revoke all on function public.mod_queue(bigint) from public, anon, authenticated;
revoke all on function public.mod_act(bigint, bigint, text) from public, anon, authenticated;
grant execute on function public.is_moderator(bigint) to service_role;
grant execute on function public.mod_queue(bigint) to service_role;
grant execute on function public.mod_act(bigint, bigint, text) to service_role;
