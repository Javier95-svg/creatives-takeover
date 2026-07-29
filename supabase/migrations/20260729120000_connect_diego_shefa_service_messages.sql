-- Connect Shefa Co./Diego Ryse service listings to the in-app messaging account.

UPDATE public.services
SET
  delivered_by_user_id = '948c1768-f299-4442-8302-99da3588ca08'::uuid,
  delivered_by_email = 'realtopw@gmail.com',
  updated_at = now()
WHERE lower(trim(coalesce(name, ''))) LIKE '%shefa%'
   OR lower(trim(coalesce(slug, ''))) LIKE '%shefa%'
   OR lower(trim(coalesce(delivered_by_email, ''))) = 'realtopw@gmail.com';
