-- В проекте service_role не имеет прав на таблицы: всё пишется через security definer RPC.
-- Прямые .from() из edge-функций падали с permission denied, поэтому поддержка молчала.

create or replace function public.support_add(p_tid bigint, p_kind text, p_body text)
returns table (id bigint, display_name text)
language plpgsql security definer set search_path to 'public' as $$
declare v_uid bigint; v_name text; v_id bigint;
begin
  select u.id, u.display_name into v_uid, v_name from users u where u.telegram_id = p_tid;
  insert into support_messages (user_id, tid, direction, body, kind)
  values (v_uid, p_tid, 'in', left(p_body, 1000), coalesce(nullif(p_kind, ''), 'bug'))
  returning support_messages.id into v_id;
  return query select v_id, v_name;
end $$;

create or replace function public.support_add_reply(p_tid bigint, p_body text)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  insert into support_messages (user_id, tid, direction, body)
  values ((select u.id from users u where u.telegram_id = p_tid), p_tid, 'out', left(p_body, 1000));
end $$;

create or replace function public.support_mark_sent(p_id bigint, p_msg_id bigint)
returns void language sql security definer set search_path to 'public' as $$
  update support_messages set tg_message_id = p_msg_id where id = p_id
$$;

-- кому адресован ответ: ищем по id сообщения, которое бот прислал модератору
create or replace function public.support_by_message(p_msg_id bigint)
returns table (tid bigint)
language sql security definer set search_path to 'public' as $$
  select s.tid from support_messages s where s.tg_message_id = p_msg_id limit 1
$$;

create or replace function public.support_routing_get()
returns table (chat_id bigint, thread_bug bigint, thread_idea bigint, thread_partner bigint)
language sql security definer set search_path to 'public' as $$
  select r.chat_id, r.thread_bug, r.thread_idea, r.thread_partner from support_routing r where r.id = 1
$$;

-- привязка одной темы; смена группы обнуляет остальные темы, чтобы не остались чужие id
create or replace function public.support_routing_set(p_chat_id bigint, p_kind text, p_thread bigint)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  insert into support_routing (id, chat_id) values (1, p_chat_id)
  on conflict (id) do update set
    chat_id        = excluded.chat_id,
    thread_bug     = case when support_routing.chat_id = excluded.chat_id then support_routing.thread_bug else null end,
    thread_idea    = case when support_routing.chat_id = excluded.chat_id then support_routing.thread_idea else null end,
    thread_partner = case when support_routing.chat_id = excluded.chat_id then support_routing.thread_partner else null end;

  update support_routing set
    thread_bug     = case when p_kind = 'bug'     then p_thread else thread_bug end,
    thread_idea    = case when p_kind = 'idea'    then p_thread else thread_idea end,
    thread_partner = case when p_kind = 'partner' then p_thread else thread_partner end,
    updated_at = now()
  where id = 1;
end $$;

revoke all on function public.support_add(bigint, text, text) from public, anon, authenticated;
revoke all on function public.support_add_reply(bigint, text) from public, anon, authenticated;
revoke all on function public.support_mark_sent(bigint, bigint) from public, anon, authenticated;
revoke all on function public.support_by_message(bigint) from public, anon, authenticated;
revoke all on function public.support_routing_get() from public, anon, authenticated;
revoke all on function public.support_routing_set(bigint, text, bigint) from public, anon, authenticated;

grant execute on function public.support_add(bigint, text, text) to service_role;
grant execute on function public.support_add_reply(bigint, text) to service_role;
grant execute on function public.support_mark_sent(bigint, bigint) to service_role;
grant execute on function public.support_by_message(bigint) to service_role;
grant execute on function public.support_routing_get() to service_role;
grant execute on function public.support_routing_set(bigint, text, bigint) to service_role;
