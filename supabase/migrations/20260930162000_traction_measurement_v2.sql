ALTER TABLE public.traction_engine_weekly_logs ADD COLUMN product_id uuid REFERENCES public.ct_products ON DELETE RESTRICT;
ALTER TABLE public.traction_engine_weekly_logs ADD COLUMN calculation_version integer NOT NULL DEFAULT 1;
ALTER TABLE public.traction_engine_sprints ADD COLUMN product_id uuid REFERENCES public.ct_products ON DELETE RESTRICT;
ALTER TABLE public.traction_engine_experiments ADD COLUMN sample_size numeric CHECK(sample_size>=0);
ALTER TABLE public.traction_engine_weekly_logs DROP CONSTRAINT traction_engine_weekly_logs_user_id_week_start_date_key;
CREATE UNIQUE INDEX traction_product_week ON public.traction_engine_weekly_logs(user_id,product_id,week_start_date) WHERE product_id IS NOT NULL;
CREATE UNIQUE INDEX traction_unassigned_week ON public.traction_engine_weekly_logs(user_id,week_start_date) WHERE product_id IS NULL;
DROP INDEX public.traction_engine_sprints_active_channel_idx;
CREATE UNIQUE INDEX traction_product_channel ON public.traction_engine_sprints(user_id,product_id,lower(channel)) WHERE status='active' AND product_id IS NOT NULL;
CREATE UNIQUE INDEX traction_unassigned_channel ON public.traction_engine_sprints(user_id,lower(channel)) WHERE status='active' AND product_id IS NULL;

CREATE TABLE public.ct_traction_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  weekly_log_id uuid NOT NULL REFERENCES public.traction_engine_weekly_logs ON DELETE CASCADE,
  revision integer NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(weekly_log_id,revision)
);
ALTER TABLE public.ct_traction_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_read ON public.ct_traction_revisions FOR SELECT TO authenticated USING(user_id=auth.uid());
GRANT SELECT ON public.ct_traction_revisions TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.ct_traction_revisions FROM anon,authenticated;

