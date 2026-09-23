-- Ленты отдают slug стиля: по нему фронт подбирает иконку набора (эмодзи из базы больше не используется).

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
        json_build_object('id', s.id, 'slug', s.slug, 'name_ru', s.name_ru, 'name_en', s.name_en)
      else null end as style,
      case when s2.id is not null then
        json_build_object('id', s2.id, 'slug', s2.slug, 'name_ru', s2.name_ru, 'name_en', s2.name_en)
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
        json_build_object('id', s.id, 'slug', s.slug, 'name_ru', s.name_ru, 'name_en', s.name_en)
      else null end as style,
      case when s2.id is not null then
        json_build_object('id', s2.id, 'slug', s2.slug, 'name_ru', s2.name_ru, 'name_en', s2.name_en)
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

