-- Messaging V2: consolidated reads, server-owned writes, request safety,
-- per-user hiding, soft deletion, mentor pricing disclosure, and notification controls.

ALTER TABLE public.conversation_user_settings
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS dm_email_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS dm_push_enabled boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS conversation_settings_inbox_v2_idx
  ON public.conversation_user_settings (user_id, request_status, archived_at, hidden_at, pinned_at DESC);

CREATE INDEX IF NOT EXISTS messages_sender_created_v2_idx
  ON public.messages (sender_id, created_at DESC, conversation_id);

-- Remove client-authorized shared mutations. Reads remain protected by the
-- existing participant policies; all writes below go through authenticated RPCs.
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_self_participant" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can update their conversations" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_participant" ON public.conversations;
DROP POLICY IF EXISTS "conversations_delete_participant" ON public.conversations;

DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can create messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_sender_is_user_and_participant" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "messages_update_own_for_read" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_sender_only" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_conversation_participant" ON public.messages;

DROP POLICY IF EXISTS "message_attachments_insert_sender" ON public.message_attachments;
DROP POLICY IF EXISTS "message_receipts_upsert_self_participant" ON public.message_receipts;
DROP POLICY IF EXISTS "message_receipts_update_self_participant" ON public.message_receipts;

CREATE OR REPLACE FUNCTION public.notif_pref_enabled(p_user_id uuid, p_channel text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    CASE p_channel
      WHEN 'push_enabled' THEN (SELECT push_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'routine_reminders' THEN (SELECT routine_reminders FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'task_reminders' THEN (SELECT task_reminders FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'retention_emails' THEN (SELECT retention_emails FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'product_updates' THEN (SELECT product_updates FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'investor_updates' THEN (SELECT investor_updates FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'dm_email_enabled' THEN (SELECT dm_email_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      WHEN 'dm_push_enabled' THEN (SELECT dm_push_enabled FROM public.notification_preferences WHERE user_id = p_user_id)
      ELSE true
    END,
    true
  );
$$;

CREATE OR REPLACE FUNCTION public.create_or_get_direct_conversation(p_other_user_id uuid)
RETURNS public.conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := auth.uid();
  v_user_a uuid;
  v_user_b uuid;
  v_conversation public.conversations;
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  IF p_other_user_id IS NULL THEN RAISE EXCEPTION 'Recipient user id is required' USING ERRCODE = '22004'; END IF;
  IF v_self = p_other_user_id THEN RAISE EXCEPTION 'Cannot message yourself' USING ERRCODE = '22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_other_user_id) THEN
    RAISE EXCEPTION 'Recipient is unavailable' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_blocks b
    WHERE (b.blocker_id = v_self AND b.blocked_id = p_other_user_id)
       OR (b.blocker_id = p_other_user_id AND b.blocked_id = v_self)
  ) THEN RAISE EXCEPTION 'Unable to contact this user' USING ERRCODE = '42501'; END IF;

  v_user_a := LEAST(v_self, p_other_user_id);
  v_user_b := GREATEST(v_self, p_other_user_id);
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_a::text || ':' || v_user_b::text, 0));

  INSERT INTO public.conversations (participants, is_group, last_message_at)
  VALUES (ARRAY[v_user_a, v_user_b], false, NULL)
  ON CONFLICT (direct_user_a, direct_user_b) DO UPDATE SET updated_at = now()
  RETURNING * INTO v_conversation;

  INSERT INTO public.conversation_user_settings (conversation_id, user_id, request_status, request_updated_at)
  VALUES (v_conversation.id, v_self, 'accepted', now())
  ON CONFLICT (conversation_id, user_id) DO UPDATE
    SET hidden_at = NULL, updated_at = now();

  RETURN v_conversation;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_inbox_v1(
  p_section text DEFAULT 'inbox',
  p_limit integer DEFAULT 30,
  p_cursor text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 30), 1), 50);
  v_cursor jsonb;
  v_cursor_time timestamptz;
  v_cursor_id uuid;
  v_items jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  IF p_section NOT IN ('inbox', 'requests', 'archived') THEN RAISE EXCEPTION 'Invalid inbox section'; END IF;
  IF p_cursor IS NOT NULL THEN
    BEGIN
      v_cursor := p_cursor::jsonb;
      v_cursor_time := (v_cursor->>'lastMessageAt')::timestamptz;
      v_cursor_id := (v_cursor->>'id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Invalid inbox cursor';
    END;
  END IF;

  WITH ranked AS (
    SELECT c.*, s.archived_at, s.hidden_at, s.muted_until, s.pinned_at,
      COALESCE(s.request_status, 'accepted') request_status,
      other.id other_user_id, other.full_name, other.username, other.avatar_url,
      lm.id last_message_id,
      CASE WHEN lm.deleted_at IS NOT NULL THEN 'Message deleted' ELSE left(COALESCE(lm.content, ''), 160) END last_message_preview,
      lm.sender_id last_sender_id,
      COALESCE(c.last_message_at, c.created_at) sort_time,
      (SELECT count(*)::integer FROM public.messages unread
       WHERE unread.conversation_id = c.id AND unread.sender_id <> v_user
         AND unread.is_read = false AND unread.deleted_at IS NULL) unread_count
    FROM public.conversations c
    LEFT JOIN public.conversation_user_settings s ON s.conversation_id = c.id AND s.user_id = v_user
    LEFT JOIN LATERAL (
      SELECT p.id, p.full_name, p.username, p.avatar_url
      FROM unnest(c.participants) participant_id
      JOIN public.public_profiles p ON p.id = participant_id
      WHERE participant_id <> v_user LIMIT 1
    ) other ON true
    LEFT JOIN LATERAL (
      SELECT m.id, m.content, m.sender_id, m.deleted_at
      FROM public.messages m WHERE m.conversation_id = c.id
      ORDER BY m.created_at DESC, m.id DESC LIMIT 1
    ) lm ON true
    WHERE v_user = ANY(c.participants) AND COALESCE(c.is_group, false) = false
      AND CASE p_section
        WHEN 'requests' THEN COALESCE(s.request_status, 'accepted') = 'pending' AND s.archived_at IS NULL
        WHEN 'archived' THEN s.archived_at IS NOT NULL
        ELSE COALESCE(s.request_status, 'accepted') NOT IN ('pending', 'refused') AND s.archived_at IS NULL
          AND (s.hidden_at IS NULL OR COALESCE(c.last_message_at, c.created_at) > s.hidden_at)
      END
  ), page AS (
    SELECT * FROM ranked
    WHERE v_cursor_time IS NULL OR (sort_time, id) < (v_cursor_time, v_cursor_id)
    ORDER BY (pinned_at IS NOT NULL) DESC, pinned_at DESC NULLS LAST, sort_time DESC, id DESC
    LIMIT v_limit + 1
  ), visible AS (SELECT * FROM page LIMIT v_limit)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'participants', participants, 'otherUser', jsonb_build_object(
      'id', other_user_id, 'fullName', full_name, 'username', username, 'avatarUrl', avatar_url),
    'lastMessageId', last_message_id, 'lastMessagePreview', last_message_preview,
    'lastSenderId', last_sender_id, 'lastMessageAt', sort_time, 'unreadCount', unread_count,
    'requestStatus', request_status, 'pinnedAt', pinned_at, 'mutedUntil', muted_until,
    'archivedAt', archived_at, 'hiddenAt', hidden_at
  ) ORDER BY (pinned_at IS NOT NULL) DESC, pinned_at DESC NULLS LAST, sort_time DESC, id DESC), '[]'::jsonb)
  INTO v_items FROM visible;

  RETURN jsonb_build_object(
    'items', v_items,
    'nextCursor', CASE WHEN jsonb_array_length(v_items) = v_limit THEN (
      SELECT jsonb_build_object('lastMessageAt', sort_time, 'id', id)::text
      FROM visible ORDER BY (pinned_at IS NOT NULL), pinned_at NULLS FIRST, sort_time, id LIMIT 1
    ) ELSE NULL END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_message_page_v1(
  p_conversation_id uuid,
  p_limit integer DEFAULT 50,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL,
  p_anchor_message_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
  v_anchor_created_at timestamptz;
  v_anchor_id uuid;
  v_items jsonb;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.conversations c WHERE c.id = p_conversation_id AND v_user = ANY(c.participants)
  ) THEN RAISE EXCEPTION 'Conversation unavailable' USING ERRCODE = '42501'; END IF;

  IF p_anchor_message_id IS NOT NULL THEN
    SELECT created_at, id INTO v_anchor_created_at, v_anchor_id
    FROM public.messages WHERE id = p_anchor_message_id AND conversation_id = p_conversation_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Message unavailable'; END IF;
  END IF;

  WITH page AS (
    SELECT m.* FROM public.messages m
    WHERE m.conversation_id = p_conversation_id
      AND CASE
        WHEN v_anchor_created_at IS NOT NULL THEN (m.created_at, m.id) <= (v_anchor_created_at, v_anchor_id)
        WHEN p_before_created_at IS NOT NULL AND p_before_id IS NOT NULL THEN (m.created_at, m.id) < (p_before_created_at, p_before_id)
        ELSE true
      END
    ORDER BY m.created_at DESC, m.id DESC LIMIT v_limit
  ), mapped AS (
    SELECT m.*,
      jsonb_build_object('id', p.id, 'fullName', p.full_name, 'avatarUrl', p.avatar_url) sender,
      COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at) FROM public.message_attachments a WHERE a.message_id = m.id), '[]'::jsonb) attachment_rows,
      COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM public.message_receipts r WHERE r.message_id = m.id), '[]'::jsonb) receipts
      ,COALESCE((SELECT jsonb_agg(jsonb_build_object('emoji', reaction.emoji, 'user_id', reaction.user_id)) FROM public.message_reactions reaction WHERE reaction.message_id = m.id), '[]'::jsonb) reaction_rows
    FROM page m LEFT JOIN public.public_profiles p ON p.id = m.sender_id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'conversation_id', conversation_id, 'sender_id', sender_id,
    'content', CASE WHEN deleted_at IS NOT NULL THEN 'Message deleted' ELSE content END,
    'message_type', message_type, 'client_message_id', client_message_id,
    'is_read', is_read, 'reply_to_id', reply_to_id, 'created_at', created_at,
    'updated_at', updated_at, 'deleted_at', deleted_at, 'sender', sender,
    'attachment_rows', CASE WHEN deleted_at IS NULL THEN attachment_rows ELSE '[]'::jsonb END,
    'receipts', receipts, 'reaction_rows', reaction_rows
  ) ORDER BY created_at, id), '[]'::jsonb) INTO v_items FROM mapped;

  RETURN jsonb_build_object(
    'items', v_items,
    'hasMore', jsonb_array_length(v_items) = v_limit,
    'oldestCursor', CASE WHEN jsonb_array_length(v_items) > 0 THEN (
      SELECT jsonb_build_object('createdAt', created_at, 'id', id)
      FROM mapped ORDER BY created_at, id LIMIT 1
    ) ELSE NULL END,
    'anchorMessageId', p_anchor_message_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.search_message_recipients_v1(p_query text, p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH candidates AS (
    SELECT p.id, p.full_name, p.username, p.avatar_url,
      public.are_users_connected(auth.uid(), p.id) connected
    FROM public.public_profiles p
    WHERE auth.uid() IS NOT NULL AND p.id <> auth.uid()
      AND COALESCE(trim(p_query), '') <> ''
      AND (p.full_name ILIKE '%' || trim(p_query) || '%' OR p.username ILIKE '%' || trim(p_query) || '%')
      AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE
        (b.blocker_id = auth.uid() AND b.blocked_id = p.id) OR (b.blocker_id = p.id AND b.blocked_id = auth.uid()))
    ORDER BY connected DESC, p.full_name NULLS LAST, p.id LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 30)
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'fullName', full_name, 'username', username, 'avatarUrl', avatar_url, 'connected', connected
  ) ORDER BY connected DESC, full_name NULLS LAST), '[]'::jsonb) FROM candidates;
