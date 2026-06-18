-- Public serving for MVP Builder "Publish" links.
-- mvp_projects is RLS-protected to its owner, so anonymous visitors of a published
-- site ({slug}.creatives-takeover.com) cannot read the project directly. This
-- SECURITY DEFINER function exposes ONLY the files of a *published* project
-- (subdomain_slug IS NOT NULL), one requested path at a time, so the serving
-- edge function can return the right file with the correct content type.

CREATE OR REPLACE FUNCTION public.get_published_mvp_file(p_slug text, p_path text)
RETURNS TABLE(content text, filename text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_files jsonb;
  v_norm text;
BEGIN
  IF p_slug IS NULL OR btrim(p_slug) = '' THEN
    RETURN;
  END IF;

  -- Prefer the latest version's files; fall back to project_files.
  SELECT COALESCE(
    (
      SELECT v.value->'files'
      FROM public.mvp_projects mp,
           LATERAL jsonb_array_elements(COALESCE(mp.versions, '[]'::jsonb)) v
      WHERE mp.subdomain_slug = p_slug
      ORDER BY COALESCE((v.value->>'version_number')::int, 0) DESC
      LIMIT 1
    ),
    (SELECT mp.project_files FROM public.mvp_projects mp WHERE mp.subdomain_slug = p_slug LIMIT 1)
  )
  INTO v_files;

  IF v_files IS NULL OR jsonb_typeof(v_files) <> 'array' THEN
    RETURN;
  END IF;

  -- Normalize requested path: drop leading slashes / "./"; empty means index.html.
  v_norm := lower(regexp_replace(COALESCE(NULLIF(btrim(p_path), ''), 'index.html'), '^(\./|/)+', ''));
  IF v_norm = '' THEN
    v_norm := 'index.html';
  END IF;

  RETURN QUERY
  SELECT f.value->>'content',
         COALESCE(f.value->>'filename', f.value->>'path')
  FROM jsonb_array_elements(v_files) f
  WHERE lower(regexp_replace(COALESCE(f.value->>'filename', f.value->>'path', ''), '^(\./|/)+', '')) = v_norm
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_published_mvp_file(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_published_mvp_file(text, text) TO anon, authenticated, service_role;
