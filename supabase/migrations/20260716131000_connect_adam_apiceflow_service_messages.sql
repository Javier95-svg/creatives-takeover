-- Connect Apiceflow/Adam Lee service listings to the in-app messaging account.

UPDATE public.services
SET
  delivered_by_user_id = 'b0866625-7934-46cf-a29d-87bb00d83e5b'::uuid,
  delivered_by_email = 'adam@apiceflow.com',
  updated_at = now()
WHERE lower(trim(coalesce(name, ''))) LIKE '%apiceflow%'
   OR lower(trim(coalesce(slug, ''))) LIKE '%apiceflow%';
