-- GTM competitive upgrade: first-party evidence, claim provenance, qualitative
-- weekly learning, richer assets, and play-level pipeline attribution.

CREATE TABLE IF NOT EXISTS public.gtm_evidence_items (
  plan_id uuid NOT NULL REFERENCES public.gtm_plans(id) ON DELETE CASCADE,
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_kind text NOT NULL CHECK (evidence_kind IN ('website', 'interview', 'document', 'pricing', 'competitor', 'traction', 'founder_note')),
  title text NOT NULL,
  content text NOT NULL,
  source_url text,
  source_date date,
  verified boolean NOT NULL DEFAULT false,
  channel_ids text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, id)
);

CREATE TABLE IF NOT EXISTS public.gtm_claim_attributions (
  plan_id uuid NOT NULL REFERENCES public.gtm_plans(id) ON DELETE CASCADE,
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim text NOT NULL,
  area text NOT NULL CHECK (area IN ('positioning', 'channel', 'competitor', 'buyer', 'economics')),
  source_ids text[] NOT NULL DEFAULT '{}',
  confidence text NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  assumption boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, id)
);

CREATE TABLE IF NOT EXISTS public.gtm_pipeline_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.gtm_plans(id) ON DELETE CASCADE,
  play_id uuid NOT NULL REFERENCES public.gtm_plays(id) ON DELETE CASCADE,
  name text NOT NULL,
  stage text NOT NULL CHECK (stage IN ('lead', 'qualified', 'opportunity', 'customer', 'lost')),
  value numeric(14,2) NOT NULL DEFAULT 0 CHECK (value >= 0),
  source_channel_id text NOT NULL,
  momentum text NOT NULL DEFAULT 'active' CHECK (momentum IN ('active', 'slowing', 'at_risk', 'closed')),
  occurred_at date NOT NULL DEFAULT current_date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gtm_weekly_reviews
  ADD COLUMN IF NOT EXISTS review_input jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS change_log jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.gtm_play_assets
  DROP CONSTRAINT IF EXISTS gtm_play_assets_asset_type_check;
ALTER TABLE public.gtm_play_assets
  ADD CONSTRAINT gtm_play_assets_asset_type_check CHECK (asset_type IN (
    'outreach_message', 'outreach_sequence', 'directory_listing', 'campaign_brief',
    'interview_script', 'landing_page_copy', 'content_calendar', 'partnership_pitch',
    'paid_test_matrix', 'launch_checklist'
  ));

CREATE INDEX IF NOT EXISTS gtm_evidence_items_user_plan_idx ON public.gtm_evidence_items(user_id, plan_id, evidence_kind);
CREATE INDEX IF NOT EXISTS gtm_claim_attributions_user_plan_idx ON public.gtm_claim_attributions(user_id, plan_id, area);
CREATE INDEX IF NOT EXISTS gtm_pipeline_entries_user_plan_idx ON public.gtm_pipeline_entries(user_id, plan_id, stage, occurred_at DESC);
CREATE INDEX IF NOT EXISTS gtm_pipeline_entries_play_idx ON public.gtm_pipeline_entries(play_id, occurred_at DESC);

ALTER TABLE public.gtm_evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_claim_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtm_pipeline_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their GTM evidence" ON public.gtm_evidence_items;
CREATE POLICY "Users manage their GTM evidence" ON public.gtm_evidence_items
  FOR ALL
  USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.gtm_plans p WHERE p.id = gtm_evidence_items.plan_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.gtm_plans p WHERE p.id = gtm_evidence_items.plan_id AND p.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Users manage their GTM claim attribution" ON public.gtm_claim_attributions;
CREATE POLICY "Users manage their GTM claim attribution" ON public.gtm_claim_attributions
  FOR ALL
  USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.gtm_plans p WHERE p.id = gtm_claim_attributions.plan_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.gtm_plans p WHERE p.id = gtm_claim_attributions.plan_id AND p.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Users manage their GTM pipeline" ON public.gtm_pipeline_entries;
