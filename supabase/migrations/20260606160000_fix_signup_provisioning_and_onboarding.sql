-- Fix new-account provisioning + onboarding.
--
-- Symptoms (reported on a fresh signup):
--   1. Onboarding quiz never appeared; user landed straight on the dashboard.
--   2. Credit balance was 0 instead of 50.
--   3. Profile/credits silently missing.
--
-- Root causes:
--   * handle_new_user inserts the profile, whose AFTER-INSERT triggers create the
--     subscriber + credits rows. create_subscriber_for_profile only handled
--     ON CONFLICT (user_id), but subscribers also has a UNIQUE(email). A leftover
--     "orphan" subscriber row (same email, different/old user_id from a deleted
--     account) made the subscriber insert raise a duplicate-key error, which
--     rolled back the whole profile insert -> NO profile, NO credits, balance 0.
--   * The onboarding quiz (/onboarding -> OnboardingForm) is gated on
--     user_preferences.requires_guided_onboarding = true. Signup never set it, so
--     every new user was treated as "legacy exempt" and bounced to the dashboard.
--   * handle_new_user defaulted non-admins to tier 'free', which is not allowed by
--     profiles_subscription_tier_check ('rookie','rising','pro').
--
-- Credit model note: spendable credits = balance + monthly_quota, and deductions
-- draw from monthly_quota first. A Rookie gets monthly_quota = 50 (from
-- subscription_tiers.rookie), so balance = 0 is intentional; 50 is fully usable.
-- The anniversary window is handled by the existing ensure_user_credit_billing_window
-- trigger on user_credits (billing_anchor_at -> compute_monthly_billing_window).

-- 1. Make subscriber sync collision-proof and never able to block provisioning.
CREATE OR REPLACE FUNCTION public.create_subscriber_for_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    -- Reclaim any stale subscriber row that holds this email under a different
    -- (deleted/old) user_id, so the email UNIQUE constraint cannot block signup.
    DELETE FROM public.subscribers s
    USING auth.users au
    WHERE au.id = NEW.id
      AND lower(s.email) = lower(au.email)
      AND s.user_id IS DISTINCT FROM NEW.id;

    INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier)
    SELECT NEW.id, au.email, false, 'rookie'
    FROM auth.users au
    WHERE au.id = NEW.id
    ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    -- Subscriber sync is non-critical; never let it roll back the profile/credits.
    RAISE LOG '[create_subscriber_for_profile] non-fatal failure user=% msg=%', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

-- 2. Provision new accounts correctly: Rookie tier + guided onboarding enabled.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  generated_username TEXT;
  name_parts TEXT[];
  first_name TEXT;
  last_name TEXT;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
  is_admin BOOLEAN;
  display_name TEXT;
