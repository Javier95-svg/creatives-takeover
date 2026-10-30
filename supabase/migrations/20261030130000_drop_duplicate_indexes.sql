-- Drop indexes that exactly duplicate another index on the same table.
--
-- Each one below has the same columns, sort order, operator class, predicate
-- and access method as the index named in its comment, which stays. None is
-- backed by a constraint and no foreign key depends on it; primary keys and
-- unique constraints are all kept. A duplicate index gives reads nothing and
-- costs every insert and update (and planner time) on its table.
--
-- Generated from the production catalog on 2026-10-30. IF EXISTS keeps it
-- safe to re-run. DROP INDEX takes a brief exclusive lock; these tables are
-- small enough that it is momentary.

DROP INDEX IF EXISTS public.idx_ai_cache_key;  -- ai_cache: same as ai_cache_cache_key_key
DROP INDEX IF EXISTS public.idx_articles_slug;  -- articles: same as articles_slug_key
DROP INDEX IF EXISTS public.idx_bizmap_shared_outputs_slug;  -- bizmap_shared_outputs: same as bizmap_shared_outputs_slug_key
DROP INDEX IF EXISTS public.idx_chat_sessions_id;  -- chat_sessions: same as chat_sessions_pkey
DROP INDEX IF EXISTS public.idx_chat_sessions_user_updated_at;  -- chat_sessions: same as idx_chat_sessions_user_updated
DROP INDEX IF EXISTS public.idx_chatbot_feedback_user_id;  -- chatbot_feedback: same as idx_chatbot_feedback_user
DROP INDEX IF EXISTS public.idx_conversations_participants_gin;  -- conversations: same as idx_conversations_participants
DROP INDEX IF EXISTS public.idx_conversion_funnels_session_id;  -- conversion_funnels: same as conversion_funnels_session_id_key
DROP INDEX IF EXISTS public.daily_task_plan_items_rank_idx;  -- daily_task_plan_items: same as daily_task_plan_items_plan_id_rank_key
DROP INDEX IF EXISTS public.idx_dashboard_files_user_id_updated_at;  -- dashboard_files: same as dashboard_files_dashboard_recent_idx
DROP INDEX IF EXISTS public.demo_studio_briefs_project_idx;  -- demo_studio_briefs: same as demo_studio_briefs_project_id_key
DROP INDEX IF EXISTS public.demo_studio_demos_public_id_idx;  -- demo_studio_demos: same as demo_studio_demos_public_id_key
DROP INDEX IF EXISTS public.demo_studio_projects_slug_idx;  -- demo_studio_projects: same as demo_studio_projects_slug_key
DROP INDEX IF EXISTS public.idx_demo_try_guest_drafts_resume_token;  -- demo_try_guest_drafts: same as demo_try_guest_drafts_resume_token_key
DROP INDEX IF EXISTS public.idx_founder_profiles_user_id;  -- founder_profiles: same as unique_user_profile
DROP INDEX IF EXISTS public.idx_funding_slug;  -- funding_opportunities: same as funding_opportunities_slug_key
DROP INDEX IF EXISTS public.idx_icp_guest_drafts_resume_token;  -- icp_guest_drafts: same as icp_guest_drafts_resume_token_key
DROP INDEX IF EXISTS public.idx_investors_slug;  -- investors: same as investors_slug_unique
DROP INDEX IF EXISTS public.idx_market_insights_cache_key;  -- market_insights_cache: same as market_insights_cache_cache_key_key
DROP INDEX IF EXISTS public.mentor_saves_user_created_idx;  -- mentor_saves: same as mentor_saves_dashboard_recent_idx
DROP INDEX IF EXISTS public.message_attachments_message_id_v2_idx;  -- message_attachments: same as message_attachments_message_id_idx
DROP INDEX IF EXISTS public.message_reactions_message_id_v2_idx;  -- message_reactions: same as idx_message_reactions_message_id
DROP INDEX IF EXISTS public.message_receipts_message_id_v2_idx;  -- message_receipts: same as message_receipts_message_id_idx
DROP INDEX IF EXISTS public.idx_messages_conversation_id;  -- messages: same as idx_messages_conversation
DROP INDEX IF EXISTS public.messages_conversation_cursor_v2_idx;  -- messages: same as messages_conversation_created_id_idx
DROP INDEX IF EXISTS public.idx_profiles_user_id;  -- profiles: same as profiles_pkey
DROP INDEX IF EXISTS public.idx_profiles_username;  -- profiles: same as profiles_username_key
DROP INDEX IF EXISTS public.referral_codes_code_idx;  -- referral_codes: same as referral_codes_code_key
DROP INDEX IF EXISTS public.revenue_metrics_dashboard_recent_idx;  -- revenue_metrics: same as idx_revenue_metrics_user_date
DROP INDEX IF EXISTS public.idx_stories_articles_slug;  -- stories_articles: same as stories_articles_slug_key
DROP INDEX IF EXISTS public.idx_webhook_events_event_id;  -- stripe_webhook_events: same as stripe_webhook_events_event_id_key
DROP INDEX IF EXISTS public.idx_monthly_quotas_user_month;  -- user_monthly_quotas: same as user_monthly_quotas_user_id_month_key
DROP INDEX IF EXISTS public.idx_user_status_user_id;  -- user_status: same as user_status_user_id_key
DROP INDEX IF EXISTS public.waitlist_pages_slug_idx;  -- waitlist_pages: same as waitlist_pages_slug_key