CREATE POLICY "Users manage their GTM pipeline" ON public.gtm_pipeline_entries
  FOR ALL
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.gtm_plays p
      WHERE p.id = gtm_pipeline_entries.play_id
        AND p.plan_id = gtm_pipeline_entries.plan_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.gtm_plays p
      WHERE p.id = gtm_pipeline_entries.play_id
        AND p.plan_id = gtm_pipeline_entries.plan_id
        AND p.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS set_gtm_evidence_items_updated_at ON public.gtm_evidence_items;
CREATE TRIGGER set_gtm_evidence_items_updated_at BEFORE UPDATE ON public.gtm_evidence_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS set_gtm_claim_attributions_updated_at ON public.gtm_claim_attributions;
CREATE TRIGGER set_gtm_claim_attributions_updated_at BEFORE UPDATE ON public.gtm_claim_attributions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS set_gtm_pipeline_entries_updated_at ON public.gtm_pipeline_entries;
CREATE TRIGGER set_gtm_pipeline_entries_updated_at BEFORE UPDATE ON public.gtm_pipeline_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Persist the immutable researched version and its normalized execution records
-- in one database transaction. Any invalid artifact rolls the whole generation
-- back so the Edge Function can safely refund the idempotent credit charge.
CREATE OR REPLACE FUNCTION public.persist_gtm_competitive_plan(
  p_user_id uuid,
  p_plan_id uuid,
  p_plan_title text,
  p_plan_content jsonb,
  p_research_sources jsonb,
  p_research_status text,
  p_plays jsonb,
  p_tasks jsonb,
  p_assets jsonb,
  p_competitor_briefs jsonb,
  p_evidence_items jsonb,
  p_claim_attributions jsonb,
  p_pipeline_entries jsonb
)
RETURNS TABLE(plan_id uuid, version integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_version integer;
BEGIN
  SELECT persisted.plan_id, persisted.version
  INTO v_plan_id, v_version
  FROM public.persist_gtm_plan_v2(
    p_user_id, p_plan_id, p_plan_title, p_plan_content,
    COALESCE(p_research_sources, '[]'::jsonb), p_research_status,
    COALESCE(p_plays, '[]'::jsonb)
  ) AS persisted;

  DELETE FROM public.gtm_tasks WHERE plan_id = v_plan_id AND user_id = p_user_id;
  DELETE FROM public.gtm_play_assets WHERE plan_id = v_plan_id AND user_id = p_user_id;
  DELETE FROM public.gtm_competitor_briefs WHERE plan_id = v_plan_id AND user_id = p_user_id;
  DELETE FROM public.gtm_evidence_items WHERE plan_id = v_plan_id AND user_id = p_user_id;
  DELETE FROM public.gtm_claim_attributions WHERE plan_id = v_plan_id AND user_id = p_user_id;

  INSERT INTO public.gtm_tasks(
    id, user_id, plan_id, play_id, week_number, title, detail, owner_label,
    time_estimate_minutes, expected_output, metric, status, completed_at
  )
  SELECT
    task->>'id', p_user_id, v_plan_id, NULLIF(task->>'playId', ''),
    (task->>'week')::integer, task->>'title', COALESCE(task->>'detail', ''),
    COALESCE(task->>'owner', 'Founder'),
    GREATEST(1, COALESCE((task->>'timeEstimateMinutes')::integer, 30)),
    COALESCE(task->>'output', ''), COALESCE(task->>'metric', ''),
    CASE WHEN task->>'status' IN ('todo', 'doing', 'done', 'skipped') THEN task->>'status' ELSE 'todo' END,
    NULLIF(task->>'completedAt', '')::timestamptz
  FROM jsonb_array_elements(COALESCE(p_tasks, '[]'::jsonb)) AS rows(task);

  INSERT INTO public.gtm_play_assets(
    id, user_id, plan_id, play_id, asset_type, title, content, status
  )
  SELECT
    asset->>'id', p_user_id, v_plan_id, asset->>'playId', asset->>'type',
    asset->>'title', asset->>'content',
    CASE WHEN asset->>'status' IN ('draft', 'approved') THEN asset->>'status' ELSE 'draft' END
  FROM jsonb_array_elements(COALESCE(p_assets, '[]'::jsonb)) AS rows(asset);

  INSERT INTO public.gtm_competitor_briefs(id, user_id, plan_id, brief)
  SELECT brief->>'id', p_user_id, v_plan_id, brief
  FROM jsonb_array_elements(COALESCE(p_competitor_briefs, '[]'::jsonb)) AS rows(brief);

  INSERT INTO public.gtm_evidence_items(
    plan_id, id, user_id, evidence_kind, title, content, source_url,
    source_date, verified, channel_ids, created_at
  )
  SELECT
    v_plan_id, item->>'id', p_user_id, item->>'kind', item->>'title', item->>'content',
    NULLIF(item->>'url', ''), NULLIF(item->>'sourceDate', '')::date,
    COALESCE((item->>'verified')::boolean, false),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(item->'channelIds', '[]'::jsonb))),
    COALESCE(NULLIF(item->>'createdAt', '')::timestamptz, now())
  FROM jsonb_array_elements(COALESCE(p_evidence_items, '[]'::jsonb)) AS rows(item);

  INSERT INTO public.gtm_claim_attributions(
    plan_id, id, user_id, claim, area, source_ids, confidence, assumption
  )
  SELECT
    v_plan_id, claim->>'id', p_user_id, claim->>'claim', claim->>'area',
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(claim->'sourceIds', '[]'::jsonb))),
    claim->>'confidence', COALESCE((claim->>'assumption')::boolean, false)
  FROM jsonb_array_elements(COALESCE(p_claim_attributions, '[]'::jsonb)) AS rows(claim);

  INSERT INTO public.gtm_pipeline_entries(
    id, user_id, plan_id, play_id, name, stage, value, source_channel_id,
    momentum, occurred_at, notes
  )
  SELECT
    (entry->>'id')::uuid, p_user_id, v_plan_id, (entry->>'playId')::uuid,
    entry->>'name', entry->>'stage', GREATEST(0, COALESCE((entry->>'value')::numeric, 0)),
    entry->>'sourceChannelId', entry->>'momentum',
    NULLIF(entry->>'occurredAt', '')::date, NULLIF(entry->>'notes', '')
  FROM jsonb_array_elements(COALESCE(p_pipeline_entries, '[]'::jsonb)) AS rows(entry)
  ON CONFLICT (id) DO UPDATE SET
    play_id = EXCLUDED.play_id,
    name = EXCLUDED.name,
    stage = EXCLUDED.stage,
    value = EXCLUDED.value,
    source_channel_id = EXCLUDED.source_channel_id,
    momentum = EXCLUDED.momentum,
    occurred_at = EXCLUDED.occurred_at,
    notes = EXCLUDED.notes,
    updated_at = now()
  WHERE gtm_pipeline_entries.user_id = p_user_id
    AND gtm_pipeline_entries.plan_id = v_plan_id;

  RETURN QUERY SELECT v_plan_id, v_version;
