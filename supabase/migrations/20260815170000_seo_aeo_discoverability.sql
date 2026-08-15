-- Quality-gated search indexing for public founder profiles and published MVPs.
-- Owners may request indexing, but only the service role or platform admin may
-- approve it. Public APIs consume the derived eligibility result, never the
-- owner-controlled request flag by itself.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS search_indexing_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS search_indexing_review_status text NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS search_indexing_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS search_indexing_reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_search_indexing_review_status_check,
  ADD CONSTRAINT profiles_search_indexing_review_status_check
    CHECK (search_indexing_review_status IN ('not_requested', 'pending', 'approved', 'rejected'));

ALTER TABLE public.mvp_projects
  ADD COLUMN IF NOT EXISTS search_indexing_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS search_indexing_review_status text NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS search_indexing_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS search_indexing_reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS seo_image_url text;

ALTER TABLE public.mvp_projects
  DROP CONSTRAINT IF EXISTS mvp_projects_search_indexing_review_status_check,
  ADD CONSTRAINT mvp_projects_search_indexing_review_status_check
    CHECK (search_indexing_review_status IN ('not_requested', 'pending', 'approved', 'rejected')),
  DROP CONSTRAINT IF EXISTS mvp_projects_seo_title_length_check,
  ADD CONSTRAINT mvp_projects_seo_title_length_check
    CHECK (seo_title IS NULL OR char_length(btrim(seo_title)) BETWEEN 10 AND 60),
  DROP CONSTRAINT IF EXISTS mvp_projects_seo_description_length_check,
  ADD CONSTRAINT mvp_projects_seo_description_length_check
    CHECK (seo_description IS NULL OR char_length(btrim(seo_description)) BETWEEN 50 AND 160);

CREATE OR REPLACE FUNCTION public.guard_search_indexing_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_reviewer boolean :=
    COALESCE(auth.role(), '') = 'service_role'
    OR lower(COALESCE(auth.jwt() ->> 'email', '')) = 'admin@creatives-takeover.com';
BEGIN
  IF NEW.search_indexing_requested IS DISTINCT FROM OLD.search_indexing_requested
     AND NOT v_is_reviewer THEN
    NEW.search_indexing_review_status := CASE
      WHEN NEW.search_indexing_requested THEN 'pending'
      ELSE 'not_requested'
    END;
    NEW.search_indexing_reviewed_at := NULL;
    NEW.search_indexing_reviewed_by := NULL;
  ELSIF NOT v_is_reviewer AND (
    NEW.search_indexing_review_status IS DISTINCT FROM OLD.search_indexing_review_status
    OR NEW.search_indexing_reviewed_at IS DISTINCT FROM OLD.search_indexing_reviewed_at
    OR NEW.search_indexing_reviewed_by IS DISTINCT FROM OLD.search_indexing_reviewed_by
  ) THEN
    RAISE EXCEPTION 'Search indexing review fields can only be changed by an administrator';
  END IF;

  IF v_is_reviewer
     AND NEW.search_indexing_review_status IN ('approved', 'rejected')
     AND NEW.search_indexing_review_status IS DISTINCT FROM OLD.search_indexing_review_status THEN
    NEW.search_indexing_reviewed_at := now();
    NEW.search_indexing_reviewed_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_search_indexing_review ON public.profiles;
CREATE TRIGGER guard_profile_search_indexing_review
BEFORE UPDATE OF search_indexing_requested, search_indexing_review_status,
  search_indexing_reviewed_at, search_indexing_reviewed_by
ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_search_indexing_review();

DROP TRIGGER IF EXISTS guard_mvp_search_indexing_review ON public.mvp_projects;
CREATE TRIGGER guard_mvp_search_indexing_review
BEFORE UPDATE OF search_indexing_requested, search_indexing_review_status,
  search_indexing_reviewed_at, search_indexing_reviewed_by
ON public.mvp_projects
FOR EACH ROW EXECUTE FUNCTION public.guard_search_indexing_review();

