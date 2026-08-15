-- Dashboard social recommendations: authoritative interaction ledger and V3 snapshot.

CREATE TABLE IF NOT EXISTS public.social_interaction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  interaction_type text NOT NULL CHECK (interaction_type IN (
    'message_sent', 'reply_sent', 'connection_request_sent', 'connection_accepted',
    'cofounder_interest_sent', 'cofounder_interest_accepted', 'discovery_call_booked'
  )),
  source_surface text NOT NULL,
  source_entity_type text,
  source_entity_id text,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  idempotency_key text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_interaction_events_idempotency_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS social_interaction_events_actor_time_idx
  ON public.social_interaction_events (actor_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS social_interaction_events_counterparty_time_idx
  ON public.social_interaction_events (counterparty_user_id, occurred_at DESC)
  WHERE counterparty_user_id IS NOT NULL;

ALTER TABLE public.social_interaction_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read their own social interactions" ON public.social_interaction_events;
CREATE POLICY "Users read their own social interactions"
  ON public.social_interaction_events FOR SELECT TO authenticated
  USING (actor_user_id = auth.uid());

REVOKE ALL ON TABLE public.social_interaction_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.social_interaction_events TO authenticated;
GRANT ALL ON TABLE public.social_interaction_events TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='social_interaction_events'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.social_interaction_events;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_message_social_interaction_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counterparty uuid;
  v_is_reply boolean;
BEGIN
  SELECT participant INTO v_counterparty
  FROM public.conversations c
  CROSS JOIN LATERAL unnest(c.participants) participant
  WHERE c.id = NEW.conversation_id AND participant <> NEW.sender_id
  ORDER BY participant LIMIT 1;

  IF v_counterparty IS NULL THEN RETURN NEW; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.messages prior
    WHERE prior.conversation_id = NEW.conversation_id
      AND prior.sender_id = v_counterparty
      AND prior.created_at < NEW.created_at
  ) INTO v_is_reply;

  INSERT INTO public.social_interaction_events (
    actor_user_id, counterparty_user_id, interaction_type, source_surface,
    source_entity_type, source_entity_id, conversation_id, occurred_at, idempotency_key
  ) VALUES (
    NEW.sender_id, v_counterparty, CASE WHEN v_is_reply THEN 'reply_sent' ELSE 'message_sent' END,
    'messages', 'message', NEW.id::text, NEW.conversation_id, NEW.created_at, 'message:' || NEW.id::text
  ) ON CONFLICT (idempotency_key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS capture_message_social_interaction_v1 ON public.messages;
CREATE TRIGGER capture_message_social_interaction_v1
AFTER INSERT ON public.messages FOR EACH ROW
EXECUTE FUNCTION public.capture_message_social_interaction_v1();

CREATE OR REPLACE FUNCTION public.capture_friend_social_interaction_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.social_interaction_events (
      actor_user_id, counterparty_user_id, interaction_type, source_surface,
      source_entity_type, source_entity_id, occurred_at, idempotency_key
    ) VALUES (
      NEW.sender_id, NEW.receiver_id, 'connection_request_sent', 'network',
      'friend_request', NEW.id::text, NEW.created_at, 'friend-request:' || NEW.id::text
    ) ON CONFLICT (idempotency_key) DO NOTHING;
  ELSIF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    INSERT INTO public.social_interaction_events (
      actor_user_id, counterparty_user_id, interaction_type, source_surface,
      source_entity_type, source_entity_id, occurred_at, idempotency_key
    ) VALUES (
      NEW.receiver_id, NEW.sender_id, 'connection_accepted', 'network',
      'friend_request', NEW.id::text, NEW.updated_at, 'friend-accepted:' || NEW.id::text
    ) ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS capture_friend_social_interaction_v1 ON public.friend_requests;
CREATE TRIGGER capture_friend_social_interaction_v1
AFTER INSERT OR UPDATE OF status ON public.friend_requests FOR EACH ROW
EXECUTE FUNCTION public.capture_friend_social_interaction_v1();

CREATE OR REPLACE FUNCTION public.capture_cofounder_social_interaction_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.social_interaction_events (
      actor_user_id, counterparty_user_id, interaction_type, source_surface,
      source_entity_type, source_entity_id, occurred_at, idempotency_key
    ) VALUES (
      NEW.sender_id, NEW.recipient_id, 'cofounder_interest_sent', 'cofounder_marketplace',
      'cofounder_interest', NEW.id::text, NEW.created_at, 'cofounder-interest:' || NEW.id::text
    ) ON CONFLICT (idempotency_key) DO NOTHING;
  ELSIF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    INSERT INTO public.social_interaction_events (
      actor_user_id, counterparty_user_id, interaction_type, source_surface,
      source_entity_type, source_entity_id, conversation_id, occurred_at, idempotency_key
    ) VALUES (
      NEW.recipient_id, NEW.sender_id, 'cofounder_interest_accepted', 'cofounder_marketplace',
      'cofounder_interest', NEW.id::text, NEW.conversation_id, COALESCE(NEW.responded_at, NEW.updated_at),
      'cofounder-accepted:' || NEW.id::text
    ) ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS capture_cofounder_social_interaction_v1 ON public.cofounder_interests;
CREATE TRIGGER capture_cofounder_social_interaction_v1
AFTER INSERT OR UPDATE OF status ON public.cofounder_interests FOR EACH ROW
EXECUTE FUNCTION public.capture_cofounder_social_interaction_v1();

CREATE OR REPLACE FUNCTION public.capture_discovery_call_social_interaction_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_mentor_user uuid;
BEGIN
  IF NEW.status::text = 'scheduled' AND (TG_OP = 'INSERT' OR OLD.status::text IS DISTINCT FROM 'scheduled') THEN
    SELECT user_id INTO v_mentor_user FROM public.mentors WHERE id = NEW.mentor_id;
    INSERT INTO public.social_interaction_events (
      actor_user_id, counterparty_user_id, interaction_type, source_surface,
      source_entity_type, source_entity_id, occurred_at, idempotency_key
    ) VALUES (
      NEW.founder_id, v_mentor_user, 'discovery_call_booked', 'network',
      'discovery_call', NEW.id::text, COALESCE(NEW.scheduled_for, NEW.updated_at, now()),
      'discovery-call-booked:' || NEW.id::text
    ) ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS capture_discovery_call_social_interaction_v1 ON public.discovery_calls;
CREATE TRIGGER capture_discovery_call_social_interaction_v1
AFTER INSERT OR UPDATE OF status ON public.discovery_calls FOR EACH ROW
EXECUTE FUNCTION public.capture_discovery_call_social_interaction_v1();

REVOKE ALL ON FUNCTION public.capture_message_social_interaction_v1() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.capture_friend_social_interaction_v1() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.capture_cofounder_social_interaction_v1() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.capture_discovery_call_social_interaction_v1() FROM PUBLIC, anon, authenticated;

-- Idempotent 90-day backfill for the first experiment baseline.
INSERT INTO public.social_interaction_events (
  actor_user_id, counterparty_user_id, interaction_type, source_surface,
  source_entity_type, source_entity_id, conversation_id, occurred_at, idempotency_key
)
SELECT m.sender_id, other.user_id,
       CASE WHEN EXISTS (
         SELECT 1 FROM public.messages prior
         WHERE prior.conversation_id=m.conversation_id AND prior.sender_id=other.user_id AND prior.created_at<m.created_at
       ) THEN 'reply_sent' ELSE 'message_sent' END,
       'messages', 'message', m.id::text, m.conversation_id, m.created_at, 'message:'||m.id::text
FROM public.messages m
JOIN public.conversations c ON c.id=m.conversation_id
CROSS JOIN LATERAL (
  SELECT participant user_id FROM unnest(c.participants) participant
  WHERE participant<>m.sender_id ORDER BY participant LIMIT 1
) other
WHERE m.created_at>=now()-interval '90 days'
ON CONFLICT (idempotency_key) DO NOTHING;

INSERT INTO public.social_interaction_events (
  actor_user_id, counterparty_user_id, interaction_type, source_surface,
  source_entity_type, source_entity_id, occurred_at, idempotency_key
)
SELECT sender_id, receiver_id, 'connection_request_sent', 'network', 'friend_request', id::text,
       created_at, 'friend-request:'||id::text
FROM public.friend_requests WHERE created_at>=now()-interval '90 days'
ON CONFLICT (idempotency_key) DO NOTHING;

INSERT INTO public.social_interaction_events (
  actor_user_id, counterparty_user_id, interaction_type, source_surface,
  source_entity_type, source_entity_id, occurred_at, idempotency_key
)
SELECT receiver_id, sender_id, 'connection_accepted', 'network', 'friend_request', id::text,
       updated_at, 'friend-accepted:'||id::text
FROM public.friend_requests WHERE status='accepted' AND updated_at>=now()-interval '90 days'
ON CONFLICT (idempotency_key) DO NOTHING;

INSERT INTO public.social_interaction_events (
  actor_user_id, counterparty_user_id, interaction_type, source_surface,
  source_entity_type, source_entity_id, occurred_at, idempotency_key
)
SELECT sender_id, recipient_id, 'cofounder_interest_sent', 'cofounder_marketplace',
       'cofounder_interest', id::text, created_at, 'cofounder-interest:'||id::text
FROM public.cofounder_interests WHERE created_at>=now()-interval '90 days'
ON CONFLICT (idempotency_key) DO NOTHING;

INSERT INTO public.social_interaction_events (
  actor_user_id, counterparty_user_id, interaction_type, source_surface,
  source_entity_type, source_entity_id, conversation_id, occurred_at, idempotency_key
)
SELECT ci.recipient_id, ci.sender_id, 'cofounder_interest_accepted', 'cofounder_marketplace',
       'cofounder_interest', ci.id::text, ci.conversation_id, COALESCE(ci.responded_at,ci.updated_at),
       'cofounder-accepted:'||ci.id::text
FROM public.cofounder_interests ci
WHERE ci.status='accepted' AND COALESCE(ci.responded_at,ci.updated_at)>=now()-interval '90 days'
ON CONFLICT (idempotency_key) DO NOTHING;

INSERT INTO public.social_interaction_events (
  actor_user_id, counterparty_user_id, interaction_type, source_surface,
  source_entity_type, source_entity_id, occurred_at, idempotency_key
)
SELECT dc.founder_id, m.user_id, 'discovery_call_booked', 'network', 'discovery_call', dc.id::text,
       COALESCE(dc.scheduled_for,dc.updated_at), 'discovery-call-booked:'||dc.id::text
FROM public.discovery_calls dc JOIN public.mentors m ON m.id=dc.mentor_id
WHERE dc.status::text IN ('scheduled','awaiting_outcome','completed')
  AND COALESCE(dc.scheduled_for,dc.updated_at)>=now()-interval '90 days'
ON CONFLICT (idempotency_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_dashboard_snapshot_v3(p_timezone text DEFAULT 'UTC')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_v2 jsonb;
  v_interactions integer := 0;
  v_unique_people integer := 0;
  v_replies_sent integer := 0;
  v_replies_received integer := 0;
  v_reactive jsonb := '[]'::jsonb;
  v_proactive jsonb := '[]'::jsonb;
  v_candidates jsonb := '[]'::jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  v_v2 := public.get_dashboard_snapshot_v2(p_timezone);

  SELECT count(*)::integer,
         count(DISTINCT counterparty_user_id)::integer,
         count(*) FILTER (WHERE interaction_type='reply_sent')::integer
  INTO v_interactions, v_unique_people, v_replies_sent
  FROM public.social_interaction_events
  WHERE actor_user_id=v_user AND occurred_at>=now()-interval '7 days';

  SELECT count(*)::integer INTO v_replies_received
  FROM public.social_interaction_events
  WHERE counterparty_user_id=v_user AND interaction_type='reply_sent'
    AND occurred_at>=now()-interval '7 days';

  WITH candidate_rows AS (
    SELECT 0 priority, latest.created_at occurred_at,
      jsonb_build_object(
        'key','social:conversation:'||c.id, 'kind','human_reply', 'toolKey','messages',
        'entityId',c.id, 'title','Reply to '||COALESCE(p.full_name,p.username,'a founder'),
        'description',CASE WHEN cus.request_status='pending' THEN 'Review this message request and respond if it is relevant.' ELSE 'A person is waiting for your response. Keep the relationship moving.' END,
        'urgency','high','reasonCodes',jsonb_build_array(CASE WHEN cus.request_status='pending' THEN 'incoming_message_request' ELSE 'waiting_human_response' END),
        'estimatedMinutes',3,'dueAt',NULL,'actionKind','open_social_action',
        'actionUrl','/messages?conversationId='||c.id,
        'priorityBand',CASE WHEN cus.request_status='pending' THEN 'human_request' ELSE 'human_reply' END,
        'interaction',jsonb_build_object('type',CASE WHEN cus.request_status='pending' THEN 'message_request' ELSE 'reply' END,
          'counterpartyType','founder','counterpartyId',p.id,'displayName',COALESCE(p.full_name,p.username,'Founder'),
          'avatarUrl',p.avatar_url,'ctaLabel',CASE WHEN cus.request_status='pending' THEN 'Review request' ELSE 'Reply' END)
      ) action
    FROM public.conversations c
    JOIN public.conversation_user_settings cus ON cus.conversation_id=c.id AND cus.user_id=v_user
    JOIN LATERAL (
      SELECT m.sender_id,m.created_at FROM public.messages m
      WHERE m.conversation_id=c.id AND m.sender_id<>v_user AND COALESCE(m.is_read,false)=false
      ORDER BY m.created_at DESC LIMIT 1
    ) latest ON true
    JOIN public.profiles p ON p.id=latest.sender_id
    WHERE v_user=ANY(c.participants) AND COALESCE(cus.request_status,'accepted')<>'refused'
      AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE
        (b.blocker_id=v_user AND b.blocked_id=p.id) OR (b.blocker_id=p.id AND b.blocked_id=v_user))

    UNION ALL

    SELECT 1, ci.created_at,
      jsonb_build_object(
        'key','social:cofounder-request:'||ci.id,'kind','human_reply','toolKey','find_cofounder',
        'entityId',ci.id,'title','Respond to '||COALESCE(p.full_name,'a co-founder candidate'),
        'description','They expressed interest in building together. Review the fit while the request is fresh.',
        'urgency','high','reasonCodes',jsonb_build_array('incoming_cofounder_request'),
        'estimatedMinutes',4,'dueAt',ci.expires_at,'actionKind','open_social_action',
        'actionUrl','/co-founder?tab=requests','priorityBand','human_request',
        'interaction',jsonb_build_object('type','cofounder_request','counterpartyType','cofounder',
          'counterpartyId',ci.sender_id,'displayName',COALESCE(p.full_name,'Founder'),'avatarUrl',p.avatar_url,'ctaLabel','Review request')
      )
    FROM public.cofounder_interests ci JOIN public.profiles p ON p.id=ci.sender_id
    WHERE ci.recipient_id=v_user AND ci.status='pending' AND ci.expires_at>now()
      AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE
        (b.blocker_id=v_user AND b.blocked_id=ci.sender_id) OR (b.blocker_id=ci.sender_id AND b.blocked_id=v_user))

    UNION ALL

    SELECT 2, fr.created_at,
      jsonb_build_object(
        'key','social:connection-request:'||fr.id,'kind','human_reply','toolKey','messages',
        'entityId',fr.id,'title','Respond to '||COALESCE(p.full_name,p.username,'a founder'),
        'description','Review this connection request, then start a useful conversation if it is a fit.',
        'urgency','high','reasonCodes',jsonb_build_array('incoming_connection_request'),
        'estimatedMinutes',3,'dueAt',NULL,'actionKind','open_social_action',
        'actionUrl',CASE WHEN p.username IS NOT NULL THEN '/profile/'||p.username ELSE '/messages' END,'priorityBand','human_request',
        'interaction',jsonb_build_object('type','connection_request','counterpartyType','founder',
          'counterpartyId',fr.sender_id,'displayName',COALESCE(p.full_name,p.username,'Founder'),'avatarUrl',p.avatar_url,'ctaLabel','Review request')
      )
    FROM public.friend_requests fr JOIN public.profiles p ON p.id=fr.sender_id
    WHERE fr.receiver_id=v_user AND fr.status='pending'
      AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE
        (b.blocker_id=v_user AND b.blocked_id=fr.sender_id) OR (b.blocker_id=fr.sender_id AND b.blocked_id=v_user))

    UNION ALL

    SELECT 3, COALESCE(dc.response_due_at,dc.updated_at),
      jsonb_build_object(
        'key','social:discovery-call:'||dc.id,'kind','human_reply','toolKey','find_mentor',
        'entityId',dc.id,'title','Respond to '||dc.mentor_name_snapshot,
        'description','A discovery-call decision is waiting for you.',
        'urgency','high','reasonCodes',jsonb_build_array('pending_booking_response'),
        'estimatedMinutes',4,'dueAt',dc.response_due_at,'actionKind','open_social_action',
        'actionUrl','/mentorship/my-bookings','priorityBand','human_request',
        'interaction',jsonb_build_object('type','booking_response','counterpartyType','mentor',
          'counterpartyId',m.user_id,'displayName',dc.mentor_name_snapshot,'avatarUrl',m.picture,'ctaLabel','Review booking')
      )
    FROM public.discovery_calls dc JOIN public.mentors m ON m.id=dc.mentor_id
    WHERE dc.founder_id=v_user AND dc.status::text='pending_founder_response'
      AND (m.user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE
        (b.blocker_id=v_user AND b.blocked_id=m.user_id) OR (b.blocker_id=m.user_id AND b.blocked_id=v_user)))
  )
  SELECT COALESCE(jsonb_agg(action ORDER BY priority,occurred_at), '[]'::jsonb)
  INTO v_reactive FROM (SELECT * FROM candidate_rows ORDER BY priority,occurred_at LIMIT 3) ranked;

  IF jsonb_array_length(v_reactive)=0 THEN
    WITH proactive_rows AS (
      SELECT 0 priority, last_message.created_at,
        jsonb_build_object(
          'key','social:follow-up:'||c.id,'kind','recommendation','toolKey','messages','entityId',c.id,
          'title','Follow up with '||COALESCE(p.full_name,p.username,'a founder'),
          'description','Your last message has been waiting for at least three days. Send one useful follow-up, then give them space.',
          'urgency','medium','reasonCodes',jsonb_build_array('relationship_follow_up_due'),
          'estimatedMinutes',4,'dueAt',NULL,'actionKind','open_social_action',
          'actionUrl','/messages?conversationId='||c.id,'priorityBand','proactive_social',
          'interaction',jsonb_build_object('type','conversation_follow_up','counterpartyType','founder',
            'counterpartyId',p.id,'displayName',COALESCE(p.full_name,p.username,'Founder'),'avatarUrl',p.avatar_url,'ctaLabel','Follow up')
        ) action
      FROM public.conversations c
      JOIN public.conversation_user_settings cus ON cus.conversation_id=c.id AND cus.user_id=v_user AND cus.request_status='accepted'
      JOIN LATERAL (
        SELECT m.sender_id,m.created_at FROM public.messages m WHERE m.conversation_id=c.id
        ORDER BY m.created_at DESC LIMIT 1
      ) last_message ON true
      JOIN LATERAL (
        SELECT p2.* FROM unnest(c.participants) participant JOIN public.profiles p2 ON p2.id=participant
        WHERE participant<>v_user LIMIT 1
      ) p ON true
      WHERE v_user=ANY(c.participants) AND last_message.sender_id=v_user
        AND last_message.created_at BETWEEN now()-interval '30 days' AND now()-interval '72 hours'
        AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE (b.blocker_id=v_user AND b.blocked_id=p.id) OR (b.blocker_id=p.id AND b.blocked_id=v_user))

      UNION ALL

      SELECT 1, fr.updated_at,
        jsonb_build_object(
          'key','social:accepted-connection:'||fr.id,'kind','recommendation','toolKey','messages','entityId',fr.id,
          'title','Start a conversation with '||COALESCE(p.full_name,p.username,'your new connection'),
          'description','This connection was accepted. Introduce yourself while the context is still fresh.',
          'urgency','medium','reasonCodes',jsonb_build_array('connection_accepted_no_conversation'),
          'estimatedMinutes',4,'dueAt',NULL,'actionKind','open_social_action',
          'actionUrl',CASE WHEN p.username IS NOT NULL THEN '/messages/'||p.username ELSE '/messages' END,
          'priorityBand','proactive_social','interaction',jsonb_build_object('type','connection_message','counterpartyType','founder',
            'counterpartyId',p.id,'displayName',COALESCE(p.full_name,p.username,'Founder'),'avatarUrl',p.avatar_url,'ctaLabel','Message')
        )
      FROM public.friend_requests fr
      JOIN public.profiles p ON p.id=CASE WHEN fr.sender_id=v_user THEN fr.receiver_id ELSE fr.sender_id END
      WHERE (fr.sender_id=v_user OR fr.receiver_id=v_user) AND fr.status='accepted'
        AND fr.updated_at>=now()-interval '30 days'
        AND NOT EXISTS (SELECT 1 FROM public.social_interaction_events e WHERE e.actor_user_id=v_user AND e.counterparty_user_id=p.id AND e.occurred_at>=now()-interval '7 days')
        AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE (b.blocker_id=v_user AND b.blocked_id=p.id) OR (b.blocker_id=p.id AND b.blocked_id=v_user))

      UNION ALL

      SELECT 2 priority, ms.created_at,
        jsonb_build_object(
          'key','social:mentor:'||m.id,'kind','recommendation','toolKey','find_mentor','entityId',m.id,
          'title','Message '||m.name,'description','You saved this mentor. Ask one focused question connected to your current challenge.',
          'urgency','medium','reasonCodes',jsonb_build_array('saved_mentor_not_contacted'),
          'estimatedMinutes',5,'dueAt',NULL,'actionKind','open_social_action',
          'actionUrl',CASE WHEN p.username IS NOT NULL THEN '/messages/'||p.username ELSE '/saved-mentors' END,
          'priorityBand','proactive_social','interaction',jsonb_build_object('type','mentor_message','counterpartyType','mentor',
            'counterpartyId',m.user_id,'displayName',m.name,'avatarUrl',m.picture,'ctaLabel','Message')
        ) action
      FROM public.mentor_saves ms JOIN public.mentors m ON m.id=ms.mentor_id AND m.is_active=true AND m.user_id IS NOT NULL
      LEFT JOIN public.profiles p ON p.id=m.user_id
      WHERE ms.user_id=v_user AND m.user_id<>v_user
        AND NOT EXISTS (SELECT 1 FROM public.social_interaction_events e WHERE e.actor_user_id=v_user AND e.counterparty_user_id=m.user_id AND e.occurred_at>=now()-interval '7 days')
        AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE (b.blocker_id=v_user AND b.blocked_id=m.user_id) OR (b.blocker_id=m.user_id AND b.blocked_id=v_user))

      UNION ALL

      SELECT 3, s.created_at,
        jsonb_build_object(
          'key','social:service:'||s.id,'kind','recommendation','toolKey','marketplace','entityId',s.id,
          'title','Message '||COALESCE(s.delivered_by_name,s.name),
          'description','Start a focused conversation with this service provider. In-app messages are free.',
          'urgency','medium','reasonCodes',jsonb_build_array('relevant_service_provider'),
          'estimatedMinutes',5,'dueAt',NULL,'actionKind','open_social_action',
          'actionUrl','/marketplace/'||COALESCE(NULLIF(s.slug,''),s.id::text),'priorityBand','proactive_social',
          'interaction',jsonb_build_object('type','service_message','counterpartyType','service_provider',
            'counterpartyId',s.delivered_by_user_id,'displayName',COALESCE(s.delivered_by_name,s.name),
            'avatarUrl',s.delivered_by_picture_url,'ctaLabel','Message')
        )
      FROM public.services s
      WHERE s.is_active=true AND s.delivered_by_user_id IS NOT NULL AND s.delivered_by_user_id<>v_user
        AND NOT EXISTS (SELECT 1 FROM public.social_interaction_events e WHERE e.actor_user_id=v_user AND e.counterparty_user_id=s.delivered_by_user_id AND e.occurred_at>=now()-interval '7 days')
        AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE (b.blocker_id=v_user AND b.blocked_id=s.delivered_by_user_id) OR (b.blocker_id=s.delivered_by_user_id AND b.blocked_id=v_user))

      UNION ALL

      SELECT 4, cp.last_active_at,
        jsonb_build_object(
          'key','social:cofounder:'||cp.id,'kind','recommendation','toolKey','find_cofounder','entityId',cp.id,
          'title','Connect with '||COALESCE(p.full_name,'a co-founder candidate'),
          'description','Review this active co-founder profile and send a thoughtful interest request if the fit is real.',
          'urgency','medium','reasonCodes',jsonb_build_array('active_cofounder_match'),
          'estimatedMinutes',6,'dueAt',cp.expires_at,'actionKind','open_social_action',
          'actionUrl','/co-founder/listing/'||cp.id,'priorityBand','proactive_social',
          'interaction',jsonb_build_object('type','cofounder_interest','counterpartyType','cofounder',
            'counterpartyId',cp.user_id,'displayName',COALESCE(p.full_name,'Founder'),'avatarUrl',p.avatar_url,'ctaLabel','View match')
        )
      FROM public.cofounder_posts cp JOIN public.profiles p ON p.id=cp.user_id
      WHERE cp.status='active' AND cp.user_id<>v_user AND cp.expires_at>now()
        AND NOT EXISTS (SELECT 1 FROM public.cofounder_interests ci WHERE ci.sender_id=v_user AND ci.listing_id=cp.id)
        AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE (b.blocker_id=v_user AND b.blocked_id=cp.user_id) OR (b.blocker_id=cp.user_id AND b.blocked_id=v_user))
    ), eligible AS (
      SELECT * FROM proactive_rows pr
      WHERE NOT EXISTS (
        SELECT 1 FROM public.recommendation_decisions rd
        WHERE rd.user_id=v_user AND rd.selected_key=pr.action->>'key' AND rd.shown_at>=now()-interval '7 days'
      )
      ORDER BY priority,created_at DESC LIMIT 1
    )
    SELECT COALESCE(jsonb_agg(action), '[]'::jsonb) INTO v_proactive FROM eligible;
  END IF;

  v_candidates := CASE WHEN jsonb_array_length(v_reactive)>0 THEN v_reactive ELSE v_proactive END;

  RETURN (v_v2-'version') || jsonb_build_object(
    'version',3,
    'social',jsonb_build_object(
      'completedInteractions7',v_interactions,
      'uniquePeople7',v_unique_people,
      'repliesSent7',v_replies_sent,
      'repliesReceived7',v_replies_received,
      'candidates',v_candidates
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_snapshot_v3(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_snapshot_v3(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.record_recommendation_feedback_v1(
  p_recommendation_key text,
  p_surface text,
  p_relevance text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_decision public.recommendation_decisions;
  v_reason text;
  v_scope text;
  v_until timestamptz;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF p_relevance NOT IN ('helpful','not_relevant') THEN
    RAISE EXCEPTION 'Invalid recommendation feedback' USING ERRCODE='22023';
  END IF;

  SELECT * INTO v_decision FROM public.recommendation_decisions
  WHERE user_id=v_user AND selected_key=p_recommendation_key AND surface=p_surface
    AND shown_at>=now()-interval '8 days'
  ORDER BY shown_at DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Recommendation exposure not found' USING ERRCODE='P0002'; END IF;

  PERFORM public.record_recommendation_outcome_v1(
    p_recommendation_key,p_surface,
    CASE WHEN p_relevance='helpful' THEN 'helpful' ELSE 'not_relevant' END,
    jsonb_build_object('reason',p_reason,'source','structured_feedback')
  );

  IF p_relevance='not_relevant' THEN
    v_reason := CASE WHEN p_reason IN (
      'already_completed','wrong_stage','wrong_goal','too_much_time',
      'already_contacted','not_right_person','remind_later'
    ) THEN p_reason ELSE 'not_relevant' END;
    v_scope := CASE WHEN v_reason IN ('wrong_stage','wrong_goal')
      THEN 'family:'||v_decision.selected_tool_key ELSE 'key:'||v_decision.selected_key END;
    v_until := CASE v_reason
      WHEN 'already_completed' THEN now()+interval '365 days'
      WHEN 'already_contacted' THEN now()+interval '365 days'
      WHEN 'remind_later' THEN now()+interval '1 day'
      WHEN 'too_much_time' THEN now()+interval '7 days'
      ELSE now()+interval '30 days' END;
    INSERT INTO public.recommendation_user_suppressions (
      user_id,scope_key,recommendation_key,recommendation_family,reason,suppressed_until
    ) VALUES (
      v_user,v_scope,v_decision.selected_key,v_decision.selected_tool_key,v_reason,v_until
    ) ON CONFLICT (user_id,scope_key) DO UPDATE SET
      reason=EXCLUDED.reason,
      suppressed_until=GREATEST(public.recommendation_user_suppressions.suppressed_until,EXCLUDED.suppressed_until),
      feedback_count=public.recommendation_user_suppressions.feedback_count+1,
      last_feedback_at=now();
  END IF;
  RETURN jsonb_build_object('ok',true,'suppressedUntil',v_until);
END;
$$;

-- In-app service messages join the free social loop. External email remains paid.
COMMENT ON TABLE public.social_interaction_events IS
  'Server-authoritative completed user-to-user interactions; free-text and message content are intentionally excluded.';
