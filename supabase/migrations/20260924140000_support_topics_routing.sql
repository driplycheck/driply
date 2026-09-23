-- Тип обращения: баг / идея / сотрудничество. Под каждый — свой топик в группе поддержки.
alter table public.support_messages
  add column if not exists kind text not null default 'bug'
  check (kind in ('bug', 'idea', 'partner'));

-- Куда бот кладёт обращения: приватная супергруппа с включёнными темами.
-- Одна строка, заполняется командой /setup_support от основателя.
create table if not exists public.support_routing (
  id             smallint primary key default 1 check (id = 1),
  chat_id        bigint not null,
  thread_bug     bigint,
  thread_idea    bigint,
  thread_partner bigint,
  updated_at     timestamptz not null default now()
);

alter table public.support_routing enable row level security;  -- политик нет: только service_role
revoke all on table public.support_routing from anon, authenticated;
