-- Today-first task plans.
-- Keeps daily_tasks as the canonical task store while adding an idempotent,
-- timezone-aware daily plan and server-owned recommendation generation.

ALTER TABLE public.daily_tasks
  ADD COLUMN IF NOT EXISTS estimated_minutes integer,
  ADD COLUMN IF NOT EXISTS user_modified_at timestamptz;

UPDATE public.daily_tasks
SET estimated_minutes = GREATEST(5, LEAST(240, COALESCE(effort_estimate::integer, 15)))
WHERE estimated_minutes IS NULL;

ALTER TABLE public.daily_tasks
  ALTER COLUMN estimated_minutes SET DEFAULT 15,
  ALTER COLUMN estimated_minutes SET NOT NULL;

ALTER TABLE public.daily_tasks
  DROP CONSTRAINT IF EXISTS daily_tasks_estimated_minutes_check;
ALTER TABLE public.daily_tasks
  ADD CONSTRAINT daily_tasks_estimated_minutes_check
  CHECK (estimated_minutes BETWEEN 5 AND 240);

CREATE TABLE IF NOT EXISTS public.daily_task_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  status text NOT NULL DEFAULT 'building' CHECK (status IN ('building','ready','failed')),
  context_hash text,
  context_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(context_snapshot)='object'),
  policy_version text NOT NULL DEFAULT 'task_plan_hybrid_v1',
  model text NOT NULL DEFAULT 'deterministic-v1',
  fallback_used boolean NOT NULL DEFAULT true,
  user_reordered_at timestamptz,
  generation_attempts integer NOT NULL DEFAULT 0 CHECK (generation_attempts >= 0),
  last_error text,
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_date)
);

ALTER TABLE public.daily_task_plans
  ADD COLUMN IF NOT EXISTS user_reordered_at timestamptz;

CREATE TABLE IF NOT EXISTS public.daily_task_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.daily_task_plans(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
  rank integer NOT NULL CHECK (rank BETWEEN 1 AND 50),
  carried_forward boolean NOT NULL DEFAULT false,
  optional boolean NOT NULL DEFAULT false,
  selection_reason text,
  score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(score_breakdown)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, task_id),
  UNIQUE (plan_id, rank)
);

ALTER TABLE public.daily_task_plan_items
  ADD COLUMN IF NOT EXISTS optional boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.daily_task_plan_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.daily_task_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('in_app','email','push')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','skipped','failed')),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, channel)
);

CREATE TABLE IF NOT EXISTS public.daily_task_plan_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.daily_task_plans(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  source text NOT NULL DEFAULT 'ensure' CHECK (source IN ('ensure','scheduler','repair','backfill')),
  status text NOT NULL CHECK (status IN ('succeeded','failed')),
  item_count integer NOT NULL DEFAULT 0,
  fallback_used boolean NOT NULL DEFAULT true,
  duration_ms integer,
  error_code text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS daily_task_plans_ready_idx
  ON public.daily_task_plans(plan_date, status, generated_at);
CREATE INDEX IF NOT EXISTS daily_task_plan_items_rank_idx
  ON public.daily_task_plan_items(plan_id, rank);
CREATE INDEX IF NOT EXISTS daily_task_plan_deliveries_pending_idx
  ON public.daily_task_plan_deliveries(status, created_at) WHERE status='pending';
CREATE INDEX IF NOT EXISTS daily_task_plan_runs_health_idx
  ON public.daily_task_plan_runs(plan_date,status,fallback_used,created_at);

-- The Today workspace records richer accountability interactions than the
-- legacy calendar. Keep the historical values and add explicit edit/order
-- signals for recommendation learning.
ALTER TABLE public.task_recommendation_events
  DROP CONSTRAINT IF EXISTS task_recommendation_events_event_type_check;
ALTER TABLE public.task_recommendation_events
  ADD CONSTRAINT task_recommendation_events_event_type_check CHECK (event_type IN (
    'suggested','accepted','dismissed','rescheduled','completed','seen',
    'remind_later','not_relevant','already_done','stop_showing','edited','reordered'
  ));

ALTER TABLE public.daily_task_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_task_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_task_plan_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_task_plan_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own daily task plans" ON public.daily_task_plans;
CREATE POLICY "Users read own daily task plans" ON public.daily_task_plans
  FOR SELECT USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "Users read own daily task plan items" ON public.daily_task_plan_items;
CREATE POLICY "Users read own daily task plan items" ON public.daily_task_plan_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.daily_task_plans p
    WHERE p.id=daily_task_plan_items.plan_id AND p.user_id=auth.uid()
  ));
DROP POLICY IF EXISTS "Users read own daily task plan deliveries" ON public.daily_task_plan_deliveries;
CREATE POLICY "Users read own daily task plan deliveries" ON public.daily_task_plan_deliveries
  FOR SELECT USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "Users read own daily task plan runs" ON public.daily_task_plan_runs;
CREATE POLICY "Users read own daily task plan runs" ON public.daily_task_plan_runs
  FOR SELECT USING (auth.uid()=user_id);

REVOKE ALL ON public.daily_task_plans, public.daily_task_plan_items, public.daily_task_plan_deliveries, public.daily_task_plan_runs
  FROM PUBLIC, anon;
GRANT SELECT ON public.daily_task_plans, public.daily_task_plan_items, public.daily_task_plan_deliveries, public.daily_task_plan_runs
  TO authenticated;
GRANT ALL ON public.daily_task_plans, public.daily_task_plan_items, public.daily_task_plan_deliveries, public.daily_task_plan_runs
  TO service_role;

DROP TRIGGER IF EXISTS set_daily_task_plans_updated_at ON public.daily_task_plans;
CREATE TRIGGER set_daily_task_plans_updated_at BEFORE UPDATE ON public.daily_task_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS set_daily_task_plan_deliveries_updated_at ON public.daily_task_plan_deliveries;
CREATE TRIGGER set_daily_task_plan_deliveries_updated_at BEFORE UPDATE ON public.daily_task_plan_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Resolve the persisted IANA timezone, using a validated caller hint only when
-- the profile has not captured one yet.
CREATE OR REPLACE FUNCTION public.resolve_task_plan_timezone_v1(p_user uuid, p_hint text DEFAULT 'UTC')
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM pg_timezone_names z WHERE z.name=NULLIF(p.user_preferences->>'timezone',''))
      THEN p.user_preferences->>'timezone'
    WHEN EXISTS (SELECT 1 FROM pg_timezone_names z WHERE z.name=p_hint) THEN p_hint
    ELSE 'UTC'
  END
  FROM public.profiles p WHERE p.id=p_user;
$$;

