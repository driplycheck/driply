-- Профиль: аватарка только из разрешённых источников, длины ограничены, пол из списка.
create or replace function public.set_profile(
  p_tid bigint, p_username text, p_avatar text, p_display_name text, p_bio text,
  p_hide_username boolean, p_gender text, p_allow_dm boolean default null
)
returns json language plpgsql security definer set search_path to 'public'
as $$
declare v_uid bigint; v_name text; v_bio text; v_gender text;
begin
  if p_display_name is not null and p_display_name = '' then
    raise exception 'EMPTY_NICKNAME';
  end if;
  if not public.is_allowed_avatar(p_avatar) then
    raise exception 'BAD_AVATAR_URL';
  end if;

  v_name := left(nullif(p_display_name, ''), 24);
  v_bio := case when p_bio is null then null else left(p_bio, 160) end;
  v_gender := case when p_gender in ('male', 'female') then p_gender end;

  insert into users (telegram_id, username, avatar_url, display_name)
  values (p_tid, p_username, p_avatar, v_name)
  on conflict (telegram_id) do update set
    username = excluded.username,
    avatar_url = coalesce(excluded.avatar_url, users.avatar_url),
    display_name = coalesce(v_name, users.display_name),
    bio = case when p_bio is null then users.bio
               when v_bio = '' then null else v_bio end,
    hide_username = coalesce(p_hide_username, users.hide_username),
    gender = coalesce(v_gender, users.gender),
    allow_dm = coalesce(p_allow_dm, users.allow_dm)
  returning id into v_uid;

  return (select row_to_json(u) from (
    select id, username, display_name, avatar_url, bio,
           hide_username, gender, allow_dm from users where id = v_uid
  ) u);
end;
$$;

revoke all on function public.set_profile(bigint, text, text, text, text, boolean, text, boolean) from public, anon, authenticated;
grant execute on function public.set_profile(bigint, text, text, text, text, boolean, text, boolean) to service_role;
