-- A founder's configured support link should not depend on recent activity or
-- a platform-specific project row. Keep three independent reports as the
-- safety threshold, and retain recency as context for the profile owner.
ALTER TABLE public.profile_support
  ADD COLUMN IF NOT EXISTS funding_type text NOT NULL DEFAULT 'provider_options'
    CHECK (funding_type IN ('provider_options', 'one_time', 'recurring', 'both'));

CREATE OR REPLACE FUNCTION public.public_profile_support_v1(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_support public.profile_support%ROWTYPE;
  v_is_owner boolean;
  v_last_update timestamptz;
  v_has_project boolean;
  v_launch_slug text;
  v_reports integer := 0;
  v_status text;
  v_asks text[];
BEGIN
  IF p_username IS NULL OR btrim(p_username) = '' THEN RETURN NULL; END IF;

  SELECT * INTO v_profile
  FROM public.profiles p
  WHERE lower(p.username) = lower(btrim(p_username))
  ORDER BY p.username = btrim(p_username) DESC
  LIMIT 1;

  IF v_profile.id IS NULL OR COALESCE(v_profile.user_type, 'founder') NOT IN ('founder', 'builder') THEN
    RETURN NULL;
  END IF;

  v_is_owner := v_profile.id = auth.uid();
  SELECT * INTO v_support FROM public.profile_support s WHERE s.user_id = v_profile.id;

  SELECT max(pp.publish_at) INTO v_last_update
  FROM public.profile_posts pp
  WHERE pp.user_id = v_profile.id AND pp.publish_at <= now();

  SELECT EXISTS (
    SELECT 1 FROM public.projects pr WHERE pr.user_id = v_profile.id AND pr.archived_at IS NULL
  ) INTO v_has_project;

  SELECT d.slug INTO v_launch_slug
  FROM public.demo_studio_projects d
  WHERE d.owner_id = v_profile.id AND d.launch_published AND d.superseded_at IS NULL AND d.slug IS NOT NULL
  ORDER BY d.updated_at DESC
  LIMIT 1;

  IF v_support.support_url IS NOT NULL THEN
    SELECT count(DISTINCT r.reporter_id) INTO v_reports
    FROM public.profile_support_reports r
    WHERE r.profile_id = v_profile.id AND r.support_url = v_support.support_url AND r.status = 'open';
  END IF;

  v_status := CASE
    WHEN v_support.support_url IS NULL OR public.support_link_provider(v_support.support_url) IS NULL THEN 'none'
    WHEN v_reports >= 3 THEN 'reported'
    WHEN NOT v_has_project THEN 'no_project'
    WHEN v_last_update IS NULL OR v_last_update < now() - interval '30 days' THEN 'stale'
    ELSE 'live'
  END;

  v_asks := COALESCE(
    v_support.asks,
    CASE WHEN v_launch_slug IS NOT NULL THEN ARRAY['feedback', 'try', 'share'] ELSE ARRAY['feedback', 'share'] END
  );

  RETURN jsonb_build_object(
    'configured', v_support.user_id IS NOT NULL,
    'asks', to_jsonb(v_asks),
    'note', v_support.note,
    'intro_target', v_support.intro_target,
    'pays_for', v_support.pays_for,
    'funding_type', COALESCE(v_support.funding_type, 'provider_options'),
    'last_update_at', v_last_update,
    'launch_slug', v_launch_slug,
    'link_status', CASE WHEN v_is_owner THEN v_status WHEN v_status = 'reported' THEN 'reported' ELSE CASE WHEN v_status = 'none' THEN 'none' ELSE 'live' END END,
    'support_url', CASE WHEN v_status <> 'reported' THEN v_support.support_url END,
    'support_provider', CASE WHEN v_status <> 'reported' THEN public.support_link_provider(v_support.support_url) END
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.public_profile_support_v1(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_profile_support_v1(text) TO anon, authenticated;

COMMENT ON FUNCTION public.public_profile_support_v1(text) IS
  'Public support asks and founder-owned support link. A configured valid link is visible until three distinct visitors report it; update recency is provided as context, not a visibility gate.';
