-- Архив своих образов теперь умеет открываться на редактирование,
-- поэтому отдаём всё, что правится: стили, вещи и остальные фото.
create or replace function public.my_posts(p_tid bigint)
returns json
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(json_agg(json_build_object(
    'id', p.id, 'media_url', p.media_url, 'caption', p.caption,
    'score', p.score, 'hidden', p.hidden, 'created_at', p.created_at,
    'extra_media', coalesce(p.extra_media, '{}'::text[]),
    'style_id', p.style_id, 'style2_id', p.style2_id,
    'items', (
      select coalesce(json_agg(json_build_object(
        'category', i.category, 'brand', i.brand, 'name', i.name, 'price', pi.price
      ) order by pi.item_id), '[]'::json)
      from post_items pi join items i on i.id = pi.item_id
      where pi.post_id = p.id
    )
  ) order by p.created_at desc), '[]'::json)
  from posts p
  join users u on u.id = p.user_id
  where u.telegram_id = p_tid;
$$;

revoke all on function public.my_posts(bigint) from public, anon, authenticated;
grant execute on function public.my_posts(bigint) to service_role;