CREATE FUNCTION public.save_traction_week_v2(p_product_id uuid,p_week date,p_experiments jsonb,p_retention jsonb,p_cohort jsonb DEFAULT NULL,p_source jsonb DEFAULT NULL,p_observation_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  uid uuid:=auth.uid(); log_id uuid; exp_id uuid; v_sprint_id uuid; r jsonb; saved public.traction_engine_weekly_logs;
  streak integer:=1; cursor_week date:=p_week-7; consistency integer; quality integer; progress integer;
  mean_quality integer; mean_progress integer; discipline integer; retained integer:=0; cohort_status text:='unknown';
  origin text:='manual'; obs public.ct_metric_observations; cohort jsonb:=p_cohort; revision_number integer;
  returned numeric; denominator numeric; total_quality integer:=0; total_progress integer:=0; active_count integer;
  sprints jsonb:='[]'; ids uuid[]:='{}'; sid uuid; target numeric; actual numeric; hours numeric; own_play uuid; own_plan uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to save your week'; END IF;
  IF p_week IS NULL OR extract(isodow FROM p_week)<>1 OR p_week>current_date OR p_week<current_date-3650 THEN RAISE EXCEPTION 'Choose a valid Monday week start'; END IF;
  IF p_product_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ct_products WHERE id=p_product_id AND user_id=uid) THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF p_experiments IS NULL OR jsonb_typeof(p_experiments)<>'array' OR jsonb_array_length(p_experiments) NOT BETWEEN 1 AND 2 THEN RAISE EXCEPTION 'Record one or two experiments'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||coalesce(p_product_id::text,'unassigned'),0));
  SELECT * INTO saved FROM traction_engine_weekly_logs WHERE user_id=uid AND product_id IS NOT DISTINCT FROM p_product_id AND week_start_date=p_week FOR UPDATE;
  log_id:=coalesce(saved.id,gen_random_uuid());
  IF saved.id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ct_traction_revisions WHERE weekly_log_id=log_id) THEN
    INSERT INTO ct_traction_revisions(user_id,weekly_log_id,revision,snapshot)
    SELECT uid,log_id,1,jsonb_build_object('log',to_jsonb(saved),'experiments',(SELECT jsonb_agg(to_jsonb(e)) FROM traction_engine_experiments e WHERE e.weekly_log_id=log_id));
  END IF;
  WHILE EXISTS(SELECT 1 FROM traction_engine_weekly_logs WHERE user_id=uid AND product_id IS NOT DISTINCT FROM p_product_id AND week_start_date=cursor_week AND calculation_version=2) LOOP
    streak:=streak+1; cursor_week:=cursor_week-7;
  END LOOP;
  consistency:=least(100,round(streak::numeric/8*100));
  IF p_observation_id IS NOT NULL THEN
    SELECT * INTO obs FROM ct_metric_observations WHERE id=p_observation_id AND user_id=uid AND product_id=p_product_id;
    IF NOT FOUND OR obs.metric NOT IN ('retention_day_7','retention_day_30') THEN RAISE EXCEPTION 'Cohort observation not found'; END IF;
    cohort:=jsonb_build_object('cohortSize',obs.denominator,'returned',obs.value,'periodStart',obs.period_start,'periodEnd',obs.period_end,'startEvent',obs.definition->>'startEvent','returnEvent',obs.definition->>'returnEvent','windowDays',obs.definition->'windowDays');
    origin:=CASE WHEN obs.provenance IN ('provider','platform') THEN obs.provenance ELSE 'manual' END;
  END IF;
  IF p_observation_id IS NOT NULL AND obs.status<>'complete' THEN cohort_status:=obs.status;
  ELSIF cohort IS NOT NULL AND cohort<>'null'::jsonb THEN
    IF nullif(cohort->>'periodStart','') IS NOT NULL AND nullif(cohort->>'periodEnd','') IS NOT NULL THEN
      IF (cohort->>'periodEnd')::timestamptz<=(cohort->>'periodStart')::timestamptz THEN RAISE EXCEPTION 'Observation end must follow cohort start'; END IF;
      IF (cohort->>'periodEnd')::timestamptz>now() THEN cohort_status:='pending';
      ELSE
        returned:=(cohort->>'returned')::numeric; denominator:=(cohort->>'cohortSize')::numeric;
        IF denominator>0 AND returned>=0 AND returned<=denominator AND denominator=trunc(denominator) AND returned=trunc(returned)
          AND length(trim(cohort->>'startEvent'))>0 AND length(trim(cohort->>'returnEvent'))>0 AND (cohort->>'windowDays')::integer BETWEEN 1 AND 365
          AND (cohort->>'periodEnd')::timestamptz-(cohort->>'periodStart')::timestamptz >= make_interval(days => (cohort->>'windowDays')::integer) THEN
          cohort_status:='complete'; retained:=round(returned/denominator*100);
        END IF;
      END IF;
    END IF;
  END IF;

  FOR r IN SELECT value FROM jsonb_array_elements(p_experiments) LOOP
    IF length(trim(coalesce(r->>'channel','')))=0 OR length(trim(coalesce(r->>'hypothesis','')))=0 OR length(trim(coalesce(r->>'actionTaken','')))=0 OR length(trim(coalesce(r->>'targetMetric','')))=0
      OR coalesce(r->>'decision','') NOT IN ('double_down','iterate','narrow','pivot','kill') THEN RAISE EXCEPTION 'Complete the experiment and decision'; END IF;
    target:=(r->>'targetValue')::numeric; actual:=(r->>'resultValue')::numeric; hours:=(r->>'timeInvestedHours')::numeric;
    IF target IS NULL OR actual IS NULL OR hours IS NULL OR target<0 OR actual<0 OR hours<0 THEN RAISE EXCEPTION 'Use non-negative numeric inputs'; END IF;
    quality:=80+CASE WHEN target>0 AND hours>0 THEN 20 ELSE 0 END;
    progress:=CASE WHEN target>0 THEN least(100,round(actual/target*100)) ELSE 0 END;
    total_quality:=total_quality+quality; total_progress:=total_progress+progress;
  END LOOP;
  IF (SELECT count(DISTINCT lower(trim(value->>'channel'))) FROM jsonb_array_elements(p_experiments))<>jsonb_array_length(p_experiments) THEN RAISE EXCEPTION 'Use different channels for each experiment'; END IF;
  mean_quality:=round(total_quality::numeric/jsonb_array_length(p_experiments));
  mean_progress:=round(total_progress::numeric/jsonb_array_length(p_experiments));
  discipline:=round((consistency+mean_quality)::numeric/2);
  IF saved.id IS NULL THEN
    INSERT INTO traction_engine_weekly_logs(id,user_id,product_id,week_start_date,combined_score,consistency_score,channel_efficiency_score,experiment_quality_score,retention_health_score,channel_quality_signal,prioritized_recommendation)
      VALUES(log_id,uid,p_product_id,p_week,discipline,consistency,mean_progress,mean_quality,retained,'Retention '||cohort_status,'Review the result, evidence and observation window before changing the next experiment.');
  END IF;
  UPDATE traction_engine_weekly_logs SET calculation_version=2,
    new_users=coalesce((p_retention->>'newUsers')::integer,0),seven_day_active_users=coalesce((p_retention->>'sevenDayActiveUsers')::integer,0),thirty_day_active_users=coalesce((p_retention->>'thirtyDayActiveUsers')::integer,0),
    primary_acquisition_channel=coalesce(p_retention->>'primaryAcquisitionChannel',''), product_category=coalesce(p_retention->>'productCategory','other'),revenue=(p_retention->>'revenue')::numeric,
    combined_score=discipline,consistency_score=consistency,channel_efficiency_score=mean_progress,experiment_quality_score=mean_quality,retention_health_score=retained,consistency_streak_weeks=streak,
    phase_seven_ready=false,channel_quality_signal='Retention '||cohort_status,prioritized_recommendation='Review the result, evidence and observation window before changing the next experiment.',
    score_breakdown=jsonb_build_object('calculationVersion',2,'retentionSource',origin,'retentionStatus',cohort_status,'cohort',cohort,'observationId',p_observation_id,'executionDiscipline',discipline),
    verification_mode='founder_reported',updated_at=now()
    WHERE id=log_id;
  FOR r IN SELECT value FROM jsonb_array_elements(p_experiments) LOOP
    SELECT id INTO v_sprint_id FROM traction_engine_sprints WHERE user_id=uid AND product_id IS NOT DISTINCT FROM p_product_id AND lower(channel)=lower(trim(r->>'channel')) AND status='active' FOR UPDATE;
    IF v_sprint_id IS NULL THEN
      SELECT count(*) INTO active_count FROM traction_engine_sprints WHERE user_id=uid AND product_id IS NOT DISTINCT FROM p_product_id AND status='active';
      IF active_count>=2 THEN RAISE EXCEPTION 'Close an active sprint before adding a third channel'; END IF;
      INSERT INTO traction_engine_sprints(user_id,product_id,channel,cycle_start_date) VALUES(uid,p_product_id,trim(r->>'channel'),p_week) RETURNING id INTO v_sprint_id;
    END IF;
    IF p_source IS NOT NULL AND lower(p_source->>'channel')=lower(trim(r->>'channel')) THEN
      SELECT id,plan_id INTO own_play,own_plan FROM gtm_plays WHERE id=(p_source->>'playId')::uuid AND plan_id=(p_source->>'planId')::uuid AND user_id=uid;
      IF own_play IS NULL THEN RAISE EXCEPTION 'GTM play not found'; END IF;
      IF p_product_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM ct_product_artifacts WHERE user_id=uid AND tool='gtm_strategist' AND artifact_id=own_plan AND product_id=p_product_id) THEN RAISE EXCEPTION 'Assign the GTM plan to the same product before saving this handoff'; END IF;
      UPDATE traction_engine_sprints SET source_gtm_play_id=own_play,source_gtm_plan_id=own_plan WHERE id=v_sprint_id;
    END IF;
    SELECT e.id INTO exp_id FROM traction_engine_experiments e WHERE e.weekly_log_id=log_id AND e.user_id=uid AND e.sprint_id=v_sprint_id;
    exp_id:=coalesce(exp_id,gen_random_uuid()); ids:=array_append(ids,exp_id);
    target:=(r->>'targetValue')::numeric; actual:=(r->>'resultValue')::numeric; hours:=(r->>'timeInvestedHours')::numeric;
    INSERT INTO traction_engine_experiments(id,user_id,weekly_log_id,sprint_id,channel,hypothesis,action_taken,target_metric,target_value,result_value,time_invested_hours,decision,recommended_decision,override_rationale,pass,efficiency_score,quality_score,sample_size)
      VALUES(exp_id,uid,log_id,v_sprint_id,trim(r->>'channel'),r->>'hypothesis',r->>'actionTaken',r->>'targetMetric',target,actual,hours,r->>'decision','iterate',nullif(r->>'decisionRationale',''),target>0 AND actual>=target,CASE WHEN target>0 THEN least(100,round(actual/target*100)) ELSE 0 END,80+CASE WHEN target>0 AND hours>0 THEN 20 ELSE 0 END,coalesce((r->>'sampleSize')::numeric,0))
      ON CONFLICT(id) DO UPDATE SET hypothesis=excluded.hypothesis,action_taken=excluded.action_taken,target_metric=excluded.target_metric,target_value=excluded.target_value,result_value=excluded.result_value,time_invested_hours=excluded.time_invested_hours,decision=excluded.decision,override_rationale=excluded.override_rationale,pass=excluded.pass,efficiency_score=excluded.efficiency_score,quality_score=excluded.quality_score,sample_size=excluded.sample_size;
    sprints:=sprints||(SELECT jsonb_build_array(to_jsonb(s)) FROM traction_engine_sprints s WHERE id=v_sprint_id);
  END LOOP;
  DELETE FROM traction_engine_experiments WHERE weekly_log_id=log_id AND user_id=uid AND NOT(id=ANY(ids));
  SELECT coalesce(max(revision),0)+1 INTO revision_number FROM ct_traction_revisions WHERE weekly_log_id=log_id;
  INSERT INTO ct_traction_revisions(user_id,weekly_log_id,revision,snapshot)
    SELECT uid,log_id,revision_number,jsonb_build_object('log',to_jsonb(l),'experiments',(SELECT jsonb_agg(to_jsonb(e)) FROM traction_engine_experiments e WHERE weekly_log_id=log_id)) FROM traction_engine_weekly_logs l WHERE id=log_id;
  IF p_product_id IS NOT NULL THEN INSERT INTO ct_product_artifacts(user_id,product_id,tool,artifact_id) VALUES(uid,p_product_id,'traction_engine',log_id) ON CONFLICT DO NOTHING; END IF;
  RETURN jsonb_build_object('logId',log_id,'sprints',sprints,'revision',revision_number);
