-- Статус first drip — первым 50 авторам (было 100). Здесь же актуальная версия create_post
-- с проверкой ссылок и ограничением длин.
create or replace function public.create_post(
  p_tid bigint, p_username text, p_avatar text, p_media_url text, p_caption text, p_items jsonb,
  p_style_id bigint default null, p_style2_id bigint default null, p_extra_media text[] default '{}'
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_uid bigint; v_post bigint; v_item jsonb; v_item_id bigint;
        v_count int; v_reward int; v_balance bigint;
        v_ref bigint; v_ref_done boolean; v_ref_bonus int := 0;
        v_ref_tid bigint; v_ref_notify boolean; v_newbie_notify boolean;
        v_style1 bigint; v_style2 bigint; v_extra text[]; v_price int;
        v_posters int; v_badge text := null;
begin
  if not public.is_own_media(p_media_url) then raise exception 'BAD_MEDIA_URL'; end if;

  insert into users (telegram_id, username, avatar_url)
  values (p_tid, p_username, case when public.is_allowed_avatar(p_avatar) then p_avatar end)
  on conflict (telegram_id) do update
    set username = excluded.username,
        avatar_url = coalesce(excluded.avatar_url, users.avatar_url)
  returning id into v_uid;

  v_style1 := coalesce(p_style_id, p_style2_id);
  v_style2 := case when p_style_id is not null and p_style2_id is distinct from p_style_id then p_style2_id end;
  v_extra := array(
    select m from unnest(coalesce(p_extra_media, '{}'::text[])) m
    where public.is_own_media(m) limit 2
  );

  insert into posts (user_id, media_url, caption, score, style_id, style2_id, extra_media)
  values (v_uid, p_media_url, left(coalesce(p_caption, ''), 300), 0, v_style1, v_style2, v_extra)
  returning id into v_post;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    select id into v_item_id from items
      where lower(name) = lower(v_item->>'name')
        and lower(coalesce(brand,'')) = lower(coalesce(v_item->>'brand',''))
      limit 1;
    if v_item_id is null then
      insert into items (name, brand, category)
      values (left(v_item->>'name', 80), left(v_item->>'brand', 80), coalesce(v_item->>'category','other'))
      returning id into v_item_id;
    end if;
    v_price := case when (v_item->>'price') ~ '^\d{1,8}$' then least((v_item->>'price')::int, 10000000) end;
    insert into post_items (post_id, item_id, price) values (v_post, v_item_id, v_price)
      on conflict do nothing;
  end loop;

  select count(*) into v_count from posts where user_id = v_uid and hidden = false;
  v_reward := case when v_count <= 1 then 300 else 100 end;

  -- статус первым 50 авторам
  if v_count <= 1 then
    select count(distinct user_id) into v_posters from posts;
    if v_posters <= 50 then
      update users set badge = 'first_drip' where id = v_uid and badge is null
        returning badge into v_badge;
    end if;
  end if;

  select referred_by, ref_rewarded into v_ref, v_ref_done from users where id = v_uid;
  if v_ref is not null and v_ref_done = false then
    v_ref_bonus := 200;
    update users set daily_credits = daily_credits + 500 where id = v_ref;
    update users set ref_rewarded = true where id = v_uid;
    select telegram_id into v_ref_tid from users where id = v_ref;
    v_ref_notify := public.should_notify(v_ref, 'referral');
    v_newbie_notify := public.should_notify(v_uid, 'referral');
  end if;

  update users set daily_credits = daily_credits + v_reward + v_ref_bonus
    where id = v_uid returning daily_credits into v_balance;

  return json_build_object(
    'post_id', v_post, 'reward', v_reward, 'badge', v_badge,
    'ref_bonus', v_ref_bonus, 'balance', v_balance,
    'ref_uid', v_ref, 'ref_tid', v_ref_tid,
    'ref_notify', v_ref_notify, 'newbie_notify', v_newbie_notify
  );
end;
$$;

revoke all on function public.create_post(bigint, text, text, text, text, jsonb, bigint, bigint, text[]) from public, anon, authenticated;
grant execute on function public.create_post(bigint, text, text, text, text, jsonb, bigint, bigint, text[]) to service_role;
