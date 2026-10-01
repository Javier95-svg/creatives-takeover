CREATE TABLE public.ct_connection_oauth_states (
  state uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  product_id uuid NOT NULL,
  provider text NOT NULL CHECK(provider IN ('sheets','ga4')),
  config jsonb NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes',
  FOREIGN KEY(product_id,user_id) REFERENCES public.ct_products(id,user_id) ON DELETE CASCADE
);
ALTER TABLE public.ct_connection_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ct_connection_oauth_states FROM anon,authenticated;

CREATE TABLE public.ct_evidence_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id uuid NOT NULL REFERENCES public.ct_evidence ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  previous_record jsonb NOT NULL,
  revised_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ct_evidence_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_read ON public.ct_evidence_revisions FOR SELECT TO authenticated USING(user_id=auth.uid());
GRANT SELECT ON public.ct_evidence_revisions TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.ct_evidence_revisions FROM anon,authenticated;
CREATE FUNCTION public.ct_record_evidence_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF OLD.original IS DISTINCT FROM NEW.original OR OLD.summary IS DISTINCT FROM NEW.summary THEN
    INSERT INTO ct_evidence_revisions(evidence_id,user_id,previous_record) VALUES(OLD.id,OLD.user_id,to_jsonb(OLD));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ct_evidence_revision BEFORE UPDATE ON public.ct_evidence FOR EACH ROW EXECUTE FUNCTION public.ct_record_evidence_revision();

GRANT ALL ON public.ct_connection_oauth_states,public.ct_evidence_revisions TO service_role;
