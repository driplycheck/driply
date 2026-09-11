-- Driply — schema dump
-- Generated from production (project chnvpnbnqvugsbwelmoq) on 2026-09-11
-- Source of truth: the live database. Regenerate after every migration.

-- =========================================================
-- TABLES
-- =========================================================

create table if not exists public.users (
  id                bigint generated always as identity primary key,
  telegram_id       bigint unique not null,
  username          text,
  avatar_url        text,
  daily_credits     int     not null default 200,
  style_score       bigint  not null default 0,
  created_at        timestamptz not null default now(),
  display_name      text,
  bio               text,
  hide_username     boolean not null default false,
  last_story_reward date,
  referred_by       bigint references public.users(id),
  ref_rewarded      boolean not null default false,
  is_founder        boolean not null default false,
  ref_code          text unique,
  badge             text,
  gender            text,
  allow_dm          boolean not null default true,
  notify_prefs      jsonb   not null default '{}'::jsonb
);

create table if not exists public.items (
  id         bigint generated always as identity primary key,
  name       text not null,
  brand      text,
  category   text not null check (category in ('top','bottoms','shoes','accessory','other')),
  created_at timestamptz not null default now()
);

create table if not exists public.styles (
  id         bigint generated always as identity primary key,
  slug       text not null unique,
  name_ru    text not null,
  name_en    text not null,
  emoji      text,
  sort_order int     not null default 100,
  active     boolean not null default true
);

create table if not exists public.posts (
  id         bigint generated always as identity primary key,
  user_id    bigint not null references public.users(id) on delete cascade,
  media_url  text not null,
  caption    text,
  score      bigint not null default 0,
  created_at timestamptz not null default now(),
  hidden     boolean not null default false,
  style_id   bigint references public.styles(id) on delete set null
);

create table if not exists public.post_items (
  post_id bigint not null references public.posts(id) on delete cascade,
  item_id bigint not null references public.items(id) on delete cascade,
  primary key (post_id, item_id)
);

create table if not exists public.votes (
  id         bigint generated always as identity primary key,
  post_id    bigint not null references public.posts(id) on delete cascade,
  voter_id   bigint not null references public.users(id) on delete cascade,
  amount     int not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (post_id, voter_id)
);

create table if not exists public.follows (
  follower_id  bigint not null references public.users(id) on delete cascade,
  following_id bigint not null references public.users(id) on delete cascade,
  created_at   timestamptz default now(),
  primary key (follower_id, following_id)
);