BEGIN
  is_admin := (lower(COALESCE(NEW.email, '')) = 'admin@creatives-takeover.com');

  display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    split_part(COALESCE(NEW.email, ''), '@', 1),
    'user'
  );

  base_slug := NULL;
  IF display_name IS NOT NULL AND btrim(display_name) <> '' THEN
    name_parts := regexp_split_to_array(btrim(display_name), '\s+');

    IF array_length(name_parts, 1) >= 2 THEN
      first_name := regexp_replace(lower(COALESCE(name_parts[1], '')), '[^a-z0-9]', '', 'g');
      last_name := regexp_replace(lower(COALESCE(name_parts[array_length(name_parts, 1)], '')), '[^a-z0-9]', '', 'g');
      base_slug := first_name || last_name;
    ELSIF array_length(name_parts, 1) = 1 THEN
      base_slug := regexp_replace(lower(COALESCE(name_parts[1], '')), '[^a-z0-9]', '', 'g');
    END IF;
  END IF;

  IF base_slug IS NULL OR base_slug = '' THEN
    base_slug := 'user' || substring(NEW.id::TEXT FROM 1 FOR 8);
  END IF;

  final_slug := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(username) = lower(final_slug) AND id <> NEW.id
  ) LOOP
    final_slug := base_slug || counter::TEXT;
    counter := counter + 1;
  END LOOP;
  generated_username := final_slug;

  BEGIN
    INSERT INTO public.profiles (
      id, full_name, avatar_url, username,
      subscription_tier, onboarding_completed, user_preferences
    )
    VALUES (
      NEW.id,
      display_name,
      NEW.raw_user_meta_data->>'avatar_url',
      generated_username,
      CASE WHEN is_admin THEN 'pro' ELSE 'rookie' END,
      CASE WHEN is_admin THEN true ELSE false END,
      CASE WHEN is_admin THEN '{}'::jsonb
           ELSE jsonb_build_object('requires_guided_onboarding', true) END
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
      username = COALESCE(public.profiles.username, EXCLUDED.username),
      subscription_tier = CASE
        WHEN is_admin THEN 'pro'
        ELSE public.profiles.subscription_tier
      END;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.signup_trigger_failures (
      user_id, email, error_code, error_message, raw_user_meta_data, context
    ) VALUES (
      NEW.id, NEW.email, SQLSTATE, SQLERRM, NEW.raw_user_meta_data,
      jsonb_build_object('stage', 'profiles_upsert')
    );
    RAISE LOG '[SIGNUP_TRIGGER] profiles upsert failed user_id=% email=% code=% msg=%',
      NEW.id, NEW.email, SQLSTATE, SQLERRM;
    RETURN NEW;
  END;

  IF is_admin THEN
    BEGIN
      INSERT INTO public.user_credits (user_id, balance, subscription_tier, monthly_quota)
      VALUES (NEW.id, 5, 'pro', 5)
      ON CONFLICT (user_id) DO UPDATE SET subscription_tier = 'pro';

      INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier)
      VALUES (NEW.id, NEW.email, true, 'pro')
      ON CONFLICT (email) DO UPDATE
      SET subscribed = true, subscription_tier = 'pro';
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.signup_trigger_failures (
        user_id, email, error_code, error_message, raw_user_meta_data, context
      ) VALUES (
        NEW.id, NEW.email, SQLSTATE, SQLERRM, NEW.raw_user_meta_data,
        jsonb_build_object('stage', 'admin_bootstrap')
      );
      RAISE LOG '[SIGNUP_TRIGGER] admin bootstrap failed user_id=% email=% code=% msg=%',
        NEW.id, NEW.email, SQLSTATE, SQLERRM;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.signup_trigger_failures (
    user_id, email, error_code, error_message, raw_user_meta_data, context
  ) VALUES (
    NEW.id, NEW.email, SQLSTATE, SQLERRM, NEW.raw_user_meta_data,
    jsonb_build_object('stage', 'handle_new_user_unhandled')
  );
  RAISE LOG '[SIGNUP_TRIGGER] unhandled failure user_id=% email=% code=% msg=%',
    NEW.id, NEW.email, SQLSTATE, SQLERRM;
  RETURN NEW;
END;
$function$;

-- 3. Backfill the accounts whose provisioning previously failed: insert the
--    missing profile (its triggers create the credits + subscriber rows). The
--    fixed create_subscriber_for_profile clears any orphan email row first.
INSERT INTO public.profiles (
  id, full_name, username, subscription_tier, onboarding_completed, user_preferences
)
SELECT
  au.id,
  COALESCE(NULLIF(au.raw_user_meta_data->>'full_name', ''), split_part(au.email, '@', 1), 'user'),
  regexp_replace(lower(COALESCE(NULLIF(au.raw_user_meta_data->>'full_name',''), split_part(au.email,'@',1), 'user')), '[^a-z0-9]', '', 'g')
    || substr(replace(au.id::text, '-', ''), 1, 8),
  'rookie',
  false,
  jsonb_build_object('requires_guided_onboarding', true)
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id);
