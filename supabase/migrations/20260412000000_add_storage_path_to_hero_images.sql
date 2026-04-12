ALTER TABLE public.hero_images
ADD COLUMN IF NOT EXISTS storage_path TEXT;

UPDATE public.hero_images
SET storage_path = regexp_replace(
  regexp_replace(
    image_url,
    '^https?://[^/]+/storage/v1/(?:object/public|render/image/public)/hero-images/',
    ''
  ),
  '\?.*$',
  ''
)
WHERE storage_path IS NULL
  AND image_url ~ '^https?://[^/]+/storage/v1/(?:object/public|render/image/public)/hero-images/';
