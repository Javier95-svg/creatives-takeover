-- Backend follow-ups: RLS hardening, minimal scheduled jobs, safety helpers

-- Enable pg_trgm for text search indexes if not present
create extension if not exists pg_trgm with schema public;

-- RLS for conversations/messages/social/content
-- Conversations
alter table if exists public.conversations enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='conversations' and policyname='conversations_select_participant'
  ) then
    create policy "conversations_select_participant" on public.conversations
      for select using ( auth.uid() = any(participants) );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='conversations' and policyname='conversations_insert_self_participant'
  ) then
    create policy "conversations_insert_self_participant" on public.conversations
      for insert with check ( auth.uid() = any(participants) );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='conversations' and policyname='conversations_update_participant'
  ) then
    create policy "conversations_update_participant" on public.conversations
      for update using ( auth.uid() = any(participants) );
  end if;
end $$;

-- Messages
alter table if exists public.messages enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='messages' and policyname='messages_select_conversation_participant'
  ) then
    create policy "messages_select_conversation_participant" on public.messages
      for select using (
        exists (
          select 1 from public.conversations c
          where c.id = conversation_id and auth.uid() = any(c.participants)
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='messages' and policyname='messages_insert_sender_is_user_and_participant'
  ) then
    create policy "messages_insert_sender_is_user_and_participant" on public.messages
      for insert with check (
        sender_id = auth.uid() and exists (
          select 1 from public.conversations c
          where c.id = conversation_id and auth.uid() = any(c.participants)
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='messages' and policyname='messages_update_own_for_read'
  ) then
    create policy "messages_update_own_for_read" on public.messages
      for update using (
        exists (
          select 1 from public.conversations c
          where c.id = conversation_id and auth.uid() = any(c.participants)
        )
      );
  end if;
end $$;

-- Community posts
alter table if exists public.community_posts enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='community_posts' and policyname='community_posts_select_all'
  ) then
    create policy "community_posts_select_all" on public.community_posts for select using ( true );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='community_posts' and policyname='community_posts_insert_own'
  ) then
    create policy "community_posts_insert_own" on public.community_posts for insert with check ( user_id = auth.uid() );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='community_posts' and policyname='community_posts_update_own'
  ) then
    create policy "community_posts_update_own" on public.community_posts for update using ( user_id = auth.uid() );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='community_posts' and policyname='community_posts_delete_own'
  ) then
    create policy "community_posts_delete_own" on public.community_posts for delete using ( user_id = auth.uid() );
  end if;
end $$;

-- Friend requests
alter table if exists public.friend_requests enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='friend_requests' and policyname='friend_requests_select_involved'
  ) then
    create policy "friend_requests_select_involved" on public.friend_requests
      for select using ( sender_id = auth.uid() or receiver_id = auth.uid() );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='friend_requests' and policyname='friend_requests_insert_sender_self'
  ) then
    create policy "friend_requests_insert_sender_self" on public.friend_requests
      for insert with check ( sender_id = auth.uid() );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='friend_requests' and policyname='friend_requests_update_involved'
  ) then
    create policy "friend_requests_update_involved" on public.friend_requests
      for update using ( sender_id = auth.uid() or receiver_id = auth.uid() );
  end if;
end $$;

-- User follows
alter table if exists public.user_follows enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_follows' and policyname='user_follows_select_public'
  ) then
    create policy "user_follows_select_public" on public.user_follows for select using ( true );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_follows' and policyname='user_follows_insert_self'
  ) then
    create policy "user_follows_insert_self" on public.user_follows for insert with check ( follower_id = auth.uid() );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_follows' and policyname='user_follows_delete_self'
  ) then
    create policy "user_follows_delete_self" on public.user_follows for delete using ( follower_id = auth.uid() );
  end if;
end $$;

-- Daily check-ins
alter table if exists public.daily_check_ins enable row level security;
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='daily_check_ins' and policyname='daily_check_ins_select_own'
  ) then
    create policy "daily_check_ins_select_own" on public.daily_check_ins for select using ( user_id = auth.uid() );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='daily_check_ins' and policyname='daily_check_ins_insert_own'
  ) then
    create policy "daily_check_ins_insert_own" on public.daily_check_ins for insert with check ( user_id = auth.uid() );
  end if;
end $$;

-- Sprints and tasks
alter table if exists public.sprints enable row level security;
alter table if exists public.sprint_tasks enable row level security;
alter table if exists public.sprint_comments enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sprints' and policyname='sprints_own') then
    create policy "sprints_own" on public.sprints for all using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sprint_tasks' and policyname='sprint_tasks_by_sprint') then
    create policy "sprint_tasks_by_sprint" on public.sprint_tasks for all using (
      exists (select 1 from public.sprints s where s.id = sprint_id and s.user_id = auth.uid())
    ) with check (
      exists (select 1 from public.sprints s where s.id = sprint_id and s.user_id = auth.uid())
    );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sprint_comments' and policyname='sprint_comments_by_sprint') then
    create policy "sprint_comments_by_sprint" on public.sprint_comments for all using (
      exists (select 1 from public.sprints s where s.id = sprint_id and s.user_id = auth.uid())
    ) with check (
      exists (select 1 from public.sprints s where s.id = sprint_id and s.user_id = auth.uid())
    );
  end if;
end $$;

-- Bookmarks and chatbot_shared_reports
alter table if exists public.user_bookmarks enable row level security;
alter table if exists public.chatbot_shared_reports enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_bookmarks' and policyname='user_bookmarks_own') then
    create policy "user_bookmarks_own" on public.user_bookmarks for all using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='chatbot_shared_reports' and policyname='chatbot_shared_reports_own') then
    create policy "chatbot_shared_reports_own" on public.chatbot_shared_reports for all using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );
  end if;
end $$;

-- Reputation (read own + public aggregates)
alter table if exists public.user_reputation enable row level security;
alter table if exists public.reputation_transactions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_reputation' and policyname='user_reputation_select') then
    create policy "user_reputation_select" on public.user_reputation for select using ( true );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reputation_transactions' and policyname='reputation_transactions_own') then
    create policy "reputation_transactions_own" on public.reputation_transactions for all using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );
  end if;
end $$;

-- Minimal maintenance jobs using pg_cron where available
create extension if not exists pg_cron with schema extensions;

-- Create helper function for pruning old analytics safely
create or replace function public.prune_old_page_analytics(retain_days int default 30)
returns void language plpgsql as $$
begin
  if to_regclass('public.page_analytics') is not null then
    delete from public.page_analytics where created_at < now() - make_interval(days => retain_days);
  end if;
end $$;

-- Schedule daily pruning at 03:15 UTC (idempotent) if pg_cron present
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname='schedule' and n.nspname='extensions') then
    perform extensions.cron_schedule('daily_analytics_prune', '15 3 * * *', $$select public.prune_old_page_analytics(30);$$)
    on conflict do nothing;
  end if;
end $$;


