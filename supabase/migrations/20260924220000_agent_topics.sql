-- Агенты в группе: у каждого своя тема, в ней он и живёт.
-- Привязка темы и переписка хранятся отдельно от обращений поддержки.
create table if not exists public.agent_topics (
  kind       text primary key,
  chat_id    bigint not null,
  thread_id  bigint not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_messages (
  id         bigserial primary key,
  kind       text not null,
  role       text not null check (role in ('user', 'assistant')),
  body       text not null,
  created_at timestamptz not null default now()
);

alter table public.agent_topics enable row level security;
alter table public.agent_messages enable row level security;
revoke all on table public.agent_topics, public.agent_messages from anon, authenticated;
revoke all on sequence public.agent_messages_id_seq from anon, authenticated;

create index if not exists agent_messages_kind_idx on public.agent_messages (kind, created_at desc);

create or replace function public.agent_topic_set(p_kind text, p_chat_id bigint, p_thread_id bigint)
returns void language sql security definer set search_path to 'public' as $$
  insert into agent_topics (kind, chat_id, thread_id) values (p_kind, p_chat_id, p_thread_id)
  on conflict (kind) do update set chat_id = excluded.chat_id, thread_id = excluded.thread_id, updated_at = now()
$$;

-- по теме, в которую написали, понимаем, чей это чат
create or replace function public.agent_by_thread(p_chat_id bigint, p_thread_id bigint)
returns text language sql stable security definer set search_path to 'public' as $$
  select kind from agent_topics where chat_id = p_chat_id and thread_id = p_thread_id
$$;

create or replace function public.agent_topics_list()
returns table (kind text, chat_id bigint, thread_id bigint)
language sql stable security definer set search_path to 'public' as $$
  select kind, chat_id, thread_id from agent_topics order by kind
$$;

create or replace function public.agent_log(p_kind text, p_role text, p_body text)
returns void language sql security definer set search_path to 'public' as $$
  insert into agent_messages (kind, role, body) values (p_kind, p_role, left(p_body, 8000))
$$;

-- история для контекста: свежие сверху, в функции разворачиваем
create or replace function public.agent_history(p_kind text, p_limit int default 12)
returns table (role text, body text)
language sql stable security definer set search_path to 'public' as $$
  select role, body from agent_messages
  where kind = p_kind order by created_at desc limit least(coalesce(p_limit, 12), 40)
$$;

revoke all on function public.agent_topic_set(text, bigint, bigint) from public, anon, authenticated;
revoke all on function public.agent_by_thread(bigint, bigint) from public, anon, authenticated;
revoke all on function public.agent_topics_list() from public, anon, authenticated;
revoke all on function public.agent_log(text, text, text) from public, anon, authenticated;
revoke all on function public.agent_history(text, int) from public, anon, authenticated;

grant execute on function public.agent_topic_set(text, bigint, bigint) to service_role;
grant execute on function public.agent_by_thread(bigint, bigint) to service_role;
grant execute on function public.agent_topics_list() to service_role;
grant execute on function public.agent_log(text, text, text) to service_role;
grant execute on function public.agent_history(text, int) to service_role;
