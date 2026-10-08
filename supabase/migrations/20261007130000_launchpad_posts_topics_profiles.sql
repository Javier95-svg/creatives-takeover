-- Launchpad, phase 1: Posts, Topics and Profiles on the existing community
-- tables. community_posts, post_comments, user_votes, user_bookmarks and
-- user_topic_preferences already hold the feed; this adds topics, a project
-- snapshot, the author's stage, moderation, and closes three RLS gaps.

-- ---------------------------------------------------------------------------
-- Topics: a fixed, curated list. The app holds the copy and tool links; this
-- table only exists so a post or a follow cannot name a topic that is not there.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.launchpad_topics (
  slug text PRIMARY KEY CHECK (slug ~ '^[a-z0-9-]{2,40}$'),
  label text NOT NULL,
  sort_order smallint NOT NULL DEFAULT 0
);

INSERT INTO public.launchpad_topics (slug, label, sort_order) VALUES
  ('validation', 'Validation', 10),
  ('building', 'Building', 20),
  ('launch', 'Launch', 30),
  ('traction', 'Traction', 40),
  ('fundraising', 'Fundraising', 50),
  ('customers', 'Customers & ICP', 60),
  ('distribution', 'Distribution', 70),
  ('pricing', 'Pricing', 80),
  ('product', 'Product & UX', 90),
  ('tech-stack', 'Tech stack', 100),
  ('team', 'Co-founders & team', 110),
  ('founder-life', 'Founder life', 120)
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

ALTER TABLE public.launchpad_topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS launchpad_topics_read ON public.launchpad_topics;
CREATE POLICY launchpad_topics_read ON public.launchpad_topics FOR SELECT USING (true);

-- Topic follows. The table has never held a row, so the foreign key is safe.
ALTER TABLE public.user_topic_preferences
  DROP CONSTRAINT IF EXISTS user_topic_preferences_topic_fkey,
  ADD CONSTRAINT user_topic_preferences_topic_fkey
    FOREIGN KEY (topic) REFERENCES public.launchpad_topics(slug) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------------
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS topic text REFERENCES public.launchpad_topics(slug) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  -- projects rows are owner-only, so readers see this snapshot of the name.
  ADD COLUMN IF NOT EXISTS project_name text,
  -- The author's quiz stage, only when they chose to show it publicly.
  ADD COLUMN IF NOT EXISTS stage smallint CHECK (stage IS NULL OR stage BETWEEN 1 AND 7),
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

-- Launchpad post kinds join the legacy values, which stay valid for old rows.
ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS community_posts_post_type_social_layer_check;
ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS community_posts_post_type_check;
ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_post_type_check CHECK (
  post_type IS NULL OR post_type = ANY (ARRAY[
    'discussion', 'feedback', 'milestone', 'idea',
    'build_in_public', 'mindset', 'growth_marketing', 'fundraising_revenue', 'product_validation'
  ])
);

CREATE INDEX IF NOT EXISTS community_posts_topic_created_idx
  ON public.community_posts (topic, created_at DESC) WHERE hidden_at IS NULL;
CREATE INDEX IF NOT EXISTS community_posts_created_idx
  ON public.community_posts (created_at DESC) WHERE hidden_at IS NULL;

