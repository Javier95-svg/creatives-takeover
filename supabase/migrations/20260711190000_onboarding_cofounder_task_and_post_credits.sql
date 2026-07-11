-- Add the onboarding co-founder task and enforce universal 5-credit posting.

CREATE INDEX IF NOT EXISTS daily_tasks_user_recommendation_key_idx
  ON public.daily_tasks (user_id, recommendation_key);

CREATE OR REPLACE FUNCTION public.sync_onboarding_cofounder_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_situation text := NEW.user_preferences->>'cofounderSituation';
  v_task_date date := current_date;
BEGIN
  IF COALESCE(NEW.user_preferences->>'onboardingLocalDate', '')
      ~ '^\d{4}-\d{2}-\d{2}$' THEN
    v_task_date := (NEW.user_preferences->>'onboardingLocalDate')::date;
  END IF;

  IF v_situation = 'actively_looking' THEN
    INSERT INTO public.daily_tasks (
      user_id,
      task_text,
      task_description,
      task_date,
      task_source,
      priority,
      source_tool,
      source_route,
      intent_type,
      recommendation_key,
      recommendation_reason,
      recommendation_status,
      effort_estimate,
      business_impact_score,
      stage_alignment_score,
      ai_generated,
      is_foundational,
      is_completed
    )
    SELECT
      NEW.id,
      'Find a co-founder',
      'Create a co-founder post and start meeting potential partners. Publishing costs 5 credits.',
      v_task_date,
      'platform',
      'high',
      'find_cofounder',
      '/co-founder',
      'accountability',
      'onboarding:find_cofounder',
      'You told us you are actively looking for a co-founder.',
      'accepted',
      10,
      8,
      8,
      false,
      false,
      false
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.daily_tasks existing
      WHERE existing.user_id = NEW.id
        AND existing.recommendation_key = 'onboarding:find_cofounder'
    );
  ELSIF v_situation = 'solo_ok' THEN
    UPDATE public.daily_tasks
    SET
      recommendation_status = 'dismissed',
      dismissed_at = COALESCE(dismissed_at, now()),
      updated_at = now()
    WHERE user_id = NEW.id
      AND recommendation_key = 'onboarding:find_cofounder'
      AND COALESCE(is_completed, false) = false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_onboarding_cofounder_task
  ON public.profiles;

CREATE TRIGGER sync_onboarding_cofounder_task
AFTER UPDATE OF user_preferences
ON public.profiles
FOR EACH ROW
WHEN (
  (NEW.user_preferences->>'cofounderSituation') IS DISTINCT FROM
  (OLD.user_preferences->>'cofounderSituation')
)
EXECUTE FUNCTION public.sync_onboarding_cofounder_task();

CREATE OR REPLACE FUNCTION public.enforce_cofounder_post_credit_charge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_charge_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'You can only create a co-founder post for your own account.'
      USING ERRCODE = '42501';
  END IF;

  v_charge_result := public.deduct_credits_atomic(
    NEW.user_id,
    5,
    'Co-founder post',
    NULL,
    jsonb_build_object(
      'idempotencyKey', 'cofounder-post:' || NEW.id::text,
      'operationId', 'cofounder-post:' || NEW.id::text,
      'featureKey', 'COFOUNDER_POST',
      'feature_key', 'COFOUNDER_POST',
      'source', 'cofounder_post_insert_trigger',
      'postId', NEW.id
    )
  );

  IF COALESCE((v_charge_result->>'success')::boolean, false) THEN
    RETURN NEW;
  END IF;

  IF v_charge_result->>'errorCode' = 'INSUFFICIENT_CREDITS' THEN
    RAISE EXCEPTION 'Insufficient credits. Publishing a co-founder post requires 5 credits.';
  END IF;

  RAISE EXCEPTION 'Co-founder post credit deduction failed: %',
    COALESCE(v_charge_result->>'error', 'Unknown error');
END;
$$;

DROP TRIGGER IF EXISTS enforce_cofounder_post_credit_charge
  ON public.cofounder_posts;

-- Credits replace the previous Rookie/Starter monthly posting quota.
DROP TRIGGER IF EXISTS trg_cofounder_posts_quota_guard
  ON public.cofounder_posts;

CREATE TRIGGER enforce_cofounder_post_credit_charge
BEFORE INSERT
ON public.cofounder_posts
FOR EACH ROW
EXECUTE FUNCTION public.enforce_cofounder_post_credit_charge();

CREATE OR REPLACE FUNCTION public.complete_onboarding_cofounder_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.daily_tasks
  SET
    is_completed = true,
    completed_at = COALESCE(completed_at, now()),
    recommendation_status = 'accepted',
    updated_at = now()
  WHERE user_id = NEW.user_id
    AND recommendation_key = 'onboarding:find_cofounder'
    AND COALESCE(is_completed, false) = false;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS complete_onboarding_cofounder_task
  ON public.cofounder_posts;

CREATE TRIGGER complete_onboarding_cofounder_task
AFTER INSERT
ON public.cofounder_posts
FOR EACH ROW
EXECUTE FUNCTION public.complete_onboarding_cofounder_task();

REVOKE ALL ON FUNCTION public.sync_onboarding_cofounder_task() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_cofounder_post_credit_charge() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_onboarding_cofounder_task() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.enforce_cofounder_post_credit_charge() IS
  'Atomically charges 5 platform credits before every co-founder post insert on every plan.';
