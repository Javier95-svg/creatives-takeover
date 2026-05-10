-- Add image/jpg (non-standard but commonly reported by Windows/Edge for JPEG files)
-- to the angel-pictures bucket's allowed MIME types so uploads from those clients
-- are not rejected at the storage API level.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
]
WHERE id = 'angel-pictures';