REVOKE ALL ON FUNCTION public.resolve_task_plan_timezone_v1(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_task_plan_timezone_v1(uuid,text) TO service_role;

-- Internal deterministic fallback. The edge function may reorder these safe
-- candidates, but it may not invent task keys or destinations.
CREATE OR REPLACE FUNCTION public.ensure_task_plan_for_user_v1(
  p_user uuid,
  p_plan_date date,
  p_timezone text,
  p_target_count integer DEFAULT 3
) RETURNS public.daily_task_plans
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_plan public.daily_task_plans;
  v_context jsonb := '{}'::jsonb;
  v_stage text := 'IDENTITY';
  v_goal text;
  v_blocker text;
  v_capacity numeric;
  v_loop text;
  v_count integer := 0;
  v_rank integer := 0;
  v_task_id uuid;
  v_deadline timestamptz;
  v_candidate record;
  v_carry record;
  v_progress_blocker jsonb;
  v_progress_milestone jsonb;
  v_customer_evidence jsonb;
  v_suppressed_keys jsonb := '{}'::jsonb;
BEGIN
  IF p_user IS NULL OR p_plan_date IS NULL THEN RAISE EXCEPTION 'User and plan date are required'; END IF;
  IF p_target_count < 3 OR p_target_count > 10 THEN RAISE EXCEPTION 'Target count must be between 3 and 10'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text||':'||p_plan_date::text,0));
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name=p_timezone) THEN p_timezone := 'UTC'; END IF;
  v_deadline := ((p_plan_date + 1)::timestamp - interval '1 minute') AT TIME ZONE p_timezone;

  v_stage:=COALESCE(
    (SELECT up.current_stage::text FROM public.user_progress up WHERE up.user_id=p_user),
    (SELECT CASE fs.current_stage WHEN 1 THEN 'IDENTITY' WHEN 2 THEN 'PROTOTYPE'
      WHEN 3 THEN 'VALIDATING' WHEN 4 THEN 'BUILDING' WHEN 5 THEN 'LAUNCH' ELSE 'TRACTION' END
      FROM public.founder_stage_state fs WHERE fs.user_id=p_user),
    (SELECT CASE lower(COALESCE(p.quiz_current_stage,p.business_stage,''))
      WHEN 'idea' THEN 'IDENTITY' WHEN 'building-mvp' THEN 'BUILDING'
      WHEN 'mvp-ready' THEN 'LAUNCH' WHEN 'early-users' THEN 'TRACTION'
      WHEN 'growth' THEN 'TRACTION' ELSE NULL END FROM public.profiles p WHERE p.id=p_user),
    'IDENTITY'
  );

  SELECT s.answers->>'primaryGoal', s.answers->>'blocker',
         CASE WHEN COALESCE(s.answers->>'weeklyCapacityHours','') ~ '^[0-9]+([.][0-9]+)?$'
           THEN (s.answers->>'weeklyCapacityHours')::numeric END,
         s.derived_context->>'founderLoop'
  INTO v_goal,v_blocker,v_capacity,v_loop
  FROM public.onboarding_sessions s
  WHERE s.user_id=p_user AND s.status='completed'
  ORDER BY s.completed_at DESC NULLS LAST LIMIT 1;

  v_goal:=COALESCE((SELECT f.primary_goal FROM public.founder_cycle_state f WHERE f.user_id=p_user),v_goal);
  v_capacity:=COALESCE((SELECT f.weekly_capacity_hours FROM public.founder_cycle_state f WHERE f.user_id=p_user),v_capacity);
  v_loop:=COALESCE((SELECT f.selected_loop FROM public.founder_cycle_state f WHERE f.user_id=p_user),v_loop);

  v_context := jsonb_strip_nulls(jsonb_build_object(
    'stage',v_stage,'goal',v_goal,'blocker',v_blocker,'weeklyCapacityHours',v_capacity,'loop',v_loop
  ));

  -- These context modules are optional across installations. Dynamic SQL
  -- prevents a missing module from invalidating task generation for everyone.
  IF to_regclass('public.progress_blockers') IS NOT NULL THEN
    EXECUTE $query$
      SELECT to_jsonb(blocker) FROM (
        SELECT id,blocker_title,blocker_description,severity
        FROM public.progress_blockers
        WHERE user_id=$1 AND status IN ('open','in_progress','escalated')
        ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
          identified_at
        LIMIT 1
      ) blocker
    $query$ INTO v_progress_blocker USING p_user;
  END IF;
  IF to_regclass('public.progress_milestones') IS NOT NULL THEN
    EXECUTE $query$
      SELECT to_jsonb(milestone) FROM (
        SELECT id,milestone_name,milestone_description,status,completion_percentage
        FROM public.progress_milestones
        WHERE user_id=$1 AND status IN ('not_started','in_progress','blocked')
          AND COALESCE(completion_percentage,0)<100
        ORDER BY CASE status WHEN 'blocked' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
          updated_at DESC
        LIMIT 1
      ) milestone
    $query$ INTO v_progress_milestone USING p_user;
  END IF;
  IF to_regclass('public.customer_evidence_events') IS NOT NULL THEN
    EXECUTE $query$
      SELECT to_jsonb(evidence) FROM (
        SELECT id,active_loop,event_type
        FROM public.customer_evidence_events
        WHERE user_id=$1 AND occurred_at>=now()-interval '3 days'
          AND event_type IN ('reply_received','interview_scheduled','outreach_sent','commitment_received','customer_lost')
        ORDER BY occurred_at DESC LIMIT 1
      ) evidence
    $query$ INTO v_customer_evidence USING p_user;
  END IF;
  IF to_regclass('public.founder_cycle_action_feedback') IS NOT NULL THEN
    EXECUTE $query$
      SELECT COALESCE(jsonb_object_agg(action_key,true),'{}'::jsonb)
      FROM public.founder_cycle_action_feedback
      WHERE user_id=$1 AND feedback_status='not_relevant' AND cooldown_until>now()
    $query$ INTO v_suppressed_keys USING p_user;
  END IF;

  INSERT INTO public.daily_task_plans(user_id,plan_date,timezone,status,context_hash,context_snapshot,generation_attempts)
  VALUES(p_user,p_plan_date,p_timezone,'building',md5(v_context::text),v_context,1)
  ON CONFLICT(user_id,plan_date) DO UPDATE SET
    timezone=EXCLUDED.timezone,
    context_hash=EXCLUDED.context_hash,
    context_snapshot=EXCLUDED.context_snapshot,
    generation_attempts=public.daily_task_plans.generation_attempts+1,
    last_error=NULL
  RETURNING * INTO v_plan;

  SELECT count(*),COALESCE(max(rank),0) INTO v_count,v_rank
  FROM public.daily_task_plan_items WHERE plan_id=v_plan.id;

  -- Preserve event-driven recommendations already created for this local day
  -- (for example a reply or an overdue customer commitment). They are ranked
  -- ahead of internal planning work and never duplicated into a second task.
  FOR v_candidate IN
    SELECT t.* FROM public.daily_tasks t
    WHERE t.user_id=p_user AND t.task_source='platform' AND t.task_date=p_plan_date
      AND COALESCE(t.is_completed,false)=false
      AND COALESCE(t.recommendation_status,'accepted')<>'dismissed'
      AND COALESCE(t.is_foundational,false)=false
      AND NOT EXISTS (
        SELECT 1 FROM public.daily_task_plan_items i
        WHERE i.plan_id=v_plan.id AND i.task_id=t.id
      )
    ORDER BY
      CASE t.intent_type WHEN 'follow_up' THEN 0 WHEN 'accountability' THEN 1 ELSE 2 END,
      COALESCE(t.business_impact_score,0) DESC,
      t.created_at
  LOOP
    EXIT WHEN v_count>=p_target_count;
    v_rank:=v_rank+1;
    INSERT INTO public.daily_task_plan_items(plan_id,task_id,rank,optional,selection_reason,score_breakdown)
    VALUES(v_plan.id,v_candidate.id,v_rank,v_count>=3,
      COALESCE(v_candidate.recommendation_reason,'A current commitment needs attention today.'),
      jsonb_build_object(
        'impact',COALESCE(v_candidate.business_impact_score,8),
        'urgency',CASE WHEN v_candidate.intent_type IN ('follow_up','accountability') THEN 10 ELSE 8 END,
        'relevance',COALESCE(v_candidate.stage_alignment_score,8),
        'effortFit',7
      ));
    v_count:=v_count+1;
  END LOOP;

  -- A still-relevant platform task may occupy one slot without rewriting its
  -- original date, preserving history and keeping the rest in Backlog.
  IF v_count<LEAST(p_target_count,3) AND NOT EXISTS (
    SELECT 1 FROM public.daily_task_plan_items WHERE plan_id=v_plan.id AND carried_forward
  ) THEN
    SELECT t.* INTO v_carry FROM public.daily_tasks t
    WHERE t.user_id=p_user AND t.task_source='platform' AND COALESCE(t.is_completed,false)=false
      AND COALESCE(t.recommendation_status,'accepted')<>'dismissed'
      AND COALESCE(t.is_foundational,false)=false AND t.user_modified_at IS NULL
      AND t.task_date<p_plan_date AND t.task_date>=p_plan_date-7
      AND (t.cooldown_until IS NULL OR t.cooldown_until<=now())
      AND NOT EXISTS (
        SELECT 1 FROM public.daily_task_plan_items existing
        JOIN public.daily_tasks existing_task ON existing_task.id=existing.task_id
        WHERE existing.plan_id=v_plan.id
          AND existing_task.recommendation_key IS NOT DISTINCT FROM t.recommendation_key
      )
    ORDER BY CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,t.task_date,t.created_at
    LIMIT 1;
    IF FOUND THEN
      INSERT INTO public.daily_task_plan_items(plan_id,task_id,rank,carried_forward,selection_reason,score_breakdown)
      VALUES(v_plan.id,v_carry.id,v_rank+1,true,'Still the highest-impact unfinished recommendation.',
        jsonb_build_object('impact',COALESCE(v_carry.business_impact_score,7),'urgency',9,'relevance',COALESCE(v_carry.stage_alignment_score,7),'effortFit',7));
      v_count:=v_count+1; v_rank:=v_rank+1;
    END IF;
  END IF;

  FOR v_candidate IN
    WITH templates(stage,key,title,description,reason,route,priority,minutes,impact,relevance,intent,tool) AS (
      VALUES
      ('IDENTITY','identity:pains','Write down your three most urgent customer pains','Rank each pain by frequency and urgency using what you know today.','Your current stage needs a sharper problem before product decisions.','/icp-builder','high',20,9,10,'stage_action','icp-builder'),
      ('IDENTITY','identity:segment','Choose one customer segment to focus on','Name the narrowest group you can reach and learn from this week.','Focus improves the quality of every validation action.','/icp-builder','high',15,8,10,'stage_action','icp-builder'),
      ('IDENTITY','identity:trigger','Define the customer buying trigger','Describe the event that makes this problem important right now.','Buying triggers turn a broad audience into an actionable ICP.','/icp-builder','medium',15,7,9,'stage_action','icp-builder'),
      ('IDENTITY','identity:conversation','Schedule one problem conversation','Invite one target customer to a short problem-focused conversation.','Real language from a customer is the fastest path to clarity.','/pmf-lab','high',20,9,9,'customer_evidence','pmf-lab'),
      ('PROTOTYPE','prototype:value','Write a one-line value proposition','Connect the customer, urgent problem, and promised outcome in one sentence.','A clear promise is needed before testing demand.','/demo-studio','high',20,9,10,'stage_action','demo-studio'),
      ('PROTOTYPE','prototype:page','Draft the demand page hero','Write the headline, supporting line, and one clear call to action.','A concrete page turns positioning into something customers can react to.','/demo-studio','high',30,9,10,'stage_action','demo-studio'),
      ('PROTOTYPE','prototype:share','Share your demand page with five prospects','Send the page directly to five people who match your target segment.','Distribution creates the first measurable demand signal.','/demo-studio','high',25,10,9,'customer_evidence','demo-studio'),
      ('PROTOTYPE','prototype:review','Review the first demand signals','Note which message, channel, or audience produced the strongest response.','Early signals should shape the next iteration.','/demo-studio','medium',20,8,9,'stage_action','demo-studio'),
      ('VALIDATING','validating:interview','Book one customer interview','Contact a qualified prospect and secure a time for a problem interview.','Your validation stage advances through evidence, not more planning.','/pmf-lab','high',20,10,10,'customer_evidence','pmf-lab'),
      ('VALIDATING','validating:evidence','Log one fresh validation signal','Capture a quote, behavior, objection, or commitment from a real customer.','Fresh evidence keeps the recommendation system grounded in reality.','/pmf-lab','high',15,9,10,'customer_evidence','pmf-lab'),
      ('VALIDATING','validating:risk','Name the riskiest unproven assumption','Choose the assumption that could invalidate the business if it is wrong.','Testing the largest risk first prevents expensive false progress.','/pmf-lab','high',15,9,10,'stage_action','pmf-lab'),
      ('VALIDATING','validating:experiment','Design one low-cost validation experiment','Define the audience, action, success threshold, and deadline.','A bounded experiment converts uncertainty into a decision.','/pmf-lab','medium',25,8,9,'stage_action','pmf-lab'),
      ('BUILDING','building:scope','Remove one non-essential MVP feature','Protect the smallest workflow that delivers the promised customer outcome.','A narrower scope increases the chance of shipping and learning.','/mvp-builder','high',20,9,10,'stage_action','mvp-builder'),
      ('BUILDING','building:workflow','Complete one end-to-end customer workflow','Move one core workflow from start to a usable customer outcome.','Usable workflows matter more than a larger feature count.','/mvp-builder','high',45,10,10,'stage_action','mvp-builder'),
      ('BUILDING','building:test','Put the current build in front of one user','Ask one target user to attempt the core workflow without coaching.','Observed use reveals problems internal review cannot.','/mvp-builder','high',30,10,9,'customer_evidence','mvp-builder'),
      ('BUILDING','building:blocker','Resolve the highest-risk build blocker','Choose the technical or product decision most likely to delay release and close it.','Removing the primary blocker restores shipping momentum.','/mvp-builder','medium',30,8,9,'stage_action','mvp-builder'),
      ('LAUNCH','launch:prospects','Build a list of ten launch prospects','Choose ten reachable people who match the ICP and can respond this week.','A launch needs a concrete audience, not only published assets.','/go-to-market','high',25,9,10,'customer_evidence','gtm-strategist'),
      ('LAUNCH','launch:messages','Send five personalized launch messages','Send direct messages that connect the prospect problem to your offer.','Conversations are the closest leading indicator of first revenue.','/go-to-market','high',30,10,10,'customer_evidence','gtm-strategist'),
      ('LAUNCH','launch:offer','Tighten your first-customer offer','State the outcome, scope, price or commitment, and next step.','A specific offer makes customer intent measurable.','/go-to-market','high',20,9,9,'stage_action','gtm-strategist'),
      ('LAUNCH','launch:followup','Follow up with every warm prospect','Reply to interested prospects and ask for a concrete next step.','Warm conversations should outrank new internal work.','/go-to-market','high',20,10,9,'follow_up','gtm-strategist'),
      ('TRACTION','traction:channel','Review one acquisition channel','Compare activity, qualified conversations, customers, and revenue for one channel.','Growth requires knowing which motion is becoming repeatable.','/traction-engine','high',25,9,10,'stage_action','traction-engine'),
      ('TRACTION','traction:retention','Record one retention signal','Capture repeat use, renewal, expansion, or a reason a customer left.','Retention evidence separates real traction from temporary acquisition.','/core-metrics','high',15,10,10,'customer_evidence','traction-engine'),
      ('TRACTION','traction:repeat','Repeat the strongest acquisition motion','Run the same winning outreach or channel action with the next cohort.','Repeatability is the core goal of the traction stage.','/traction-engine','high',30,10,10,'stage_action','traction-engine'),
      ('TRACTION','traction:metric','Update the metric that drives this week','Record the latest value and compare it with the current target.','Current metrics make the next growth decision clearer.','/core-metrics','medium',15,8,9,'stage_action','traction-engine'),
      ('FUNDRAISING','fundraising:list','Add five aligned investors to your target list','Prioritize investors whose thesis, stage, and geography match the company.','A focused list improves outreach quality and saves time.','/vc-search','high',25,9,10,'stage_action','vc-search'),
      ('FUNDRAISING','fundraising:deck','Strengthen the weakest pitch-deck slide','Clarify the evidence or narrative gap most likely to create investor doubt.','The weakest proof point often controls the fundraising conversation.','/pitch-deck-analyzer','high',30,9,10,'stage_action','pitch-deck-analyzer'),
      ('FUNDRAISING','fundraising:proof','Update one traction proof point','Add the latest customer, revenue, retention, or pipeline evidence.','Current proof makes the raise more credible.','/core-metrics','high',15,10,9,'customer_evidence','core-metrics'),
      ('FUNDRAISING','fundraising:outreach','Send three tailored investor messages','Reference each investor thesis and make a specific meeting request.','Qualified conversations move a raise forward.','/vc-search','high',30,10,9,'follow_up','vc-search')
    ),
    dynamic_candidates AS (
      SELECT 'context:goal:'||md5(COALESCE(v_goal,'current-goal')) key,
        'Take one concrete step toward '||COALESCE(NULLIF(v_goal,''),'your current goal') title,
        'Choose the smallest observable result you can finish today.' description,
        'This is aligned with the primary goal you gave the platform.' reason,
        '/dashboard' route,'high' priority,20 minutes,9 impact,9 relevance,'daily_momentum' intent,'dashboard' tool
      WHERE NULLIF(v_goal,'') IS NOT NULL
      UNION ALL
      SELECT 'context:blocker:'||md5(COALESCE(v_blocker,'current-blocker')),
        'Remove one part of your current blocker',
        'Define the blocker, the next controllable step, and finish that step today.',
        'You identified this as the area where progress is most constrained.',
        '/dashboard','high',20,9,9,'accountability','dashboard'
      WHERE NULLIF(v_blocker,'') IS NOT NULL
      UNION ALL
      SELECT 'progress-blocker:'||(v_progress_blocker->>'id'),
        'Resolve: '||(v_progress_blocker->>'blocker_title'),
        left(COALESCE(NULLIF(v_progress_blocker->>'blocker_description',''),'Choose the next controllable step and complete it today.'),500),
        'This unresolved blocker is constraining progress in your current journey.',
        '/dashboard','high',20,
        CASE v_progress_blocker->>'severity' WHEN 'critical' THEN 10 WHEN 'high' THEN 9 ELSE 8 END,
        10,'accountability','dashboard'
      WHERE v_progress_blocker IS NOT NULL
      UNION ALL
      SELECT 'progress-milestone:'||(v_progress_milestone->>'id'),
        'Advance: '||(v_progress_milestone->>'milestone_name'),
        left(COALESCE(NULLIF(v_progress_milestone->>'milestone_description',''),'Complete the smallest step that visibly advances this milestone.'),500),
        'This active milestone is one of your clearest unfinished commitments.',
        '/dashboard','medium',25,8,9,'stage_action','dashboard'
      WHERE v_progress_milestone IS NOT NULL
      UNION ALL
      SELECT 'evidence-next:'||(v_customer_evidence->>'id'),
        CASE v_customer_evidence->>'event_type'
          WHEN 'reply_received' THEN 'Reply to the customer who responded'
          WHEN 'interview_scheduled' THEN 'Prepare for your next customer interview'
          WHEN 'outreach_sent' THEN 'Follow up on your latest outreach'
          WHEN 'commitment_received' THEN 'Turn the customer commitment into a concrete next step'
          WHEN 'customer_lost' THEN 'Capture why the customer was lost'
          ELSE 'Act on your latest customer signal'
        END,
        CASE v_customer_evidence->>'event_type'
          WHEN 'reply_received' THEN 'Respond while the conversation is warm and ask for one concrete next step.'
          WHEN 'interview_scheduled' THEN 'Write the three highest-value questions you need answered.'
          WHEN 'outreach_sent' THEN 'Review responses and send the most relevant follow-up.'
          WHEN 'commitment_received' THEN 'Confirm the owner, deliverable, and deadline with the customer.'
          WHEN 'customer_lost' THEN 'Record the reason, evidence, and one adjustment to test next.'
          ELSE 'Review the signal and complete the next external action it supports.'
        END,
        'Recent customer evidence should outrank lower-impact internal planning.',
        CASE WHEN v_customer_evidence->>'active_loop'='SELL' THEN '/go-to-market' WHEN v_customer_evidence->>'active_loop'='GROW' THEN '/traction-engine' ELSE '/pmf-lab' END,
        'high',20,10,10,
        CASE WHEN v_customer_evidence->>'event_type' IN ('reply_received','outreach_sent','commitment_received') THEN 'follow_up' ELSE 'customer_evidence' END,
        CASE WHEN v_customer_evidence->>'active_loop'='SELL' THEN 'gtm-strategist' WHEN v_customer_evidence->>'active_loop'='GROW' THEN 'traction-engine' ELSE 'pmf-lab' END
      WHERE v_customer_evidence IS NOT NULL
      UNION ALL
      SELECT 'weekly:'||w.id::text,'Move this week''s mission forward: '||w.mission_goal,
        'Block one focused session that directly advances the weekly commitment.',
        'Daily work should protect progress on the active weekly mission.',
        '/dashboard/weekly-mission','high',25,10,10,'weekly_mission','weekly-mission'
      FROM (
        SELECT * FROM public.weekly_missions
        WHERE user_id=p_user AND status='active'
          AND week_start_date<=p_plan_date AND week_end_date>=p_plan_date
          AND COALESCE(completion_percentage,0)<100
        ORDER BY created_at DESC LIMIT 1
      ) w
    ), candidates AS (
      SELECT key,title,description,reason,route,priority,minutes,impact,relevance,intent,tool,0 source_order
      FROM dynamic_candidates
      UNION ALL
      SELECT key,title,description,reason,route,priority,minutes,impact,relevance,intent,tool,1
      FROM templates WHERE stage=v_stage
    )
    SELECT c.*, (c.impact*0.35 + 8*0.30 + c.relevance*0.25 +
      CASE WHEN COALESCE(v_capacity,5)<=2 AND c.minutes<=20 THEN 10
           WHEN COALESCE(v_capacity,5)<=5 AND c.minutes<=30 THEN 9 ELSE 7 END*0.10) score
    FROM candidates c
    WHERE NOT EXISTS (
      SELECT 1 FROM public.daily_task_plan_items pi JOIN public.daily_tasks t ON t.id=pi.task_id
      WHERE pi.plan_id=v_plan.id AND t.recommendation_key=c.key
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.daily_tasks t WHERE t.user_id=p_user AND t.recommendation_key=c.key
        AND ((t.is_completed AND t.completed_at>=now()-interval '30 days') OR t.cooldown_until>now())
    )
    AND NOT (v_suppressed_keys ? c.key)
    ORDER BY source_order,score DESC,key
  LOOP
    EXIT WHEN v_count>=p_target_count;
    INSERT INTO public.daily_tasks(
      user_id,task_text,task_description,task_date,deadline_time,task_source,priority,
      source_tool,source_route,intent_type,recommendation_key,recommendation_reason,
      recommendation_status,estimated_minutes,effort_estimate,business_impact_score,
      stage_alignment_score,ai_generated,is_foundational,is_completed
    ) VALUES (
      p_user,v_candidate.title,v_candidate.description,p_plan_date,v_deadline,'platform',v_candidate.priority,
      v_candidate.tool,v_candidate.route,v_candidate.intent,v_candidate.key,v_candidate.reason,
      'accepted',v_candidate.minutes,v_candidate.minutes,v_candidate.impact,v_candidate.relevance,
      false,false,false
    ) RETURNING id INTO v_task_id;
    v_rank:=v_rank+1;
    INSERT INTO public.daily_task_plan_items(plan_id,task_id,rank,optional,selection_reason,score_breakdown)
    VALUES(v_plan.id,v_task_id,v_rank,v_count>=3,v_candidate.reason,jsonb_build_object(
      'impact',v_candidate.impact,'urgency',8,'relevance',v_candidate.relevance,
      'effortFit',CASE WHEN COALESCE(v_capacity,5)<=2 AND v_candidate.minutes<=20 THEN 10 WHEN COALESCE(v_capacity,5)<=5 AND v_candidate.minutes<=30 THEN 9 ELSE 7 END,
      'total',round(v_candidate.score::numeric,2)
    ));
    INSERT INTO public.task_recommendation_events(user_id,task_id,recommendation_key,event_type,metadata)
    VALUES(p_user,v_task_id,v_candidate.key,'suggested',jsonb_build_object('surface','task_plan','planId',v_plan.id));
    v_count:=v_count+1;
  END LOOP;

  -- Absolute fallback: context-building tasks guarantee a non-empty plan even
  -- for a brand-new founder with no stage or onboarding record.
  WHILE v_count<p_target_count LOOP
    v_rank:=v_rank+1;
    INSERT INTO public.daily_tasks(
      user_id,task_text,task_description,task_date,deadline_time,task_source,priority,
      source_tool,source_route,intent_type,recommendation_key,recommendation_reason,
      recommendation_status,estimated_minutes,effort_estimate,business_impact_score,
      stage_alignment_score,ai_generated,is_foundational,is_completed
    ) VALUES (
      p_user,
      CASE (v_count%3) WHEN 0 THEN 'Choose the single outcome that matters today' WHEN 1 THEN 'Speak with one target customer' ELSE 'Record what you learned and choose the next step' END,
      CASE (v_count%3) WHEN 0 THEN 'Write one observable result you can finish before the day ends.' WHEN 1 THEN 'Ask about the problem, current workaround, and urgency.' ELSE 'Capture the signal, decision, and next action while the context is fresh.' END,
      p_plan_date,v_deadline,'platform','medium','dashboard','/dashboard','daily_momentum',
      'fallback:'||p_plan_date::text||':'||v_rank::text,
      'This safe fallback keeps a clear next action available while your founder context develops.',
      'accepted',15,15,7,7,false,false,false
    ) RETURNING id INTO v_task_id;
    INSERT INTO public.daily_task_plan_items(plan_id,task_id,rank,optional,selection_reason,score_breakdown)
    VALUES(v_plan.id,v_task_id,v_rank,v_count>=3,'Deterministic context-building fallback.',jsonb_build_object('impact',7,'urgency',6,'relevance',7,'effortFit',9,'total',7.05));
    v_count:=v_count+1;
  END LOOP;

  UPDATE public.daily_task_plans SET status='ready',generated_at=COALESCE(generated_at,now()),last_error=NULL
  WHERE id=v_plan.id RETURNING * INTO v_plan;
  INSERT INTO public.daily_task_plan_runs(plan_id,user_id,plan_date,source,status,item_count,fallback_used)
  VALUES(v_plan.id,p_user,p_plan_date,'ensure','succeeded',v_count,true);
  RETURN v_plan;
