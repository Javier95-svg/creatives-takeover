-- Launchpad, phase 2: weekly launch rounds.
--
-- A launch is a published Demo Studio launch page entered into a round. Rounds
-- are calendar weeks starting Monday 00:00 UTC, computed rather than stored, so
-- nothing has to create next week's round. Upvotes count only while the round
-- is open, and supporters earn a small, capped credit reward for backing other
-- founders' launches.

CREATE OR REPLACE FUNCTION public.launchpad_current_week()
RETURNS date
LANGUAGE sql
STABLE
AS $function$
  SELECT date_trunc('week', now() AT TIME ZONE 'UTC')::date;
$function$;

CREATE TABLE IF NOT EXISTS public.launchpad_launches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_project_id uuid NOT NULL UNIQUE REFERENCES public.demo_studio_projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL CHECK (extract(isodow FROM week_start) = 1),
  upvotes integer NOT NULL DEFAULT 0,
  hidden_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS launchpad_launches_week_idx
  ON public.launchpad_launches (week_start, upvotes DESC, created_at);
CREATE INDEX IF NOT EXISTS launchpad_launches_owner_idx
  ON public.launchpad_launches (owner_id, week_start);

CREATE TABLE IF NOT EXISTS public.launchpad_launch_votes (
  launch_id uuid NOT NULL REFERENCES public.launchpad_launches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (launch_id, user_id)
);

CREATE INDEX IF NOT EXISTS launchpad_launch_votes_user_idx
  ON public.launchpad_launch_votes (user_id, created_at DESC);

-- One reward per supporter per product, ever. Keyed on the Demo Studio project
-- rather than the launch, so removing and re-adding an upvote, or a launch
-- being withdrawn and entered again, never pays twice.
CREATE TABLE IF NOT EXISTS public.launchpad_supporter_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  demo_project_id uuid NOT NULL REFERENCES public.demo_studio_projects(id) ON DELETE CASCADE,
  launch_id uuid,
  week_start date NOT NULL,
  credits integer NOT NULL CHECK (credits > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, demo_project_id)
);

CREATE INDEX IF NOT EXISTS launchpad_supporter_rewards_week_idx
  ON public.launchpad_supporter_rewards (user_id, week_start);

-- Reads go through the functions below; writes only through the RPCs. Owners
-- may withdraw their own launch.
ALTER TABLE public.launchpad_launches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launchpad_launch_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launchpad_supporter_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS launchpad_launches_read ON public.launchpad_launches;
DROP POLICY IF EXISTS launchpad_launches_owner_delete ON public.launchpad_launches;
DROP POLICY IF EXISTS launchpad_launches_admin_update ON public.launchpad_launches;
CREATE POLICY launchpad_launches_read ON public.launchpad_launches FOR SELECT TO authenticated
  USING (hidden_at IS NULL OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY launchpad_launches_owner_delete ON public.launchpad_launches FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY launchpad_launches_admin_update ON public.launchpad_launches FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS launchpad_launch_votes_own_read ON public.launchpad_launch_votes;
CREATE POLICY launchpad_launch_votes_own_read ON public.launchpad_launch_votes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS launchpad_supporter_rewards_own_read ON public.launchpad_supporter_rewards;
CREATE POLICY launchpad_supporter_rewards_own_read ON public.launchpad_supporter_rewards FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Enter a published launch page into this week's round.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.launchpad_enter_launch(p_demo_project_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  me uuid := auth.uid();
  project public.demo_studio_projects;
  week date := public.launchpad_current_week();
  new_id uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in to enter a launch.' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO project FROM public.demo_studio_projects WHERE id = p_demo_project_id;
  IF NOT FOUND OR project.owner_id <> me THEN
    RAISE EXCEPTION 'That launch page is not one of yours.' USING ERRCODE = 'P0001';
  END IF;
  IF NOT project.launch_published OR project.slug IS NULL OR project.superseded_at IS NOT NULL THEN
    RAISE EXCEPTION 'Publish the launch page in Demo Studio first.' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.launchpad_launches WHERE demo_project_id = p_demo_project_id) THEN
    RAISE EXCEPTION 'This launch page has already been entered in a round.' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.launchpad_launches WHERE owner_id = me AND week_start = week) THEN
    RAISE EXCEPTION 'You already have a launch in this week''s round. Enter the next one on Monday.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.launchpad_launches (demo_project_id, owner_id, week_start)
  VALUES (p_demo_project_id, me, week)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Upvote or withdraw an upvote. Pays the supporter on a first upvote, within
