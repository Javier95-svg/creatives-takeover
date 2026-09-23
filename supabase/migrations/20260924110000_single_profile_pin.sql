BEGIN;

-- One row per account makes replacement atomic, including simultaneous requests.
CREATE TABLE IF NOT EXISTS public.profile_post_pins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_id uuid REFERENCES public.profile_posts(id) ON DELETE CASCADE,
  photo_id uuid REFERENCES public.user_photos(id) ON DELETE CASCADE,
  community_id uuid REFERENCES public.community_posts(id) ON DELETE CASCADE,
  source text GENERATED ALWAYS AS (CASE WHEN journey_id IS NOT NULL THEN 'journey' WHEN photo_id IS NOT NULL THEN 'photo' ELSE 'community' END) STORED,
  post_id uuid GENERATED ALWAYS AS (COALESCE(journey_id, photo_id, community_id)) STORED,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(journey_id, photo_id, community_id) = 1)
);
CREATE INDEX IF NOT EXISTS profile_post_pins_journey_idx ON public.profile_post_pins(journey_id) WHERE journey_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS profile_post_pins_photo_idx ON public.profile_post_pins(photo_id) WHERE photo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS profile_post_pins_community_idx ON public.profile_post_pins(community_id) WHERE community_id IS NOT NULL;
ALTER TABLE public.profile_post_pins ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.profile_post_pins TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profile_post_pins TO authenticated;
DROP POLICY IF EXISTS profile_pin_read ON public.profile_post_pins;
CREATE POLICY profile_pin_read ON public.profile_post_pins FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profile_interaction_posts p WHERE p.source = profile_post_pins.source AND p.id = profile_post_pins.post_id AND p.user_id = profile_post_pins.user_id));
DROP POLICY IF EXISTS profile_pin_insert ON public.profile_post_pins;
CREATE POLICY profile_pin_insert ON public.profile_post_pins FOR INSERT TO authenticated WITH CHECK (
  user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.profile_interaction_posts p WHERE p.source = profile_post_pins.source AND p.id = profile_post_pins.post_id AND p.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS profile_pin_update ON public.profile_post_pins;
CREATE POLICY profile_pin_update ON public.profile_post_pins FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (
  user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.profile_interaction_posts p WHERE p.source = profile_post_pins.source AND p.id = profile_post_pins.post_id AND p.user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS profile_pin_delete ON public.profile_post_pins;
CREATE POLICY profile_pin_delete ON public.profile_post_pins FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- Preserve the newest legacy community highlight as the account's single pin.
-- A rerun must not resurrect pins which an account has since removed.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'community_posts' AND column_name = 'is_pinned') THEN
    INSERT INTO public.profile_post_pins(user_id, community_id)
    SELECT DISTINCT ON (user_id) user_id, id FROM public.community_posts
    WHERE is_pinned = true ORDER BY user_id, created_at DESC, id DESC
    ON CONFLICT (user_id) DO NOTHING;
    UPDATE public.community_posts SET is_pinned = false WHERE is_pinned = true;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_profile_pinned_post(p_source text, p_id uuid, p_pinned boolean)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to pin a post' USING ERRCODE = '42501'; END IF;
  IF p_pinned IS NULL THEN RAISE EXCEPTION 'Pin state is required'; END IF;
  IF NOT p_pinned THEN
    DELETE FROM profile_post_pins WHERE user_id = auth.uid() AND source = p_source AND post_id = p_id;
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profile_interaction_posts WHERE source = p_source AND id = p_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'You can only pin your own published posts' USING ERRCODE = '42501';
  END IF;
  INSERT INTO profile_post_pins(user_id, journey_id, photo_id, community_id)
  VALUES (auth.uid(), CASE WHEN p_source = 'journey' THEN p_id END, CASE WHEN p_source = 'photo' THEN p_id END, CASE WHEN p_source = 'community' THEN p_id END)
  ON CONFLICT (user_id) DO UPDATE SET journey_id = EXCLUDED.journey_id, photo_id = EXCLUDED.photo_id, community_id = EXCLUDED.community_id, pinned_at = now();
END;
$$;
CREATE OR REPLACE FUNCTION public.get_profile_pinned_post(p_user_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.get_profile_shared_post(source, post_id) FROM profile_post_pins WHERE user_id = p_user_id;
$$;
REVOKE ALL ON FUNCTION public.set_profile_pinned_post(text, uuid, boolean), public.get_profile_pinned_post(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_profile_pinned_post(text, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_pinned_post(uuid) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
