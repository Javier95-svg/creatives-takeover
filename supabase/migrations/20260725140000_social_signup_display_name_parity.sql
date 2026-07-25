-- Give every social provider the same profile quality on signup.
--
-- handle_new_user() read only `full_name`/`avatar_url`, which Google and X send but
-- LinkedIn OIDC does not: LinkedIn sends the OIDC standard claims `name`,
-- `given_name`/`family_name` and `picture`. Every LinkedIn account therefore fell back
-- to the email prefix for its display name and username (e.g. "tdong1919" instead of
-- "Crystal Thuy Dong") and got no avatar.
--
-- Only the display_name/avatar_url resolution changes; the rest of the function is
-- reproduced unchanged.

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
  avatar_url TEXT;
  starter_routine jsonb;
BEGIN
  is_admin := (lower(COALESCE(NEW.email, '')) = 'admin@creatives-takeover.com');

  -- Provider-agnostic: full_name (Google, X) -> name (LinkedIn OIDC, OIDC standard)
  -- -> given_name + family_name -> handle -> email prefix.
  display_name := COALESCE(
    NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(btrim(concat_ws(' ',
      NULLIF(btrim(NEW.raw_user_meta_data->>'given_name'), ''),
      NULLIF(btrim(NEW.raw_user_meta_data->>'family_name'), '')
    )), ''),
    NULLIF(btrim(NEW.raw_user_meta_data->>'user_name'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data->>'preferred_username'), ''),
    split_part(COALESCE(NEW.email, ''), '@', 1),
    'user'
  );

  avatar_url := COALESCE(
    NULLIF(btrim(NEW.raw_user_meta_data->>'avatar_url'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data->>'picture'), '')
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
      avatar_url,
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

-- Repair accounts already created with an email-prefix name / missing avatar.
-- Scoped to profiles whose name is still exactly the email prefix, so anything the
-- member edited themselves is left alone.
UPDATE public.profiles p
SET
  full_name = COALESCE(
    NULLIF(btrim(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(btrim(u.raw_user_meta_data->>'name'), ''),
    NULLIF(btrim(concat_ws(' ',
      NULLIF(btrim(u.raw_user_meta_data->>'given_name'), ''),
      NULLIF(btrim(u.raw_user_meta_data->>'family_name'), '')
    )), ''),
    p.full_name
  ),
  avatar_url = COALESCE(
    p.avatar_url,
    NULLIF(btrim(u.raw_user_meta_data->>'avatar_url'), ''),
    NULLIF(btrim(u.raw_user_meta_data->>'picture'), '')
  ),
  updated_at = now()
FROM auth.users u
WHERE u.id = p.id
  AND p.full_name = split_part(COALESCE(u.email, ''), '@', 1)
  AND COALESCE(
    NULLIF(btrim(u.raw_user_meta_data->>'name'), ''),
    NULLIF(btrim(concat_ws(' ',
      NULLIF(btrim(u.raw_user_meta_data->>'given_name'), ''),
      NULLIF(btrim(u.raw_user_meta_data->>'family_name'), '')
    )), '')
  ) IS NOT NULL;
