-- Make server-held roles authoritative for the remaining email-based admin
-- helpers and policies. Existing admin role membership is checked before use.
BEGIN;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
ON public.user_roles FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_admin_user_id(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(p_user_id, 'admin'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

DROP POLICY IF EXISTS "Admins can update funding opportunities"
ON public.funding_opportunities;
CREATE POLICY "Admins can update funding opportunities"
ON public.funding_opportunities
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin can upload founder journey GIFs"
ON storage.objects;
CREATE POLICY "Admin can upload founder journey GIFs"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'founder-journey-gifs'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Admin can update founder journey GIFs"
ON storage.objects;
CREATE POLICY "Admin can update founder journey GIFs"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'founder-journey-gifs'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Admin can delete founder journey GIFs"
ON storage.objects;
CREATE POLICY "Admin can delete founder journey GIFs"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'founder-journey-gifs'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

NOTIFY pgrst, 'reload schema';
COMMIT;
