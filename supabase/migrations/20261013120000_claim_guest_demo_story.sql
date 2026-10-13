-- Service-only conversion of a text story into a native Demo Studio brief.
-- Row locking makes retries and simultaneous auth returns produce one project.
CREATE OR REPLACE FUNCTION public.claim_guest_demo_story(p_guest_id uuid, p_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  guest public.guest_activation_artifacts%ROWTYPE;
  draft jsonb;
  project_id uuid;
BEGIN
  SELECT * INTO guest FROM public.guest_activation_artifacts WHERE id = p_guest_id FOR UPDATE;
  IF NOT FOUND OR guest.artifact_type <> 'demo' OR guest.expires_at <= now() THEN
    RAISE EXCEPTION 'GUEST_ARTIFACT_NOT_FOUND';
  END IF;
  IF guest.claimed_by IS NOT NULL AND guest.claimed_by <> p_user_id THEN
    RAISE EXCEPTION 'GUEST_ARTIFACT_ALREADY_CLAIMED';
  END IF;
  draft := guest.deep_payload;
  IF draft->>'kind' IS DISTINCT FROM 'demo_story' OR draft->>'v' IS DISTINCT FROM '1'
    OR jsonb_typeof(draft->'steps') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'INVALID_DEMO_STORY';
  END IF;
  IF jsonb_array_length(draft->'steps') <> 3 OR coalesce(length(trim(draft->>'productName')), 0) = 0
    OR coalesce(length(trim(draft->>'pitch')), 0) = 0 THEN
    RAISE EXCEPTION 'INVALID_DEMO_STORY';
  END IF;
  IF guest.claim_state = 'claimed' AND guest.native_artifact_id IS NOT NULL THEN
    RETURN guest.native_artifact_id::uuid;
  END IF;
  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_READY'; END IF;
  INSERT INTO public.demo_studio_projects(owner_id, name, tagline)
    VALUES(p_user_id, draft->>'productName', draft->>'pitch') RETURNING id INTO project_id;
  INSERT INTO public.demo_studio_briefs(project_id, owner_id, audience, problem, product_promise, aha_moment,
    primary_cta_label, ai_storyboard, ai_launch_copy)
    VALUES(project_id, p_user_id, draft#>>'{brief,audience}', draft#>>'{brief,problem}',
      draft#>>'{brief,product_promise}', draft#>>'{brief,aha_moment}', 'Try it', draft->'steps',
      jsonb_build_object('headlines', jsonb_build_array(jsonb_build_object('variant', 'A',
        'headline', draft->>'productName', 'subheadline', draft->>'pitch', 'rationale', 'Your saved demo story')),
        'subheadline', draft->>'pitch', 'cta_label', 'Try it', 'proof_bullets', '[]'::jsonb,
        'success_message', 'Thanks for your interest.'));
  UPDATE public.guest_activation_artifacts SET claimed_by = p_user_id, claim_state = 'claimed',
    native_artifact_id = project_id::text, claimed_at = now(), updated_at = now() WHERE id = p_guest_id;
  UPDATE public.profiles SET user_preferences = coalesce(user_preferences, '{}'::jsonb)
    || CASE WHEN user_preferences->>'firstArtifactType' IS NOT NULL THEN '{}'::jsonb ELSE
      jsonb_build_object('firstArtifactType', 'demo_studio_draft', 'firstArtifactId', project_id,
        'firstArtifactCreatedAt', now(), 'firstArtifactLabel', draft->>'productName',
        'firstArtifactResumeUrl', '/demo-studio/projects/' || project_id || '/brief',
        'firstValueAction', 'demo_studio_draft', 'firstValueActionAt', now()) END,
    updated_at = now() WHERE id = p_user_id;
  RETURN project_id;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_guest_demo_story(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_guest_demo_story(uuid, uuid) TO service_role;
