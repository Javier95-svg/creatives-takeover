-- Customer Discovery: one list of people per idea.
--
-- The progress strip counts interviews for the idea on screen, but the list
-- held everyone the founder ever found, for every idea. Each person now
-- belongs to an idea; the same person found for two ideas is two rows, each
-- with its own status.

ALTER TABLE public.pmf_discovery_leads
  ADD COLUMN IF NOT EXISTS validation_context_id uuid
    REFERENCES public.prebuild_validation_contexts(id) ON DELETE SET NULL;

-- The idea of the search that found them...
UPDATE public.pmf_discovery_leads lead
SET validation_context_id = search.validation_context_id
FROM public.pmf_customer_discovery search
WHERE lead.validation_context_id IS NULL
  AND search.id = COALESCE(lead.latest_discovery_id, lead.first_discovery_id)
  AND search.validation_context_id IS NOT NULL;

-- ...or, for searches made before ideas existed, the founder's latest idea.
-- Anyone still without an idea shows in every idea's list.
UPDATE public.pmf_discovery_leads lead
SET validation_context_id = (
  SELECT context.id
  FROM public.prebuild_validation_contexts context
  WHERE context.user_id = lead.user_id
  ORDER BY context.updated_at DESC NULLS LAST, context.created_at DESC
  LIMIT 1
)
WHERE lead.validation_context_id IS NULL;

-- One row per person per idea. NULLs stay distinct, so deleting an idea
-- (which unassigns its people) never collides with another unassigned row.
ALTER TABLE public.pmf_discovery_leads
  DROP CONSTRAINT IF EXISTS pmf_discovery_leads_user_id_source_normalized_username_key;
ALTER TABLE public.pmf_discovery_leads
  DROP CONSTRAINT IF EXISTS pmf_discovery_leads_user_context_person_key;
ALTER TABLE public.pmf_discovery_leads
  ADD CONSTRAINT pmf_discovery_leads_user_context_person_key
  UNIQUE (user_id, validation_context_id, source, normalized_username);

-- People a search finds join that search's idea.
CREATE OR REPLACE FUNCTION public.finalize_pmf_discovery_leads(p_user_id uuid, p_discovery_id uuid, p_people jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_person JSONB;
  v_username TEXT;
  v_normalized TEXT;
  v_source TEXT;
  v_profile_url TEXT;
  v_context_id UUID;
  v_lead public.pmf_discovery_leads%ROWTYPE;
  v_enriched JSONB := '[]'::jsonb;
BEGIN
  SELECT validation_context_id INTO v_context_id
  FROM public.pmf_customer_discovery
  WHERE id = p_discovery_id AND user_id = p_user_id;
  IF NOT FOUND THEN
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
      user_id, validation_context_id, source, normalized_username, username, latest_subreddit,
      profile_url, latest_permalink, latest_pain_quote,
      first_discovery_id, latest_discovery_id, rank_score, intent_score
    ) VALUES (
      p_user_id, v_context_id, v_source, v_normalized, v_username, NULLIF(v_person->>'subreddit', ''),
      v_profile_url,
      NULLIF(v_person->>'permalink', ''), NULLIF(v_person->>'painQuote', ''),
      p_discovery_id, p_discovery_id,
      CASE WHEN COALESCE(v_person->>'rankScore', '') ~ '^\d{1,3}$'
        THEN LEAST(100, GREATEST(0, (v_person->>'rankScore')::INTEGER)) ELSE 0 END,
      CASE WHEN COALESCE(v_person->>'intentScore', '') ~ '^\d{1,3}$'
        THEN LEAST(100, GREATEST(0, (v_person->>'intentScore')::INTEGER)) ELSE 0 END
    )
    ON CONFLICT (user_id, validation_context_id, source, normalized_username) DO UPDATE SET
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
$function$;

REVOKE ALL ON FUNCTION public.finalize_pmf_discovery_leads(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_pmf_discovery_leads(uuid, uuid, jsonb) TO service_role;
