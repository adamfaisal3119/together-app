-- ============================================================
-- Together App — run this entire file in Supabase SQL Editor
-- Safe to re-run: uses IF NOT EXISTS and DROP IF EXISTS
-- ============================================================

-- 0. Events — is_invite flag for RSVP tracking
alter table events add column if not exists is_invite boolean default true;

-- 1. Profile columns
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists location text;

-- 2. Group Memories
create table if not exists memories (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid references groups(id) on delete cascade not null,
  uploaded_by uuid references auth.users(id) on delete cascade not null,
  file_url    text not null,
  file_type   text not null,
  caption     text,
  created_at  timestamptz default now()
);
alter table memories enable row level security;
drop policy if exists "Group members can view memories" on memories;
create policy "Group members can view memories" on memories
  for select using (
    exists (select 1 from group_members where group_id = memories.group_id and user_id = auth.uid())
  );
drop policy if exists "Group members can add memories" on memories;
create policy "Group members can add memories" on memories
  for insert with check (
    auth.uid() = uploaded_by and
    exists (select 1 from group_members where group_id = memories.group_id and user_id = auth.uid())
  );
drop policy if exists "Memory owner can delete" on memories;
create policy "Memory owner can delete" on memories
  for delete using (auth.uid() = uploaded_by);

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
drop policy if exists "Anyone can view reactions" on event_reactions;
create policy "Anyone can view reactions" on event_reactions for select using (true);
drop policy if exists "Auth users can react" on event_reactions;
create policy "Auth users can react" on event_reactions for insert with check (auth.uid() = user_id);
drop policy if exists "Users can remove own reaction" on event_reactions;
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
drop policy if exists "Anyone can view comments" on event_comments;
create policy "Anyone can view comments" on event_comments for select using (true);
drop policy if exists "Auth users can comment" on event_comments;
create policy "Auth users can comment" on event_comments for insert with check (auth.uid() = user_id);
drop policy if exists "Owner can delete comment" on event_comments;
create policy "Owner can delete comment" on event_comments for delete using (auth.uid() = user_id);
drop policy if exists "Owner or admin can update comment" on event_comments;
create policy "Owner or admin can update comment" on event_comments for update
  using (
    auth.uid() = user_id
    OR exists (
      select 1 from group_members gm
      join events e on e.group_id = gm.group_id
      where gm.user_id = auth.uid() and gm.role = 'admin' and e.id = event_comments.event_id
    )
  )
  with check (
    auth.uid() = user_id
    OR exists (
      select 1 from group_members gm
      join events e on e.group_id = gm.group_id
      where gm.user_id = auth.uid() and gm.role = 'admin' and e.id = event_comments.event_id
    )
  );

-- 5. Message edits
alter table messages add column if not exists edited_at timestamptz;
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'messages' and policyname = 'Message owner can update'
  ) then
    execute 'create policy "Message owner can update" on messages for update using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  end if;
end $$;

-- 6. Group Polls
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
drop policy if exists "Group members can view polls" on group_polls;
create policy "Group members can view polls" on group_polls for select using (
  exists (select 1 from group_members where group_id = group_polls.group_id and user_id = auth.uid())
);
drop policy if exists "Group members can create polls" on group_polls;
create policy "Group members can create polls" on group_polls for insert with check (
  auth.uid() = user_id and
  exists (select 1 from group_members where group_id = group_polls.group_id and user_id = auth.uid())
);
drop policy if exists "Poll creator can delete polls" on group_polls;
create policy "Poll creator can delete polls" on group_polls for delete using (auth.uid() = user_id);
drop policy if exists "Anyone can view options" on group_poll_options;
create policy "Anyone can view options" on group_poll_options for select using (true);
drop policy if exists "Poll creator can add options" on group_poll_options;
create policy "Poll creator can add options" on group_poll_options for insert with check (
  exists (select 1 from group_polls where id = poll_id and user_id = auth.uid())
);
drop policy if exists "Poll creator can delete options" on group_poll_options;
create policy "Poll creator can delete options" on group_poll_options for delete using (
  exists (select 1 from group_polls where id = poll_id and user_id = auth.uid())
);
drop policy if exists "Anyone can view votes" on group_poll_votes;
create policy "Anyone can view votes" on group_poll_votes for select using (true);
drop policy if exists "Auth users can vote" on group_poll_votes;
create policy "Auth users can vote" on group_poll_votes for insert with check (auth.uid() = user_id);
drop policy if exists "Users can unvote" on group_poll_votes;
create policy "Users can unvote" on group_poll_votes for delete using (auth.uid() = user_id);