-- a weekly cap, from accounts old enough not to be throwaways.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.launchpad_toggle_launch_vote(p_launch_id uuid, p_on boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  me uuid := auth.uid();
  launch public.launchpad_launches;
  week date := public.launchpad_current_week();
  inserted integer := 0;
  credited integer := 0;
  weekly_cap constant integer := 5;
  earned_this_week integer;
  account_ok boolean;
  total integer;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Sign in to upvote.' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO launch FROM public.launchpad_launches WHERE id = p_launch_id FOR UPDATE;
  IF NOT FOUND OR launch.hidden_at IS NOT NULL THEN
    RAISE EXCEPTION 'This launch is no longer available.' USING ERRCODE = 'P0001';
  END IF;
  IF launch.owner_id = me THEN
    RAISE EXCEPTION 'You cannot upvote your own launch.' USING ERRCODE = 'P0001';
  END IF;
  IF launch.week_start <> week THEN
    RAISE EXCEPTION 'Voting for this round has closed.' USING ERRCODE = 'P0001';
  END IF;

  IF p_on THEN
    INSERT INTO public.launchpad_launch_votes (launch_id, user_id)
    VALUES (p_launch_id, me)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS inserted = ROW_COUNT;
  ELSE
    DELETE FROM public.launchpad_launch_votes WHERE launch_id = p_launch_id AND user_id = me;
  END IF;

  SELECT count(*) INTO total FROM public.launchpad_launch_votes WHERE launch_id = p_launch_id;
  UPDATE public.launchpad_launches SET upvotes = total WHERE id = p_launch_id;

  IF inserted = 1 AND NOT EXISTS (
    SELECT 1 FROM public.launchpad_supporter_rewards WHERE user_id = me AND demo_project_id = launch.demo_project_id
  ) THEN
    SELECT count(*) INTO earned_this_week
    FROM public.launchpad_supporter_rewards WHERE user_id = me AND week_start = week;

    SELECT u.email_confirmed_at IS NOT NULL AND u.created_at <= now() - interval '7 days'
    INTO account_ok FROM auth.users u WHERE u.id = me;

    IF earned_this_week < weekly_cap AND COALESCE(account_ok, false) THEN
      UPDATE public.user_credits SET balance = balance + 1, updated_at = now() WHERE user_id = me;
      -- No wallet means no reward; the upvote itself still counts.
      IF FOUND THEN
        INSERT INTO public.launchpad_supporter_rewards (user_id, demo_project_id, launch_id, week_start, credits)
        VALUES (me, launch.demo_project_id, p_launch_id, week, 1);
        INSERT INTO public.credit_transactions (user_id, amount, tx_type, reason, feature, metadata)
        VALUES (me, 1, 'grant', 'Supported a Launchpad launch', 'Launchpad',
          jsonb_build_object('launchId', p_launch_id, 'weekStart', week, 'idempotencyKey', 'launchpad-support:' || me || ':' || launch.demo_project_id));
        credited := 1;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('upvotes', total, 'voted', p_on, 'credited', credited);
END;
$function$;

-- ---------------------------------------------------------------------------
-- A round, ranked. Only launches whose page is still published appear, and a
-- maker's stage only when they made it public.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.launchpad_round(
  p_week date DEFAULT NULL,
  p_sort text DEFAULT 'popular',
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  week_start date,
  rank integer,
  upvotes integer,
  created_at timestamptz,
  slug text,
  name text,
  tagline text,
  logo_url text,
  category text,
  headline text,
  maker_id uuid,
  maker_username text,
  maker_name text,
  maker_avatar text,
  maker_stage smallint,
  voted boolean,
  is_mine boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH round AS (
    SELECT l.*,
      rank() OVER (ORDER BY l.upvotes DESC, l.created_at ASC)::integer AS round_rank
    FROM public.launchpad_launches l
    JOIN public.demo_studio_projects dp ON dp.id = l.demo_project_id
    WHERE l.week_start = COALESCE(p_week, public.launchpad_current_week())
      AND dp.launch_published AND dp.superseded_at IS NULL AND dp.slug IS NOT NULL
      AND (l.hidden_at IS NULL OR l.owner_id = auth.uid())
  )
  SELECT r.id, r.week_start, r.round_rank, r.upvotes, r.created_at,
    dp.slug, dp.name, dp.tagline, dp.logo_url, dp.category,
    (SELECT lp.headline FROM public.demo_studio_launch_pages lp WHERE lp.project_id = dp.id ORDER BY lp.updated_at DESC LIMIT 1),
    r.owner_id, pr.username, pr.full_name, pr.avatar_url,
    CASE WHEN COALESCE(pr.user_preferences->>'public_stage_visible', 'false') = 'true' THEN pr.assigned_stage::smallint END,
    EXISTS (SELECT 1 FROM public.launchpad_launch_votes v WHERE v.launch_id = r.id AND v.user_id = auth.uid()),
    r.owner_id = auth.uid()
  FROM round r
  JOIN public.demo_studio_projects dp ON dp.id = r.demo_project_id
  LEFT JOIN public.profiles pr ON pr.id = r.owner_id
  ORDER BY
    CASE WHEN p_sort = 'latest' THEN extract(epoch FROM r.created_at) ELSE NULL END DESC NULLS LAST,
    r.round_rank ASC
  LIMIT LEAST(GREATEST(p_limit, 1), 100);
$function$;

-- What the supporter has earned this week, so the page can say so plainly.
CREATE OR REPLACE FUNCTION public.launchpad_supporter_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'earnedThisWeek', (SELECT COALESCE(sum(credits), 0) FROM public.launchpad_supporter_rewards
      WHERE user_id = auth.uid() AND week_start = public.launchpad_current_week()),
    'weeklyCap', 5,
    'eligible', COALESCE((SELECT u.email_confirmed_at IS NOT NULL AND u.created_at <= now() - interval '7 days'
      FROM auth.users u WHERE u.id = auth.uid()), false),
    'weekStart', public.launchpad_current_week()
  );
$function$;

REVOKE ALL ON FUNCTION public.launchpad_enter_launch(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.launchpad_toggle_launch_vote(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.launchpad_round(date, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.launchpad_supporter_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.launchpad_enter_launch(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.launchpad_toggle_launch_vote(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.launchpad_round(date, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.launchpad_supporter_status() TO authenticated;
