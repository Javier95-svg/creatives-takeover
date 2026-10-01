CREATE TABLE public.ct_reviewer_profiles (
 user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE, display_name text NOT NULL,
 role text NOT NULL, industry text NOT NULL, problems text[] NOT NULL DEFAULT '{}', languages text[] NOT NULL DEFAULT '{en}',
 timezone text NOT NULL DEFAULT 'UTC', opted_in boolean NOT NULL DEFAULT false
);
CREATE TABLE public.ct_reviewer_exclusions (
 user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE, other_user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 reason text NOT NULL CHECK(reason IN ('blocked','collaborator')), PRIMARY KEY(user_id,other_user_id),CHECK(user_id<>other_user_id)
);
CREATE TABLE public.ct_reviewer_slots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 starts_at timestamptz NOT NULL, booked boolean NOT NULL DEFAULT false, UNIQUE(user_id,starts_at)
);
CREATE TABLE public.ct_validation_google_accounts (
 user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE, google_subject text NOT NULL UNIQUE,
 email text NOT NULL, encrypted_secret text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ct_validation_oauth_states (
 state uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes'
);
CREATE TABLE public.ct_validation_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), founder_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
 reviewer_id uuid REFERENCES auth.users ON DELETE SET NULL, product_id uuid NOT NULL REFERENCES ct_products ON DELETE RESTRICT,
 context_id uuid NOT NULL REFERENCES prebuild_validation_contexts ON DELETE CASCADE, slot_id uuid REFERENCES ct_reviewer_slots,
 starts_at timestamptz NOT NULL, status text NOT NULL DEFAULT 'booked' CHECK(status IN ('invited','booked','cancelled','completed','review')),
 guest_name text, guest_email text, guest_token_hash text UNIQUE, guest_expires_at timestamptz,
 calendar_id text, meet_url text, calendar_state text NOT NULL DEFAULT 'pending', calendar_error text,
 attendance_status text NOT NULL DEFAULT 'pending' CHECK(attendance_status IN ('pending','verified','review')),
 overlap_seconds integer NOT NULL DEFAULT 0, attendance_evidence jsonb NOT NULL DEFAULT '{}',
 pre_feedback jsonb, feedback jsonb, feedback_at timestamptz, target_customer boolean NOT NULL DEFAULT false,
 screening text, reward_status text NOT NULL DEFAULT 'pending' CHECK(reward_status IN ('pending','held','review','granted','ineligible')),
 reward_eligible_at timestamptz, review_reason text, evidence_id uuid REFERENCES ct_evidence,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(founder_id IS DISTINCT FROM reviewer_id)
);
CREATE INDEX validation_session_due ON ct_validation_sessions(starts_at) WHERE status IN ('booked','review');
CREATE TABLE public.ct_validation_rewards (
 session_id uuid PRIMARY KEY REFERENCES ct_validation_sessions ON DELETE RESTRICT,
 reviewer_id uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT, founder_id uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
 amount integer NOT NULL DEFAULT 20 CHECK(amount=20), granted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ct_validation_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),session_id uuid NOT NULL REFERENCES ct_validation_sessions ON DELETE CASCADE,
 event text NOT NULL,detail jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['ct_reviewer_profiles','ct_reviewer_exclusions','ct_reviewer_slots','ct_validation_google_accounts','ct_validation_oauth_states','ct_validation_sessions','ct_validation_rewards','ct_validation_events'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM anon,authenticated',t);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
 END LOOP;
END $$;
CREATE POLICY owner_profile ON ct_reviewer_profiles FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE POLICY owner_exclusion ON ct_reviewer_exclusions FOR ALL TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE POLICY owner_slots ON ct_reviewer_slots FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY participant_sessions ON ct_validation_sessions FOR SELECT TO authenticated USING(founder_id=auth.uid() OR reviewer_id=auth.uid());
CREATE POLICY reviewer_rewards ON ct_validation_rewards FOR SELECT TO authenticated USING(reviewer_id=auth.uid());
CREATE POLICY participant_events ON ct_validation_events FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM ct_validation_sessions WHERE id=session_id AND (founder_id=auth.uid() OR reviewer_id=auth.uid())));
GRANT SELECT,INSERT,UPDATE,DELETE ON ct_reviewer_profiles,ct_reviewer_exclusions TO authenticated;
GRANT SELECT ON ct_reviewer_slots,ct_validation_sessions,ct_validation_rewards,ct_validation_events TO authenticated;
-- Invitation bearer credentials stay service-only, even to authenticated participants.
REVOKE SELECT ON ct_validation_sessions FROM authenticated;
GRANT SELECT(id,founder_id,reviewer_id,product_id,context_id,slot_id,starts_at,status,guest_name,calendar_state,calendar_error,meet_url,attendance_status,overlap_seconds,pre_feedback,feedback,feedback_at,target_customer,screening,reward_status,reward_eligible_at,review_reason,evidence_id,created_at) ON ct_validation_sessions TO authenticated;