EXCEPTION WHEN OTHERS THEN
  IF v_plan.id IS NOT NULL THEN
    UPDATE public.daily_task_plans SET status='failed',last_error=left(SQLSTATE||':'||SQLERRM,1000) WHERE id=v_plan.id;
  END IF;
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_task_plan_for_user_v1(uuid,date,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_task_plan_for_user_v1(uuid,date,text,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.task_plan_payload_v1(p_plan uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT jsonb_build_object(
    'plan',to_jsonb(p),
    'items',COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id',i.id,'rank',i.rank,'carriedForward',i.carried_forward,'optional',i.optional,
      'selectionReason',i.selection_reason,'scoreBreakdown',i.score_breakdown,'task',to_jsonb(t)
    ) ORDER BY i.rank) FROM public.daily_task_plan_items i JOIN public.daily_tasks t ON t.id=i.task_id WHERE i.plan_id=p.id),'[]'::jsonb)
  ) FROM public.daily_task_plans p WHERE p.id=p_plan;
$$;

REVOKE ALL ON FUNCTION public.task_plan_payload_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.task_plan_payload_v1(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_today_task_plan_v1(p_timezone text DEFAULT 'UTC',p_additional boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid:=auth.uid(); v_zone text; v_date date; v_plan public.daily_task_plans; v_target integer:=3;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  v_zone:=public.resolve_task_plan_timezone_v1(v_user,p_timezone);
  v_date:=(now() AT TIME ZONE v_zone)::date;
  IF p_additional THEN
    SELECT GREATEST(4,COALESCE(max(i.rank),3)+1) INTO v_target
    FROM public.daily_task_plans p LEFT JOIN public.daily_task_plan_items i ON i.plan_id=p.id
    WHERE p.user_id=v_user AND p.plan_date=v_date;
  END IF;
  v_plan:=public.ensure_task_plan_for_user_v1(v_user,v_date,v_zone,v_target);
  RETURN public.task_plan_payload_v1(v_plan.id);
END;
$$;

REVOKE ALL ON FUNCTION public.get_today_task_plan_v1(text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_today_task_plan_v1(text,boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reorder_today_task_plan_v1(
  p_task_ids uuid[],p_timezone text DEFAULT 'UTC',p_record_user_action boolean DEFAULT true
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid:=auth.uid(); v_plan uuid; v_task uuid; v_rank integer:=0;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  SELECT id INTO v_plan FROM public.daily_task_plans
  WHERE user_id=v_user AND plan_date=(now() AT TIME ZONE public.resolve_task_plan_timezone_v1(v_user,p_timezone))::date;
  IF v_plan IS NULL THEN RAISE EXCEPTION 'Today plan not found'; END IF;
  UPDATE public.daily_task_plan_items SET rank=rank+20 WHERE plan_id=v_plan;
  FOREACH v_task IN ARRAY p_task_ids LOOP
    v_rank:=v_rank+1;
    UPDATE public.daily_task_plan_items SET rank=v_rank WHERE plan_id=v_plan AND task_id=v_task;
  END LOOP;
  UPDATE public.daily_task_plan_items SET rank=v_rank+(rank-20) WHERE plan_id=v_plan AND rank>20;
  IF p_record_user_action THEN
    UPDATE public.daily_task_plans SET user_reordered_at=now() WHERE id=v_plan;
    INSERT INTO public.task_recommendation_events(user_id,task_id,recommendation_key,event_type,metadata)
    SELECT v_user,i.task_id,COALESCE(t.recommendation_key,t.id::text),'reordered',
      jsonb_build_object('surface','task_plan','rank',i.rank,'planId',v_plan)
    FROM public.daily_task_plan_items i JOIN public.daily_tasks t ON t.id=i.task_id
    WHERE i.plan_id=v_plan;
  END IF;
  RETURN public.task_plan_payload_v1(v_plan);
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_today_task_plan_v1(uuid[],text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_today_task_plan_v1(uuid[],text,boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.act_on_task_recommendation_v1(
  p_task_id uuid,p_action text,p_payload jsonb DEFAULT '{}'::jsonb,p_timezone text DEFAULT 'UTC'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_user uuid:=auth.uid(); v_task public.daily_tasks; v_plan public.daily_task_plans; v_zone text; v_date date; v_event text; v_target integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_action NOT IN ('complete','reopen','make_next','edit','reschedule','snooze','replace','not_relevant') THEN
    RAISE EXCEPTION 'Unsupported task action';
  END IF;
  SELECT * INTO v_task FROM public.daily_tasks WHERE id=p_task_id AND user_id=v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Task not found'; END IF;
  v_zone:=public.resolve_task_plan_timezone_v1(v_user,p_timezone); v_date:=(now() AT TIME ZONE v_zone)::date;
  SELECT p.* INTO v_plan FROM public.daily_task_plans p JOIN public.daily_task_plan_items i ON i.plan_id=p.id
  WHERE p.user_id=v_user AND p.plan_date=v_date AND i.task_id=p_task_id;
  IF v_plan.id IS NULL THEN
    SELECT * INTO v_plan FROM public.daily_task_plans WHERE user_id=v_user AND plan_date=v_date;
  END IF;

  CASE p_action
    WHEN 'complete' THEN
      UPDATE public.daily_tasks SET is_completed=true,completed_at=now(),updated_at=now() WHERE id=p_task_id;
      v_event:='completed';
      IF v_task.recommendation_key LIKE 'stage:%' THEN
        INSERT INTO public.bizmap_task_progress(user_id,stage,task_id,is_completed,completed_at)
        VALUES(v_user,split_part(v_task.recommendation_key,':',2)::public.bizmap_stage,
          split_part(v_task.recommendation_key,':',3),true,now())
        ON CONFLICT(user_id,task_id) DO UPDATE SET is_completed=true,completed_at=now();
      END IF;
    WHEN 'reopen' THEN
      UPDATE public.daily_tasks SET is_completed=false,completed_at=NULL,updated_at=now() WHERE id=p_task_id;
    WHEN 'make_next' THEN
      RETURN public.reorder_today_task_plan_v1(ARRAY[p_task_id] || ARRAY(
        SELECT i.task_id FROM public.daily_task_plan_items i WHERE i.plan_id=v_plan.id AND i.task_id<>p_task_id ORDER BY i.rank
      ),v_zone);
    WHEN 'edit' THEN
      UPDATE public.daily_tasks SET
        task_text=COALESCE(NULLIF(trim(p_payload->>'title'),''),task_text),
        task_description=CASE WHEN p_payload ? 'description' THEN NULLIF(trim(p_payload->>'description'),'') ELSE task_description END,
        priority=CASE WHEN p_payload->>'priority' IN ('low','medium','high') THEN p_payload->>'priority' ELSE priority END,
        estimated_minutes=CASE WHEN COALESCE(p_payload->>'estimatedMinutes','') ~ '^[0-9]+$' THEN LEAST(240,GREATEST(5,(p_payload->>'estimatedMinutes')::integer)) ELSE estimated_minutes END,
        user_modified_at=now(),updated_at=now() WHERE id=p_task_id;
      v_event:='edited';
    WHEN 'reschedule' THEN
      IF COALESCE(p_payload->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN RAISE EXCEPTION 'Valid date required'; END IF;
      UPDATE public.daily_tasks SET task_date=(p_payload->>'date')::date,
        deadline_time=(((p_payload->>'date')::date+1)::timestamp-interval '1 minute') AT TIME ZONE v_zone,
        rescheduled_from_date=task_date,rescheduled_at=now(),user_modified_at=now(),updated_at=now() WHERE id=p_task_id;
      v_event:='rescheduled';
      DELETE FROM public.daily_task_plan_items WHERE plan_id=v_plan.id AND task_id=p_task_id;
    WHEN 'snooze' THEN
      UPDATE public.daily_tasks SET task_date=COALESCE(NULLIF(p_payload->>'date','')::date,v_date+1),
        deadline_time=((COALESCE(NULLIF(p_payload->>'date','')::date,v_date+1)+1)::timestamp-interval '1 minute') AT TIME ZONE v_zone,
        feedback_status='remind_later',cooldown_until=now()+interval '1 day',rescheduled_from_date=task_date,rescheduled_at=now(),updated_at=now()
      WHERE id=p_task_id; v_event:='remind_later';
      DELETE FROM public.daily_task_plan_items WHERE plan_id=v_plan.id AND task_id=p_task_id;
    WHEN 'replace' THEN
      UPDATE public.daily_tasks SET recommendation_status='dismissed',dismissed_at=now(),cooldown_until=now()+interval '14 days',updated_at=now() WHERE id=p_task_id;
      v_event:='dismissed'; DELETE FROM public.daily_task_plan_items WHERE plan_id=v_plan.id AND task_id=p_task_id;
    WHEN 'not_relevant' THEN
      UPDATE public.daily_tasks SET recommendation_status='dismissed',dismissed_at=now(),feedback_status='not_relevant',cooldown_until=now()+interval '30 days',updated_at=now() WHERE id=p_task_id;
      v_event:='not_relevant'; DELETE FROM public.daily_task_plan_items WHERE plan_id=v_plan.id AND task_id=p_task_id;
  END CASE;
  IF v_event IS NOT NULL AND v_task.recommendation_key IS NOT NULL THEN
    INSERT INTO public.task_recommendation_events(user_id,task_id,recommendation_key,event_type,metadata)
    VALUES(v_user,p_task_id,v_task.recommendation_key,v_event,jsonb_build_object('surface','task_plan','action',p_action));
  END IF;
  IF p_action IN ('complete','not_relevant') THEN
    INSERT INTO public.recommendation_outcomes(decision_id,user_id,outcome_type,reward_value,metadata)
    SELECT d.id,v_user,CASE WHEN p_action='complete' THEN 'completed' ELSE 'not_relevant' END,
      CASE WHEN p_action='complete' THEN 1 ELSE -1 END,
      jsonb_build_object('taskId',p_task_id,'surface','task_plan')
    FROM public.recommendation_decisions d
    WHERE d.user_id=v_user AND d.decision_key='task_plan:'||v_date::text||':'||p_task_id::text
    ON CONFLICT(decision_id,outcome_type) DO UPDATE SET
      reward_value=EXCLUDED.reward_value,occurred_at=now(),metadata=EXCLUDED.metadata;
  END IF;
  IF p_action IN ('reschedule','snooze','replace','not_relevant') THEN
    PERFORM public.ensure_task_plan_for_user_v1(v_user,v_date,v_zone,3);
  END IF;
  RETURN CASE WHEN v_plan.id IS NULL THEN jsonb_build_object('plan',NULL,'items','[]'::jsonb)
    ELSE public.task_plan_payload_v1(v_plan.id) END;
END;
$$;

REVOKE ALL ON FUNCTION public.act_on_task_recommendation_v1(uuid,text,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.act_on_task_recommendation_v1(uuid,text,jsonb,text) TO authenticated, service_role;

-- Bounded, idempotent worker. Repeated cron calls fill missing local dates in
-- batches and never create a second plan for the same founder/day.
CREATE OR REPLACE FUNCTION public.process_due_daily_task_plans_v1(p_limit integer DEFAULT 100)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; v_zone text; v_date date; v_count integer:=0;
BEGIN
  FOR r IN
    SELECT p.id,zone.name timezone,(now() AT TIME ZONE zone.name)::date local_date
    FROM public.profiles p
    JOIN auth.users auth_user ON auth_user.id=p.id
    CROSS JOIN LATERAL (SELECT public.resolve_task_plan_timezone_v1(p.id,'UTC') name) zone
    WHERE NOT EXISTS (
      SELECT 1 FROM public.daily_task_plans d
      WHERE d.user_id=p.id AND d.plan_date=(now() AT TIME ZONE zone.name)::date AND d.status='ready'
    )
    ORDER BY p.id LIMIT LEAST(GREATEST(p_limit,1),500)
  LOOP
    v_zone:=r.timezone; v_date:=r.local_date;
    BEGIN
      PERFORM public.ensure_task_plan_for_user_v1(r.id,v_date,v_zone,3); v_count:=v_count+1;
    EXCEPTION WHEN OTHERS THEN
      -- A user can be deleted after the batch cursor is materialized. Avoid
      -- masking the original generation error with a diagnostic-row FK error.
      IF EXISTS (SELECT 1 FROM auth.users existing_user WHERE existing_user.id=r.id) THEN
        INSERT INTO public.daily_task_plan_runs(user_id,plan_date,source,status,error_code,error_message)
        VALUES(r.id,v_date,'scheduler','failed',SQLSTATE,left(SQLERRM,1000));
      END IF;
      RAISE WARNING 'Task plan generation failed user=% date=%: %',r.id,v_date,SQLERRM;
    END;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.process_due_daily_task_plans_v1(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_due_daily_task_plans_v1(integer) TO service_role;

-- Recommendation learning now recognizes the task-plan surface.
DO $$ BEGIN
  IF to_regclass('public.recommendation_decisions') IS NOT NULL THEN
    ALTER TABLE public.recommendation_decisions DROP CONSTRAINT IF EXISTS recommendation_decisions_surface_check;
    ALTER TABLE public.recommendation_decisions ADD CONSTRAINT recommendation_decisions_surface_check
      CHECK (surface IN ('command_center','daily_mission','first_action','task_plan'));
  END IF;
END $$;

-- Generate/backfill continuously; a founder's new local date becomes eligible
-- on the first 15-minute tick after midnight and is therefore ready before 7 AM.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='generate-daily-task-plans-v1';
    PERFORM cron.schedule('generate-daily-task-plans-v1','*/15 * * * *',
      $job$SELECT public.process_due_daily_task_plans_v1(500);$job$);
  END IF;
END $$;

-- Backfill the current local day as part of rollout. Failures remain visible in
-- the plan status and are repaired by the next cron tick or authenticated open.
SELECT public.process_due_daily_task_plans_v1(500);

COMMENT ON TABLE public.daily_task_plans IS 'One timezone-aware, ranked accountability plan per founder and local date.';
COMMENT ON TABLE public.daily_task_plan_items IS 'Ranked task references for a daily plan; preserves original task history during carry-forward.';

CREATE OR REPLACE FUNCTION public.get_task_plan_health_v1(p_from date DEFAULT current_date-7,p_to date DEFAULT current_date)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH expected AS (
    SELECT count(*)::numeric founder_days
    FROM public.profiles
    JOIN auth.users expected_user ON expected_user.id=profiles.id
    CROSS JOIN generate_series(p_from,p_to,interval '1 day')
  ), plan_stats AS (
    SELECT plan.id,plan.status,plan.fallback_used,plan.generated_at,
      count(i.id)::numeric item_count,
      count(DISTINCT COALESCE(t.recommendation_key,t.id::text))::numeric distinct_actions,
      count(i.id) FILTER (WHERE t.is_completed)::numeric completed_count,
      count(i.id) FILTER (WHERE i.carried_forward)::numeric carried_count,
      min(t.completed_at) FILTER (WHERE t.is_completed) first_completed_at
    FROM public.daily_task_plans plan
    LEFT JOIN public.daily_task_plan_items i ON i.plan_id=plan.id
    LEFT JOIN public.daily_tasks t ON t.id=i.task_id
    WHERE plan.plan_date BETWEEN p_from AND p_to
    GROUP BY plan.id
  ), totals AS (
    SELECT count(*)::numeric plans,
      count(*) FILTER (WHERE status='ready')::numeric ready_plans,
      count(*) FILTER (WHERE item_count>=3)::numeric plans_with_three,
      count(*) FILTER (WHERE fallback_used)::numeric fallback_plans,
      COALESCE(sum(item_count),0)::numeric items,
      COALESCE(sum(completed_count),0)::numeric completed_items,
      COALESCE(sum(carried_count),0)::numeric carried_items,
      COALESCE(sum(GREATEST(item_count-distinct_actions,0)),0)::numeric duplicate_items,
      avg(EXTRACT(epoch FROM (first_completed_at-generated_at))/60)
        FILTER (WHERE first_completed_at IS NOT NULL AND generated_at IS NOT NULL) avg_first_completion_minutes
    FROM plan_stats
  ), feedback AS (
    SELECT count(*)::numeric feedback_count,
      count(*) FILTER (WHERE event_type='not_relevant')::numeric not_relevant_count,
      count(*) FILTER (WHERE event_type='dismissed')::numeric replacement_count
    FROM public.task_recommendation_events
    WHERE created_at::date BETWEEN p_from AND p_to
      AND event_type IN ('dismissed','not_relevant','remind_later')
  )
  SELECT jsonb_build_object(
    'from',p_from,'to',p_to,
    'expectedFounderDays',expected.founder_days,
    'plans',totals.plans,
    'readyPlans',totals.ready_plans,
    'plansWithThree',totals.plans_with_three,
    'coverageRate',round(CASE WHEN expected.founder_days=0 THEN 1 ELSE totals.plans_with_three/expected.founder_days END,4),
    'fallbackPlans',totals.fallback_plans,
    'fallbackRate',round(CASE WHEN totals.plans=0 THEN 0 ELSE totals.fallback_plans/totals.plans END,4),
    'failedRuns',(SELECT count(*) FROM public.daily_task_plan_runs r WHERE r.plan_date BETWEEN p_from AND p_to AND r.status='failed'),
    'duplicateItems',totals.duplicate_items,
    'duplicateRate',round(CASE WHEN totals.items=0 THEN 0 ELSE totals.duplicate_items/totals.items END,4),
    'completedItems',totals.completed_items,
    'completionRate',round(CASE WHEN totals.items=0 THEN 0 ELSE totals.completed_items/totals.items END,4),
    'carriedItems',totals.carried_items,
    'carryForwardRate',round(CASE WHEN totals.items=0 THEN 0 ELSE totals.carried_items/totals.items END,4),
    'replacementFeedback',feedback.feedback_count,
    'replacementRate',round(CASE WHEN totals.items=0 THEN 0 ELSE feedback.replacement_count/totals.items END,4),
    'notRelevantRate',round(CASE WHEN totals.items=0 THEN 0 ELSE feedback.not_relevant_count/totals.items END,4),
    'averageMinutesToFirstCompletion',round(COALESCE(totals.avg_first_completion_minutes,0)::numeric,2)
  ) FROM totals CROSS JOIN expected CROSS JOIN feedback;
$$;

REVOKE ALL ON FUNCTION public.get_task_plan_health_v1(date,date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_task_plan_health_v1(date,date) TO service_role;

-- Queue one digest at 07:00 local time. The notification row is the in-app
-- delivery and automatically bridges to push when push_enabled is true. Email
-- uses the existing retention sender and remains governed by task_reminders.
CREATE OR REPLACE FUNCTION public.dispatch_daily_task_plan_digests_v1(p_limit integer DEFAULT 500)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  r record; v_url text:=(SELECT value FROM private.service_config WHERE key='supabase_url');
  v_key text:=(SELECT value FROM private.service_config WHERE key='supabase_service_key');
  v_count integer:=0;
BEGIN
  FOR r IN
    SELECT plan.id plan_id,plan.user_id,plan.plan_date,au.email,p.full_name,
      (SELECT t.task_text FROM public.daily_task_plan_items i JOIN public.daily_tasks t ON t.id=i.task_id
       WHERE i.plan_id=plan.id ORDER BY i.rank LIMIT 1) first_task,
      public.resolve_task_plan_timezone_v1(plan.user_id,'UTC') timezone
    FROM public.daily_task_plans plan
    JOIN public.profiles p ON p.id=plan.user_id JOIN auth.users au ON au.id=plan.user_id
    WHERE plan.status='ready' AND plan.plan_date=(now() AT TIME ZONE public.resolve_task_plan_timezone_v1(plan.user_id,'UTC'))::date
      AND EXTRACT(hour FROM now() AT TIME ZONE public.resolve_task_plan_timezone_v1(plan.user_id,'UTC'))=7
      AND EXTRACT(minute FROM now() AT TIME ZONE public.resolve_task_plan_timezone_v1(plan.user_id,'UTC'))<15
      AND public.notif_pref_enabled(plan.user_id,'task_reminders')
      AND NOT EXISTS (SELECT 1 FROM public.daily_task_plan_deliveries d WHERE d.plan_id=plan.id AND d.channel='in_app')
    ORDER BY plan.generated_at LIMIT LEAST(GREATEST(p_limit,1),1000)
  LOOP
    INSERT INTO public.community_notifications(user_id,actor_id,notification_type,read,metadata)
    VALUES(r.user_id,r.user_id,'daily_task_plan_ready',false,jsonb_build_object(
      'message','Your three founder priorities are ready. Start with: '||COALESCE(r.first_task,'your next action'),
      'route','/dashboard/tasks','planId',r.plan_id,'planDate',r.plan_date
    ));
    INSERT INTO public.daily_task_plan_deliveries(plan_id,user_id,channel,status,sent_at)
    VALUES(r.plan_id,r.user_id,'in_app','sent',now()) ON CONFLICT(plan_id,channel) DO NOTHING;
    INSERT INTO public.daily_task_plan_deliveries(plan_id,user_id,channel,status,sent_at)
    VALUES(r.plan_id,r.user_id,'push',CASE WHEN public.notif_pref_enabled(r.user_id,'push_enabled') THEN 'sent' ELSE 'skipped' END,now())
    ON CONFLICT(plan_id,channel) DO NOTHING;

    IF r.email IS NOT NULL AND v_url IS NOT NULL AND v_key IS NOT NULL
      AND public.notif_pref_enabled(r.user_id,'retention_emails') THEN
      PERFORM net.http_post(url:=v_url||'/functions/v1/send-retention-email',
        headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_key),
        body:=jsonb_build_object('userId',r.user_id,'email',r.email,'fullName',r.full_name,
          'sequence','task_plan_digest','contextHeadline','Start here: '||COALESCE(r.first_task,'Open today''s founder plan.'),
          'ctaUrl','https://www.creativestakeover.com/dashboard/tasks','ctaLabel','Open today''s plan'));
      INSERT INTO public.daily_task_plan_deliveries(plan_id,user_id,channel,status,sent_at)
      VALUES(r.plan_id,r.user_id,'email','sent',now()) ON CONFLICT(plan_id,channel) DO NOTHING;
    ELSE
      INSERT INTO public.daily_task_plan_deliveries(plan_id,user_id,channel,status,last_error)
      VALUES(r.plan_id,r.user_id,'email','skipped','No deliverable email or service configuration')
      ON CONFLICT(plan_id,channel) DO NOTHING;
    END IF;
    v_count:=v_count+1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_daily_task_plan_digests_v1(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_daily_task_plan_digests_v1(integer) TO service_role;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='daily-task-plan-digests-v1';
    PERFORM cron.schedule('daily-task-plan-digests-v1','*/15 * * * *',
      $job$SELECT public.dispatch_daily_task_plan_digests_v1(1000);$job$);
  END IF;
END $$;
