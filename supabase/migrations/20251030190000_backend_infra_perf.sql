-- Infrastructure performance and consistency improvements
-- Safe indexes for common access patterns and messaging trigger for consistency

-- Conversations: array membership + ordering by last_message_at
create index if not exists conversations_participants_gin on public.conversations using gin (participants);
create index if not exists conversations_last_message_at_idx on public.conversations (last_message_at desc nulls last);

-- Messages: fast fetch by conversation + chronological order, unread updates
create index if not exists messages_conversation_created_at_idx on public.messages (conversation_id, created_at);
create index if not exists messages_conversation_unread_idx on public.messages (conversation_id, is_read, sender_id);

-- Profiles commonly joined by id (pk) already exists; add quick lookup by full_name for search (if present)
do $$ begin
  perform 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='full_name';
  if found then
    execute 'create index if not exists profiles_full_name_trgm on public.profiles using gin (full_name gin_trgm_ops)';
  end if;
end $$;

-- Community posts: per-user feeds and latest lists
create index if not exists community_posts_user_created_idx on public.community_posts (user_id, created_at desc);
create index if not exists community_posts_created_idx on public.community_posts (created_at desc);

-- Follows and friend requests: typical lookups
create index if not exists user_follows_follower_idx on public.user_follows (follower_id);
create index if not exists user_follows_following_idx on public.user_follows (following_id);
create unique index if not exists user_follows_unique_pair on public.user_follows (follower_id, following_id);

create index if not exists friend_requests_receiver_idx on public.friend_requests (receiver_id);
create index if not exists friend_requests_sender_idx on public.friend_requests (sender_id);
create index if not exists friend_requests_status_idx on public.friend_requests (status);

-- Daily check-ins and sprints
create index if not exists daily_check_ins_user_created_idx on public.daily_check_ins (user_id, created_at desc);
create index if not exists sprints_user_created_idx on public.sprints (user_id, created_at desc);
create index if not exists sprint_tasks_sprint_status_idx on public.sprint_tasks (sprint_id, status);
create index if not exists sprint_comments_sprint_created_idx on public.sprint_comments (sprint_id, created_at);

-- Collaboration entities
create index if not exists collaboration_messages_session_created_idx on public.collaboration_messages (session_id, created_at);
create index if not exists user_presence_session_idx on public.user_presence (session_id);
create index if not exists live_comments_target_created_idx on public.live_comments (target_id, created_at);

-- Content and feedback
create index if not exists chatbot_shared_reports_user_created_idx on public.chatbot_shared_reports (user_id, created_at desc);
create index if not exists page_analytics_created_idx on public.page_analytics (created_at desc);
create index if not exists page_feedback_created_idx on public.page_feedback (created_at desc);

-- Reputation and bookmarks
create index if not exists user_reputation_user_idx on public.user_reputation (user_id);
create index if not exists reputation_transactions_user_created_idx on public.reputation_transactions (user_id, created_at desc);
create index if not exists user_bookmarks_user_created_idx on public.user_bookmarks (user_id, created_at desc);

-- Conversations: keep last_message_at consistent with new messages via trigger
create or replace function public.set_conversation_last_message_at()
returns trigger language plpgsql as $$
begin
  update public.conversations
    set last_message_at = coalesce(new.created_at, now())
  where id = new.conversation_id;
  return new;
end $$;

do $$ begin
  -- create trigger if it doesn't already exist
  if not exists (
    select 1 from pg_trigger
    where tgname = 'messages_set_conversation_last_message_at'
  ) then
    create trigger messages_set_conversation_last_message_at
    after insert on public.messages
    for each row execute function public.set_conversation_last_message_at();
  end if;
end $$;


