-- PMF Customer Discovery: multi-source leads + platform validation network.
-- 1) Widens pmf_discovery_leads beyond Reddit (platform members, Hacker News, X, LinkedIn, web).
-- 2) Adds an explicit validation-network opt-in on profiles.
-- 3) match_validation_users(): opted-in platform members ranked for interview fit.
-- 4) finalize_pmf_discovery_leads(): source-aware profile URLs for scan people.

-- ── 1. Multi-source lead schema ─────────────────────────────────────────────
ALTER TABLE public.pmf_discovery_leads
  DROP CONSTRAINT IF EXISTS pmf_discovery_leads_source_check;
ALTER TABLE public.pmf_discovery_leads
  ADD CONSTRAINT pmf_discovery_leads_source_check
  CHECK (source IN ('reddit', 'platform', 'hackernews', 'x', 'linkedin', 'web'));

ALTER TABLE public.pmf_discovery_leads
  ADD COLUMN IF NOT EXISTS platform_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.pmf_discovery_leads
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- ── 2. Validation-network opt-in ────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS validation_interviews_opt_in BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_validation_network
  ON public.profiles (last_active_at DESC NULLS LAST)
  WHERE validation_interviews_opt_in;

-- ── 3. Platform member matching ─────────────────────────────────────────────
-- SECURITY DEFINER so it can rank across profiles, but it only returns fields
-- that are already public via public_profiles, plus a coarse activity bucket
-- (never the precise last_active_at timestamp).
CREATE OR REPLACE FUNCTION public.match_validation_users(
  p_industries TEXT[] DEFAULT '{}',
  p_stage TEXT DEFAULT NULL,
  p_keywords TEXT[] DEFAULT '{}',
  p_limit INTEGER DEFAULT 12
) RETURNS TABLE (
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  positioning_line TEXT,
  startup_name TEXT,
  startup_tagline TEXT,
  startup_industry TEXT[],
  startup_stage TEXT,
  bio TEXT,
  activity_bucket TEXT,
  match_score INTEGER,
  match_reasons TEXT[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester UUID := auth.uid();
  v_industries TEXT[];
  v_keywords TEXT[];
BEGIN
  IF v_requester IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_industries := ARRAY(
    SELECT DISTINCT lower(trim(item)) FROM unnest(COALESCE(p_industries, '{}')) AS item
    WHERE length(trim(item)) BETWEEN 2 AND 60 LIMIT 10
  );
  -- Escape ILIKE wildcards so keyword matching stays literal.
  v_keywords := ARRAY(
    SELECT DISTINCT replace(replace(replace(lower(trim(item)), '\', '\\'), '%', '\%'), '_', '\_')
    FROM unnest(COALESCE(p_keywords, '{}')) AS item
    WHERE length(trim(item)) BETWEEN 3 AND 40 LIMIT 8
  );

  RETURN QUERY
  WITH candidates AS (
    SELECT
      p.id,
      p.username,
      p.full_name,
      p.avatar_url,
      p.positioning_line,
      p.startup_name,
      p.startup_tagline,
      p.startup_industry,
      p.startup_stage,
      p.bio,
      p.last_active_at,
      lower(concat_ws(' ', p.bio, p.startup_description, p.positioning_line, p.startup_tagline, p.creative_niche)) AS haystack,
      ARRAY(
        SELECT DISTINCT lower(trim(item)) FROM unnest(COALESCE(p.startup_industry, '{}')) AS item
      ) AS industries_norm
    FROM public.profiles p
    WHERE p.validation_interviews_opt_in
      AND p.id <> v_requester
      AND p.username IS NOT NULL
  ), scored AS (
    SELECT
      c.*,
      COALESCE((
        SELECT count(*) FROM unnest(v_industries) AS wanted
        WHERE wanted = ANY(c.industries_norm)
      ), 0)::INTEGER AS industry_hits,
      COALESCE((
        SELECT count(*) FROM unnest(v_keywords) AS kw
        WHERE c.haystack ILIKE '%' || kw || '%'
      ), 0)::INTEGER AS keyword_hits,
      (p_stage IS NOT NULL AND c.startup_stage IS NOT NULL AND lower(c.startup_stage) = lower(p_stage)) AS stage_match,
      CASE
        WHEN c.last_active_at >= NOW() - INTERVAL '7 days' THEN 15
        WHEN c.last_active_at >= NOW() - INTERVAL '30 days' THEN 10
        WHEN c.last_active_at >= NOW() - INTERVAL '90 days' THEN 5
        ELSE 0
      END AS recency_score
    FROM candidates c
  )
  SELECT
    s.id,
    s.username,
    s.full_name,
    s.avatar_url,
    s.positioning_line,
    s.startup_name,
    s.startup_tagline,
    s.startup_industry,
    s.startup_stage,
    s.bio,
    CASE
      WHEN s.last_active_at >= NOW() - INTERVAL '7 days' THEN 'this_week'
      WHEN s.last_active_at >= NOW() - INTERVAL '30 days' THEN 'this_month'
      ELSE 'earlier'
    END,
    LEAST(100, s.industry_hits * 30
      + LEAST(s.keyword_hits * 8, 24)
      + CASE WHEN s.stage_match THEN 15 ELSE 0 END
      + s.recency_score)::INTEGER,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN s.industry_hits > 0 THEN 'Same industry' END,
      CASE WHEN s.keyword_hits > 0 THEN 'Mentions your problem space' END,
      CASE WHEN s.stage_match THEN 'Same startup stage' END,
      CASE WHEN s.recency_score >= 10 THEN 'Recently active' END
    ], NULL)
  FROM scored s
  ORDER BY
    (s.industry_hits * 30 + LEAST(s.keyword_hits * 8, 24)
      + CASE WHEN s.stage_match THEN 15 ELSE 0 END + s.recency_score) DESC,
    s.last_active_at DESC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 12), 1), 24);