-- 7. Push Notification Subscriptions
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  endpoint   text not null unique,
  p256dh     text not null,
  auth_key   text not null,
  created_at timestamptz default now()
);
alter table push_subscriptions enable row level security;
drop policy if exists "Users manage own push subscriptions" on push_subscriptions;
create policy "Users manage own push subscriptions" on push_subscriptions
  for all using (auth.uid() = user_id);

-- 8. Storage buckets
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public) values ('memories', 'memories', true) on conflict (id) do update set public = true;

drop policy if exists "Avatar images are publicly accessible" on storage.objects;
create policy "Avatar images are publicly accessible" on storage.objects
  for select using (bucket_id = 'avatars');
drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Memory images are publicly accessible" on storage.objects;
create policy "Memory images are publicly accessible" on storage.objects
  for select using (bucket_id = 'memories');
drop policy if exists "Group members can upload memories" on storage.objects;
create policy "Group members can upload memories" on storage.objects
  for insert with check (bucket_id = 'memories' and auth.uid() is not null);
drop policy if exists "Memory files owner can delete" on storage.objects;
create policy "Memory files owner can delete" on storage.objects
  for delete using (bucket_id = 'memories' and auth.uid()::text = (storage.foldername(name))[1]);

-- 9. Realtime
do $$ begin
  begin alter publication supabase_realtime add table event_reactions; exception when others then null; end;
  begin alter publication supabase_realtime add table event_comments; exception when others then null; end;
  begin alter publication supabase_realtime add table group_polls; exception when others then null; end;
  begin alter publication supabase_realtime add table group_poll_votes; exception when others then null; end;
  begin alter publication supabase_realtime add table memories; exception when others then null; end;
  begin alter publication supabase_realtime add table notifications; exception when others then null; end;
end $$;

-- 10. Group delete policy
drop policy if exists "Group creator can delete" on groups;
create policy "Group creator can delete" on groups
  for delete using (auth.uid() = created_by);

-- 11. Notifications table
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  read       boolean default false,
  created_at timestamptz default now()
);
alter table notifications enable row level security;
drop policy if exists "Users can read own notifications" on notifications;
create policy "Users can read own notifications" on notifications
  for select using (auth.uid() = user_id);
drop policy if exists "System can insert notifications" on notifications;
create policy "System can insert notifications" on notifications
  for insert with check (true);
drop policy if exists "Users can update own notifications" on notifications;
create policy "Users can update own notifications" on notifications
  for update using (auth.uid() = user_id);

-- 12. memory_likes table
create table if not exists memory_likes (
  id        uuid primary key default gen_random_uuid(),
  memory_id uuid references memories(id) on delete cascade,
  user_id   uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(memory_id, user_id)
);
alter table memory_likes enable row level security;
drop policy if exists "Anyone can view memory likes" on memory_likes;
create policy "Anyone can view memory likes" on memory_likes for select using (true);
drop policy if exists "Auth users can like" on memory_likes;
create policy "Auth users can like" on memory_likes for insert with check (auth.uid() = user_id);
drop policy if exists "Users can unlike" on memory_likes;
create policy "Users can unlike" on memory_likes for delete using (auth.uid() = user_id);

-- 13. memory_comments table
create table if not exists memory_comments (
  id        uuid primary key default gen_random_uuid(),
  memory_id uuid references memories(id) on delete cascade,
  user_id   uuid references auth.users(id) on delete cascade,
  content   text not null,
  created_at timestamptz default now()
);
alter table memory_comments enable row level security;
drop policy if exists "Anyone can view memory comments" on memory_comments;
create policy "Anyone can view memory comments" on memory_comments for select using (true);
drop policy if exists "Auth users can comment on memories" on memory_comments;
create policy "Auth users can comment on memories" on memory_comments for insert with check (auth.uid() = user_id);

