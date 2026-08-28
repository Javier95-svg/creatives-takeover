-- Make optional founder-context modules capability-detected so a missing
-- module can never prevent the daily deterministic plan from being built.

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

-- Retry founders whose initial plan generation failed.
SELECT public.process_due_daily_task_plans_v1(500);