$$;

CREATE OR REPLACE FUNCTION public.get_direct_message_quote_v1(p_conversation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid(); v_recipient uuid; v_is_mentor boolean; v_sender_is_mentor boolean;
  v_has_prior boolean; v_balance integer; v_status text; v_credits integer := 0;
BEGIN
  SELECT participant INTO v_recipient FROM public.conversations c
  CROSS JOIN LATERAL unnest(c.participants) participant
  WHERE c.id = p_conversation_id AND v_user = ANY(c.participants) AND participant <> v_user LIMIT 1;
  IF v_user IS NULL OR v_recipient IS NULL THEN RAISE EXCEPTION 'Conversation unavailable' USING ERRCODE = '42501'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.mentors WHERE user_id = v_recipient) INTO v_is_mentor;
  SELECT EXISTS(SELECT 1 FROM public.mentors WHERE user_id = v_user) INTO v_sender_is_mentor;
  SELECT EXISTS(SELECT 1 FROM public.messages WHERE conversation_id = p_conversation_id AND sender_id = v_user) INTO v_has_prior;
  SELECT COALESCE(balance, 0) INTO v_balance FROM public.user_credits WHERE user_id = v_user;
  SELECT request_status INTO v_status FROM public.conversation_user_settings WHERE conversation_id = p_conversation_id AND user_id = v_recipient;
  IF v_is_mentor AND NOT v_sender_is_mentor AND v_has_prior THEN v_credits := 3; END IF;
  RETURN jsonb_build_object('recipientId', v_recipient, 'recipientIsMentor', v_is_mentor,
    'firstMentorMessageFree', v_is_mentor AND NOT v_has_prior, 'credits', v_credits,
    'balance', COALESCE(v_balance, 0), 'canAfford', COALESCE(v_balance, 0) >= v_credits,
    'canSend', COALESCE(v_balance, 0) >= v_credits
      AND COALESCE(v_status, 'accepted') <> 'refused'
      AND NOT (COALESCE(v_status, 'accepted') = 'pending' AND v_has_prior),
    'requestStatus', COALESCE(v_status, 'accepted'));
