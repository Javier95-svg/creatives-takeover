-- Backfill mentor notification email from each linked mentor's account email.
-- Idempotent: only fills contact_email where it is currently empty and the mentor
-- has a linked account. Unlinked mentors must be populated manually (no email on file).
UPDATE public.mentors m
SET contact_email = u.email
FROM auth.users u
WHERE m.user_id = u.id
  AND NULLIF(TRIM(COALESCE(m.contact_email, '')), '') IS NULL
  AND u.email IS NOT NULL;
