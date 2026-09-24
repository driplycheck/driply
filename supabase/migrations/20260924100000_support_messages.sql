-- Служба поддержки: переписка юзер ↔ основатель через бота.
-- Доступ только у service_role: quick-handler пишет входящие, tg-webhook — ответы.
create table if not exists public.support_messages (
  id            bigserial primary key,
  user_id       bigint references public.users(id) on delete set null,
  tid           bigint not null,
  direction     text not null check (direction in ('in', 'out')),
  body          text not null,
  tg_message_id bigint,                      -- id сообщения у модератора: по нему находим адресата при реплае
  created_at    timestamptz not null default now()
);

alter table public.support_messages enable row level security;  -- политик нет: с клиента не читается
revoke all on table public.support_messages from anon, authenticated;
revoke all on sequence public.support_messages_id_seq from anon, authenticated;

create index if not exists support_tid_idx    on public.support_messages (tid, created_at desc);
create index if not exists support_tg_msg_idx on public.support_messages (tg_message_id) where tg_message_id is not null;

-- Кому уходят обращения: первый основатель.
create or replace function public.support_moderator_tid()
returns bigint
language sql
security definer
set search_path to 'public'
as $$
  select telegram_id from public.users where is_founder = true order by created_at limit 1
$$;

revoke all on function public.support_moderator_tid() from public, anon, authenticated;
grant execute on function public.support_moderator_tid() to service_role;
