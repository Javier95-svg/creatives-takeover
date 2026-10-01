CREATE OR REPLACE FUNCTION public.activate_gtm_play_v2(
  p_plan_id uuid,
  p_play_id uuid,
  p_channel text,
  p_activation_payload jsonb,
  p_idempotency_key text
)
RETURNS TABLE(sprint_id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  caller_id uuid := auth.uid();
  resolved_sprint_id uuid;
  selected_product uuid;
  active_count integer;
  rewritten_plays jsonb;
BEGIN
  IF caller_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.gtm_plans WHERE id = p_plan_id AND user_id = caller_id) THEN
    RAISE EXCEPTION 'GTM plan not found';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.gtm_plays WHERE id = p_play_id AND plan_id = p_plan_id AND user_id = caller_id) THEN
    RAISE EXCEPTION 'GTM play not found';
  END IF;

  SELECT product_id INTO selected_product FROM public.ct_product_artifacts WHERE user_id=caller_id AND tool='gtm_strategist' AND artifact_id=p_plan_id;
  PERFORM pg_advisory_xact_lock(hashtextextended(caller_id::text||coalesce(selected_product::text,'unassigned'),0));

  SELECT id INTO resolved_sprint_id
    FROM public.traction_engine_sprints
    WHERE user_id = caller_id
      AND product_id IS NOT DISTINCT FROM selected_product
      AND (activation_idempotency_key = p_idempotency_key OR (status = 'active' AND lower(channel) = lower(trim(p_channel))))
    ORDER BY created_at DESC LIMIT 1;

  IF resolved_sprint_id IS NULL THEN
    SELECT count(*) INTO active_count FROM public.traction_engine_sprints WHERE user_id = caller_id AND product_id IS NOT DISTINCT FROM selected_product AND status = 'active';
    IF active_count >= 2 THEN RAISE EXCEPTION 'Traction Engine supports two active channels at a time'; END IF;
    INSERT INTO public.traction_engine_sprints (
      user_id, product_id, channel, cycle_start_date, status, source_gtm_plan_id, source_gtm_play_id,
      activation_payload, activation_idempotency_key, review_due_at
    ) VALUES (
      caller_id, selected_product, trim(p_channel), date_trunc('week',now() AT TIME ZONE 'UTC')::date, 'active', p_plan_id, p_play_id,
      COALESCE(p_activation_payload, '{}'::jsonb), p_idempotency_key, now() + interval '7 days'
    ) RETURNING id INTO resolved_sprint_id;
  ELSE
    UPDATE public.traction_engine_sprints SET
      source_gtm_plan_id = p_plan_id,
      source_gtm_play_id = p_play_id,
      activation_payload = COALESCE(p_activation_payload, activation_payload),
      activation_idempotency_key = COALESCE(activation_idempotency_key, p_idempotency_key),
      review_due_at = COALESCE(review_due_at, now() + interval '7 days')
    WHERE id = resolved_sprint_id AND user_id = caller_id;
  END IF;

  UPDATE public.gtm_plays SET
    status = 'active',
    play_content = play_content || jsonb_build_object('status', 'active', 'tractionSprintId', resolved_sprint_id::text)
  WHERE id = p_play_id AND user_id = caller_id;

  SELECT jsonb_agg(
    CASE WHEN item->>'id' = p_play_id::text
      THEN item || jsonb_build_object('status', 'active', 'tractionSprintId', resolved_sprint_id::text)
      ELSE item END
  ) INTO rewritten_plays
  FROM jsonb_array_elements((SELECT plan_content->'plays' FROM public.gtm_plans WHERE id = p_plan_id)) AS item;

  UPDATE public.gtm_plans SET
    plan_content = jsonb_set(plan_content, '{plays}', COALESCE(rewritten_plays, '[]'::jsonb), true),
    updated_at = now()
  WHERE id = p_plan_id AND user_id = caller_id;

  RETURN QUERY SELECT resolved_sprint_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_gtm_play_v2(uuid, uuid, text, jsonb, text) TO authenticated;
