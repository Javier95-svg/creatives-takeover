-- Fix profile username generation so uppercase initials are preserved.
-- Root cause: previous logic stripped non-[a-z0-9] before lowercasing.
-- This migration normalizes first, then strips.

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.normalize_profile_part(v text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT regexp_replace(lower(unaccent(coalesce(v, ''))), '[^a-z0-9]', '', 'g');
$$;

CREATE OR REPLACE FUNCTION public.generate_profile_base_slug(full_name text, fallback_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  name_parts text[];
  first_name text;
  last_name text;
  base_slug text;
BEGIN
  base_slug := NULL;

  IF full_name IS NOT NULL AND btrim(full_name) <> '' THEN
    name_parts := regexp_split_to_array(btrim(full_name), '\s+');

    IF array_length(name_parts, 1) >= 2 THEN
      first_name := public.normalize_profile_part(name_parts[1]);
      last_name := public.normalize_profile_part(name_parts[array_length(name_parts, 1)]);
      base_slug := first_name || last_name;
    ELSIF array_length(name_parts, 1) = 1 THEN
      base_slug := public.normalize_profile_part(name_parts[1]);
    END IF;
  END IF;

  IF base_slug IS NULL OR base_slug = '' THEN
    base_slug := 'user' || substring(fallback_user_id::text FROM 1 FOR 8);
  END IF;

  RETURN base_slug;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  generated_username text;
  base_slug text;
  final_slug text;
  counter integer;
  is_admin boolean;
  admin_tier text;
  display_name text;
BEGIN
  is_admin := (lower(NEW.email) = 'admin@creatives-takeover.com');
  admin_tier := CASE WHEN is_admin THEN 'professional' ELSE 'free' END;

  display_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1));
  base_slug := public.generate_profile_base_slug(display_name, NEW.id);
  final_slug := base_slug;
  counter := 1;

  WHILE EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE lower(username) = lower(final_slug)
      AND id <> NEW.id
  ) LOOP
    final_slug := base_slug || counter::text;
    counter := counter + 1;
  END LOOP;

  generated_username := final_slug;

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
    subscription_tier = CASE WHEN is_admin THEN 'professional' ELSE public.profiles.subscription_tier END;

  IF is_admin THEN
    INSERT INTO public.user_credits (user_id, balance, subscription_tier, monthly_quota)
    VALUES (NEW.id, 5, 'professional', 5)
    ON CONFLICT (user_id) DO UPDATE SET
      subscription_tier = 'professional';

    INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier)
    VALUES (NEW.id, NEW.email, true, 'professional')
    ON CONFLICT (email) DO UPDATE SET
      subscribed = true,
      subscription_tier = 'professional';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.ensure_profile_username()
RETURNS TRIGGER AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer;
BEGIN
  IF NEW.username IS NULL OR NEW.username = '' OR btrim(NEW.username) = '' THEN
    base_slug := public.generate_profile_base_slug(NEW.full_name, NEW.id);
    final_slug := base_slug;
    counter := 1;

    WHILE EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE lower(username) = lower(final_slug)
        AND id <> NEW.id
    ) LOOP
      final_slug := base_slug || counter::text;
      counter := counter + 1;
    END LOOP;

    NEW.username := final_slug;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_profile_username_on_name_change()
RETURNS TRIGGER AS $$
DECLARE
  current_username text;
  old_expected_slug text;
  new_expected_slug text;
  base_slug text;
  final_slug text;
  counter integer;
BEGIN
  IF NEW.full_name IS DISTINCT FROM OLD.full_name
     AND NEW.full_name IS NOT NULL
     AND btrim(NEW.full_name) <> '' THEN

    current_username := COALESCE(NEW.username, OLD.username);
    old_expected_slug := public.generate_profile_base_slug(OLD.full_name, OLD.id);
    new_expected_slug := public.generate_profile_base_slug(NEW.full_name, NEW.id);

    IF current_username IS NULL OR btrim(current_username) = ''
       OR current_username ~ ('^' || old_expected_slug || '([0-9]+)?$') THEN
      base_slug := new_expected_slug;
      final_slug := base_slug;
      counter := 1;

      WHILE EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE lower(username) = lower(final_slug)
          AND id <> NEW.id
      ) LOOP
        final_slug := base_slug || counter::text;
        counter := counter + 1;
      END LOOP;

      NEW.username := final_slug;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_profile_username_trigger ON public.profiles;
CREATE TRIGGER update_profile_username_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.full_name IS DISTINCT FROM OLD.full_name)
  EXECUTE FUNCTION public.update_profile_username_on_name_change();

-- Backfill usernames that still match the legacy buggy base (e.g., "ikshit" vs "dikshit").
DO $$
DECLARE
  rec RECORD;
  candidate text;
  counter integer;
BEGIN
  FOR rec IN
    WITH base AS (
      SELECT
        p.id,
        p.username,
        regexp_split_to_array(btrim(coalesce(p.full_name, '')), '\s+') AS parts
      FROM public.profiles p
      WHERE p.full_name IS NOT NULL
        AND btrim(p.full_name) <> ''
        AND p.username IS NOT NULL
        AND btrim(p.username) <> ''
    ),
    calc AS (
      SELECT
        id,
        username,
        CASE
          WHEN array_length(parts, 1) >= 2 THEN
            lower(regexp_replace(parts[1], '[^a-z0-9]', '', 'g')) ||
            lower(regexp_replace(parts[array_length(parts, 1)], '[^a-z0-9]', '', 'g'))
          WHEN array_length(parts, 1) = 1 THEN
            lower(regexp_replace(parts[1], '[^a-z0-9]', '', 'g'))
          ELSE ''
        END AS legacy_buggy_base,
        CASE
          WHEN array_length(parts, 1) >= 2 THEN
            public.normalize_profile_part(parts[1]) ||
            public.normalize_profile_part(parts[array_length(parts, 1)])
          WHEN array_length(parts, 1) = 1 THEN
            public.normalize_profile_part(parts[1])
          ELSE ''
        END AS corrected_base
      FROM base
    )
    SELECT
      id,
      username,
      corrected_base
    FROM calc
    WHERE legacy_buggy_base <> ''
      AND corrected_base <> ''
      AND legacy_buggy_base <> corrected_base
      AND username ~ ('^' || legacy_buggy_base || '([0-9]+)?$')
  LOOP
    candidate := rec.corrected_base;
    counter := 1;

    WHILE EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE lower(p.username) = lower(candidate)
        AND p.id <> rec.id
    ) LOOP
      candidate := rec.corrected_base || counter::text;
      counter := counter + 1;
    END LOOP;

    UPDATE public.profiles
    SET username = candidate
    WHERE id = rec.id;

    RAISE NOTICE '[username-initial-fix] id=% old=% new=%', rec.id, rec.username, candidate;
  END LOOP;
END;
$$;
