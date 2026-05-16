-- Social networking layer alignment for the existing Creatives Takeover schema.
-- This migration is intentionally additive: it does not recreate profiles,
-- community_posts, messages, user_follows, or friend_requests because those
-- surfaces already exist in production.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_project text,
  ADD COLUMN IF NOT EXISTS stage text,
  ADD COLUMN IF NOT EXISTS niche text,
  ADD COLUMN IF NOT EXISTS is_coach boolean DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_stage_social_layer_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_stage_social_layer_check
      CHECK (
        stage IS NULL OR stage IN ('idea', 'validation', 'mvp', 'launch', 'scaling')
      );
  END IF;
END $$;

UPDATE public.profiles
SET
  current_project = COALESCE(current_project, startup_name, current_focus),
  stage = COALESCE(stage, startup_stage, business_stage, quiz_current_stage),
  niche = COALESCE(niche, creative_niche),
  is_coach = COALESCE(is_coach, false)
WHERE current_project IS NULL
   OR stage IS NULL
   OR niche IS NULL
   OR is_coach IS NULL;

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS post_type text,
  ADD COLUMN IF NOT EXISTS link_url text,
  ADD COLUMN IF NOT EXISTS link_preview jsonb,
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_posts_post_type_social_layer_check'
      AND conrelid = 'public.community_posts'::regclass
  ) THEN
    ALTER TABLE public.community_posts
      ADD CONSTRAINT community_posts_post_type_social_layer_check
      CHECK (
        post_type IS NULL OR post_type IN (
          'build_in_public',
          'mindset',
          'growth_marketing',
          'fundraising_revenue',
          'product_validation'
        )
      );
  END IF;
END $$;

UPDATE public.community_posts
SET
  is_public = COALESCE(is_public, true),
  post_type = COALESCE(
    post_type,
    CASE
      WHEN content_type IN ('build_in_public', 'mindset', 'growth_marketing', 'fundraising_revenue', 'product_validation') THEN content_type
      WHEN tags && ARRAY['build_in_public', 'milestone', 'behind_scenes', 'behind-the-scenes', 'stage_checkin', 'stage-checkin', 'update', 'progress']::text[] THEN 'build_in_public'
      WHEN tags && ARRAY['mindset', 'testimonial']::text[] THEN 'mindset'
      WHEN tags && ARRAY['growth_marketing', 'growth', 'marketing']::text[] THEN 'growth_marketing'
      WHEN tags && ARRAY['fundraising_revenue', 'fundraising', 'revenue']::text[] THEN 'fundraising_revenue'
      WHEN tags && ARRAY['product_validation', 'question', 'resource', 'validation', 'product']::text[] THEN 'product_validation'
      ELSE 'build_in_public'
    END
  )
WHERE is_public IS NULL
   OR post_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_community_posts_public_created
  ON public.community_posts (is_public, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_post_type
  ON public.community_posts (post_type);

CREATE INDEX IF NOT EXISTS idx_profiles_stage_niche
  ON public.profiles (stage, niche);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_posts'
      AND policyname = 'Public community posts are viewable'
  ) THEN
    CREATE POLICY "Public community posts are viewable"
      ON public.community_posts
      FOR SELECT
      TO anon, authenticated
      USING (is_public = true OR auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_posts'
      AND policyname = 'Authenticated users can create community posts'
  ) THEN
    CREATE POLICY "Authenticated users can create community posts"
      ON public.community_posts
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_posts'
      AND policyname = 'Authors can update own community posts'
  ) THEN
    CREATE POLICY "Authors can update own community posts"
      ON public.community_posts
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_posts'
      AND policyname = 'Authors can delete own community posts'
  ) THEN
    CREATE POLICY "Authors can delete own community posts"
      ON public.community_posts
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT ON TABLE public.community_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.community_posts TO authenticated;

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  username,
  full_name,
  avatar_url,
  bio,
  positioning_line,
  COALESCE(niche, creative_niche) AS creative_niche,
  followers_count,
  following_count,
  location,
  COALESCE(current_project, startup_name) AS startup_name,
  startup_tagline,
  COALESCE(stage, startup_stage, business_stage) AS startup_stage,
  startup_industry,
  website_url,
  twitter_url,
  linkedin_url,
  instagram_url,
  facebook_url,
  youtube_url,
  github_url,
  tiktok_url,
  is_coach
FROM public.profiles;

REVOKE ALL ON TABLE public.public_profiles FROM PUBLIC;
REVOKE ALL ON TABLE public.public_profiles FROM anon;
REVOKE ALL ON TABLE public.public_profiles FROM authenticated;
GRANT SELECT ON TABLE public.public_profiles TO anon;
GRANT SELECT ON TABLE public.public_profiles TO authenticated;

COMMENT ON COLUMN public.community_posts.post_type IS
  'Product-facing room category for the social networking layer: build in public, mindset, growth/marketing, fundraising/revenue, or product/validation.';
COMMENT ON COLUMN public.community_posts.is_public IS
  'Controls whether a community post can appear in public Explore previews.';