-- Server-owned columns. A client insert or update cannot set counters, the
-- moderation flag, the stage or the project snapshot; the vote and comment
-- triggers (nested, so pg_trigger_depth() > 1) and admins still can.
CREATE OR REPLACE FUNCTION public.launchpad_guard_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  author_prefs jsonb;
  author_stage smallint;
  recent_posts integer;
  is_admin boolean := public.has_role(auth.uid(), 'admin'::app_role);
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.upvotes := 0;
    NEW.downvotes := 0;
    NEW.comment_count := 0;
    NEW.hidden_at := NULL;

    IF NOT is_admin THEN
      SELECT count(*) INTO recent_posts
      FROM public.community_posts
      WHERE user_id = NEW.user_id AND created_at > now() - interval '24 hours';
      IF recent_posts >= 10 THEN
        RAISE EXCEPTION 'You can share up to 10 posts a day. Try again tomorrow.'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  ELSE
    NEW.user_id := OLD.user_id;
    NEW.upvotes := OLD.upvotes;
    NEW.downvotes := OLD.downvotes;
    NEW.comment_count := OLD.comment_count;
    IF NOT is_admin THEN
      NEW.hidden_at := OLD.hidden_at;
    END IF;
  END IF;

  -- Stage: copied from the author, and only when they publish it.
  SELECT p.user_preferences, p.assigned_stage INTO author_prefs, author_stage
  FROM public.profiles p WHERE p.id = NEW.user_id;
  NEW.stage := CASE
    WHEN COALESCE(author_prefs->>'public_stage_visible', 'false') = 'true' THEN author_stage
    ELSE NULL
  END;

  -- Project: only one the author owns, and readers get its name.
  IF NEW.project_id IS NULL THEN
    NEW.project_name := NULL;
  ELSE
    SELECT pr.title INTO NEW.project_name
    FROM public.projects pr
    WHERE pr.id = NEW.project_id AND pr.user_id = NEW.user_id AND pr.archived_at IS NULL;
    IF NEW.project_name IS NULL THEN
      RAISE EXCEPTION 'That project is not one of yours.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS launchpad_guard_post ON public.community_posts;
CREATE TRIGGER launchpad_guard_post
  BEFORE INSERT OR UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.launchpad_guard_post();

-- RLS. "Public can view community posts" used `true`, which overrode the
-- is_public check, and two policies were duplicated under different names.
DROP POLICY IF EXISTS "Public can view community posts" ON public.community_posts;
DROP POLICY IF EXISTS "Public community posts are viewable" ON public.community_posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Authenticated users can create community posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Authors can update own community posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Authors can delete own community posts" ON public.community_posts;
DROP POLICY IF EXISTS community_posts_read ON public.community_posts;
DROP POLICY IF EXISTS community_posts_insert ON public.community_posts;
DROP POLICY IF EXISTS community_posts_update ON public.community_posts;
DROP POLICY IF EXISTS community_posts_delete ON public.community_posts;

-- Public profiles still list a founder's public posts to visitors, so anon
-- keeps read access to public, unhidden rows. Launchpad itself is signed-in.
CREATE POLICY community_posts_read ON public.community_posts FOR SELECT TO anon, authenticated
  USING (
    (is_public = true AND hidden_at IS NULL)
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY community_posts_insert ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY community_posts_update ON public.community_posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY community_posts_delete ON public.community_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

-- Comments: hide the moderated ones and the ones under a hidden post.
DROP POLICY IF EXISTS "Public can view comments" ON public.post_comments;
DROP POLICY IF EXISTS post_comments_read ON public.post_comments;
CREATE POLICY post_comments_read ON public.post_comments FOR SELECT TO anon, authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      hidden_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.community_posts cp
        WHERE cp.id = post_comments.post_id AND cp.is_public = true AND cp.hidden_at IS NULL
      )
    )
  );

-- The update policy had no WITH CHECK, so a comment could be moved to another
-- author. Pin user_id and hidden_at the same way as posts.
DROP POLICY IF EXISTS "Users can update their own comments" ON public.post_comments;
DROP POLICY IF EXISTS post_comments_update ON public.post_comments;
CREATE POLICY post_comments_update ON public.post_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.launchpad_guard_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.upvotes := 0;
    NEW.downvotes := 0;
    NEW.hidden_at := NULL;
  ELSE
    NEW.user_id := OLD.user_id;
    NEW.post_id := OLD.post_id;
    NEW.upvotes := OLD.upvotes;
    NEW.downvotes := OLD.downvotes;
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      NEW.hidden_at := OLD.hidden_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS launchpad_guard_comment ON public.post_comments;
CREATE TRIGGER launchpad_guard_comment
  BEFORE INSERT OR UPDATE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.launchpad_guard_comment();

