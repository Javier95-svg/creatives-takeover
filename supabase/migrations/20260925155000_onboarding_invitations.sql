-- Invitation eligibility is bound to a verified sign-in email. Issuing one
-- does not approve the account or send an email.
CREATE TABLE public.account_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (email = lower(btrim(email)) AND email LIKE '%_@_%._%'),
  user_type text NOT NULL CHECK (user_type IN ('mentor','marketplace')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  revoked_at timestamptz,
  claimed_by uuid REFERENCES auth.users(id),
  UNIQUE(email,user_type)
);
ALTER TABLE public.account_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_invitations FROM anon, authenticated;
ALTER TABLE public.account_applications ADD COLUMN invitation_id uuid REFERENCES public.account_invitations(id);

CREATE FUNCTION public.classify_onboarding_situation(p_situation text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  SELECT CASE p_situation
    WHEN 'existing_project' THEN 'founder' WHEN 'starting_project' THEN 'builder'
    WHEN 'share_expertise' THEN 'mentor' WHEN 'deliver_services' THEN 'marketplace'
    WHEN 'explore_investments' THEN 'investor' ELSE NULL END;
$$;

CREATE FUNCTION public.manage_account_invitation(p_email text, p_user_type text, p_revoke boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid; v_email text := lower(btrim(p_email));
BEGIN
  IF NOT COALESCE(public.is_admin_user(),false) THEN RAISE EXCEPTION 'Only an administrator can manage invitations'; END IF;
  IF p_user_type IS NULL OR p_user_type NOT IN ('mentor','marketplace') OR v_email IS NULL OR length(v_email)>254 OR v_email NOT LIKE '%_@_%._%' THEN
    RAISE EXCEPTION 'Enter a valid email and invitation category';
  END IF;
  IF p_revoke THEN
    UPDATE public.account_invitations SET revoked_at=now() WHERE email=v_email AND user_type=p_user_type RETURNING id INTO v_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found'; END IF;
  ELSE
    INSERT INTO public.account_invitations(email,user_type,created_by) VALUES(v_email,p_user_type,auth.uid())
    ON CONFLICT(email,user_type) DO UPDATE SET expires_at=now()+interval '30 days',revoked_at=NULL
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;

CREATE FUNCTION public.list_account_invitations()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT COALESCE(public.is_admin_user(),false) THEN RAISE EXCEPTION 'Only an administrator can list invitations'; END IF;
  RETURN (SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.created_at DESC),'[]') FROM public.account_invitations i);
END $$;

CREATE FUNCTION public.my_account_invitation_types()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE(jsonb_agg(i.user_type),'[]') FROM public.account_invitations i
  JOIN auth.users u ON u.id=auth.uid() AND lower(btrim(u.email))=i.email
  WHERE u.email_confirmed_at IS NOT NULL AND i.revoked_at IS NULL AND i.expires_at>now()
    AND (i.claimed_by IS NULL OR i.claimed_by=u.id);
$$;

CREATE FUNCTION public.guard_application_invitation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_inv public.account_invitations;
BEGIN
  IF NEW.user_type NOT IN ('mentor','marketplace') THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' THEN
    SELECT i.* INTO v_inv FROM public.account_invitations i JOIN auth.users u
      ON u.id=NEW.user_id AND lower(btrim(u.email))=i.email
      WHERE u.email_confirmed_at IS NOT NULL AND i.user_type=NEW.user_type
        AND i.revoked_at IS NULL AND i.expires_at>now()
        AND (i.claimed_by IS NULL OR i.claimed_by=NEW.user_id) FOR UPDATE OF i;
    IF NOT FOUND THEN RAISE EXCEPTION 'A valid invitation for your verified email is required. Contact an administrator.'; END IF;
    UPDATE public.account_invitations SET claimed_by=NEW.user_id WHERE id=v_inv.id;
    NEW.invitation_id := v_inv.id;
  ELSIF NEW.status='approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    SELECT * INTO v_inv FROM public.account_invitations WHERE id=NEW.invitation_id FOR UPDATE;
    IF NOT FOUND OR v_inv.revoked_at IS NOT NULL OR v_inv.user_type<>NEW.user_type OR v_inv.claimed_by IS DISTINCT FROM NEW.user_id THEN
      RAISE EXCEPTION 'An active invitation is required before approval';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_application_invitation BEFORE INSERT OR UPDATE ON public.account_applications
FOR EACH ROW EXECUTE FUNCTION public.guard_application_invitation();

REVOKE ALL ON FUNCTION public.manage_account_invitation(text,text,boolean), public.list_account_invitations(), public.my_account_invitation_types() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_account_invitation(text,text,boolean), public.list_account_invitations(), public.my_account_invitation_types() TO authenticated;
