-- PMF Customer Discovery lead pipeline.
-- Public Reddit identities only; outreach and interview lifecycle remain user-owned.

CREATE TABLE IF NOT EXISTS public.pmf_discovery_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'reddit' CHECK (source = 'reddit'),
  normalized_username TEXT NOT NULL,
  username TEXT NOT NULL,
  latest_subreddit TEXT,
  profile_url TEXT,
  latest_permalink TEXT,
  latest_pain_quote TEXT,
  first_discovery_id UUID REFERENCES public.pmf_customer_discovery(id) ON DELETE SET NULL,
  latest_discovery_id UUID REFERENCES public.pmf_customer_discovery(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'saved', 'contacted', 'interview_scheduled', 'interviewed', 'dismissed')),
  rank_score INTEGER NOT NULL DEFAULT 0 CHECK (rank_score BETWEEN 0 AND 100),
  intent_score INTEGER NOT NULL DEFAULT 0 CHECK (intent_score BETWEEN 0 AND 100),
  occurrence_count INTEGER NOT NULL DEFAULT 1 CHECK (occurrence_count >= 1),
  notes TEXT NOT NULL DEFAULT '',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contacted_at TIMESTAMPTZ,
  interview_scheduled_at TIMESTAMPTZ,
  interviewed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, source, normalized_username)
);

CREATE TABLE IF NOT EXISTS public.pmf_discovery_lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.pmf_discovery_leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'status_changed', 'note_added', 'outreach_copied', 'outreach_sent',
    'interview_scheduled', 'interview_logged'
  )),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pmf_discovery_leads_user_status
  ON public.pmf_discovery_leads(user_id, status, rank_score DESC, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_pmf_discovery_lead_activities_lead_time
  ON public.pmf_discovery_lead_activities(lead_id, occurred_at DESC);

ALTER TABLE public.pmf_discovery_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmf_discovery_lead_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own pmf discovery leads" ON public.pmf_discovery_leads;
CREATE POLICY "Users can manage own pmf discovery leads"
  ON public.pmf_discovery_leads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own pmf discovery lead activities" ON public.pmf_discovery_lead_activities;
CREATE POLICY "Users can manage own pmf discovery lead activities"
  ON public.pmf_discovery_lead_activities FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.pmf_discovery_leads lead
      WHERE lead.id = lead_id AND lead.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS update_pmf_discovery_leads_updated_at ON public.pmf_discovery_leads;
CREATE TRIGGER update_pmf_discovery_leads_updated_at
BEFORE UPDATE ON public.pmf_discovery_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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

    INSERT INTO public.pmf_discovery_leads (
      user_id, source, normalized_username, username, latest_subreddit,
      profile_url, latest_permalink, latest_pain_quote,
      first_discovery_id, latest_discovery_id, rank_score, intent_score
    ) VALUES (
      p_user_id, 'reddit', v_normalized, v_username, NULLIF(v_person->>'subreddit', ''),
      'https://www.reddit.com/user/' || v_username,
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