END;
$$;

REVOKE ALL ON FUNCTION public.persist_gtm_competitive_plan(
  uuid, uuid, text, jsonb, jsonb, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_gtm_competitive_plan(
  uuid, uuid, text, jsonb, jsonb, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) TO service_role;

-- Keep database-facing plan copy aligned with the runtime feature contract.
UPDATE public.subscription_tiers
SET features = features || '["GTM Strategist available; researched generations use 6 credits and saved edits/reviews are included"]'::jsonb
WHERE tier_name IN ('rookie', 'starter')
  AND NOT features @> '["GTM Strategist available; researched generations use 6 credits and saved edits/reviews are included"]'::jsonb;

UPDATE public.subscription_tiers
SET features = (
  SELECT jsonb_agg(
    CASE
      WHEN value #>> '{}' LIKE 'GTM Strategist%' THEN to_jsonb('GTM Strategist available; researched generations use 6 credits and saved edits/reviews are included'::text)
      ELSE value
    END
  )
  FROM jsonb_array_elements(features)
)
WHERE tier_name IN ('rising', 'pro');

COMMENT ON TABLE public.gtm_evidence_items IS 'Founder-controlled first-party evidence used by GTM research, scoring, and attribution.';
COMMENT ON TABLE public.gtm_claim_attributions IS 'Claim-level provenance or explicit assumption status for GTM strategy output.';
COMMENT ON TABLE public.gtm_pipeline_entries IS 'Lightweight play-attributed pipeline and revenue evidence for a GTM plan.';