END;
$$;

REVOKE ALL ON FUNCTION public.match_validation_users(TEXT[], TEXT, TEXT[], INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_validation_users(TEXT[], TEXT, TEXT[], INTEGER) TO authenticated, service_role;

-- ── 4. Source-aware lead finalization ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.finalize_pmf_discovery_leads(
  p_user_id UUID,
  p_discovery_id UUID,
  p_people JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_person JSONB;
  v_username TEXT;
  v_normalized TEXT;
  v_source TEXT;
  v_profile_url TEXT;
  v_lead public.pmf_discovery_leads%ROWTYPE;
  v_enriched JSONB := '[]'::jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.pmf_customer_discovery
    WHERE id = p_discovery_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Discovery result does not belong to the requested user';
  END IF;

  IF jsonb_typeof(COALESCE(p_people, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'People payload must be a JSON array';
  END IF;

  FOR v_person IN SELECT value FROM jsonb_array_elements(COALESCE(p_people, '[]'::jsonb))
  LOOP
    v_username := trim(COALESCE(v_person->>'username', ''));
    v_normalized := lower(v_username);
    IF v_normalized = '' OR v_normalized IN ('[deleted]', 'deleted', 'automoderator') THEN
      CONTINUE;
    END IF;

    v_source := COALESCE(NULLIF(trim(v_person->>'source'), ''), 'reddit');
    IF v_source NOT IN ('reddit', 'hackernews', 'x', 'linkedin', 'web') THEN
      v_source := 'reddit';
    END IF;
    v_profile_url := COALESCE(
      NULLIF(trim(v_person->>'profileUrl'), ''),
      CASE v_source
        WHEN 'reddit' THEN 'https://www.reddit.com/user/' || v_username
        WHEN 'hackernews' THEN 'https://news.ycombinator.com/user?id=' || v_username
        ELSE NULL
      END
    );

    INSERT INTO public.pmf_discovery_leads (
      user_id, source, normalized_username, username, latest_subreddit,
      profile_url, latest_permalink, latest_pain_quote,
      first_discovery_id, latest_discovery_id, rank_score, intent_score
    ) VALUES (
      p_user_id, v_source, v_normalized, v_username, NULLIF(v_person->>'subreddit', ''),
      v_profile_url,
      NULLIF(v_person->>'permalink', ''), NULLIF(v_person->>'painQuote', ''),
      p_discovery_id, p_discovery_id,
      CASE WHEN COALESCE(v_person->>'rankScore', '') ~ '^\d{1,3}$'
        THEN LEAST(100, GREATEST(0, (v_person->>'rankScore')::INTEGER)) ELSE 0 END,
      CASE WHEN COALESCE(v_person->>'intentScore', '') ~ '^\d{1,3}$'
        THEN LEAST(100, GREATEST(0, (v_person->>'intentScore')::INTEGER)) ELSE 0 END
    )
    ON CONFLICT (user_id, source, normalized_username) DO UPDATE SET
      username = EXCLUDED.username,
      latest_subreddit = EXCLUDED.latest_subreddit,
      profile_url = EXCLUDED.profile_url,
      latest_permalink = EXCLUDED.latest_permalink,
      latest_pain_quote = EXCLUDED.latest_pain_quote,
      latest_discovery_id = EXCLUDED.latest_discovery_id,
      rank_score = EXCLUDED.rank_score,
      intent_score = EXCLUDED.intent_score,
      occurrence_count = public.pmf_discovery_leads.occurrence_count + 1,
      last_seen_at = NOW()
    RETURNING * INTO v_lead;

    v_enriched := v_enriched || jsonb_build_array(
      v_person || jsonb_build_object(
        'leadId', v_lead.id,
        'leadStatus', v_lead.status,
        'occurrenceCount', v_lead.occurrence_count,
        'isRepeat', v_lead.occurrence_count > 1
      )
    );
  END LOOP;

  IF jsonb_array_length(v_enriched) = 0 THEN
    RAISE EXCEPTION 'No usable people were provided for lead finalization';
  END IF;

  UPDATE public.pmf_customer_discovery
  SET people = v_enriched
  WHERE id = p_discovery_id AND user_id = p_user_id;

  RETURN v_enriched;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_pmf_discovery_leads(UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_pmf_discovery_leads(UUID, UUID, JSONB) TO service_role;
