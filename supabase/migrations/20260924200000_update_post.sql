-- Правка уже опубликованного образа: подпись, стили и вещи.
-- Фото не трогаем намеренно: за него уже отдали дрипы, подменять картинку под голосами нельзя.
create or replace function public.update_post(
  p_tid bigint, p_post_id bigint, p_caption text, p_items jsonb,
  p_style_id bigint default null, p_style2_id bigint default null
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_uid bigint; v_owner bigint; v_item jsonb; v_item_id bigint; v_price int;
        v_style1 bigint; v_style2 bigint;
begin
  select id into v_uid from users where telegram_id = p_tid;
  if v_uid is null then raise exception 'NO_USER'; end if;

  select user_id into v_owner from posts where id = p_post_id;
  if v_owner is null then raise exception 'POST_NOT_FOUND'; end if;
  if v_owner <> v_uid then raise exception 'NOT_OWNER'; end if;

  v_style1 := coalesce(p_style_id, p_style2_id);
  v_style2 := case when p_style_id is not null and p_style2_id is distinct from p_style_id then p_style2_id end;

  update posts
     set caption = left(coalesce(p_caption, ''), 300),
         style_id = v_style1,
         style2_id = v_style2
   where id = p_post_id;

  -- вещи заменяем целиком: так правка «убрал одну, добавил другую» отрабатывает без диффа
  delete from post_items where post_id = p_post_id;

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
    insert into post_items (post_id, item_id, price) values (p_post_id, v_item_id, v_price)
      on conflict do nothing;
  end loop;

  return json_build_object('post_id', p_post_id);
end $$;

revoke all on function public.update_post(bigint, bigint, text, jsonb, bigint, bigint) from public, anon, authenticated;
grant execute on function public.update_post(bigint, bigint, text, jsonb, bigint, bigint) to service_role;