create table if not exists public.blocks (
  blocker_id bigint not null references public.users(id) on delete cascade,
  blocked_id bigint not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists public.reports (
  id          bigserial primary key,
  reporter_id bigint not null references public.users(id) on delete cascade,
  post_id     bigint references public.posts(id) on delete cascade,
  target_uid  bigint references public.users(id) on delete cascade,
  reason      text not null check (reason in ('nsfw','harassment','spam','not_outfit','other')),
  status      text not null default 'pending' check (status in ('pending','reviewed','dismissed')),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);

-- =========================================================
-- INDEXES
-- =========================================================

create index if not exists idx_items_name        on public.items using btree (lower(name));
create index if not exists idx_post_items_item   on public.post_items using btree (item_id);
create index if not exists idx_posts_created_at  on public.posts using btree (created_at desc);
create index if not exists idx_posts_style       on public.posts using btree (style_id);
create index if not exists idx_users_style_score on public.users using btree (style_score desc);

create index if not exists reports_status_idx on public.reports using btree (status, created_at desc);
create unique index if not exists reports_uniq_post on public.reports using btree (reporter_id, post_id) where (post_id is not null);
create unique index if not exists reports_uniq_user on public.reports using btree (reporter_id, target_uid) where (post_id is null);

-- =========================================================
-- ROW LEVEL SECURITY
-- All reads from the client go through security-definer RPCs.
-- Direct table reads are limited to public, non-sensitive data.
-- `reports` deliberately has NO policy: it must never be client-readable.
-- =========================================================

alter table public.users      enable row level security;
alter table public.items      enable row level security;
alter table public.styles     enable row level security;
alter table public.posts      enable row level security;
alter table public.post_items enable row level security;
alter table public.votes      enable row level security;
alter table public.follows    enable row level security;
alter table public.blocks     enable row level security;
alter table public.reports    enable row level security;

create policy read_users      on public.users      for select using (true);
create policy read_items      on public.items      for select using (true);
create policy read_styles     on public.styles     for select using (true);
create policy read_posts      on public.posts      for select using (true);
create policy read_post_items on public.post_items for select using (true);
create policy read_votes      on public.votes      for select using (true);
create policy follows_read    on public.follows    for select using (true);
create policy blocks_read     on public.blocks     for select using (true);

-- =========================================================
-- COLUMN GRANTS
-- telegram_id, notify_prefs, referred_by, ref_rewarded, ref_code,
-- last_story_reward and daily_credits must stay server-side only.
-- =========================================================

revoke select on public.users from anon, authenticated;
grant select (
  id, username, avatar_url, style_score, created_at,
  display_name, bio, hide_username, is_founder, badge, gender, allow_dm
) on public.users to anon, authenticated;

-- =========================================================
-- PREDICATES
-- =========================================================

create or replace function public.is_blocked(p_a bigint, p_b bigint)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select exists(
    select 1 from blocks
    where (blocker_id = p_a and blocked_id = p_b)
       or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

create or replace function public.has_reported(p_uid bigint, p_post bigint)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select exists(
    select 1 from reports
    where reporter_id = p_uid and post_id = p_post
  );
$$;

create or replace function public.should_notify(p_uid bigint, p_type text)
returns boolean language sql stable security definer set search_path to 'public'
as $$
  select coalesce((notify_prefs->>'all')::boolean, true)
     and coalesce((notify_prefs->>p_type)::boolean, true)
  from users where id = p_uid;
$$;

-- =========================================================
-- FEEDS
-- =========================================================

create or replace function public.main_feed(p_uid bigint)
returns json language sql stable security definer set search_path to 'public'
as $$
  select coalesce(json_agg(t order by t.created_at desc), '[]'::json)
  from (
    select
      p.id, p.media_url, p.caption, p.score, p.created_at,
      exists(select 1 from votes v where v.post_id = p.id and v.voter_id = p_uid) as voted,
      json_build_object(
        'id', u.id, 'username', u.username, 'display_name', u.display_name,
        'avatar_url', u.avatar_url, 'style_score', u.style_score
      ) as users,
      case when s.id is not null then
        json_build_object('id', s.id, 'name_ru', s.name_ru, 'name_en', s.name_en, 'emoji', s.emoji)
      else null end as style,
      coalesce((
        select json_agg(json_build_object(
          'items', json_build_object('name', i.name, 'brand', i.brand, 'category', i.category)
        ))
        from post_items pi join items i on i.id = pi.item_id
        where pi.post_id = p.id
      ), '[]'::json) as post_items
    from posts p
    join users u on u.id = p.user_id
    left join styles s on s.id = p.style_id
    where p.hidden = false
      and (p_uid = 0 or not public.is_blocked(p_uid, p.user_id))
      and (p_uid = 0 or not public.has_reported(p_uid, p.id))
  ) t;
$$;

create or replace function public.following_feed(p_uid bigint)
returns json language sql stable security definer set search_path to 'public'
as $$
  select coalesce(json_agg(t order by t.created_at desc), '[]'::json)
  from (
    select
      p.id, p.media_url, p.caption, p.score, p.created_at,
      json_build_object(
        'id', u.id, 'username', u.username, 'display_name', u.display_name,
        'avatar_url', u.avatar_url, 'style_score', u.style_score
      ) as users,
      coalesce((
        select json_agg(json_build_object(
          'items', json_build_object('name', i.name, 'brand', i.brand, 'category', i.category)
        ))
        from post_items pi join items i on i.id = pi.item_id
        where pi.post_id = p.id
      ), '[]'::json) as post_items
    from posts p
    join users u on u.id = p.user_id
    where p.hidden = false
      and p.user_id in (select following_id from follows where follower_id = p_uid)
      and not public.is_blocked(p_uid, p.user_id)
      and not public.has_reported(p_uid, p.id)
  ) t;
$$;

create or replace function public.posts_by_style(p_uid bigint, p_style_id bigint)
returns json language sql stable security definer set search_path to 'public'
as $$
  select coalesce(json_agg(json_build_object(
    'id', p.id, 'media_url', p.media_url, 'score', p.score
  ) order by p.score desc, p.created_at desc), '[]'::json)
  from posts p
  where p.style_id = p_style_id
    and p.hidden = false
    and (p_uid = 0 or not public.is_blocked(p_uid, p.user_id));
$$;

-- =========================================================
-- PROFILE / SOCIAL READS
-- =========================================================

create or replace function public.my_profile(p_tid bigint)
returns json language sql stable security definer set search_path to 'public'
as $$
  select case when u.id is null then null else json_build_object(
    'id', u.id,
    'display_name', u.display_name,
    'avatar_url', u.avatar_url,
    'bio', u.bio,
    'style_score', u.style_score,
    'hide_username', u.hide_username,
    'daily_credits', u.daily_credits,
    'is_founder', u.is_founder,
    'gender', u.gender,
    'allow_dm', u.allow_dm,
    'notify_prefs', u.notify_prefs
  ) end
  from users u where u.telegram_id = p_tid;
$$;

create or replace function public.profile_relations(p_target bigint, p_viewer bigint)
returns json language sql stable security definer set search_path to 'public'
as $$
  select json_build_object(
    'followers', (select count(*) from follows where following_id = p_target),
    'following', (select count(*) from follows where follower_id = p_target),
    'is_following', (
      select exists(
        select 1 from follows
        where follower_id = p_viewer and following_id = p_target
      )
    )
  );
$$;

create or replace function public.follow_list(p_target bigint, p_mode text)
returns json language sql stable security definer set search_path to 'public'
as $$
  select coalesce(json_agg(json_build_object(
    'id', u.id, 'username', u.username, 'display_name', u.display_name,
    'avatar_url', u.avatar_url, 'style_score', u.style_score, 'hide_username', u.hide_username
  )), '[]'::json)
  from follows f
  join users u on u.id = case
    when p_mode = 'followers' then f.follower_id else f.following_id end
  where case
    when p_mode = 'followers' then f.following_id = p_target else f.follower_id = p_target end
    and not public.is_blocked(p_target, u.id);
$$;

create or replace function public.search_people(p_uid bigint, p_q text)
returns json language sql stable security definer set search_path to 'public'
as $$
  select coalesce(json_agg(json_build_object(
    'id', u.id, 'username', u.username, 'display_name', u.display_name,
    'avatar_url', u.avatar_url, 'style_score', u.style_score, 'hide_username', u.hide_username
  )), '[]'::json)
  from users u
  where (u.display_name ilike '%'||p_q||'%' or u.username ilike '%'||p_q||'%')
    and (p_uid = 0 or not public.is_blocked(p_uid, u.id))
  limit 20;
$$;

create or replace function public.top_users(p_limit int default 50, p_offset int default 0)
returns json language sql stable security definer set search_path to 'public'
as $$
  select coalesce(json_agg(t), '[]'::json) from (
    select id, username, display_name, avatar_url, style_score,
      row_number() over (order by style_score desc) as rank
    from users
    order by style_score desc
    limit p_limit offset p_offset
  ) t;
$$;

create or replace function public.my_posts(p_tid bigint)
returns json language sql stable security definer set search_path to 'public'
as $$
  select coalesce(json_agg(json_build_object(
    'id', p.id, 'media_url', p.media_url, 'caption', p.caption,
    'score', p.score, 'hidden', p.hidden, 'created_at', p.created_at
  ) order by p.created_at desc), '[]'::json)
  from posts p
  join users u on u.id = p.user_id
  where u.telegram_id = p_tid;
$$;

create or replace function public.my_votes(p_tid bigint)
returns json language sql stable security definer set search_path to 'public'
as $$
  select coalesce(json_agg(json_build_object(
    'vote_id', v.id, 'amount', v.amount, 'voted_at', v.created_at,
    'post_id', p.id, 'media_url', p.media_url, 'score', p.score,
    'author_id', u.id, 'author_name', u.display_name,
    'author_username', u.username, 'author_hide', u.hide_username,
    'avatar_url', u.avatar_url
  ) order by v.created_at desc), '[]'::json)
  from votes v
  join posts p on p.id = v.post_id and p.hidden = false
  join users u on u.id = p.user_id
  where v.voter_id = (select id from users where telegram_id = p_tid)
  limit 50;
$$;

create or replace function public.my_blocks(p_tid bigint)
returns json language sql stable security definer set search_path to 'public'
as $$
  select coalesce(json_agg(json_build_object(
    'id', u.id, 'username', u.username, 'display_name', u.display_name,
    'avatar_url', u.avatar_url, 'style_score', u.style_score, 'hide_username', u.hide_username
  )), '[]'::json)
  from blocks b
  join users me on me.telegram_id = p_tid
  join users u on u.id = b.blocked_id
  where b.blocker_id = me.id;
$$;

-- =========================================================
-- REFERRALS
-- NOTE: set_referrer_code calls set_referrer. Never drop one without the other.
-- =========================================================

create or replace function public.set_referrer(p_tid bigint, p_ref bigint)
returns json language plpgsql security definer set search_path to 'public'
as $$
declare v_me bigint; v_cur bigint; v_posts int;
begin
  select id, referred_by into v_me, v_cur from users where telegram_id = p_tid;
  if v_me is null then
    return json_build_object('ok', false, 'reason', 'no_user_yet');
  end if;
  if v_cur is not null then
    return json_build_object('ok', false, 'reason', 'already_set');
  end if;
  if p_ref = v_me then
    return json_build_object('ok', false, 'reason', 'self');
  end if;
  if not exists (select 1 from users where id = p_ref) then
    return json_build_object('ok', false, 'reason', 'bad_ref');
  end if;
  -- a user who already posted is not a newcomer
  select count(*) into v_posts from posts where user_id = v_me;
  if v_posts > 0 then
    return json_build_object('ok', false, 'reason', 'not_new');
  end if;

  update users set referred_by = p_ref where id = v_me;
  return json_build_object('ok', true);
end; $$;

create or replace function public.set_referrer_code(p_tid bigint, p_code text)
returns json language plpgsql security definer set search_path to 'public'
as $$
declare v_ref bigint;
begin
  if p_code ~ '^[0-9]+$' then
    v_ref := p_code::bigint;
  else
    select id into v_ref from users where ref_code = lower(p_code);
  end if;
  if v_ref is null then
    return json_build_object('ok', false, 'reason', 'bad_code');
  end if;
  return public.set_referrer(p_tid, v_ref);
end; $$;

create or replace function public.ref_stats(p_tid bigint)
returns json language sql stable security definer set search_path to 'public'
as $$
  select json_build_object(
    'invited', (select count(*) from users r join users me on me.telegram_id = p_tid
                where r.referred_by = me.id and r.ref_rewarded = true),
    'earned', (select count(*) * 500 from users r join users me on me.telegram_id = p_tid
               where r.referred_by = me.id and r.ref_rewarded = true),
    'my_id', (select id from users where telegram_id = p_tid),
    'ref_code', (select ref_code from users where telegram_id = p_tid)
  );
$$;

create or replace function public.ref_invited_list(p_tid bigint)
returns json language sql stable security definer set search_path to 'public'
as $$
  select coalesce(json_agg(json_build_object(
    'id', u.id, 'username', u.username, 'display_name', u.display_name,
    'avatar_url', u.avatar_url, 'rewarded', u.ref_rewarded, 'joined_at', u.created_at
  ) order by u.created_at desc), '[]'::json)
  from users u
  where u.referred_by = (select id from users where telegram_id = p_tid);
$$;

-- =========================================================
-- WRITES
-- =========================================================

create or replace function public.set_profile(
  p_tid bigint, p_username text, p_avatar text, p_display_name text,
  p_bio text, p_hide_username boolean, p_gender text, p_allow_dm boolean default null
) returns json language plpgsql security definer set search_path to 'public'
as $$
declare v_uid bigint;
begin
  insert into users (telegram_id, username, avatar_url, display_name)
  values (p_tid, p_username, p_avatar, p_display_name)
  on conflict (telegram_id) do update set
    username = excluded.username,
    avatar_url = coalesce(excluded.avatar_url, users.avatar_url),
    display_name = coalesce(nullif(p_display_name,''), users.display_name),
    bio = case when p_bio is null then users.bio
               when p_bio = '' then null else p_bio end,
    hide_username = coalesce(p_hide_username, users.hide_username),
    gender = coalesce(p_gender, users.gender),
    allow_dm = coalesce(p_allow_dm, users.allow_dm)
  returning id into v_uid;

  if p_display_name is not null and p_display_name = '' then
    raise exception 'EMPTY_NICKNAME';
  end if;

  return (select row_to_json(u) from (
    select id, telegram_id, username, display_name, avatar_url, bio,
           hide_username, gender, allow_dm from users where id = v_uid
  ) u);
end; $$;

create or replace function public.create_post(
  p_tid bigint, p_username text, p_avatar text, p_media_url text,
  p_caption text, p_items jsonb, p_style_id bigint default null
) returns json language plpgsql security definer set search_path to 'public'
as $$
declare v_uid bigint; v_post bigint; v_item jsonb; v_item_id bigint;
        v_count int; v_reward int; v_balance bigint;
        v_ref bigint; v_ref_done boolean; v_ref_bonus int := 0;
        v_ref_tid bigint; v_ref_notify boolean; v_newbie_notify boolean;
begin
  insert into users (telegram_id, username, avatar_url)
  values (p_tid, p_username, p_avatar)
  on conflict (telegram_id) do update
    set username = excluded.username,
        avatar_url = coalesce(excluded.avatar_url, users.avatar_url)
  returning id into v_uid;

  insert into posts (user_id, media_url, caption, score, style_id)
  values (v_uid, p_media_url, p_caption, 0, p_style_id)
  returning id into v_post;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    select id into v_item_id from items
      where lower(name) = lower(v_item->>'name')
        and lower(coalesce(brand,'')) = lower(coalesce(v_item->>'brand',''))
      limit 1;
    if v_item_id is null then
      insert into items (name, brand, category)
      values (v_item->>'name', v_item->>'brand', coalesce(v_item->>'category','other'))
      returning id into v_item_id;
    end if;
    insert into post_items (post_id, item_id) values (v_post, v_item_id)
      on conflict do nothing;
  end loop;

  select count(*) into v_count from posts where user_id = v_uid and hidden = false;
  v_reward := case when v_count <= 1 then 300 else 100 end;

  select referred_by, ref_rewarded into v_ref, v_ref_done from users where id = v_uid;
  if v_ref is not null and v_ref_done = false then
    v_ref_bonus := 200;
    update users set daily_credits = daily_credits + 500 where id = v_ref;
    update users set ref_rewarded = true where id = v_uid;
    select telegram_id into v_ref_tid from users where id = v_ref;
    v_ref_notify := public.should_notify(v_ref, 'referral');
    v_newbie_notify := public.should_notify(v_uid, 'referral');
  end if;

  update users set daily_credits = daily_credits + v_reward + v_ref_bonus
    where id = v_uid returning daily_credits into v_balance;

  return json_build_object(
    'post_id', v_post, 'reward', v_reward,
    'ref_bonus', v_ref_bonus, 'balance', v_balance,
    'ref_uid', v_ref, 'ref_tid', v_ref_tid,
    'ref_notify', v_ref_notify, 'newbie_notify', v_newbie_notify
  );
end; $$;

create or replace function public.cast_vote(
  p_tid bigint, p_username text, p_avatar text, p_post bigint, p_amount int
) returns json language plpgsql security definer set search_path to 'public'
as $$
declare
  v_voter_id bigint; v_credits int; v_author bigint;
  v_new_score bigint; v_author_tid bigint; v_notify boolean;
begin
  if p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;

  insert into users (telegram_id, username, avatar_url)
  values (p_tid, p_username, p_avatar)
  on conflict (telegram_id) do update
    set username = excluded.username,
        avatar_url = coalesce(excluded.avatar_url, users.avatar_url)
  returning id, daily_credits into v_voter_id, v_credits;

  select user_id into v_author from posts where id = p_post;
  if v_author is null then raise exception 'POST_NOT_FOUND'; end if;
  if v_author = v_voter_id then raise exception 'CANNOT_VOTE_OWN'; end if;
  if v_credits < p_amount then raise exception 'NOT_ENOUGH_CREDITS'; end if;

  insert into votes (post_id, voter_id, amount) values (p_post, v_voter_id, p_amount);

  update users set daily_credits = daily_credits - p_amount where id = v_voter_id;
  update posts set score = score + p_amount where id = p_post returning score into v_new_score;
  update users set style_score = style_score + p_amount where id = v_author;

  select telegram_id into v_author_tid from users where id = v_author;
  v_notify := public.should_notify(v_author, 'votes');

  return json_build_object(
    'new_score', v_new_score,
    'remaining_credits', v_credits - p_amount,
    'author_tid', v_author_tid,
    'author_notify', v_notify,
    'voter_name', coalesce(p_username, 'Кто-то'),
    'amount', p_amount
  );
exception
  when unique_violation then raise exception 'ALREADY_VOTED';
end; $$;

create or replace function public.set_post_hidden(p_tid bigint, p_post bigint, p_hidden boolean)
returns json language plpgsql security definer set search_path to 'public'
as $$
declare v_uid bigint; v_owner bigint;
begin
  select id into v_uid from users where telegram_id = p_tid;
  if v_uid is null then raise exception 'NO_USER'; end if;
  select user_id into v_owner from posts where id = p_post;
  if v_owner is null then raise exception 'POST_NOT_FOUND'; end if;
  if v_owner <> v_uid then raise exception 'NOT_OWNER'; end if;

  update posts set hidden = p_hidden where id = p_post;
  return json_build_object('hidden', p_hidden);
end; $$;

create or replace function public.delete_post(p_tid bigint, p_post bigint)
returns json language plpgsql security definer set search_path to 'public'
as $$
declare v_uid bigint; v_owner bigint; v_score bigint;
begin
  select id into v_uid from users where telegram_id = p_tid;
  if v_uid is null then raise exception 'NO_USER'; end if;
  select user_id, score into v_owner, v_score from posts where id = p_post;
  if v_owner is null then raise exception 'POST_NOT_FOUND'; end if;
  if v_owner <> v_uid then raise exception 'NOT_OWNER'; end if;

  delete from votes where post_id = p_post;
  delete from post_items where post_id = p_post;
  delete from posts where id = p_post;

  update users set style_score = greatest(0, style_score - coalesce(v_score, 0))
    where id = v_owner;

  return json_build_object('deleted', true, 'removed_score', coalesce(v_score, 0));
end; $$;

create or replace function public.set_follow(
  p_tid bigint, p_username text, p_avatar text, p_target bigint, p_follow boolean
) returns json language plpgsql security definer set search_path to 'public'
as $$
declare v_me bigint; v_count int; v_rows int; v_new boolean := false;
        v_target_tid bigint; v_me_name text; v_notify boolean;
begin
  insert into users (telegram_id, username, avatar_url)
  values (p_tid, p_username, p_avatar)
  on conflict (telegram_id) do update
    set username = excluded.username, avatar_url = coalesce(excluded.avatar_url, users.avatar_url)
  returning id into v_me;

  if v_me = p_target then raise exception 'CANNOT_FOLLOW_SELF'; end if;
  select display_name into v_me_name from users where id = v_me;

  if p_follow then
    insert into follows (follower_id, following_id) values (v_me, p_target)
      on conflict (follower_id, following_id) do nothing;
    get diagnostics v_rows = row_count; v_new := v_rows > 0;
  else
    delete from follows where follower_id = v_me and following_id = p_target;
  end if;

  select telegram_id into v_target_tid from users where id = p_target;
  v_notify := public.should_notify(p_target, 'follows');
  select count(*) into v_count from follows where following_id = p_target;

  return json_build_object(
    'following', p_follow, 'followers', v_count, 'new_follow', v_new,
    'target_tid', v_target_tid, 'follower_name', coalesce(v_me_name, p_username),
    'notify', coalesce(v_notify, true)
  );
end; $$;

create or replace function public.set_block(p_tid bigint, p_target bigint, p_block boolean)
returns json language plpgsql security definer set search_path to 'public'
as $$
declare v_me bigint;
begin
  select id into v_me from users where telegram_id = p_tid;
  if v_me is null then raise exception 'NO_USER'; end if;
  if v_me = p_target then raise exception 'CANNOT_BLOCK_SELF'; end if;

  if p_block then
    insert into blocks (blocker_id, blocked_id) values (v_me, p_target)
      on conflict do nothing;
  else
    delete from blocks where blocker_id = v_me and blocked_id = p_target;
  end if;
  return json_build_object('blocked', p_block);
end; $$;

create or replace function public.set_notify_prefs(p_tid bigint, p_prefs jsonb)
returns json language sql security definer set search_path to 'public'
as $$
  update users
  set notify_prefs = notify_prefs || p_prefs
  where telegram_id = p_tid
  returning notify_prefs;
$$;

create or replace function public.reward_story(p_tid bigint)
returns json language plpgsql security definer set search_path to 'public'
as $$
declare v_uid bigint; v_last date; v_reward int := 200; v_new int;
begin
  select id, last_story_reward into v_uid, v_last from users where telegram_id = p_tid;
  if v_uid is null then raise exception 'NO_USER'; end if;

  if v_last = current_date then
    select daily_credits into v_new from users where id = v_uid;
    return json_build_object('rewarded', false, 'credits', v_new);
  end if;

  update users
    set daily_credits = daily_credits + v_reward,
        last_story_reward = current_date
    where id = v_uid
    returning daily_credits into v_new;

  return json_build_object('rewarded', true, 'reward', v_reward, 'credits', v_new);
end; $$;

-- =========================================================
-- MODERATION
-- =========================================================

create or replace function public.report_post(p_tid bigint, p_post bigint, p_reason text)
returns json language plpgsql security definer set search_path to 'public'
as $$
declare v_uid bigint; v_author bigint;
begin
  select id into v_uid from public.users where telegram_id = p_tid;
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'user_not_found');
  end if;

  select user_id into v_author from public.posts where id = p_post;
  if v_author is null then
    return json_build_object('ok', false, 'error', 'post_not_found');
  end if;

  if v_author = v_uid then
    return json_build_object('ok', false, 'error', 'own_post');
  end if;

  insert into public.reports(reporter_id, post_id, target_uid, reason)
  values (v_uid, p_post, v_author, p_reason)
  on conflict do nothing;

  return json_build_object('ok', true);
end; $$;

create or replace function public.report_user(p_tid bigint, p_target bigint, p_reason text)
returns json language plpgsql security definer set search_path to 'public'
as $$
declare v_uid bigint;
begin
  select id into v_uid from public.users where telegram_id = p_tid;
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'user_not_found');
  end if;

  if v_uid = p_target then
    return json_build_object('ok', false, 'error', 'self_report');
  end if;

  insert into public.reports(reporter_id, target_uid, reason)
  values (v_uid, p_target, p_reason)
  on conflict do nothing;

  return json_build_object('ok', true);
