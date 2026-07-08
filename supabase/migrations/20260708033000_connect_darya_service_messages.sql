-- Connect GetMarketing/Darya service listings to the in-app messaging account.

UPDATE public.services
SET
  delivered_by_user_id = 'a4233961-2e68-463a-a6a9-e43d57a836ab'::uuid,
  delivered_by_email = 'darya@getmarketing.team',
  updated_at = now()
WHERE lower(trim(coalesce(delivered_by_email, ''))) = 'darya@getmarketing.team'
   OR delivered_by_user_id = 'a4233961-2e68-463a-a6a9-e43d57a836ab'::uuid;
