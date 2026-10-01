ALTER TABLE public.pmf_interviews ADD COLUMN source_evidence_id uuid REFERENCES public.ct_evidence ON DELETE SET NULL,
  ADD COLUMN participant_key text, ADD COLUMN incentivized boolean NOT NULL DEFAULT false,
  ADD COLUMN target_customer boolean NOT NULL DEFAULT true;
CREATE UNIQUE INDEX pmf_import_evidence_unique ON public.pmf_interviews(validation_context_id,source_evidence_id);
CREATE UNIQUE INDEX pmf_import_participant_unique ON public.pmf_interviews(validation_context_id,participant_key) WHERE participant_key IS NOT NULL;

CREATE FUNCTION public.ct_accept_pmf_evidence(p_context uuid,p_evidence uuid,p_target_customer boolean,p_screening text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e ct_evidence; interview_id uuid; BEGIN
  SELECT e0.* INTO e FROM ct_evidence e0 JOIN ct_product_artifacts a ON a.product_id=e0.product_id AND a.user_id=e0.user_id
    WHERE e0.id=p_evidence AND e0.user_id=auth.uid() AND a.tool='pmf_lab' AND a.artifact_id=p_context;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM prebuild_validation_contexts WHERE id=p_context AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Evidence is not assigned to this validation context'; END IF;
  IF e.kind NOT IN ('interview','survey','session') OR length(trim(coalesce(e.summary->>'feedback','')))<10 THEN RAISE EXCEPTION 'Map substantive customer feedback before adding evidence'; END IF;
  IF p_target_customer AND length(trim(coalesce(p_screening,'')))<20 THEN RAISE EXCEPTION 'Explain how this person matches your target customer'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_context::text,0));
  SELECT id INTO interview_id FROM pmf_interviews WHERE validation_context_id=p_context AND user_id=auth.uid()
    AND (source_evidence_id=e.id OR (e.participant_key IS NOT NULL AND participant_key=e.participant_key));
  IF interview_id IS NOT NULL THEN
    UPDATE pmf_interviews SET target_customer=coalesce(p_target_customer,false),basic_profile=coalesce(p_screening,'')
      WHERE id=interview_id AND source_evidence_id=e.id;
    RETURN interview_id;
  END IF;
  interview_id:=gen_random_uuid();
  INSERT INTO pmf_interviews(id,user_id,validation_context_id,source_evidence_id,participant_key,incentivized,target_customer,
    interviewee_name,basic_profile,segment,main_feedback,objections,interest_level,buying_intent,created_at)
  VALUES(interview_id,auth.uid(),p_context,e.id,e.participant_key,e.incentivized,coalesce(p_target_customer,false),
    coalesce(nullif(e.summary->>'respondent',''),'Imported reviewer'),coalesce(p_screening,''),e.segment,
    e.summary->>'feedback',coalesce(e.summary->>'objections',''),3,'low',e.captured_at);
  RETURN interview_id;
END $$;
REVOKE ALL ON FUNCTION public.ct_accept_pmf_evidence(uuid,uuid,boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ct_accept_pmf_evidence(uuid,uuid,boolean,text) TO authenticated;

-- A direct edit cannot retain an external source badge or alter its original evidence.
CREATE FUNCTION public.ct_pmf_manual_edit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    NEW.evidence_origin:='founder_reported';
    IF TG_OP='INSERT' THEN NEW.source_evidence_id:=NULL; NEW.participant_key:=NULL; NEW.incentivized:=false;
    ELSE NEW.source_evidence_id:=OLD.source_evidence_id; NEW.participant_key:=OLD.participant_key; NEW.incentivized:=OLD.incentivized; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ct_pmf_manual_edit BEFORE INSERT OR UPDATE ON public.pmf_interviews FOR EACH ROW EXECUTE FUNCTION public.ct_pmf_manual_edit();