END $$;
REVOKE ALL ON FUNCTION public.save_traction_week_v2(uuid,date,jsonb,jsonb,jsonb,jsonb,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_traction_week_v2(uuid,date,jsonb,jsonb,jsonb,jsonb,uuid) TO authenticated;

-- Historical benchmarks are retained for legacy reports. New comparisons must
-- select an explicit calculation version instead of mixing scoring methods.
CREATE FUNCTION public.get_traction_category_benchmarks_v2(p_category text)
RETURNS TABLE(cohort_users integer,p25 numeric,p50 numeric,p75 numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH founders AS (SELECT user_id,avg(combined_score) score FROM traction_engine_weekly_logs
    WHERE product_category=p_category AND calculation_version=2 AND product_id IS NOT NULL
      AND week_start_date>=current_date-180 GROUP BY user_id)
  SELECT count(*)::integer,percentile_cont(.25) WITHIN GROUP(ORDER BY score)::numeric,
    percentile_cont(.5) WITHIN GROUP(ORDER BY score)::numeric,percentile_cont(.75) WITHIN GROUP(ORDER BY score)::numeric
  FROM founders HAVING count(*)>=20;
$$;
REVOKE ALL ON FUNCTION public.get_traction_category_benchmarks_v2(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_traction_category_benchmarks_v2(text) TO authenticated;

-- Weekly corrections must pass through the versioned transaction. Direct client
-- writes could otherwise forge scores, source labels, or destroy revision history.
REVOKE INSERT,UPDATE,DELETE ON public.traction_engine_weekly_logs,public.traction_engine_experiments FROM anon,authenticated;
