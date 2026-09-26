-- Metadata retrieval for Pulse. Existing content remains the source of truth:
-- edits, publication state and service availability take effect on the next query.
BEGIN;
CREATE OR REPLACE FUNCTION public.search_pulse_catalog(
  p_query text DEFAULT '', p_kinds text[] DEFAULT ARRAY['article','podcast','service'], p_limit integer DEFAULT 3
)
RETURNS TABLE (kind text, id uuid, title text, slug text, summary text, tags text[], updated_at timestamptz, rank real)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public SET statement_timeout = '3s'
AS $$
  WITH query AS (
    SELECT websearch_to_tsquery('english', left(coalesce(p_query, ''), 180)) AS terms
  ), documents AS (
    SELECT 'article'::text AS kind, s.id, s.title, s.slug, coalesce(s.excerpt, '') AS summary,
      coalesce(s.hashtags, ARRAY[]::text[]) AS tags, s.updated_at,
      coalesce(s.published_at, s.created_at) AS released_at,
      ''::text AS byline
    FROM public.stories_articles s WHERE s.status = 'published' AND 'article' = ANY(p_kinds)
    UNION ALL
    SELECT 'podcast', p.id, p.title, ''::text, coalesce(p.description, ''),
      coalesce(p.hashtags, ARRAY[]::text[]), p.updated_at, p.created_at, coalesce(p.guest_name, '')
    FROM public.podcast_episodes p WHERE p.is_published = true AND 'podcast' = ANY(p_kinds)
    UNION ALL
    SELECT 'service', s.id, s.name, s.slug, coalesce(s.description, ''),
      ARRAY[s.category::text], s.updated_at, s.created_at, coalesce(s.delivered_by_name, '')
    FROM public.services s WHERE s.is_active = true AND 'service' = ANY(p_kinds)
  ), ranked AS (
    SELECT d.*, setweight(to_tsvector('english', d.title), 'A') ||
      setweight(to_tsvector('english', array_to_string(d.tags, ' ') || ' ' || d.byline), 'A') ||
      setweight(to_tsvector('english', d.summary), 'B') AS document
    FROM documents d
  )
  SELECT d.kind, d.id, d.title, d.slug, left(d.summary, 1200), d.tags, d.updated_at,
    ts_rank(d.document, q.terms) AS rank
  FROM ranked d CROSS JOIN query q
  WHERE numnode(q.terms) = 0 OR d.document @@ q.terms
  ORDER BY rank DESC, d.released_at DESC NULLS LAST, d.id
  LIMIT least(greatest(coalesce(p_limit, 3), 1), 9);
$$;
REVOKE ALL ON FUNCTION public.search_pulse_catalog(text,text[],integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_pulse_catalog(text,text[],integer) TO authenticated, service_role;
COMMIT;