CREATE FUNCTION public.ct_find_reviewers(p_language text,p_role text,p_industry text,p_problems text[],p_from timestamptz,p_to timestamptz)
RETURNS TABLE(slot_id uuid,user_id uuid,display_name text,role text,industry text,timezone text,starts_at timestamptz,match_reasons text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT s.id,p.user_id,p.display_name,p.role,p.industry,p.timezone,s.starts_at,
   array_remove(ARRAY[CASE WHEN p.problems&&p_problems THEN 'Has experienced a matching problem' END,CASE WHEN lower(p.role)=lower(p_role) THEN 'Matches the buyer or user role' END,CASE WHEN lower(p.industry)=lower(p_industry) THEN 'Works in the target industry' END],NULL)
 FROM ct_reviewer_profiles p JOIN ct_reviewer_slots s ON s.user_id=p.user_id
 WHERE auth.uid() IS NOT NULL AND p.opted_in AND p.user_id<>auth.uid() AND p_language=ANY(p.languages)
   AND NOT s.booked AND s.starts_at>now() AND s.starts_at BETWEEN p_from AND p_to
   AND NOT EXISTS(SELECT 1 FROM ct_reviewer_exclusions e WHERE (e.user_id=auth.uid() AND e.other_user_id=p.user_id) OR (e.user_id=p.user_id AND e.other_user_id=auth.uid()))
 ORDER BY (p.problems&&p_problems) DESC,(lower(p.role)=lower(p_role)) DESC,(lower(p.industry)=lower(p_industry)) DESC,s.starts_at LIMIT 30;
$$;
CREATE FUNCTION public.ct_offer_reviewer_slot(p_start timestamptz) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result uuid; BEGIN
 IF auth.uid() IS NULL OR p_start<now()+interval '1 hour' OR p_start>now()+interval '90 days' THEN RAISE EXCEPTION 'Choose a time between one hour and 90 days from now'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 IF EXISTS(SELECT 1 FROM ct_reviewer_slots WHERE user_id=auth.uid() AND starts_at<p_start+interval '25 minutes' AND starts_at+interval '25 minutes'>p_start) THEN RAISE EXCEPTION 'This availability overlaps another slot'; END IF;
 INSERT INTO ct_reviewer_slots(user_id,starts_at) VALUES(auth.uid(),p_start) RETURNING id INTO result; RETURN result;
END $$;
CREATE FUNCTION public.ct_book_validation(p_slot uuid,p_context uuid,p_product uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s ct_reviewer_slots; result uuid; BEGIN
 -- One lock serializes booking, rescheduling and reward eligibility checks during the small pilot.
 PERFORM pg_advisory_xact_lock(hashtextextended('ct-validation-pilot',0));
 SELECT * INTO s FROM ct_reviewer_slots WHERE id=p_slot AND NOT booked AND starts_at>now() FOR UPDATE;
 IF NOT FOUND OR s.user_id=auth.uid() OR auth.uid() IS NULL THEN RAISE EXCEPTION 'Slot is no longer available'; END IF;
 IF NOT EXISTS(SELECT 1 FROM ct_product_artifacts WHERE user_id=auth.uid() AND product_id=p_product AND artifact_id=p_context AND tool='pmf_lab') THEN RAISE EXCEPTION 'Assign this validation context to your product first'; END IF;
 IF NOT EXISTS(SELECT 1 FROM ct_reviewer_profiles WHERE user_id=s.user_id AND opted_in) OR EXISTS(SELECT 1 FROM ct_reviewer_exclusions WHERE (user_id=auth.uid() AND other_user_id=s.user_id) OR (user_id=s.user_id AND other_user_id=auth.uid())) THEN RAISE EXCEPTION 'This reviewer is unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM ct_validation_sessions WHERE status IN ('booked','invited') AND (founder_id IN (auth.uid(),s.user_id) OR reviewer_id IN (auth.uid(),s.user_id)) AND starts_at<s.starts_at+interval '25 minutes' AND starts_at+interval '25 minutes'>s.starts_at) THEN RAISE EXCEPTION 'A participant already has a session at this time'; END IF;
 IF NOT EXISTS(SELECT 1 FROM ct_validation_google_accounts WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Connect Google Calendar before booking'; END IF;
 INSERT INTO ct_validation_sessions(founder_id,reviewer_id,product_id,context_id,slot_id,starts_at) VALUES(auth.uid(),s.user_id,p_product,p_context,s.id,s.starts_at) RETURNING id INTO result;
 UPDATE ct_reviewer_slots SET booked=true WHERE id=s.id;
 INSERT INTO ct_validation_events(session_id,event) VALUES(result,'booked'); RETURN result;
END $$;

CREATE FUNCTION public.ct_grant_validation_reward(p_session uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s ct_validation_sessions; eligible boolean; reason text; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('ct-validation-pilot',0));
 SELECT * INTO s FROM ct_validation_sessions WHERE id=p_session FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
 IF EXISTS(SELECT 1 FROM ct_validation_rewards WHERE session_id=s.id) THEN RETURN 'granted'; END IF;
 IF s.reviewer_id IS NULL THEN UPDATE ct_validation_sessions SET reward_status='ineligible' WHERE id=s.id; RETURN 'ineligible'; END IF;
 IF s.status='cancelled' OR s.attendance_status<>'verified' OR s.overlap_seconds<900 OR s.feedback IS NULL OR s.pre_feedback IS NULL OR s.feedback_at IS NULL OR s.feedback_at+interval '24 hours'>now() THEN RETURN 'pending'; END IF;
 IF s.reward_status='review' OR s.review_reason IS NOT NULL THEN RETURN 'review'; END IF;
 SELECT email_confirmed_at IS NOT NULL AND created_at<=s.starts_at-interval '7 days' INTO eligible FROM auth.users WHERE id=s.reviewer_id;
 IF NOT coalesce(eligible,false) THEN reason:='Reviewer account must have verified email and be seven days old at the session';
 ELSIF (SELECT count(*) FROM ct_validation_rewards)>=100 THEN reason:='The 100-session pilot credit limit has been reached';
 ELSIF (SELECT count(*) FROM ct_validation_rewards r JOIN ct_validation_sessions v ON v.id=r.session_id WHERE r.reviewer_id=s.reviewer_id AND date_trunc('week',v.starts_at AT TIME ZONE 'UTC')=date_trunc('week',s.starts_at AT TIME ZONE 'UTC'))>=2 THEN reason:='Weekly reward limit reached';
 ELSIF (SELECT count(*) FROM ct_validation_rewards r JOIN ct_validation_sessions v ON v.id=r.session_id WHERE r.reviewer_id=s.reviewer_id AND date_trunc('month',v.starts_at AT TIME ZONE 'UTC')=date_trunc('month',s.starts_at AT TIME ZONE 'UTC'))>=4 THEN reason:='Monthly reward limit reached';
 ELSIF EXISTS(SELECT 1 FROM ct_validation_rewards r JOIN ct_validation_sessions v ON v.id=r.session_id WHERE ((r.reviewer_id=s.reviewer_id AND r.founder_id=s.founder_id) OR (r.reviewer_id=s.founder_id AND r.founder_id=s.reviewer_id)) AND abs(extract(epoch FROM v.starts_at-s.starts_at))<30*86400) THEN reason:='This pairing already received a reward in the last 30 days';
 ELSIF EXISTS(SELECT 1 FROM ct_validation_rewards r JOIN ct_validation_sessions v ON v.id=r.session_id WHERE (r.reviewer_id=s.reviewer_id OR r.founder_id=s.reviewer_id) AND v.starts_at<s.starts_at+interval '25 minutes' AND v.starts_at+interval '25 minutes'>s.starts_at) THEN reason:='Overlapping rewarded session';
 END IF;
 IF reason IS NOT NULL THEN UPDATE ct_validation_sessions SET reward_status='ineligible',review_reason=reason WHERE id=s.id; RETURN 'ineligible'; END IF;
 IF s.attendance_evidence->>'reviewedBy' IS NULL AND (EXISTS(SELECT 1 FROM ct_validation_sessions v WHERE v.id<>s.id AND v.reviewer_id=s.reviewer_id AND v.feedback=s.feedback)
 OR EXISTS(SELECT 1 FROM ct_validation_sessions v WHERE v.id<>s.id AND v.reviewer_id=s.founder_id AND v.founder_id=s.reviewer_id AND v.starts_at>now()-interval '60 days')
 OR EXISTS(SELECT 1 FROM ct_reviewer_exclusions WHERE (user_id=s.founder_id AND other_user_id=s.reviewer_id) OR (user_id=s.reviewer_id AND other_user_id=s.founder_id))) THEN
  UPDATE ct_validation_sessions SET reward_status='review',review_reason='Duplicate feedback, reciprocal sessions or declared relationship requires review' WHERE id=s.id; RETURN 'review';
 END IF;
 INSERT INTO ct_validation_rewards(session_id,reviewer_id,founder_id) VALUES(s.id,s.reviewer_id,s.founder_id);
 UPDATE user_credits SET balance=balance+20,updated_at=now() WHERE user_id=s.reviewer_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reviewer wallet not found'; END IF;
 INSERT INTO credit_transactions(user_id,amount,tx_type,reason,feature,metadata) VALUES(s.reviewer_id,20,'grant','Completed validation feedback','PMF validation',jsonb_build_object('sessionId',s.id,'idempotencyKey','validation:'||s.id));
 UPDATE ct_validation_sessions SET reward_status='granted' WHERE id=s.id;
 INSERT INTO ct_validation_events(session_id,event,detail) VALUES(s.id,'reward_granted','{"credits":20}'); RETURN 'granted';
END $$;
REVOKE ALL ON FUNCTION public.ct_find_reviewers(text,text,text,text[],timestamptz,timestamptz),public.ct_offer_reviewer_slot(timestamptz),public.ct_book_validation(uuid,uuid,uuid),public.ct_grant_validation_reward(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ct_find_reviewers(text,text,text,text[],timestamptz,timestamptz),public.ct_offer_reviewer_slot(timestamptz),public.ct_book_validation(uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ct_grant_validation_reward(uuid) TO service_role;
