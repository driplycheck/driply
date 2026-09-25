-- Канал для публикаций и срез «ошибки» для агентов.
alter table public.support_routing add column if not exists channel_id bigint;

drop function if exists public.support_routing_get();
create function public.support_routing_get()
returns table (chat_id bigint, thread_bug bigint, thread_idea bigint, thread_partner bigint,
               thread_reports bigint, channel_id bigint)
language sql security definer set search_path to 'public' as $$
  select r.chat_id, r.thread_bug, r.thread_idea, r.thread_partner, r.thread_reports, r.channel_id
  from support_routing r where r.id = 1
$$;

create or replace function public.support_channel_set(p_channel_id bigint)
returns void language sql security definer set search_path to 'public' as $$
  update support_routing set channel_id = p_channel_id, updated_at = now() where id = 1
$$;

revoke all on function public.support_routing_get() from public, anon, authenticated;
revoke all on function public.support_channel_set(bigint) from public, anon, authenticated;
grant execute on function public.support_routing_get() to service_role;
grant execute on function public.support_channel_set(bigint) to service_role;
