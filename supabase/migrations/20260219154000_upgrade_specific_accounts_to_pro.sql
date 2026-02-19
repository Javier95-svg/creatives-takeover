-- Upgrade specific users to Professional tier with Pro-level credit allocation.
-- Requested accounts:
-- - uneebkhanzada91@gmail.com (f2fa28f8-7889-4397-b17b-478488435b84)
-- - does@elevatedynamics.pt (15bba750-6594-4f48-a101-0c02a404835e)
-- - adam@tiplo.ai (c6aba37d-847a-439e-848d-d6874b7d245a)
-- - apembertona@gmail.com (b05d6111-0940-4403-a710-92901fcbf034)
--
-- This migration is idempotent and safe to run multiple times.

DO $$
DECLARE
  target RECORD;
  resolved_user_id UUID;
  resolved_email TEXT;
  derived_full_name TEXT;
  derived_avatar_url TEXT;
  existing_username TEXT;
  base_username TEXT;
  final_username TEXT;
  username_counter INTEGER;
  previous_balance INTEGER;
  previous_tier TEXT;
  professional_credits INTEGER := 150;
BEGIN
  FOR target IN
    SELECT *
    FROM (VALUES
      ('f2fa28f8-7889-4397-b17b-478488435b84'::UUID, 'uneebkhanzada91@gmail.com'::TEXT),
      ('15bba750-6594-4f48-a101-0c02a404835e'::UUID, 'does@elevatedynamics.pt'::TEXT),
      ('c6aba37d-847a-439e-848d-d6874b7d245a'::UUID, 'adam@tiplo.ai'::TEXT),
      ('b05d6111-0940-4403-a710-92901fcbf034'::UUID, 'apembertona@gmail.com'::TEXT)
    ) AS t(user_id, email)
  LOOP
    resolved_email := lower(target.email);

    -- Resolve user by UID first, then by email as fallback.
    SELECT u.id INTO resolved_user_id
    FROM auth.users u
    WHERE u.id = target.user_id OR lower(u.email) = resolved_email
    ORDER BY CASE WHEN u.id = target.user_id THEN 0 ELSE 1 END
    LIMIT 1;

    IF resolved_user_id IS NULL THEN
      RAISE WARNING '[pro-upgrade] user not found, skipping email=% uid=%', resolved_email, target.user_id;
      CONTINUE;
    END IF;

    IF resolved_user_id <> target.user_id THEN
      RAISE WARNING '[pro-upgrade] uid mismatch for email=% expected_uid=% resolved_uid=%',
        resolved_email, target.user_id, resolved_user_id;
    END IF;

    SELECT
      COALESCE(NULLIF(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1)),
      NULLIF(u.raw_user_meta_data->>'avatar_url', '')
    INTO derived_full_name, derived_avatar_url
    FROM auth.users u
    WHERE u.id = resolved_user_id;

    SELECT p.username
    INTO existing_username
    FROM public.profiles p
    WHERE p.id = resolved_user_id;

    IF existing_username IS NULL OR btrim(existing_username) = '' THEN
      base_username := regexp_replace(lower(split_part(resolved_email, '@', 1)), '[^a-z0-9_]', '', 'g');
      IF base_username IS NULL OR base_username = '' THEN
        base_username := 'user' || substring(resolved_user_id::text FROM 1 FOR 8);
      END IF;

      final_username := base_username;
      username_counter := 1;
      WHILE EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE lower(p.username) = lower(final_username)
          AND p.id <> resolved_user_id
      ) LOOP
        final_username := base_username || username_counter::TEXT;
        username_counter := username_counter + 1;
      END LOOP;
    ELSE
      final_username := existing_username;
    END IF;

    -- Ensure profile exists and enforce professional tier.
    INSERT INTO public.profiles (
      id,
      full_name,
      avatar_url,
      username,
      subscription_tier,
      subscribed,
      subscription_end,
      updated_at
    )
    VALUES (
      resolved_user_id,
      derived_full_name,
      derived_avatar_url,
      final_username,
      'professional',
      true,
      NULL,
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
      username = COALESCE(NULLIF(public.profiles.username, ''), EXCLUDED.username),
      subscription_tier = 'professional',
      subscribed = true,
      subscription_end = NULL,
      updated_at = now();

    SELECT COALESCE(uc.balance, 0), COALESCE(uc.subscription_tier, 'free')
    INTO previous_balance, previous_tier
    FROM public.user_credits uc
    WHERE uc.user_id = resolved_user_id;

    -- Ensure user credits align with professional tier and Pro quota.
    INSERT INTO public.user_credits (
      user_id,
      balance,
      monthly_quota,
      subscription_tier,
      last_credit_grant,
      updated_at
    )
    VALUES (
      resolved_user_id,
      professional_credits,
      professional_credits,
      'professional',
      now(),
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      subscription_tier = 'professional',
      monthly_quota = professional_credits,
      balance = GREATEST(COALESCE(public.user_credits.balance, 0), professional_credits),
      last_credit_grant = now(),
      updated_at = now();

    IF COALESCE(previous_balance, 0) < professional_credits THEN
      INSERT INTO public.credit_transactions (
        user_id,
        amount,
        tx_type,
        reason,
        feature,
        metadata
      )
      VALUES (
        resolved_user_id,
        professional_credits - COALESCE(previous_balance, 0),
        'grant',
        'Manual Pro upgrade to professional tier',
        'Subscription - professional',
        jsonb_build_object(
          'source', 'manual_pro_upgrade',
          'previous_tier', COALESCE(previous_tier, 'free'),
          'previous_balance', COALESCE(previous_balance, 0),
          'new_tier', 'professional',
          'target_email', resolved_email
        )
      );
    END IF;

    -- Keep subscribers in sync for feature gating/subscription checks.
    UPDATE public.subscribers
    SET
      email = resolved_email,
      subscribed = true,
      subscription_tier = 'professional',
      subscription_end = NULL,
      updated_at = now()
    WHERE user_id = resolved_user_id;

    INSERT INTO public.subscribers (
      user_id,
      email,
      subscribed,
      subscription_tier,
      subscription_end,
      updated_at
    )
    VALUES (
      resolved_user_id,
      resolved_email,
      true,
      'professional',
      NULL,
      now()
    )
    ON CONFLICT (email) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      subscribed = true,
      subscription_tier = 'professional',
      subscription_end = NULL,
      updated_at = now();

    RAISE NOTICE '[pro-upgrade] completed email=% uid=%', resolved_email, resolved_user_id;
  END LOOP;
END $$;