END;
$$;

CREATE OR REPLACE FUNCTION public.send_direct_message_v2(
  p_conversation_id uuid,
  p_content text,
  p_client_message_id text,
  p_reply_to_id uuid DEFAULT NULL,
  p_attachments jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid(); v_conversation public.conversations; v_recipient uuid;
  v_message public.messages; v_existing public.messages; v_recipient_status text;
  v_connected boolean; v_prior_count integer; v_new_recipient_count integer; v_charged integer := 0;
  v_attachment jsonb; v_attachment_count integer; v_balance integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  IF COALESCE(trim(p_client_message_id), '') = '' THEN RAISE EXCEPTION 'Client message id is required'; END IF;
  IF COALESCE(trim(p_content), '') = '' AND jsonb_array_length(COALESCE(p_attachments, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Message content is required';
  END IF;
  IF jsonb_typeof(COALESCE(p_attachments, '[]'::jsonb)) <> 'array' THEN RAISE EXCEPTION 'Invalid attachments'; END IF;

  SELECT * INTO v_existing FROM public.messages
  WHERE conversation_id = p_conversation_id AND sender_id = v_user AND client_message_id = p_client_message_id;
  IF FOUND THEN
    RETURN jsonb_build_object('message', to_jsonb(v_existing), 'attachments', COALESCE((
      SELECT jsonb_agg(to_jsonb(a)) FROM public.message_attachments a WHERE a.message_id = v_existing.id), '[]'::jsonb),
      'chargedCredits', 0, 'remainingCredits', (SELECT COALESCE(balance, 0) FROM public.user_credits WHERE user_id = v_user));
  END IF;

  SELECT * INTO v_conversation FROM public.conversations WHERE id = p_conversation_id AND v_user = ANY(participants) FOR SHARE;
  IF NOT FOUND OR COALESCE(v_conversation.is_group, false) OR array_length(v_conversation.participants, 1) <> 2 THEN
    RAISE EXCEPTION 'Conversation unavailable' USING ERRCODE = '42501';
  END IF;
  SELECT participant INTO v_recipient FROM unnest(v_conversation.participants) participant WHERE participant <> v_user LIMIT 1;
  IF EXISTS (SELECT 1 FROM public.user_blocks b WHERE
    (b.blocker_id = v_user AND b.blocked_id = v_recipient) OR (b.blocker_id = v_recipient AND b.blocked_id = v_user)) THEN
    RAISE EXCEPTION 'Unable to contact this user' USING ERRCODE = '42501';
  END IF;

  v_connected := public.are_users_connected(v_user, v_recipient) OR public.is_admin_user();
  SELECT request_status INTO v_recipient_status FROM public.conversation_user_settings
  WHERE conversation_id = p_conversation_id AND user_id = v_recipient;
  SELECT count(*) INTO v_prior_count FROM public.messages WHERE conversation_id = p_conversation_id AND sender_id = v_user;

  IF NOT v_connected AND v_recipient_status = 'refused' THEN RAISE EXCEPTION 'This message request was refused' USING ERRCODE = '42501'; END IF;
  IF NOT v_connected AND COALESCE(v_recipient_status, 'pending') = 'pending' AND v_prior_count > 0 THEN
    RAISE EXCEPTION 'Wait for this founder to accept your message request' USING ERRCODE = '42501';
  END IF;
  IF NOT v_connected AND v_prior_count = 0 THEN
    SELECT count(*) INTO v_new_recipient_count FROM public.messages m
    WHERE m.sender_id = v_user AND m.created_at > now() - interval '24 hours'
      AND NOT EXISTS (SELECT 1 FROM public.messages earlier WHERE earlier.sender_id = v_user
        AND earlier.conversation_id = m.conversation_id AND (earlier.created_at, earlier.id) < (m.created_at, m.id));
    IF v_new_recipient_count >= 10 THEN RAISE EXCEPTION 'Daily new conversation limit reached'; END IF;
  END IF;

  v_attachment_count := jsonb_array_length(COALESCE(p_attachments, '[]'::jsonb));
  IF v_attachment_count > 4 THEN RAISE EXCEPTION 'A message can include at most four attachments'; END IF;
  FOR v_attachment IN SELECT * FROM jsonb_array_elements(COALESCE(p_attachments, '[]'::jsonb)) LOOP
    IF COALESCE((v_attachment->>'file_size')::bigint, 0) <= 0 OR (v_attachment->>'file_size')::bigint > 10485760 THEN
      RAISE EXCEPTION 'Attachment exceeds the 10MB limit';
    END IF;
    IF v_attachment->>'mime_type' NOT IN ('image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain','application/zip') THEN
      RAISE EXCEPTION 'Unsupported attachment type';
    END IF;
    IF COALESCE(v_attachment->>'storage_path', '') NOT LIKE p_conversation_id::text || '/pending/' || v_user::text || '/' || p_client_message_id || '/%' THEN
      RAISE EXCEPTION 'Invalid attachment path';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'message-attachments'
      AND o.name = v_attachment->>'storage_path' AND o.owner = v_user) THEN RAISE EXCEPTION 'Attachment upload not found'; END IF;
  END LOOP;

  IF EXISTS(SELECT 1 FROM public.mentors WHERE user_id = v_recipient)
    AND NOT EXISTS(SELECT 1 FROM public.mentors WHERE user_id = v_user) AND v_prior_count > 0 THEN v_charged := 3; END IF;

  INSERT INTO public.messages(conversation_id, sender_id, content, message_type, reply_to_id, client_message_id)
  VALUES(p_conversation_id, v_user, COALESCE(NULLIF(trim(p_content), ''),
    (SELECT string_agg(item->>'file_name', ', ') FROM jsonb_array_elements(p_attachments) item)),
    CASE WHEN v_attachment_count = 0 THEN 'text' WHEN (p_attachments->0->>'mime_type') LIKE 'image/%' THEN 'image' ELSE 'file' END,
    p_reply_to_id, p_client_message_id)
  RETURNING * INTO v_message;

  INSERT INTO public.message_attachments(message_id, uploader_id, storage_path, file_name, mime_type, file_size, width, height)
  SELECT v_message.id, v_user, item->>'storage_path', left(item->>'file_name', 255), item->>'mime_type',
    (item->>'file_size')::bigint, NULLIF(item->>'width','')::integer, NULLIF(item->>'height','')::integer
  FROM jsonb_array_elements(COALESCE(p_attachments, '[]'::jsonb)) item;

  UPDATE public.conversations SET last_message_at = v_message.created_at, updated_at = now() WHERE id = p_conversation_id;
  INSERT INTO public.conversation_user_settings(conversation_id, user_id, request_status, request_updated_at, hidden_at)
  VALUES(p_conversation_id, v_user, 'accepted', now(), NULL)
  ON CONFLICT(conversation_id, user_id) DO UPDATE SET hidden_at = NULL, updated_at = now();
  INSERT INTO public.conversation_user_settings(conversation_id, user_id, request_status, request_updated_at, hidden_at)
  VALUES(p_conversation_id, v_recipient, CASE WHEN v_connected THEN 'accepted' ELSE 'pending' END, now(), NULL)
  ON CONFLICT(conversation_id, user_id) DO UPDATE SET
    request_status = CASE WHEN v_connected THEN 'accepted' WHEN public.conversation_user_settings.request_status = 'accepted' THEN 'accepted' ELSE 'pending' END,
    request_updated_at = now(), hidden_at = NULL, updated_at = now();

  SELECT COALESCE(balance, 0) INTO v_balance FROM public.user_credits WHERE user_id = v_user;
  RETURN jsonb_build_object('message', to_jsonb(v_message), 'attachments', COALESCE((
    SELECT jsonb_agg(to_jsonb(a)) FROM public.message_attachments a WHERE a.message_id = v_message.id), '[]'::jsonb),
    'chargedCredits', v_charged, 'remainingCredits', COALESCE(v_balance, 0),
    'requestStatus', CASE WHEN v_connected THEN 'accepted' ELSE 'pending' END);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_message_request_status_v1(p_conversation_id uuid, p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_current text; v_row public.conversation_user_settings;
BEGIN
  IF p_status NOT IN ('accepted','refused') THEN RAISE EXCEPTION 'Invalid request status'; END IF;
  SELECT request_status INTO v_current FROM public.conversation_user_settings
  WHERE conversation_id = p_conversation_id AND user_id = v_user FOR UPDATE;
  IF v_current IS DISTINCT FROM 'pending' AND NOT (v_current = 'refused' AND p_status = 'accepted') THEN
    RAISE EXCEPTION 'Message request cannot be changed';
  END IF;
  UPDATE public.conversation_user_settings SET request_status = p_status, request_updated_at = now(),
    archived_at = CASE WHEN p_status = 'refused' THEN now() ELSE NULL END, updated_at = now()
  WHERE conversation_id = p_conversation_id AND user_id = v_user RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END; $$;

CREATE OR REPLACE FUNCTION public.mark_conversation_read_v1(p_conversation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_now timestamptz := now();
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.conversations WHERE id = p_conversation_id AND v_user = ANY(participants)) THEN
    RAISE EXCEPTION 'Conversation unavailable' USING ERRCODE = '42501'; END IF;
  UPDATE public.messages SET is_read = true WHERE conversation_id = p_conversation_id AND sender_id <> v_user AND is_read = false;
  INSERT INTO public.message_receipts(message_id, user_id, delivered_at, read_at)
  SELECT id, v_user, v_now, v_now FROM public.messages WHERE conversation_id = p_conversation_id AND sender_id <> v_user
  ON CONFLICT(message_id, user_id) DO UPDATE SET delivered_at = COALESCE(message_receipts.delivered_at, v_now), read_at = v_now, updated_at = v_now;
END; $$;

CREATE OR REPLACE FUNCTION public.set_conversation_state_v1(
  p_conversation_id uuid, p_action text, p_muted_until timestamptz DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_row public.conversation_user_settings;
BEGIN
  IF p_action NOT IN ('pin','unpin','mute','unmute','archive','unarchive','hide') THEN RAISE EXCEPTION 'Invalid conversation action'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.conversations WHERE id = p_conversation_id AND v_user = ANY(participants)) THEN
    RAISE EXCEPTION 'Conversation unavailable' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.conversation_user_settings(conversation_id,user_id) VALUES(p_conversation_id,v_user)
  ON CONFLICT(conversation_id,user_id) DO NOTHING;
  UPDATE public.conversation_user_settings SET
    pinned_at = CASE WHEN p_action='pin' THEN now() WHEN p_action='unpin' THEN NULL ELSE pinned_at END,
    muted_until = CASE WHEN p_action='mute' THEN COALESCE(p_muted_until, now()+interval '1 year') WHEN p_action='unmute' THEN NULL ELSE muted_until END,
    archived_at = CASE WHEN p_action='archive' THEN now() WHEN p_action='unarchive' THEN NULL ELSE archived_at END,
    hidden_at = CASE WHEN p_action='hide' THEN now() ELSE hidden_at END, updated_at=now()
  WHERE conversation_id=p_conversation_id AND user_id=v_user RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END; $$;

CREATE OR REPLACE FUNCTION public.soft_delete_message_v1(p_message_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_message public.messages;
BEGIN
  UPDATE public.messages SET content='Message deleted', attachments=NULL, deleted_at=now(), deleted_by=v_user, updated_at=now()
  WHERE id=p_message_id AND sender_id=v_user AND deleted_at IS NULL RETURNING * INTO v_message;
  IF NOT FOUND THEN RAISE EXCEPTION 'Message unavailable' USING ERRCODE='42501'; END IF;
  DELETE FROM public.message_attachments WHERE message_id=p_message_id AND uploader_id=v_user;
  RETURN to_jsonb(v_message);
END; $$;

-- Muted conversations suppress bell notifications while retaining unread state.
CREATE OR REPLACE FUNCTION public.notify_message_recipient()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_recipient uuid;
BEGIN
  SELECT participant INTO v_recipient FROM public.conversations c
  CROSS JOIN LATERAL unnest(c.participants) participant
  WHERE c.id=NEW.conversation_id AND COALESCE(c.is_group,false)=false AND participant<>NEW.sender_id LIMIT 1;
  IF v_recipient IS NULL OR EXISTS(SELECT 1 FROM public.conversation_user_settings s
    WHERE s.conversation_id=NEW.conversation_id AND s.user_id=v_recipient AND s.muted_until>now()) THEN RETURN NEW; END IF;
  INSERT INTO public.community_notifications(user_id,actor_id,notification_type,conversation_id,message_id,metadata)
  VALUES(v_recipient,NEW.sender_id,'message',NEW.conversation_id,NEW.id,
    jsonb_build_object('conversation_id',NEW.conversation_id,'message_id',NEW.id,'route','/messages?conversationId='||NEW.conversation_id));
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.suppress_disabled_dm_email_queue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.notif_pref_enabled(NEW.recipient_id,'dm_email_enabled') OR EXISTS(
    SELECT 1 FROM public.conversation_user_settings s WHERE s.conversation_id=NEW.conversation_id
      AND s.user_id=NEW.recipient_id AND s.muted_until>now()) THEN RETURN NULL; END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS suppress_disabled_dm_email_queue ON public.message_email_notifications;
CREATE TRIGGER suppress_disabled_dm_email_queue BEFORE INSERT ON public.message_email_notifications
FOR EACH ROW EXECUTE FUNCTION public.suppress_disabled_dm_email_queue();

-- Rebuild push bridge with a DM-specific preference check.
CREATE OR REPLACE FUNCTION public.push_on_new_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_url text := (SELECT value FROM private.service_config WHERE key='supabase_url');
  v_key text := (SELECT value FROM private.service_config WHERE key='supabase_service_key');
BEGIN
  IF v_url IS NULL OR v_key IS NULL OR NOT public.notif_pref_enabled(NEW.user_id,'push_enabled') THEN RETURN NEW; END IF;
  IF NEW.notification_type='message' AND NOT public.notif_pref_enabled(NEW.user_id,'dm_push_enabled') THEN RETURN NEW; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.push_subscriptions WHERE user_id=NEW.user_id) THEN RETURN NEW; END IF;
  BEGIN
    PERFORM net.http_post(url:=v_url||'/functions/v1/send-push',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_key),
      body:=jsonb_build_object('userId',NEW.user_id,'title','Creatives Takeover','message',COALESCE(NEW.metadata->>'message','You have a new message'),
      'url',COALESCE(NEW.metadata->>'route','/messages'),'tag',NEW.notification_type));
  EXCEPTION WHEN OTHERS THEN RAISE LOG '[push_on_new_notification] non-fatal failure user=% msg=%',NEW.user_id,SQLERRM; END;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_message_uploads_v1()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage AS $$
DECLARE v_deleted integer;
BEGIN
  WITH removed AS (
    DELETE FROM storage.objects object
    WHERE object.bucket_id = 'message-attachments'
      AND object.name LIKE '%/pending/%'
      AND object.created_at < now() - interval '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM public.message_attachments attachment
        WHERE attachment.storage_path = object.name
      )
    RETURNING 1
  ) SELECT count(*)::integer INTO v_deleted FROM removed;
  RETURN COALESCE(v_deleted, 0);
END; $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'cleanup-orphaned-message-uploads-v1';
    PERFORM cron.schedule(
      'cleanup-orphaned-message-uploads-v1',
      '17 * * * *',
      'SELECT public.cleanup_orphaned_message_uploads_v1()'
    );
  END IF;
END; $$;

GRANT EXECUTE ON FUNCTION public.create_or_get_direct_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inbox_v1(text,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_message_page_v1(uuid,integer,timestamptz,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_message_recipients_v1(text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_direct_message_quote_v1(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_direct_message_v2(uuid,text,text,uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_message_request_status_v1(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read_v1(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_conversation_state_v1(uuid,text,timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_message_v1(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.cleanup_orphaned_message_uploads_v1() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_inbox_v1(text,integer,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_message_page_v1(uuid,integer,timestamptz,uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_message_recipients_v1(text,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_direct_message_quote_v1(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.send_direct_message_v2(uuid,text,text,uuid,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_message_request_status_v1(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_conversation_read_v1(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_conversation_state_v1(uuid,text,timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.soft_delete_message_v1(uuid) FROM PUBLIC, anon;
