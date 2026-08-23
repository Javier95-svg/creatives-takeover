-- Connect the Jidoka Group service listings to the in-app messaging account.

UPDATE public.services
SET
  delivered_by_user_id = 'a16ea40e-8470-41ce-910d-5bea9a00818c'::uuid,
  delivered_by_email = 'bd@jidokagroup.com',
  updated_at = now()
WHERE lower(trim(coalesce(delivered_by_name, ''))) LIKE '%jidoka%'
   OR lower(trim(coalesce(slug, ''))) = 'ops-automation-sprint'
   OR lower(trim(coalesce(delivered_by_email, ''))) = 'bd@jidokagroup.com';