-- 14. Friends can view each other's personal events
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'personal_events' and policyname = 'Friends can view personal events'
  ) then
    execute $policy$
      create policy "Friends can view personal events" on personal_events
        for select using (
          auth.uid() = user_id
          OR exists (
            select 1 from friendships
            where status = 'accepted'
              and (
                (requester_id = auth.uid() and addressee_id = personal_events.user_id)
                or (addressee_id = auth.uid() and requester_id = personal_events.user_id)
              )
          )
        )
    $policy$;
  end if;
end $$;

-- 15. INFRA-04: Expo push token support
-- Adds expo_push_token + platform columns so native (iOS/Android) and web push
-- tokens can coexist in the same table.
-- Makes web-push-only fields nullable since native rows won't have them.
alter table push_subscriptions
  add column if not exists expo_push_token text,
  add column if not exists platform text default 'web'
    check (platform in ('web', 'ios', 'android'));

alter table push_subscriptions
  alter column endpoint drop not null,
  alter column p256dh   drop not null,
  alter column auth_key drop not null;

-- Unique constraint on expo_push_token (one row per device)
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'push_subscriptions_expo_push_token_key'
  ) then
    alter table push_subscriptions
      add constraint push_subscriptions_expo_push_token_key unique (expo_push_token);
  end if;
end $$;

-- 16. Triggers: notifications

create or replace function notify_friend_request()
returns trigger language plpgsql security definer as $$
declare sender_name text;
begin
  select coalesce(full_name, username, 'Someone') into sender_name from profiles where id = NEW.requester_id;
  insert into notifications (user_id, type, title, body, link)
  values (NEW.addressee_id, 'friend_request', sender_name || ' sent you a friend request', null, '/friends');
  return NEW;
end;
$$;
drop trigger if exists on_friend_request on friendships;
create trigger on_friend_request
  after insert on friendships
  for each row when (NEW.status = 'pending')
  execute function notify_friend_request();

create or replace function notify_friend_accepted()
returns trigger language plpgsql security definer as $$
declare accepter_name text;
begin
  if OLD.status = 'pending' and NEW.status = 'accepted' then
    select coalesce(full_name, username, 'Someone') into accepter_name from profiles where id = NEW.addressee_id;
    insert into notifications (user_id, type, title, body, link)
    values (NEW.requester_id, 'friend_accepted', accepter_name || ' accepted your friend request', null, '/friends');
  end if;
  return NEW;
end;
$$;
drop trigger if exists on_friend_accepted on friendships;
create trigger on_friend_accepted
  after update on friendships
  for each row
  execute function notify_friend_accepted();

create or replace function notify_group_message()
returns trigger language plpgsql security definer as $$
declare sender_name text; group_name text;
begin
  select coalesce(full_name, username, 'Someone') into sender_name from profiles where id = NEW.user_id;
  select name into group_name from groups where id = NEW.group_id;
  insert into notifications (user_id, type, title, body, link)
  select gm.user_id, 'message', group_name, sender_name || ': ' || left(NEW.content, 80), '/groups/' || NEW.group_id || '/chat'
  from group_members gm
  where gm.group_id = NEW.group_id and gm.user_id <> NEW.user_id
  limit 50;
  return NEW;
end;
$$;
drop trigger if exists on_group_message on messages;
create trigger on_group_message
  after insert on messages
  for each row
  execute function notify_group_message();

create or replace function notify_group_invite()
returns trigger language plpgsql security definer as $$
declare group_name text;
begin
  select name into group_name from groups where id = NEW.group_id;
  insert into notifications (user_id, type, title, body, link)
  values (NEW.user_id, 'group_invite', 'You were added to ' || group_name, null, '/groups/' || NEW.group_id);
  return NEW;
end;
$$;
drop trigger if exists on_group_invite on group_members;
create trigger on_group_invite
  after insert on group_members
  for each row
  execute function notify_group_invite();


-- 16. FEAT: Create Event flow — groups.type column
-- Distinguishes temporary groups (dissolve when event ends) from permanent ones.
alter table groups add column if not exists type text not null default 'permanent';
