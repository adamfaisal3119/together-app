-- ============================================================
-- Together App — run this entire file in Supabase SQL Editor
-- ============================================================

-- 1. Profile avatar URL
alter table profiles add column if not exists avatar_url text;

-- 2. Group Memories
create table if not exists group_memories (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid references groups(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  storage_path text not null,
  caption     text,
  created_at  timestamptz default now()
);
alter table group_memories enable row level security;
create policy "Group members can view memories" on group_memories
  for select using (
    exists (select 1 from group_members where group_id = group_memories.group_id and user_id = auth.uid())
  );
create policy "Group members can add memories" on group_memories
  for insert with check (
    auth.uid() = user_id and
    exists (select 1 from group_members where group_id = group_memories.group_id and user_id = auth.uid())
  );
create policy "Memory owner can delete" on group_memories
  for delete using (auth.uid() = user_id);

-- 3. Event Reactions
create table if not exists event_reactions (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid references events(id) on delete cascade not null,
  user_id    uuid references auth.users(id) on delete cascade not null,
  emoji      text not null,
  created_at timestamptz default now(),
  unique(event_id, user_id, emoji)
);
alter table event_reactions enable row level security;
create policy "Anyone can view reactions" on event_reactions for select using (true);
create policy "Auth users can react" on event_reactions for insert with check (auth.uid() = user_id);
create policy "Users can remove own reaction" on event_reactions for delete using (auth.uid() = user_id);

-- 4. Event Comments
create table if not exists event_comments (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid references events(id) on delete cascade not null,
  user_id    uuid references auth.users(id) on delete cascade not null,
  content    text not null,
  created_at timestamptz default now()
);
alter table event_comments enable row level security;
create policy "Anyone can view comments" on event_comments for select using (true);
create policy "Auth users can comment" on event_comments for insert with check (auth.uid() = user_id);
create policy "Owner can delete comment" on event_comments for delete using (auth.uid() = user_id);

-- 5. Group Polls
create table if not exists group_polls (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid references groups(id) on delete cascade not null,
  user_id    uuid references auth.users(id) on delete cascade not null,
  question   text not null,
  created_at timestamptz default now()
);
create table if not exists group_poll_options (
  id      uuid primary key default gen_random_uuid(),
  poll_id uuid references group_polls(id) on delete cascade not null,
  text    text not null
);
create table if not exists group_poll_votes (
  id        uuid primary key default gen_random_uuid(),
  option_id uuid references group_poll_options(id) on delete cascade not null,
  user_id   uuid references auth.users(id) on delete cascade not null,
  unique(option_id, user_id)
);
alter table group_polls enable row level security;
alter table group_poll_options enable row level security;
alter table group_poll_votes enable row level security;
create policy "Group members can view polls" on group_polls for select using (
  exists (select 1 from group_members where group_id = group_polls.group_id and user_id = auth.uid())
);
create policy "Group members can create polls" on group_polls for insert with check (
  auth.uid() = user_id and
  exists (select 1 from group_members where group_id = group_polls.group_id and user_id = auth.uid())
);
create policy "Anyone can view options" on group_poll_options for select using (true);
create policy "Poll creator can add options" on group_poll_options for insert with check (
  exists (select 1 from group_polls where id = poll_id and user_id = auth.uid())
);
create policy "Anyone can view votes" on group_poll_votes for select using (true);
create policy "Auth users can vote" on group_poll_votes for insert with check (auth.uid() = user_id);
create policy "Users can unvote" on group_poll_votes for delete using (auth.uid() = user_id);

-- 6. Push Notification Subscriptions
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  endpoint   text not null unique,
  p256dh     text not null,
  auth_key   text not null,
  created_at timestamptz default now()
);
alter table push_subscriptions enable row level security;
create policy "Users manage own push subscriptions" on push_subscriptions
  for all using (auth.uid() = user_id);

-- ============================================================
-- Storage buckets — run each in Supabase Dashboard:
--   Storage > New bucket
--   1. Name: "avatars"    — Public: true
--   2. Name: "memories"   — Public: true
--
-- Or run via SQL:
-- ============================================================
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('memories', 'memories', true) on conflict do nothing;

create policy "Avatar images are publicly accessible" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "Users can upload their own avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can update their own avatar" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Memory images are publicly accessible" on storage.objects
  for select using (bucket_id = 'memories');
create policy "Group members can upload memories" on storage.objects
  for insert with check (bucket_id = 'memories' and auth.uid() is not null);
create policy "Memory owner can delete" on storage.objects
  for delete using (bucket_id = 'memories' and auth.uid()::text = (storage.foldername(name))[1]);

-- Enable realtime for relevant tables
alter publication supabase_realtime add table event_reactions;
alter publication supabase_realtime add table event_comments;
alter publication supabase_realtime add table group_polls;
alter publication supabase_realtime add table group_poll_votes;
alter publication supabase_realtime add table group_memories;
