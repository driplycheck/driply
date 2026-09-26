-- Согласие с документами: фиксируем версию и момент, иначе согласие нечем подтвердить.
alter table public.users add column if not exists terms_version text;
alter table public.users add column if not exists terms_accepted_at timestamptz;

create or replace function public.accept_terms(p_tid bigint, p_version text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_uid bigint;
begin
  select id into v_uid from users where telegram_id = p_tid;
  if v_uid is null then raise exception 'NO_USER'; end if;

  update users
     set terms_version = left(coalesce(p_version, ''), 40),
         terms_accepted_at = now()
   where id = v_uid;

  return json_build_object('version', p_version, 'accepted_at', now());
end $$;

revoke all on function public.accept_terms(bigint, text) from public, anon, authenticated;
grant execute on function public.accept_terms(bigint, text) to service_role;

-- приложению нужно знать, с какой версией человек согласился
create or replace function public.my_profile(p_tid bigint)
returns json
language sql
stable
security definer
set search_path to 'public'
as $$
  select case when u.id is null then null else json_build_object(
    'id', u.id, 'display_name', u.display_name, 'avatar_url', u.avatar_url, 'bio', u.bio,
    'style_score', u.style_score, 'hide_username', u.hide_username, 'daily_credits', u.daily_credits,
    'is_founder', u.is_founder, 'gender', u.gender, 'allow_dm', u.allow_dm,
    'notify_prefs', u.notify_prefs, 'terms_version', u.terms_version
  ) end
  from users u where u.telegram_id = p_tid;
$$;

revoke all on function public.my_profile(bigint) from public, anon, authenticated;
grant execute on function public.my_profile(bigint) to service_role;
