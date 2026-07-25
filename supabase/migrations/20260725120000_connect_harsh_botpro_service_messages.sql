-- Connect Botpro Solutions/Harsh Ladani service listings to the in-app messaging account.

UPDATE public.services
SET
  delivered_by_user_id = '4ceda6be-fc20-420f-aba1-cee3a1416f59'::uuid,
  delivered_by_email = 'harsh.ladani@botprosolutions.com',
  updated_at = now()
WHERE lower(trim(coalesce(name, ''))) LIKE '%botpro%'
   OR lower(trim(coalesce(slug, ''))) LIKE '%botpro%'
   OR lower(trim(coalesce(delivered_by_email, ''))) = 'harsh.ladani@botprosolutions.com';
