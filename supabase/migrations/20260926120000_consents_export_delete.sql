-- Три согласия по 152-ФЗ, выгрузка данных и самостоятельное удаление аккаунта.
create table if not exists public.consents (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('terms', 'processing', 'publication')),
  version text not null,
  accepted boolean not null default true,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.consents enable row level security;
revoke all on table public.consents from anon, authenticated;
revoke all on sequence public.consents_id_seq from anon, authenticated;
create index if not exists consents_user_idx on public.consents (user_id, kind, created_at desc);

-- Записываем сразу три согласия: частичное согласие в интерфейсе невозможно.
create or replace function public.accept_consents(p_tid bigint, p_version text, p_details jsonb default '{}'::jsonb)
returns json
language plpgsql security definer set search_path to 'public'
as $$
declare v_uid bigint; v_kind text;
begin
  select id into v_uid from users where telegram_id = p_tid;
  if v_uid is null then raise exception 'NO_USER'; end if;

  foreach v_kind in array array['terms', 'processing', 'publication'] loop
    insert into consents (user_id, kind, version, details)
    values (v_uid, v_kind, left(coalesce(p_version, ''), 40), coalesce(p_details, '{}'::jsonb));
  end loop;

  update users set terms_version = left(coalesce(p_version, ''), 40), terms_accepted_at = now() where id = v_uid;
  return json_build_object('version', p_version, 'accepted_at', now());
end $$;

-- Копия своих данных: право по ст. 14 152-ФЗ.
create or replace function public.export_my_data(p_tid bigint)
returns json
language sql stable security definer set search_path to 'public'
as $$
  select json_build_object(
    'выгружено', now(),
    'профиль', (select to_jsonb(u) - 'ref_code' from users u where u.telegram_id = p_tid),
    'образы', (select coalesce(json_agg(to_jsonb(p) order by p.created_at), '[]'::json)
               from posts p join users u on u.id = p.user_id where u.telegram_id = p_tid),
    'вещи_в_образах', (select coalesce(json_agg(json_build_object(
                          'образ', pi.post_id, 'бренд', i.brand, 'название', i.name, 'цена', pi.price)), '[]'::json)
                       from post_items pi join items i on i.id = pi.item_id
                       join posts p on p.id = pi.post_id join users u on u.id = p.user_id
                       where u.telegram_id = p_tid),
    'мои_оценки', (select coalesce(json_agg(json_build_object(
                      'образ', v.post_id, 'дрипов', v.amount, 'когда', v.created_at) order by v.created_at), '[]'::json)
                   from votes v join users u on u.id = v.voter_id where u.telegram_id = p_tid),
    'подписки', (select coalesce(json_agg(f.following_id), '[]'::json)
                 from follows f join users u on u.id = f.follower_id where u.telegram_id = p_tid),
    'подписчики', (select coalesce(json_agg(f.follower_id), '[]'::json)
                   from follows f join users u on u.id = f.following_id where u.telegram_id = p_tid),
    'чёрный_список', (select coalesce(json_agg(b.blocked_id), '[]'::json)
                      from blocks b join users u on u.id = b.blocker_id where u.telegram_id = p_tid),
    'обращения', (select coalesce(json_agg(json_build_object(
                     'направление', s.direction, 'текст', s.body, 'когда', s.created_at) order by s.created_at), '[]'::json)
                  from support_messages s where s.tid = p_tid),
    'согласия', (select coalesce(json_agg(json_build_object(
                    'что', c.kind, 'версия', c.version, 'когда', c.created_at) order by c.created_at), '[]'::json)
                 from consents c join users u on u.id = c.user_id where u.telegram_id = p_tid)
  );
$$;

-- Удаление аккаунта самим человеком, без обращения в поддержку.
create or replace function public.delete_my_account(p_tid bigint)
returns json
language plpgsql security definer set search_path to 'public'
as $$
declare v_uid bigint; v_posts int;
begin
  select id into v_uid from users where telegram_id = p_tid;
  if v_uid is null then raise exception 'NO_USER'; end if;
  select count(*) into v_posts from posts where user_id = v_uid;

  delete from votes where voter_id = v_uid;
  delete from follows where follower_id = v_uid or following_id = v_uid;
  delete from blocks where blocker_id = v_uid or blocked_id = v_uid;
  delete from reports where reporter_id = v_uid or target_uid = v_uid;
  delete from post_items where post_id in (select id from posts where user_id = v_uid);
  delete from posts where user_id = v_uid;
  delete from support_messages where tid = p_tid;
  delete from events where tid = p_tid;
  delete from consents where user_id = v_uid;
  delete from users where id = v_uid;

  return json_build_object('deleted', true, 'posts', v_posts);
end $$;

revoke all on function public.accept_consents(bigint, text, jsonb) from public, anon, authenticated;
revoke all on function public.export_my_data(bigint) from public, anon, authenticated;
revoke all on function public.delete_my_account(bigint) from public, anon, authenticated;
grant execute on function public.accept_consents(bigint, text, jsonb) to service_role;
grant execute on function public.export_my_data(bigint) to service_role;
grant execute on function public.delete_my_account(bigint) to service_role;