end; $$;

-- =========================================================
-- SEED: styles
-- =========================================================

insert into public.styles (id, slug, name_ru, name_en, emoji, sort_order, active) values
  (1, 'streetwear', 'Стритвир', 'Streetwear', '🛹', 10, true),
  (2, 'casual', 'Кэжуал', 'Casual', '👕', 20, true),
  (3, 'y2k', 'Y2K', 'Y2K', '💿', 30, true),
  (4, 'alt', 'Альт', 'Alt', '🖤', 40, true),
  (5, 'oldmoney', 'Олд-мани', 'Old Money', '🤍', 50, true),
  (6, 'minimal', 'Минимал', 'Minimal', '◽', 60, true),
  (7, 'grunge', 'Гранж', 'Grunge', '🎸', 70, true),
  (8, 'techwear', 'Техвир', 'Techwear', '🌫', 80, true),
  (9, 'gorpcore', 'Горпкор', 'Gorpcore', '🏔', 90, true),
  (10, 'vintage', 'Винтаж', 'Vintage', '📻', 100, true),
  (11, 'preppy', 'Преппи', 'Preppy', '🎓', 110, true),
  (12, 'sporty', 'Спорт', 'Sporty', '🏀', 120, true),
  (13, 'formal', 'Классика', 'Formal', '👔', 130, true),
  (14, 'boho', 'Бохо', 'Boho', '🌾', 140, true),
  (15, 'cottagecore', 'Коттеджкор', 'Cottagecore', '🌸', 150, true),
  (16, 'punk', 'Панк', 'Punk', '🧷', 160, true)
on conflict (id) do nothing;
