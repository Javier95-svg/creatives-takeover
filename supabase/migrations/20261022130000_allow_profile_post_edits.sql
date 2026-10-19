-- Let a post owner correct a published journey update and its image reference.
GRANT UPDATE ON public.profile_posts TO authenticated;

DROP POLICY IF EXISTS profile_posts_update ON public.profile_posts;
CREATE POLICY profile_posts_update ON public.profile_posts FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

NOTIFY pgrst, 'reload schema';
