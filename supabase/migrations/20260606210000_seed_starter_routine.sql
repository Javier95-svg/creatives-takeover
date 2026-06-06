-- Retention P1: ignite the daily streak/routine loop.
--
-- The dashboard accountability loop (streak chip, "today's habits", routine
-- reminder crons) only fires for users who have a routine configured AND
-- reminders enabled. But routine_config was empty {} for everyone and reminders
-- default to off, so the loop never started — 0 daily check-ins, 0 streaks.
--
-- Seed every NEW account (non-admin) with a sensible starter routine (the
-- "validate idea" template) and reminders enabled at 09:00, so day 1 the cockpit
-- has real habits to check off and the daily nudge engine (in-app + the capped,
-- dormant-only email) has something to drive. Users can change the goal, edit
-- tasks, or turn reminders off in the Routine tab. Existing users are untouched.

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
  starter_routine jsonb;
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
    SELECT 1 FROM public.profiles WHERE lower(username) = lower(final_slug) AND id <> NEW.id
  ) LOOP
    final_slug := base_slug || counter::TEXT;
    counter := counter + 1;
  END LOOP;
  generated_username := final_slug;

  starter_routine := jsonb_build_object(
    'version', 1,
    'primaryGoal', 'validate_idea',
    'updatedAt', now(),
    'tasks', jsonb_build_array(
      jsonb_build_object('id','validate-daily-customer-signal','title','Capture one customer signal or objection','cadence','daily','days',jsonb_build_array(1,2,3,4,5),'order',0,'source','template','active',true),
      jsonb_build_object('id','validate-daily-assumption','title','Write the riskiest assumption for today','cadence','daily','days',jsonb_build_array(1,2,3,4,5),'order',1,'source','template','active',true),
      jsonb_build_object('id','validate-weekly-interviews','title','Review customer conversations and update the ICP','cadence','weekly','days',jsonb_build_array(5),'order',2,'source','template','active',true)
    )
  );

  BEGIN
    INSERT INTO public.profiles (
      id, full_name, avatar_url, username,
      subscription_tier, onboarding_completed, user_preferences,
      routine_config, routine_primary_goal, routine_reminder_preferences
    )
    VALUES (
      NEW.id,
      display_name,
      NEW.raw_user_meta_data->>'avatar_url',
      generated_username,
      CASE WHEN is_admin THEN 'pro' ELSE 'rookie' END,
      CASE WHEN is_admin THEN true ELSE false END,
      CASE WHEN is_admin THEN '{}'::jsonb ELSE jsonb_build_object('requires_guided_onboarding', true) END,
      CASE WHEN is_admin THEN NULL ELSE starter_routine END,
      CASE WHEN is_admin THEN NULL ELSE 'validate_idea' END,
      CASE WHEN is_admin THEN NULL ELSE jsonb_build_object('enabled', true, 'time', '09:00') END
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
      username = COALESCE(public.profiles.username, EXCLUDED.username),
      subscription_tier = CASE WHEN is_admin THEN 'pro' ELSE public.profiles.subscription_tier END;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.signup_trigger_failures (user_id, email, error_code, error_message, raw_user_meta_data, context)
    VALUES (NEW.id, NEW.email, SQLSTATE, SQLERRM, NEW.raw_user_meta_data, jsonb_build_object('stage', 'profiles_upsert'));
    RAISE LOG '[SIGNUP_TRIGGER] profiles upsert failed user_id=% email=% code=% msg=%', NEW.id, NEW.email, SQLSTATE, SQLERRM;
    RETURN NEW;
  END;

  IF is_admin THEN
    BEGIN
      INSERT INTO public.user_credits (user_id, balance, subscription_tier, monthly_quota)
      VALUES (NEW.id, 5, 'pro', 5)
      ON CONFLICT (user_id) DO UPDATE SET subscription_tier = 'pro';

      INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier)
      VALUES (NEW.id, NEW.email, true, 'pro')
      ON CONFLICT (email) DO UPDATE SET subscribed = true, subscription_tier = 'pro';
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.signup_trigger_failures (user_id, email, error_code, error_message, raw_user_meta_data, context)
      VALUES (NEW.id, NEW.email, SQLSTATE, SQLERRM, NEW.raw_user_meta_data, jsonb_build_object('stage', 'admin_bootstrap'));
      RAISE LOG '[SIGNUP_TRIGGER] admin bootstrap failed user_id=% email=% code=% msg=%', NEW.id, NEW.email, SQLSTATE, SQLERRM;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.signup_trigger_failures (user_id, email, error_code, error_message, raw_user_meta_data, context)
  VALUES (NEW.id, NEW.email, SQLSTATE, SQLERRM, NEW.raw_user_meta_data, jsonb_build_object('stage', 'handle_new_user_unhandled'));
  RAISE LOG '[SIGNUP_TRIGGER] unhandled failure user_id=% email=% code=% msg=%', NEW.id, NEW.email, SQLSTATE, SQLERRM;
  RETURN NEW;
END;
$function$;
