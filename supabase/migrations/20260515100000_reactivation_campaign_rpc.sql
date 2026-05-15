CREATE OR REPLACE FUNCTION public.grant_reactivation_campaign_bonus(
  p_user_id UUID,
  p_campaign TEXT,
  p_amount INTEGER,
  p_granted_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit RECORD;
  v_existing_campaign BOOLEAN := false;
  v_updated_rows INTEGER := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'missing_user_id');
  END IF;

  IF p_campaign IS NULL OR btrim(p_campaign) = '' THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'missing_campaign');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'invalid_amount');
  END IF;

  SELECT uc.user_id, uc.balance, uc.subscription_tier
    INTO v_credit
    FROM public.user_credits uc
   WHERE uc.user_id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'credit_record_not_found');
  END IF;

  IF v_credit.subscription_tier <> 'rookie' THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'not_rookie');
  END IF;

  IF COALESCE(v_credit.balance, 0) <> 0 THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'balance_changed');
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.credit_transactions ct
     WHERE ct.user_id = p_user_id
       AND ct.metadata ->> 'campaign' = p_campaign
  )
    INTO v_existing_campaign;

  IF v_existing_campaign THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'campaign_already_granted');
  END IF;

  UPDATE public.user_credits
     SET balance = p_amount
   WHERE user_id = p_user_id
     AND subscription_tier = 'rookie'
     AND balance = 0;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'balance_update_skipped');
  END IF;

  INSERT INTO public.credit_transactions (
    id,
    user_id,
    amount,
    tx_type,
    reason,
    feature,
    metadata,
    created_at
  )
  VALUES (
    gen_random_uuid(),
    p_user_id,
    p_amount,
    'grant',
    'One-time reactivation gift - May 2026 campaign',
    'Reactivation Bonus',
    jsonb_build_object(
      'campaign', p_campaign,
      'granted_at', COALESCE(p_granted_at, NOW()),
      'source', 'reactivation-campaign'
    ),
    NOW()
  );

  UPDATE public.profiles
     SET credit_balance = p_amount
   WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'granted', true,
    'amount', p_amount,
    'campaign', p_campaign
  );
END;
$$;

REVOKE ALL ON FUNCTION public.grant_reactivation_campaign_bonus(UUID, TEXT, INTEGER, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_reactivation_campaign_bonus(UUID, TEXT, INTEGER, TIMESTAMPTZ) FROM anon;
REVOKE ALL ON FUNCTION public.grant_reactivation_campaign_bonus(UUID, TEXT, INTEGER, TIMESTAMPTZ) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.grant_reactivation_campaign_bonus(UUID, TEXT, INTEGER, TIMESTAMPTZ) TO service_role;
