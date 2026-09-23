-- Безопасность: ссылки принимаем только свои, действия ограничиваем по частоте.
-- (Проверка ссылок внутри create_post — в миграции 20260923221421, там актуальная версия функции.)

create or replace function public.is_own_media(p_url text)
returns boolean language sql immutable set search_path to 'public'
as $$
  select p_url is not null
     and p_url like 'https://chnvpnbnqvugsbwelmoq.supabase.co/storage/v1/object/public/outfits/%'
     and p_url !~ '[\s"''<>()]';   -- чтобы ссылка не уехала в CSS/HTML как инъекция
$$;

create or replace function public.is_allowed_avatar(p_url text)
returns boolean language sql immutable set search_path to 'public'
as $$
  select p_url is null
      or public.is_own_media(p_url)
      or (p_url like 'https://t.me/i/userpic/%' and p_url !~ '[\s"''<>()]');
$$;

-- Частота действий: событие пишем в events, лимит считаем по окну
create or replace function public.rate_ok(p_tid bigint, p_action text, p_max int, p_seconds int)
returns boolean language plpgsql security definer set search_path to 'public'
as $$
declare v_count int;
begin
  select count(*) into v_count
  from events
  where tid = p_tid and kind = 'rl:' || p_action
    and created_at > now() - make_interval(secs => p_seconds);

  if v_count >= p_max then
    return false;
  end if;

  insert into events (user_id, tid, kind, meta)
  values ((select id from users where telegram_id = p_tid), p_tid, 'rl:' || p_action, '{}'::jsonb);
  return true;
end;
$$;

revoke all on function public.rate_ok(bigint, text, int, int) from public, anon, authenticated;
grant execute on function public.rate_ok(bigint, text, int, int) to service_role;

create index if not exists events_rate_idx on public.events (tid, kind, created_at desc);

-- Ограничения самого бакета выставлены отдельно:
-- update storage.buckets set file_size_limit = 8388608,
--   allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif']
-- where id = 'outfits';
