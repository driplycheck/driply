-- Три согласия по 152-ФЗ, выгрузка данных и самостоятельное удаление аккаунта.
create table if not exists public.consents (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('terms', 'processing', 'publication')),
  version text not null,
  accepted boolean not null default true,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.consents enable row level security;
revoke all on table public.consents from anon, authenticated;
revoke all on sequence public.consents_id_seq from anon, authenticated;
create index if not exists consents_user_idx on public.consents (user_id, kind, created_at desc);
