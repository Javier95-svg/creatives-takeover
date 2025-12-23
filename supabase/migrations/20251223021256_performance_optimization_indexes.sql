-- ================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- Additional indexes to improve query performance across the application
-- ================================================

-- Fundraising Readiness Assessments: Index for lookups by assessment_id (used in investor matching)
CREATE INDEX IF NOT EXISTS idx_assessments_id_user 
ON public.fundraising_readiness_assessments(id, user_id);

-- Investors: Composite index for active investors with stage filtering (common query pattern)
-- Note: investment_stages is an array, so we can't include it directly in B-tree index
-- The existing GIN index on investment_stages handles array queries efficiently
CREATE INDEX IF NOT EXISTS idx_investors_active_created 
ON public.investors(is_active, created_at DESC) 
WHERE is_active = true;

-- Investors: Index for locations filtering (if not exists from main table)
-- Note: locations array already has GIN index from main investors table, but adding filtered version for active investors
-- Using IF NOT EXISTS to avoid conflicts
CREATE INDEX IF NOT EXISTS idx_investors_locations_active_gin 
ON public.investors USING GIN(locations) 
WHERE is_active = true;


-- Business Insights Cache: Index for faster cache lookups
CREATE INDEX IF NOT EXISTS idx_business_insights_cache_lookup 
ON public.business_insights_cache(industry, business_stage, expires_at DESC) 
WHERE expires_at > now();

-- Personalized Recommendations: Index for user lookups with expiration
CREATE INDEX IF NOT EXISTS idx_personalized_recommendations_user 
ON public.personalized_recommendations(user_id, expires_at DESC, is_dismissed) 
WHERE expires_at > now() AND is_dismissed = false;

-- Community Posts: Index for featured posts lookup
CREATE INDEX IF NOT EXISTS idx_community_posts_featured 
ON public.community_posts(is_featured, created_at DESC) 
WHERE is_featured = true;

-- Post Comments: Index for post comments lookup (common pattern)
CREATE INDEX IF NOT EXISTS idx_post_comments_post_created 
ON public.post_comments(post_id, created_at DESC);

-- User Activity Log: Index for recent activity lookups
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_created 
ON public.user_activity_log(user_id, created_at DESC);

-- Chat Sessions: Index for user sessions lookup
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated 
ON public.chat_sessions(user_id, updated_at DESC);

-- Business Success Scores: Index for latest scores per user
CREATE INDEX IF NOT EXISTS idx_business_success_scores_user_created 
ON public.business_success_scores(user_id, created_at DESC);

