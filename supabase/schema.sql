-- ===== Driply MVP schema =====

create table public.users (
  id            bigint generated always as identity primary key,
  telegram_id   bigint unique not null,
  username      text,
  avatar_url    text,
  city          text,
  vuz           text,
  daily_credits int    not null default 1000,
  style_score   bigint not null default 0,
  created_at    timestamptz not null default now()
);

create table public.items (
  id         bigint generated always as identity primary key,
  name       text not null,
  brand      text,
  category   text not null check (category in ('top','bottoms','shoes','accessory','other')),
  created_at timestamptz not null default now()
);

create table public.posts (
  id         bigint generated always as identity primary key,
  user_id    bigint not null references public.users(id) on delete cascade,
  media_url  text not null,
  caption    text,
  score      bigint not null default 0,
  created_at timestamptz not null default now()
);

create table public.post_items (
  post_id bigint not null references public.posts(id) on delete cascade,
  item_id bigint not null references public.items(id) on delete cascade,
  primary key (post_id, item_id)
);

create table public.votes (
  id         bigint generated always as identity primary key,
  post_id    bigint not null references public.posts(id) on delete cascade,
  voter_id   bigint not null references public.users(id) on delete cascade,
  amount     int not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (post_id, voter_id)
);

create index idx_posts_created_at  on public.posts (created_at desc);
create index idx_items_name        on public.items (lower(name));
create index idx_post_items_item   on public.post_items (item_id);
create index idx_users_style_score on public.users (style_score desc);

grant usage on schema public to anon, authenticated;
grant select on public.users, public.posts, public.items, public.post_items, public.votes to anon, authenticated;

alter table public.users      enable row level security;
alter table public.posts      enable row level security;
alter table public.items      enable row level security;
alter table public.post_items enable row level security;
alter table public.votes      enable row level security;

create policy "read_users"      on public.users      for select using (true);
create policy "read_posts"      on public.posts      for select using (true);
create policy "read_items"      on public.items      for select using (true);
create policy "read_post_items" on public.post_items for select using (true);
create policy "read_votes"      on public.votes      for select using (true);
