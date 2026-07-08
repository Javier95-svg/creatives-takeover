-- Rename the Growth Consulting service profile route to /marketplace/get-marketing.

WITH target AS (
  SELECT id
  FROM public.services
  WHERE slug = 'growth-consulting-for-startups'
     OR lower(trim(name)) = 'growth consulting for startups'
  ORDER BY (slug = 'growth-consulting-for-startups') DESC, updated_at DESC
  LIMIT 1
)
UPDATE public.services AS service
SET
  slug = 'get-marketing',
  updated_at = now()
FROM target
WHERE service.id = target.id
  AND NOT EXISTS (
    SELECT 1
    FROM public.services AS existing
    WHERE existing.slug = 'get-marketing'
      AND existing.id <> service.id
  );
