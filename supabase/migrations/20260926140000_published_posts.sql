-- Что из предложенного агентом реально ушло в канал. Без этого PR-менеджер пишет вслепую:
-- он не отличает пост, который понравился, от поста, который молча пропустили.
create table if not exists public.published_posts (
  id bigserial primary key,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.published_posts enable row level security;
revoke all on table public.published_posts from anon, authenticated;
revoke all on sequence public.published_posts_id_seq from anon, authenticated;

create or replace function public.post_published(p_body text)
returns void language sql security definer set search_path to 'public' as $$
  insert into published_posts (body) values (left(p_body, 4000))
$$;

create or replace function public.published_list(p_limit int default 10)
returns table (body text, created_at timestamptz)
language sql stable security definer set search_path to 'public' as $$
  select body, created_at from published_posts
  order by created_at desc limit least(coalesce(p_limit, 10), 50)
$$;

revoke all on function public.post_published(text) from public, anon, authenticated;
revoke all on function public.published_list(int) from public, anon, authenticated;
grant execute on function public.post_published(text) to service_role;
grant execute on function public.published_list(int) to service_role;
