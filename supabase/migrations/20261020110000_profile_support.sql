-- "How you can support me" on founder and builder profiles.
--
-- Every founder and builder profile shows the section. By default it offers
-- feedback and sharing (plus "try it" when the founder has a published launch
-- page); the founder can pick other asks, add a note, and add one support link.
--
-- Money never passes through Creatives Takeover. The support link points to
-- the founder's own page on an allowlisted provider, and it only shows while
-- the founder keeps posting: a journey update in the last 30 days and an
-- active project (earn-to-ask). Three reports from different people hide a
-- link until an admin looks at it.

-- One allowlist, used by the table constraint and by the public read. The
-- client mirrors it in src/lib/supportLinks.ts.
CREATE OR REPLACE FUNCTION public.support_link_provider(p_url text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $function$
  SELECT CASE
    WHEN p_url IS NULL OR p_url ~ '\s' OR char_length(p_url) > 300 THEN NULL
    WHEN p_url ~* '^https://(www\.)?buymeacoffee\.com/[^/?#]' THEN 'Buy Me a Coffee'
    WHEN p_url ~* '^https://(www\.)?ko-fi\.com/[^/?#]' THEN 'Ko-fi'
    WHEN p_url ~* '^https://(www\.)?patreon\.com/[^/?#]' THEN 'Patreon'
    WHEN p_url ~* '^https://(buy|donate)\.stripe\.com/[^/?#]' THEN 'Stripe'
    WHEN p_url ~* '^https://(www\.)?paypal\.me/[^/?#]' THEN 'PayPal'
    WHEN p_url ~* '^https://(www\.)?github\.com/sponsors/[^/?#]' THEN 'GitHub Sponsors'
    WHEN p_url ~* '^https://(www\.)?opencollective\.com/[^/?#]' THEN 'Open Collective'
  END
$function$;

CREATE TABLE IF NOT EXISTS public.profile_support (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  asks text[] NOT NULL DEFAULT ARRAY['feedback', 'share']::text[]
    CHECK (asks <@ ARRAY['feedback', 'testers', 'intros', 'try', 'share']::text[]),
  note text CHECK (note IS NULL OR char_length(note) <= 280),
  intro_target text CHECK (intro_target IS NULL OR char_length(intro_target) <= 80),
  pays_for text CHECK (pays_for IS NULL OR char_length(pays_for) <= 140),
  support_url text CHECK (support_url IS NULL OR public.support_link_provider(support_url) IS NOT NULL),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_support ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profile_support_owner_read ON public.profile_support;
DROP POLICY IF EXISTS profile_support_owner_insert ON public.profile_support;
DROP POLICY IF EXISTS profile_support_owner_update ON public.profile_support;
DROP POLICY IF EXISTS profile_support_owner_delete ON public.profile_support;
CREATE POLICY profile_support_owner_read ON public.profile_support FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY profile_support_owner_insert ON public.profile_support FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY profile_support_owner_update ON public.profile_support FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY profile_support_owner_delete ON public.profile_support FOR DELETE TO authenticated
  USING (user_id = auth.uid());
REVOKE ALL ON TABLE public.profile_support FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profile_support TO authenticated;

-- Reports against the link a visitor saw. Written only through the function
-- below, so a report always names the profile's current link.
CREATE TABLE IF NOT EXISTS public.profile_support_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  support_url text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'dismissed', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, reporter_id, support_url)
);

ALTER TABLE public.profile_support_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profile_support_reports_read ON public.profile_support_reports;
DROP POLICY IF EXISTS profile_support_reports_admin_update ON public.profile_support_reports;
CREATE POLICY profile_support_reports_read ON public.profile_support_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY profile_support_reports_admin_update ON public.profile_support_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
REVOKE ALL ON TABLE public.profile_support_reports FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON TABLE public.profile_support_reports TO authenticated;

-- What a profile shows in "How you can support me". Visitors get the support
-- link only while it is live; the owner also gets it when it is not, with the
-- reason, so the profile can tell them how to bring it back.
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
  IF p_username IS NULL OR btrim(p_username) = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles p
  WHERE lower(p.username) = lower(btrim(p_username))
  ORDER BY p.username = btrim(p_username) DESC
  LIMIT 1;

  -- Founders and builders only: asking for support does not fit a mentor,
  -- service provider or investor profile.
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
    'last_update_at', v_last_update,
    'launch_slug', v_launch_slug,
    'link_status', CASE WHEN v_is_owner OR v_status = 'live' THEN v_status ELSE 'none' END,
    'support_url', CASE WHEN v_is_owner OR v_status = 'live' THEN v_support.support_url END,
    'support_provider', CASE WHEN v_is_owner OR v_status = 'live' THEN public.support_link_provider(v_support.support_url) END
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.public_profile_support_v1(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_profile_support_v1(text) TO anon, authenticated;

-- A signed-in visitor reports the support link they were shown. Admins get a
-- notification; three open reports from different people hide the link.
CREATE OR REPLACE FUNCTION public.report_profile_support_link_v1(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_reporter uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_url text;
  v_reports integer;
  v_recipient record;
BEGIN
  IF v_reporter IS NULL THEN
    RAISE EXCEPTION 'Sign in to report a link.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_profile FROM public.profiles p WHERE lower(p.username) = lower(btrim(p_username)) LIMIT 1;
  IF v_profile.id IS NULL THEN
    RETURN false;
  END IF;
  IF v_profile.id = v_reporter THEN
    RAISE EXCEPTION 'You cannot report your own link.' USING ERRCODE = 'P0001';
  END IF;

  SELECT s.support_url INTO v_url FROM public.profile_support s WHERE s.user_id = v_profile.id;
  IF v_url IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.profile_support_reports (profile_id, reporter_id, support_url)
  VALUES (v_profile.id, v_reporter, v_url)
  ON CONFLICT (profile_id, reporter_id, support_url) DO NOTHING;

  SELECT count(DISTINCT r.reporter_id) INTO v_reports
  FROM public.profile_support_reports r
  WHERE r.profile_id = v_profile.id AND r.support_url = v_url AND r.status = 'open';

  FOR v_recipient IN SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin' LOOP
    INSERT INTO public.community_notifications (user_id, actor_id, notification_type, read, metadata)
    VALUES (
      v_recipient.user_id, v_reporter, 'community_report', false,
      jsonb_build_object(
        'message', 'A support link on a founder profile was reported'
          || CASE WHEN v_reports >= 3 THEN ' and is now hidden' ELSE '' END,
        'route', '/profile/' || v_profile.username
      )
    );
  END LOOP;

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.report_profile_support_link_v1(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_profile_support_link_v1(text) TO authenticated;

COMMENT ON TABLE public.profile_support IS
  'Owner-written settings for "How you can support me" on founder and builder profiles. Read publicly only through public_profile_support_v1().';
COMMENT ON FUNCTION public.public_profile_support_v1(text) IS
  'Public "How you can support me" section: asks, note and, while live (project + journey update in 30 days + under 3 reports), the support link.';
