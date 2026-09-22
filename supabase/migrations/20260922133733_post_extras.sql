-- Образы: второй стиль, до двух дополнительных фото, цена вещи.

alter table public.posts add column if not exists style2_id bigint references public.styles(id) on delete set null;
alter table public.posts add column if not exists extra_media text[] not null default '{}';
alter table public.posts drop constraint if exists posts_extra_media_max;
alter table public.posts add constraint posts_extra_media_max check (cardinality(extra_media) <= 2);
alter table public.posts drop constraint if exists posts_styles_distinct;
alter table public.posts add constraint posts_styles_distinct check (style2_id is null or style2_id <> style_id);
create index if not exists posts_style2_id_idx on public.posts (style2_id);
grant select (style2_id, extra_media) on public.posts to anon, authenticated;

alter table public.post_items add column if not exists price integer;
alter table public.post_items drop constraint if exists post_items_price_range;
alter table public.post_items add constraint post_items_price_range check (price is null or price between 0 and 10000000);

-- create_post: новая сигнатура (+ второй стиль, доп. фото, цена вещи); старую убираем, чтобы не было перегрузки
drop function if exists public.create_post(bigint, text, text, text, text, jsonb, bigint);

create function public.create_post(
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
begin
  insert into users (telegram_id, username, avatar_url)
  values (p_tid, p_username, p_avatar)
  on conflict (telegram_id) do update
    set username = excluded.username,
        avatar_url = coalesce(excluded.avatar_url, users.avatar_url)
  returning id into v_uid;

  -- второй стиль без первого становится первым; одинаковые не дублируем
  v_style1 := coalesce(p_style_id, p_style2_id);
  v_style2 := case when p_style_id is not null and p_style2_id is distinct from p_style_id then p_style2_id end;
  v_extra := array(select m from unnest(coalesce(p_extra_media, '{}'::text[])) m where coalesce(m, '') <> '' limit 2);

  insert into posts (user_id, media_url, caption, score, style_id, style2_id, extra_media)
  values (v_uid, p_media_url, p_caption, 0, v_style1, v_style2, v_extra)
  returning id into v_post;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    select id into v_item_id from items
      where lower(name) = lower(v_item->>'name')
        and lower(coalesce(brand,'')) = lower(coalesce(v_item->>'brand',''))
      limit 1;
    if v_item_id is null then
      insert into items (name, brand, category)
      values (v_item->>'name', v_item->>'brand', coalesce(v_item->>'category','other'))
      returning id into v_item_id;
    end if;
    v_price := case when (v_item->>'price') ~ '^\d{1,8}$' then least((v_item->>'price')::int, 10000000) end;
    insert into post_items (post_id, item_id, price) values (v_post, v_item_id, v_price)
      on conflict do nothing;
  end loop;

  select count(*) into v_count from posts where user_id = v_uid and hidden = false;
  v_reward := case when v_count <= 1 then 300 else 100 end;

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
    'post_id', v_post, 'reward', v_reward,
    'ref_bonus', v_ref_bonus, 'balance', v_balance,
    'ref_uid', v_ref, 'ref_tid', v_ref_tid,
    'ref_notify', v_ref_notify, 'newbie_notify', v_newbie_notify
  );
end;
$$;

revoke all on function public.create_post(bigint, text, text, text, text, jsonb, bigint, bigint, text[]) from public, anon, authenticated;
grant execute on function public.create_post(bigint, text, text, text, text, jsonb, bigint, bigint, text[]) to service_role;

-- ленты: + второй стиль, доп. фото, цена вещи (предикаты не менялись)
create or replace function public.main_feed(p_uid bigint)
returns json
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(json_agg(t order by t.created_at desc), '[]'::json)
  from (
    select
      p.id, p.media_url, p.extra_media, p.caption, p.score, p.created_at,
      exists(select 1 from votes v where v.post_id = p.id and v.voter_id = p_uid) as voted,
      json_build_object(
        'id', u.id, 'username', u.username, 'display_name', u.display_name,
        'avatar_url', u.avatar_url, 'style_score', u.style_score
      ) as users,
      case when s.id is not null then
        json_build_object('id', s.id, 'name_ru', s.name_ru, 'name_en', s.name_en, 'emoji', s.emoji)
      else null end as style,
      case when s2.id is not null then
        json_build_object('id', s2.id, 'name_ru', s2.name_ru, 'name_en', s2.name_en, 'emoji', s2.emoji)
      else null end as style2,
      coalesce((
        select json_agg(json_build_object(
          'price', pi.price,
          'items', json_build_object('name', i.name, 'brand', i.brand, 'category', i.category)
        ))
        from post_items pi join items i on i.id = pi.item_id
        where pi.post_id = p.id
      ), '[]'::json) as post_items
    from posts p
    join users u on u.id = p.user_id
    left join styles s on s.id = p.style_id
    left join styles s2 on s2.id = p.style2_id
    where p.hidden = false
      and (p_uid = 0 or not public.is_blocked(p_uid, p.user_id))
      and (p_uid = 0 or not public.has_reported(p_uid, p.id))
  ) t;
$$;

create or replace function public.following_feed(p_uid bigint)
returns json
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(json_agg(t order by t.created_at desc), '[]'::json)
  from (
    select
      p.id, p.media_url, p.extra_media, p.caption, p.score, p.created_at,
      json_build_object(
        'id', u.id, 'username', u.username, 'display_name', u.display_name,
        'avatar_url', u.avatar_url, 'style_score', u.style_score
      ) as users,
      case when s.id is not null then
        json_build_object('id', s.id, 'name_ru', s.name_ru, 'name_en', s.name_en, 'emoji', s.emoji)
      else null end as style,
      case when s2.id is not null then
        json_build_object('id', s2.id, 'name_ru', s2.name_ru, 'name_en', s2.name_en, 'emoji', s2.emoji)
      else null end as style2,
      coalesce((
        select json_agg(json_build_object(
          'price', pi.price,
          'items', json_build_object('name', i.name, 'brand', i.brand, 'category', i.category)
        ))
        from post_items pi join items i on i.id = pi.item_id
        where pi.post_id = p.id
      ), '[]'::json) as post_items
    from posts p
    join users u on u.id = p.user_id
    left join styles s on s.id = p.style_id
    left join styles s2 on s2.id = p.style2_id
    where p.hidden = false
      and p.user_id in (select following_id from follows where follower_id = p_uid)
      and not public.is_blocked(p_uid, p.user_id)
      and not public.has_reported(p_uid, p.id)
  ) t;
$$;

create or replace function public.posts_by_style(p_uid bigint, p_style_id bigint)
returns json
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(json_agg(json_build_object(
    'id', p.id, 'media_url', p.media_url, 'score', p.score
  ) order by p.score desc, p.created_at desc), '[]'::json)
  from posts p
  where (p.style_id = p_style_id or p.style2_id = p_style_id)
    and p.hidden = false
    and (p_uid = 0 or not public.is_blocked(p_uid, p.user_id));
$$;