-- Votes: "manage their own votes" had no WITH CHECK, so a row could be
-- inserted under someone else's user_id.
DROP POLICY IF EXISTS "Users can manage their own votes" ON public.user_votes;
DROP POLICY IF EXISTS user_votes_own ON public.user_votes;
CREATE POLICY user_votes_own ON public.user_votes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own bookmarks" ON public.user_bookmarks;
DROP POLICY IF EXISTS user_bookmarks_own ON public.user_bookmarks;
CREATE POLICY user_bookmarks_own ON public.user_bookmarks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Admin thread alerts used to open the retired progress feed.
CREATE OR REPLACE FUNCTION public.notify_admins_of_new_community_thread()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recipient RECORD;
  thread_title text;
BEGIN
  thread_title := COALESCE(NULLIF(btrim(NEW.title), ''), 'Untitled thread');

  FOR recipient IN
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'admin'
      AND ur.user_id IS DISTINCT FROM NEW.user_id
  LOOP
    INSERT INTO public.community_notifications (
      user_id, actor_id, notification_type, post_id, read, metadata
    )
    VALUES (
      recipient.user_id,
      NEW.user_id,
      'community_thread_awaiting_reply',
      NEW.id,
      false,
      jsonb_build_object(
        'message', 'New Launchpad post needs a reply within 24h: ' || thread_title,
        'route', '/launchpad/posts/' || NEW.id,
        'topic', NEW.topic,
        'postId', NEW.id
      )
    );
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'notify_admins_of_new_community_thread failed for post %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Reports. Three open reports from different people hide the item until an
-- admin looks, so nobody has to watch the feed around the clock.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category = ANY (ARRAY['spam', 'harassment', 'misleading_information', 'inappropriate_content', 'other'])),
  explanation text CHECK (explanation IS NULL OR char_length(explanation) <= 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status = ANY (ARRAY['open', 'resolved', 'dismissed'])),
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((post_id IS NOT NULL) <> (comment_id IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS community_reports_one_per_post
  ON public.community_reports (reporter_id, post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS community_reports_one_per_comment
  ON public.community_reports (reporter_id, comment_id) WHERE comment_id IS NOT NULL;

ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS community_reports_insert ON public.community_reports;
DROP POLICY IF EXISTS community_reports_read ON public.community_reports;
DROP POLICY IF EXISTS community_reports_admin_update ON public.community_reports;
CREATE POLICY community_reports_insert ON public.community_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND status = 'open');
CREATE POLICY community_reports_read ON public.community_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY community_reports_admin_update ON public.community_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.launchpad_handle_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  open_reports integer;
  author uuid;
  recipient RECORD;
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    SELECT user_id INTO author FROM public.community_posts WHERE id = NEW.post_id;
  ELSE
    SELECT user_id INTO author FROM public.post_comments WHERE id = NEW.comment_id;
  END IF;
  IF author = NEW.reporter_id THEN
    RAISE EXCEPTION 'You cannot report your own post.' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.post_id IS NOT NULL THEN
    SELECT count(DISTINCT reporter_id) INTO open_reports
    FROM public.community_reports WHERE post_id = NEW.post_id AND status = 'open';
    IF open_reports >= 3 THEN
      UPDATE public.community_posts SET hidden_at = COALESCE(hidden_at, now()) WHERE id = NEW.post_id;
    END IF;
  ELSE
    SELECT count(DISTINCT reporter_id) INTO open_reports
    FROM public.community_reports WHERE comment_id = NEW.comment_id AND status = 'open';
    IF open_reports >= 3 THEN
      UPDATE public.post_comments SET hidden_at = COALESCE(hidden_at, now()) WHERE id = NEW.comment_id;
    END IF;
  END IF;

  FOR recipient IN SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin' LOOP
    INSERT INTO public.community_notifications (user_id, actor_id, notification_type, post_id, comment_id, read, metadata)
    VALUES (
      recipient.user_id, NEW.reporter_id, 'community_report', NEW.post_id, NEW.comment_id, false,
      jsonb_build_object(
        'message', 'A Launchpad ' || CASE WHEN NEW.post_id IS NULL THEN 'comment' ELSE 'post' END
          || ' was reported for ' || replace(NEW.category, '_', ' ')
          || CASE WHEN open_reports >= 3 THEN ' and is now hidden' ELSE '' END,
        'route', '/launchpad/posts/' || COALESCE(NEW.post_id, (SELECT post_id FROM public.post_comments WHERE id = NEW.comment_id))
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS launchpad_handle_report ON public.community_reports;
CREATE TRIGGER launchpad_handle_report
  AFTER INSERT ON public.community_reports
  FOR EACH ROW EXECUTE FUNCTION public.launchpad_handle_report();

-- ---------------------------------------------------------------------------
-- Read models
-- ---------------------------------------------------------------------------

-- Post and follower counts per topic. Follows are owner-only rows, so this
-- returns counts and never who follows.
CREATE OR REPLACE FUNCTION public.launchpad_topic_stats()
RETURNS TABLE (slug text, post_count bigint, follower_count bigint, last_post_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT t.slug,
    (SELECT count(*) FROM public.community_posts p WHERE p.topic = t.slug AND p.is_public AND p.hidden_at IS NULL),
    (SELECT count(*) FROM public.user_topic_preferences f WHERE f.topic = t.slug),
    (SELECT max(p.created_at) FROM public.community_posts p WHERE p.topic = t.slug AND p.is_public AND p.hidden_at IS NULL)
  FROM public.launchpad_topics t
  ORDER BY t.sort_order;
$function$;

REVOKE ALL ON FUNCTION public.launchpad_topic_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.launchpad_topic_stats() TO authenticated;

-- The Profiles directory. public_profiles exposes assigned_stage to everyone,
-- but a founder's stage is private unless they opted in, so the directory reads
-- through here and only returns the stage when it is meant to be public.
CREATE OR REPLACE FUNCTION public.launchpad_profiles(
  p_search text DEFAULT NULL,
  p_user_type text DEFAULT NULL,
  p_stage smallint DEFAULT NULL,
  p_sector text DEFAULT NULL,
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  avatar_url text,
  positioning_line text,
  startup_name text,
  startup_tagline text,
  startup_industry text[],
  location text,
  user_type text,
  stage smallint,
  followers_count integer,
  post_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH visible AS (
    SELECT p.*,
      CASE WHEN COALESCE(p.user_preferences->>'public_stage_visible', 'false') = 'true'
        THEN p.assigned_stage::smallint END AS public_stage
    FROM public.profiles p
    WHERE p.username IS NOT NULL
      AND btrim(p.username) <> ''
      AND COALESCE(p.onboarding_completed, false)
  )
  SELECT v.id, v.username, v.full_name, v.avatar_url, v.positioning_line,
    v.startup_name, v.startup_tagline, v.startup_industry, v.location, v.user_type,
    v.public_stage, COALESCE(v.followers_count, 0)::integer,
    (SELECT count(*) FROM public.community_posts cp WHERE cp.user_id = v.id AND cp.is_public AND cp.hidden_at IS NULL)
  FROM visible v
  WHERE (p_search IS NULL OR btrim(p_search) = '' OR
      v.full_name ILIKE '%' || btrim(p_search) || '%' OR
      v.username ILIKE '%' || btrim(p_search) || '%' OR
      v.startup_name ILIKE '%' || btrim(p_search) || '%')
    AND (p_user_type IS NULL OR v.user_type = p_user_type)
    AND (p_stage IS NULL OR v.public_stage = p_stage)
    AND (p_sector IS NULL OR p_sector = ANY (v.startup_industry))
  ORDER BY
    (v.id = auth.uid()) DESC,
    (v.startup_name IS NOT NULL OR v.positioning_line IS NOT NULL) DESC,
    COALESCE(v.followers_count, 0) DESC,
    v.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 60)
  OFFSET GREATEST(p_offset, 0);
$function$;

REVOKE ALL ON FUNCTION public.launchpad_profiles(text, text, smallint, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.launchpad_profiles(text, text, smallint, text, integer, integer) TO authenticated;
