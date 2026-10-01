-- Основателей может быть несколько.
--
-- Было: права в боте определялись сравнением с `support_moderator_tid()` — а она возвращает
-- одного человека, того, кто завёлся первым. Второй основатель не мог ничего: ни запустить
-- агента, ни ответить человеку в поддержку, ни опубликовать пост. Теперь бот спрашивает
-- `is_moderator(tid)`, то есть флаг в базе, и таких людей может быть сколько угодно.
--
-- Сами функции не меняются: `is_moderator` уже умела отвечать по флагу,
-- а `support_moderator_tid` остаётся — но только как запасной адрес для обращений,
-- если рабочая группа ещё не настроена.

-- Кто сейчас в штабе. Отдаём и имя, чтобы в списке было понятно, кто есть кто.
create or replace function public.support_staff_list()
returns json
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(json_agg(json_build_object(
    'tid', telegram_id,
    'name', coalesce(nullif(display_name, ''), '@' || coalesce(username, '')),
    'username', username,
    'badge', badge
  ) order by id), '[]'::json)
  from users where is_founder
$$;

-- Выдать или снять права. Человек должен уже быть в приложении: права выдаются
-- существующему аккаунту, а не телефонному номеру.
create or replace function public.support_staff_set(p_tid bigint, p_on boolean)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_name text;
begin
  update users set is_founder = p_on
  where telegram_id = p_tid
  returning coalesce(nullif(display_name, ''), '@' || coalesce(username, '')) into v_name;

  if v_name is null then
    return json_build_object('ok', false, 'error', 'not_found');
  end if;
  return json_build_object('ok', true, 'name', v_name, 'on', p_on);
end; $$;

revoke all on function public.support_staff_list() from public, anon, authenticated;
revoke all on function public.support_staff_set(bigint, boolean) from public, anon, authenticated;
grant execute on function public.support_staff_list() to service_role;
grant execute on function public.support_staff_set(bigint, boolean) to service_role;

-- Второй основатель: Ваня (@okkdkks). Метка «сооснователь» у него стояла с июня,
-- а флага прав не было — отсюда и то, что бот его не слушался.
update public.users set is_founder = true
where telegram_id = 5822071261 and badge = 'cofounder';
