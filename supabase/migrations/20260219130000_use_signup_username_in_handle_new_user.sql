-- Honor explicit signup username when provided in auth user metadata.
-- Falls back to name-based generation when username is missing/invalid.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  generated_username TEXT;
  preferred_username TEXT;
  name_parts TEXT[];
  first_name TEXT;
  last_name TEXT;
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
  is_admin BOOLEAN;
  admin_tier TEXT;
  display_name TEXT;
BEGIN
  is_admin := (lower(COALESCE(NEW.email, '')) = 'admin@creatives-takeover.com');
  admin_tier := CASE WHEN is_admin THEN 'professional' ELSE 'free' END;

  display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    split_part(COALESCE(NEW.email, ''), '@', 1),
    'user'
  );

  preferred_username := lower(COALESCE(NEW.raw_user_meta_data->>'username', ''));
  preferred_username := regexp_replace(preferred_username, '\s+', '', 'g');
  preferred_username := regexp_replace(preferred_username, '[^a-z0-9_]', '', 'g');
  preferred_username := regexp_replace(preferred_username, '^_+|_+$', '', 'g');

  IF char_length(preferred_username) > 30 THEN
    preferred_username := substring(preferred_username FROM 1 FOR 30);
  END IF;

  IF preferred_username = '' OR char_length(preferred_username) < 3 THEN
    preferred_username := NULL;
  END IF;

  -- Prefer explicit signup username first.
  base_slug := preferred_username;

  -- Fallback to display name when no explicit username was provided.
  IF base_slug IS NULL OR base_slug = '' THEN
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
  END IF;

  IF base_slug IS NULL OR base_slug = '' THEN
    base_slug := 'user' || substring(NEW.id::TEXT FROM 1 FOR 8);
  END IF;

  final_slug := base_slug;
  WHILE EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(username) = lower(final_slug)
      AND id <> NEW.id
  ) LOOP
    final_slug := base_slug || counter::TEXT;
    counter := counter + 1;
  END LOOP;
  generated_username := final_slug;

  BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, username, subscription_tier)
    VALUES (
      NEW.id,
      display_name,
      NEW.raw_user_meta_data->>'avatar_url',
      generated_username,
      admin_tier
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
      username = COALESCE(public.profiles.username, EXCLUDED.username),
      subscription_tier = CASE
        WHEN is_admin THEN 'professional'
        ELSE public.profiles.subscription_tier
      END;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.signup_trigger_failures (
      user_id, email, error_code, error_message, raw_user_meta_data, context
    )
    VALUES (
      NEW.id,
      NEW.email,
      SQLSTATE,
      SQLERRM,
      NEW.raw_user_meta_data,
      jsonb_build_object('stage', 'profiles_upsert')
    );

    RAISE LOG '[SIGNUP_TRIGGER] profiles upsert failed user_id=% email=% code=% msg=%',
      NEW.id, NEW.email, SQLSTATE, SQLERRM;
    RETURN NEW;
  END;

  IF is_admin THEN
    BEGIN
      INSERT INTO public.user_credits (user_id, balance, subscription_tier, monthly_quota)
      VALUES (NEW.id, 5, 'professional', 5)
      ON CONFLICT (user_id) DO UPDATE
      SET subscription_tier = 'professional';

      INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier)
      VALUES (NEW.id, NEW.email, true, 'professional')
      ON CONFLICT (email) DO UPDATE
      SET subscribed = true,
          subscription_tier = 'professional';
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.signup_trigger_failures (
        user_id, email, error_code, error_message, raw_user_meta_data, context
      )
      VALUES (
        NEW.id,
        NEW.email,
        SQLSTATE,
        SQLERRM,
        NEW.raw_user_meta_data,
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
  )
  VALUES (
    NEW.id,
    NEW.email,
    SQLSTATE,
    SQLERRM,
    NEW.raw_user_meta_data,
    jsonb_build_object('stage', 'handle_new_user_unhandled')
  );

  RAISE LOG '[SIGNUP_TRIGGER] unhandled failure user_id=% email=% code=% msg=%',
    NEW.id, NEW.email, SQLSTATE, SQLERRM;
  RETURN NEW;
END;
$$;