CREATE OR REPLACE FUNCTION public.profile_is_search_indexable(p public.profiles)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    COALESCE(p.search_indexing_requested, false)
    AND p.search_indexing_review_status = 'approved'
    AND char_length(btrim(COALESCE(p.username, ''))) >= 3
    AND p.username !~* '^user[_-]?[0-9a-f]{6,}$'
    AND char_length(btrim(COALESCE(p.full_name, ''))) >= 2
    AND char_length(btrim(COALESCE(p.bio, ''))) >= 120
    AND char_length(btrim(COALESCE(p.positioning_line, ''))) >= 20
    AND COALESCE(p.profile_completion_percentage, 0) >= 60
    AND (
      char_length(btrim(COALESCE(p.creative_niche, ''))) >= 2
      OR (
        char_length(btrim(COALESCE(p.startup_name, ''))) >= 2
        AND char_length(btrim(COALESCE(p.startup_tagline, ''))) >= 10
      )
    );
$$;

-- Preserve the live public projection's exact column order. Production may
-- contain additional safe fields (for example is_coach) that are not present
-- in older repository snapshots. PostgreSQL matches CREATE OR REPLACE VIEW
-- columns positionally, so rebuilding from a hard-coded list can be mistaken
-- for a column rename. Append only the derived eligibility column instead.
DO $$
DECLARE
  v_public_columns text;
BEGIN
  SELECT string_agg(format('p.%I', column_name), ', ' ORDER BY ordinal_position)
  INTO v_public_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'public_profiles'
    AND column_name <> 'seo_indexable';

  IF v_public_columns IS NULL THEN
    RAISE EXCEPTION 'public.public_profiles must exist before applying the SEO migration';
  END IF;

  EXECUTE format(
    'CREATE OR REPLACE VIEW public.public_profiles AS SELECT %s, public.profile_is_search_indexable(p) AS seo_indexable FROM public.profiles p',
    v_public_columns
  );
END;
$$;

REVOKE ALL ON TABLE public.public_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.public_profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_published_mvp_file_v2(p_slug text, p_path text)
RETURNS TABLE(
  content text,
  filename text,
  seo_indexable boolean,
  seo_title text,
  seo_description text,
  seo_image_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project public.mvp_projects;
  v_files jsonb;
  v_norm text;
  v_validation jsonb;
BEGIN
  IF p_slug IS NULL OR btrim(p_slug) = '' THEN
    RETURN;
  END IF;

  SELECT * INTO v_project
  FROM public.mvp_projects
  WHERE subdomain_slug = lower(btrim(p_slug))
    AND deployment_status = 'deployed'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(
    (
      SELECT v.value -> 'files'
      FROM jsonb_array_elements(COALESCE(v_project.versions, '[]'::jsonb)) v
      ORDER BY COALESCE((v.value ->> 'version_number')::int, 0) DESC
      LIMIT 1
    ),
    v_project.project_files
  ) INTO v_files;

  IF v_files IS NULL OR jsonb_typeof(v_files) <> 'array' THEN
    RETURN;
  END IF;

  v_norm := lower(regexp_replace(COALESCE(NULLIF(btrim(p_path), ''), 'index.html'), '^(\./|/)+', ''));
  IF v_norm = '' THEN v_norm := 'index.html'; END IF;
  v_validation := COALESCE(v_project.metadata -> 'lastPublishValidation', '{}'::jsonb);

  RETURN QUERY
  SELECT
    f.value ->> 'content',
    COALESCE(f.value ->> 'filename', f.value ->> 'path'),
    (
      v_norm = 'index.html'
      AND v_project.project_type = 'html_single'
      AND v_project.search_indexing_requested
      AND v_project.search_indexing_review_status = 'approved'
      AND char_length(btrim(COALESCE(v_project.seo_title, ''))) BETWEEN 10 AND 60
      AND char_length(btrim(COALESCE(v_project.seo_description, ''))) BETWEEN 50 AND 160
      AND COALESCE((v_validation #>> '{smokeTest,passed}')::boolean, false)
    ),
    v_project.seo_title,
    v_project.seo_description,
    v_project.seo_image_url
  FROM jsonb_array_elements(v_files) f
  WHERE lower(regexp_replace(COALESCE(f.value ->> 'filename', f.value ->> 'path', ''), '^(\./|/)+', '')) = v_norm
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_published_mvp_file_v2(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_published_mvp_file_v2(text, text) TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS profiles_search_indexing_review_idx
  ON public.profiles (search_indexing_review_status, updated_at DESC)
  WHERE search_indexing_requested;

CREATE INDEX IF NOT EXISTS mvp_projects_search_indexing_review_idx
  ON public.mvp_projects (search_indexing_review_status, updated_at DESC)
  WHERE search_indexing_requested;
