BEGIN;
SET LOCAL lock_timeout='5s';
-- Restore a session checkpoint atomically, including removed screens and hotspots.
-- Publication status, public IDs and asset storage are deliberately not rewritten.
CREATE OR REPLACE FUNCTION public.restore_demo_edit(p_demo_id uuid,p_title text,p_theme jsonb,p_steps jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s jsonb; h jsonb;
BEGIN
 PERFORM 1 FROM public.demo_studio_demos WHERE id=p_demo_id AND owner_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Demo not found'; END IF;
 IF jsonb_typeof(p_steps) IS DISTINCT FROM 'array' OR jsonb_array_length(p_steps)>200 THEN RAISE EXCEPTION 'Invalid screen snapshot'; END IF;
 FOR s IN SELECT value FROM jsonb_array_elements(p_steps) LOOP
  IF EXISTS(SELECT 1 FROM public.demo_studio_demo_steps WHERE id=(s->>'id')::uuid AND demo_id<>p_demo_id) THEN RAISE EXCEPTION 'Screen belongs to another demo'; END IF;
  FOR h IN SELECT value FROM jsonb_array_elements(coalesce(s->'hotspots','[]')) LOOP
   IF EXISTS(SELECT 1 FROM public.demo_studio_demo_hotspots x JOIN public.demo_studio_demo_steps y ON y.id=x.step_id WHERE x.id=(h->>'id')::uuid AND y.demo_id<>p_demo_id) THEN RAISE EXCEPTION 'Hotspot belongs to another demo'; END IF;
  END LOOP;
 END LOOP;
 DELETE FROM public.demo_studio_demo_steps WHERE demo_id=p_demo_id;
 FOR s IN SELECT value FROM jsonb_array_elements(p_steps) LOOP
  INSERT INTO public.demo_studio_demo_steps(id,demo_id,position,asset_type,asset_url,asset_width,asset_height,asset_captured_at,title,caption,speaker_notes)
  VALUES((s->>'id')::uuid,p_demo_id,(s->>'position')::int,coalesce(s->>'asset_type','image'),s->>'asset_url',(s->>'asset_width')::int,(s->>'asset_height')::int,(s->>'asset_captured_at')::timestamptz,s->>'title',s->>'caption',s->>'speaker_notes');
  FOR h IN SELECT value FROM jsonb_array_elements(coalesce(s->'hotspots','[]')) LOOP
   INSERT INTO public.demo_studio_demo_hotspots(id,step_id,x,y,w,h,type,label,action,action_target) VALUES((h->>'id')::uuid,(s->>'id')::uuid,(h->>'x')::numeric,(h->>'y')::numeric,(h->>'w')::numeric,(h->>'h')::numeric,h->>'type',h->>'label',h->>'action',h->>'action_target');
  END LOOP;
 END LOOP;
 UPDATE public.demo_studio_demos SET title=p_title,theme=p_theme,updated_at=now() WHERE id=p_demo_id;
END $$;
REVOKE ALL ON FUNCTION public.restore_demo_edit(uuid,text,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_demo_edit(uuid,text,jsonb,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.reorder_demo_screens(p_ids uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE demo uuid;
BEGIN
 SELECT demo_id INTO demo FROM public.demo_studio_demo_steps WHERE id=p_ids[1];
 PERFORM 1 FROM public.demo_studio_demos WHERE id=demo AND owner_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Demo not found'; END IF;
 IF cardinality(p_ids)<>(SELECT count(*) FROM public.demo_studio_demo_steps WHERE demo_id=demo) OR cardinality(p_ids)<>(SELECT count(DISTINCT s.id) FROM public.demo_studio_demo_steps s WHERE s.demo_id=demo AND s.id=ANY(p_ids)) THEN RAISE EXCEPTION 'Screen list changed. Reopen the demo before reordering.'; END IF;
 UPDATE public.demo_studio_demo_steps s SET position=u.n-1 FROM unnest(p_ids) WITH ORDINALITY u(id,n) WHERE s.id=u.id;
END $$;
REVOKE ALL ON FUNCTION public.reorder_demo_screens(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_demo_screens(uuid[]) TO authenticated;
COMMIT;
