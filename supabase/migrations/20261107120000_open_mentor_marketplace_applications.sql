-- Mentor and Marketplace accounts open by application (approved by Javier,
-- 2026-11-07). Anyone can sign up as either, answer the onboarding questions
-- and wait for an admin's review; nothing about the account is visible to
-- founders until it is approved (hasCategoryAccess, review_account_application).
--
-- 1. The invitation becomes optional. When one exists for the verified email it
--    is still claimed and attached to the application, so admin-issued
--    invitations keep working as before; without one the application is filed
--    anyway, and approval no longer asks for one.
-- 2. The application asks for more: a one-line intro, a link and monthly time
--    for mentors; a business name, a link and an optional starting price for
--    providers. This keeps the server check equal to src/lib/roleProfileSchema.ts.

CREATE OR REPLACE FUNCTION public.guard_application_invitation()
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
    IF FOUND THEN
      UPDATE public.account_invitations SET claimed_by=NEW.user_id WHERE id=v_inv.id;
      NEW.invitation_id := v_inv.id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.validate_account_role_profile(p_type text, p_value jsonb, p_required boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  v_key text; v_value jsonb; v_allowed text[]; v_required text[];
  v_arrays text[]; v_options text[]; v_item jsonb;
BEGIN
  IF p_type NOT IN ('mentor','marketplace','investor') THEN
    IF p_value <> '{}'::jsonb THEN RAISE EXCEPTION 'Role details do not apply to this account'; END IF;
    RETURN '{}'::jsonb;
  END IF;
  IF p_value IS NULL OR jsonb_typeof(p_value) <> 'object' OR octet_length(p_value::text) > 12000 THEN
    RAISE EXCEPTION 'Invalid role details';
  END IF;
  CASE p_type
    WHEN 'mentor' THEN
      v_allowed := ARRAY['headline','link','yearsActive','expertise','stages','experience','engagement','availability'];
      v_required := ARRAY['headline','link','expertise','stages','experience','engagement','availability'];
      v_arrays := ARRAY['expertise','stages'];
    WHEN 'marketplace' THEN
      v_allowed := ARRAY['businessName','link','category','services','idealCustomer','portfolio','capacity','startingPrice'];
      v_required := ARRAY['businessName','link','category','services','idealCustomer','portfolio','capacity'];
      v_arrays := ARRAY['services'];
    WHEN 'investor' THEN
      v_allowed := ARRAY['sectors','stages','geography','checkRange','activity'];
      v_required := ARRAY['sectors','stages','geography','activity'];
      v_arrays := ARRAY['sectors','stages'];
  END CASE;
  FOR v_key, v_value IN SELECT * FROM jsonb_each(p_value) LOOP
    IF NOT v_key = ANY(v_allowed) THEN RAISE EXCEPTION 'Unknown role field: %', v_key; END IF;
    IF v_key = ANY(v_arrays) THEN
      IF jsonb_typeof(v_value) <> 'array' THEN RAISE EXCEPTION 'Invalid %', v_key; END IF;
      IF jsonb_array_length(v_value) > 40 THEN RAISE EXCEPTION 'Too many values for %', v_key; END IF;
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_value) LOOP
        IF jsonb_typeof(v_item) <> 'string' OR length(btrim(v_item #>> '{}')) NOT BETWEEN 1 AND 60 THEN
          RAISE EXCEPTION 'Invalid value in %', v_key;
        END IF;
      END LOOP;
    ELSIF v_key = 'yearsActive' THEN
      IF jsonb_typeof(v_value) <> 'number' OR (v_value::text)::numeric NOT BETWEEN 0 AND 100 THEN
        RAISE EXCEPTION 'Invalid years operating';
      END IF;
    ELSIF jsonb_typeof(v_value) <> 'string' OR length(btrim(v_value #>> '{}')) NOT BETWEEN 1 AND 500 THEN
      RAISE EXCEPTION 'Invalid %', v_key;
    ELSIF v_key = 'link' AND ((v_value #>> '{}') !~* '^https?://[^\s/.]+\.\S+$' OR length(v_value #>> '{}') > 300) THEN
      RAISE EXCEPTION 'Invalid link';
    END IF;
    v_options := CASE
      WHEN v_key='sectors' AND p_type='investor' THEN ARRAY['AI & Machine Learning','BioTech & Life Sciences','CleanTech & Climate','Consumer & D2C','Cybersecurity','DeepTech & Hardware','Developer Tools','E-Commerce & Marketplace','EdTech','Energy','Enterprise Software','FinTech','FoodTech & AgTech','Gaming & Entertainment','GovTech','HealthTech','HR Tech & Future of Work','InsurTech','LegalTech','Logistics & Supply Chain','Manufacturing & Industry 4.0','Media & Creator Economy','Mobility & Logistics','Mobility & Transportation','PropTech & Real Estate','RetailTech','Robotics & Automation','SaaS','Social Impact','SpaceTech','Sports & Wellness','Travel & Hospitality','Web3 & Blockchain']
      WHEN v_key='category' THEN ARRAY['sales','marketing','ops','tech_support']
      WHEN v_key='stages' AND p_type='investor' THEN ARRAY['Pre-Seed','Seed','Series A','Series B','Series C+']
      WHEN v_key='stages' AND p_type='mentor' THEN ARRAY['Exploring','Validation','Building','Launch','Growth']
      WHEN v_key='engagement' THEN ARRAY['one_off','ongoing','both']
      WHEN v_key='availability' THEN ARRAY['1_2_hours','3_5_hours','6_plus_hours']
      WHEN v_key='capacity' THEN ARRAY['available','limited','waitlist']
      WHEN v_key='activity' THEN ARRAY['actively_investing','exploring']
      ELSE NULL END;
    IF v_options IS NOT NULL THEN
      IF v_key = ANY(v_arrays) THEN
        IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_value) x WHERE NOT x = ANY(v_options)) THEN
          RAISE EXCEPTION 'Invalid option for %', v_key;
        END IF;
      ELSIF NOT (v_value #>> '{}') = ANY(v_options) THEN RAISE EXCEPTION 'Invalid option for %', v_key;
      END IF;
    END IF;
  END LOOP;
  IF p_required THEN
    FOREACH v_key IN ARRAY v_required LOOP
      IF NOT p_value ? v_key OR p_value->v_key = '[]'::jsonb THEN RAISE EXCEPTION 'Missing %', v_key; END IF;
    END LOOP;
  END IF;
  RETURN p_value;
END $$;
