-- Messages 9/10 upgrade: edit history, voice notes, contextual cards,
-- founder-workspace groups, anchored notifications, and performance telemetry.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS context jsonb;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS group_purpose text,
  ADD COLUMN IF NOT EXISTS context jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.message_performance_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  event_name text NOT NULL CHECK (event_name IN ('inbox_loaded','conversation_opened','message_sent','realtime_received')),
  duration_ms integer CHECK (duration_ms BETWEEN 0 AND 120000),
  connection_type text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_performance_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS message_performance_insert_own ON public.message_performance_events;
DROP POLICY IF EXISTS message_performance_select_admin ON public.message_performance_events;
CREATE POLICY message_performance_select_admin ON public.message_performance_events
  FOR SELECT TO authenticated USING (public.is_admin_user());

CREATE INDEX IF NOT EXISTS message_performance_event_time_idx
  ON public.message_performance_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS message_performance_conversation_time_idx
  ON public.message_performance_events (conversation_id, created_at DESC);
REVOKE ALL ON TABLE public.message_performance_events FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.record_message_performance_v1(
  p_event_name text,
  p_duration_ms integer,
  p_conversation_id uuid DEFAULT NULL,
  p_connection_type text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $performance$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  IF p_event_name NOT IN ('inbox_loaded','conversation_opened','message_sent','realtime_received') THEN
    RAISE EXCEPTION 'Invalid performance event';
  END IF;
  IF p_duration_ms < 0 OR p_duration_ms > 120000 THEN RAISE EXCEPTION 'Invalid duration'; END IF;
  IF p_conversation_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.conversations c WHERE c.id=p_conversation_id AND v_user=ANY(c.participants)
  ) THEN RAISE EXCEPTION 'Conversation unavailable' USING ERRCODE='42501'; END IF;
  INSERT INTO public.message_performance_events(user_id,conversation_id,event_name,duration_ms,connection_type,metadata)
  VALUES(v_user,p_conversation_id,p_event_name,p_duration_ms,left(p_connection_type,40),
    jsonb_strip_nulls(COALESCE(p_metadata,'{}'::jsonb) - 'content' - 'email' - 'name'));
END;
$performance$;

CREATE OR REPLACE FUNCTION public.edit_direct_message_v1(p_message_id uuid, p_content text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $edit$
DECLARE v_user uuid := auth.uid(); v_message public.messages;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  IF length(trim(COALESCE(p_content,''))) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'Message must be between 1 and 5000 characters'; END IF;
  UPDATE public.messages
     SET content=trim(p_content), edited_at=now(), updated_at=now()
   WHERE id=p_message_id AND sender_id=v_user AND deleted_at IS NULL
     AND created_at >= now() - interval '15 minutes'
  RETURNING * INTO v_message;
  IF NOT FOUND THEN RAISE EXCEPTION 'This message can no longer be edited' USING ERRCODE='42501'; END IF;
  UPDATE public.conversations SET updated_at=now() WHERE id=v_message.conversation_id;
  RETURN to_jsonb(v_message);
END;
$edit$;

CREATE OR REPLACE FUNCTION public.set_message_context_v1(p_message_id uuid, p_context jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $context$
DECLARE v_user uuid := auth.uid(); v_message public.messages; v_kind text; v_route text;
BEGIN
  v_kind := p_context->>'kind'; v_route := p_context->>'route';
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  IF v_kind NOT IN ('profile','cofounder_listing','mentor','booking','artifact','external_link')
     OR length(COALESCE(p_context->>'title','')) NOT BETWEEN 1 AND 160
     OR length(COALESCE(p_context->>'description','')) > 400
     OR length(COALESCE(v_route,'')) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Invalid message context'; END IF;
  IF v_kind <> 'external_link' AND left(v_route,1) <> '/' THEN RAISE EXCEPTION 'Invalid internal route'; END IF;
  IF v_kind = 'external_link' AND v_route !~ '^https://[^[:space:]]+$' THEN RAISE EXCEPTION 'Only HTTPS links are supported'; END IF;
  UPDATE public.messages SET context=jsonb_build_object(
    'kind',v_kind,'title',left(p_context->>'title',160),'description',left(p_context->>'description',400),
    'imageUrl',left(p_context->>'imageUrl',500),'route',left(v_route,500)
  ), updated_at=now()
  WHERE id=p_message_id AND sender_id=v_user AND deleted_at IS NULL RETURNING * INTO v_message;
  IF NOT FOUND THEN RAISE EXCEPTION 'Message unavailable' USING ERRCODE='42501'; END IF;
  RETURN to_jsonb(v_message);
END;
$context$;

CREATE OR REPLACE FUNCTION public.create_message_group_v1(
  p_name text,
  p_participant_ids uuid[],
  p_purpose text,
  p_context jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $group$
DECLARE v_user uuid := auth.uid(); v_participants uuid[]; v_conversation public.conversations; v_member uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  IF length(trim(COALESCE(p_name,''))) NOT BETWEEN 3 AND 80 THEN RAISE EXCEPTION 'Group name must be between 3 and 80 characters'; END IF;
  IF p_purpose NOT IN ('cofounder_search','mentor_circle','accountability','project_collaboration') THEN RAISE EXCEPTION 'Choose a founder-workspace purpose'; END IF;
  SELECT array_agg(DISTINCT member ORDER BY member) INTO v_participants
  FROM unnest(array_append(COALESCE(p_participant_ids,'{}'::uuid[]),v_user)) member;
  IF cardinality(v_participants) NOT BETWEEN 3 AND 8 THEN RAISE EXCEPTION 'Groups require 3 to 8 members'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_participants) member WHERE NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=member)) THEN
    RAISE EXCEPTION 'One or more members are unavailable';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_participants) member JOIN public.user_blocks b
    ON (b.blocker_id=v_user AND b.blocked_id=member) OR (b.blocked_id=v_user AND b.blocker_id=member)) THEN
    RAISE EXCEPTION 'A selected member is unavailable' USING ERRCODE='42501';
  END IF;
  IF NOT public.is_admin_user() AND EXISTS (
    SELECT 1 FROM unnest(v_participants) member WHERE member<>v_user AND NOT public.are_users_connected(v_user,member)
  ) THEN RAISE EXCEPTION 'Founder workspaces can only include your connections' USING ERRCODE='42501'; END IF;
  IF (SELECT count(*) FROM public.conversations WHERE created_by=v_user AND is_group=true AND created_at>now()-interval '24 hours')>=3 THEN
    RAISE EXCEPTION 'Daily founder workspace limit reached';
  END IF;
  INSERT INTO public.conversations(participants,is_group,name,group_purpose,context,last_message_at,created_by)
  VALUES(v_participants,true,trim(p_name),p_purpose,p_context,NULL,v_user) RETURNING * INTO v_conversation;
  FOREACH v_member IN ARRAY v_participants LOOP
    INSERT INTO public.conversation_user_settings(conversation_id,user_id,request_status,request_updated_at)
    VALUES(v_conversation.id,v_member,'accepted',now()) ON CONFLICT(conversation_id,user_id) DO NOTHING;
    IF v_member<>v_user THEN
      INSERT INTO public.community_notifications(user_id,actor_id,notification_type,conversation_id,metadata)
      VALUES(v_member,v_user,'message_group_invite',v_conversation.id,jsonb_build_object(
        'title','Founder workspace invitation','message','You were added to '||trim(p_name),
        'route','/messages?conversationId='||v_conversation.id
      ));
    END IF;
  END LOOP;
  RETURN to_jsonb(v_conversation);
END;
$group$;

CREATE OR REPLACE FUNCTION public.send_group_message_v1(
  p_conversation_id uuid,
  p_content text,
  p_client_message_id text,
  p_reply_to_id uuid DEFAULT NULL,
  p_attachments jsonb DEFAULT '[]'::jsonb,
  p_context jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $group_send$
DECLARE v_user uuid := auth.uid(); v_conversation public.conversations; v_message public.messages;
  v_existing public.messages; v_attachment jsonb; v_attachment_count integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  IF COALESCE(trim(p_client_message_id),'')='' THEN RAISE EXCEPTION 'Client message id is required'; END IF;
  IF p_context IS NOT NULL AND (
    p_context->>'kind' NOT IN ('profile','cofounder_listing','mentor','booking','artifact','external_link')
    OR length(COALESCE(p_context->>'title','')) NOT BETWEEN 1 AND 160
    OR length(COALESCE(p_context->>'description',''))>400
    OR length(COALESCE(p_context->>'route','')) NOT BETWEEN 1 AND 500
    OR ((p_context->>'kind')='external_link' AND (p_context->>'route')!~'^https://[^[:space:]]+$')
    OR ((p_context->>'kind')<>'external_link' AND left(p_context->>'route',1)<>'/')
  ) THEN RAISE EXCEPTION 'Invalid message context'; END IF;
  SELECT * INTO v_existing FROM public.messages WHERE conversation_id=p_conversation_id AND sender_id=v_user AND client_message_id=p_client_message_id;
  IF FOUND THEN RETURN jsonb_build_object('message',to_jsonb(v_existing),'attachments',COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM public.message_attachments a WHERE a.message_id=v_existing.id),'[]'::jsonb)); END IF;
  SELECT * INTO v_conversation FROM public.conversations WHERE id=p_conversation_id AND is_group=true AND v_user=ANY(participants) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Group unavailable' USING ERRCODE='42501'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_conversation.participants) member JOIN public.user_blocks b
    ON ((b.blocker_id=v_user AND b.blocked_id=member) OR (b.blocked_id=v_user AND b.blocker_id=member))) THEN
    RAISE EXCEPTION 'A group member is unavailable' USING ERRCODE='42501';
  END IF;
  v_attachment_count:=jsonb_array_length(COALESCE(p_attachments,'[]'::jsonb));
  IF COALESCE(trim(p_content),'')='' AND v_attachment_count=0 THEN RAISE EXCEPTION 'Message content is required'; END IF;
  IF v_attachment_count>4 THEN RAISE EXCEPTION 'A message can include at most four attachments'; END IF;
  FOR v_attachment IN SELECT * FROM jsonb_array_elements(COALESCE(p_attachments,'[]'::jsonb)) LOOP
    IF COALESCE((v_attachment->>'file_size')::bigint,0)<=0 OR (v_attachment->>'file_size')::bigint>10485760 THEN RAISE EXCEPTION 'Attachment exceeds the 10MB limit'; END IF;
    IF v_attachment->>'mime_type' NOT IN ('image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain','application/zip','audio/webm','audio/ogg','audio/mp4','audio/mpeg') THEN RAISE EXCEPTION 'Unsupported attachment type'; END IF;
    IF COALESCE(v_attachment->>'storage_path','') NOT LIKE p_conversation_id::text||'/pending/'||v_user::text||'/'||p_client_message_id||'/%' THEN RAISE EXCEPTION 'Invalid attachment path'; END IF;
    IF NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='message-attachments' AND o.name=v_attachment->>'storage_path' AND o.owner=v_user) THEN RAISE EXCEPTION 'Attachment upload not found'; END IF;
  END LOOP;
  IF p_reply_to_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.messages WHERE id=p_reply_to_id AND conversation_id=p_conversation_id) THEN RAISE EXCEPTION 'Reply target unavailable'; END IF;
  INSERT INTO public.messages(conversation_id,sender_id,content,message_type,reply_to_id,client_message_id,context)
  VALUES(p_conversation_id,v_user,COALESCE(NULLIF(trim(p_content),''),(SELECT string_agg(item->>'file_name',', ') FROM jsonb_array_elements(p_attachments) item)),
    CASE WHEN v_attachment_count=0 THEN 'text' WHEN (p_attachments->0->>'mime_type') LIKE 'image/%' THEN 'image' ELSE 'file' END,
    p_reply_to_id,p_client_message_id,p_context) RETURNING * INTO v_message;
  INSERT INTO public.message_attachments(message_id,uploader_id,storage_path,file_name,mime_type,file_size,width,height)
  SELECT v_message.id,v_user,item->>'storage_path',left(item->>'file_name',255),item->>'mime_type',(item->>'file_size')::bigint,
    NULLIF(item->>'width','')::integer,NULLIF(item->>'height','')::integer FROM jsonb_array_elements(COALESCE(p_attachments,'[]'::jsonb)) item;
  UPDATE public.conversations SET last_message_at=v_message.created_at,updated_at=now() WHERE id=p_conversation_id;
  UPDATE public.conversation_user_settings SET hidden_at=NULL,updated_at=now() WHERE conversation_id=p_conversation_id;
  RETURN jsonb_build_object('message',to_jsonb(v_message),'attachments',COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM public.message_attachments a WHERE a.message_id=v_message.id),'[]'::jsonb),'chargedCredits',0);
END;
$group_send$;

-- Voice notes use the same direct-message safety and request rules, but only
-- accept one small audio object from the authenticated user's pending path.
CREATE OR REPLACE FUNCTION public.send_voice_message_v1(
  p_conversation_id uuid,
  p_client_message_id text,
  p_attachment jsonb,
  p_reply_to_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $voice$
DECLARE v_user uuid:=auth.uid(); v_conversation public.conversations; v_recipient uuid; v_status text;
  v_prior integer; v_connected boolean; v_message public.messages; v_existing public.messages; v_mime text; v_size bigint; v_new_recipient_count integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_existing FROM public.messages WHERE conversation_id=p_conversation_id AND sender_id=v_user AND client_message_id=p_client_message_id;
  IF FOUND THEN RETURN jsonb_build_object('message',to_jsonb(v_existing),'attachments',COALESCE((SELECT jsonb_agg(to_jsonb(a)) FROM public.message_attachments a WHERE a.message_id=v_existing.id),'[]'::jsonb)); END IF;
  SELECT * INTO v_conversation FROM public.conversations WHERE id=p_conversation_id AND is_group=false AND v_user=ANY(participants) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conversation unavailable' USING ERRCODE='42501'; END IF;
  SELECT member INTO v_recipient FROM unnest(v_conversation.participants) member WHERE member<>v_user LIMIT 1;
  IF EXISTS(SELECT 1 FROM public.user_blocks b WHERE (b.blocker_id=v_user AND b.blocked_id=v_recipient) OR (b.blocker_id=v_recipient AND b.blocked_id=v_user)) THEN RAISE EXCEPTION 'Unable to contact this user' USING ERRCODE='42501'; END IF;
  v_connected:=public.are_users_connected(v_user,v_recipient) OR public.is_admin_user();
  SELECT request_status INTO v_status FROM public.conversation_user_settings WHERE conversation_id=p_conversation_id AND user_id=v_recipient;
  SELECT count(*) INTO v_prior FROM public.messages WHERE conversation_id=p_conversation_id AND sender_id=v_user;
  IF NOT v_connected AND (v_status='refused' OR (COALESCE(v_status,'pending')='pending' AND v_prior>0)) THEN RAISE EXCEPTION 'Wait for this founder to accept your message request' USING ERRCODE='42501'; END IF;
  IF NOT v_connected AND v_prior=0 THEN
    SELECT count(DISTINCT m.conversation_id) INTO v_new_recipient_count FROM public.messages m
    WHERE m.sender_id=v_user AND m.created_at>now()-interval '24 hours';
    IF v_new_recipient_count>=10 THEN RAISE EXCEPTION 'Daily new conversation limit reached'; END IF;
  END IF;
  v_mime:=p_attachment->>'mime_type'; v_size:=COALESCE((p_attachment->>'file_size')::bigint,0);
  IF v_mime NOT IN ('audio/webm','audio/ogg','audio/mp4','audio/mpeg') OR v_size<=0 OR v_size>10485760 THEN RAISE EXCEPTION 'Invalid voice note'; END IF;
  IF COALESCE(p_attachment->>'storage_path','') NOT LIKE p_conversation_id::text||'/pending/'||v_user::text||'/'||p_client_message_id||'/%' THEN RAISE EXCEPTION 'Invalid attachment path'; END IF;
  IF NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='message-attachments' AND o.name=p_attachment->>'storage_path' AND o.owner=v_user) THEN RAISE EXCEPTION 'Voice note upload not found'; END IF;
  IF p_reply_to_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.messages WHERE id=p_reply_to_id AND conversation_id=p_conversation_id) THEN RAISE EXCEPTION 'Reply target unavailable'; END IF;
  INSERT INTO public.messages(conversation_id,sender_id,content,message_type,reply_to_id,client_message_id)
  VALUES(p_conversation_id,v_user,'Voice note','file',p_reply_to_id,p_client_message_id) RETURNING * INTO v_message;
  INSERT INTO public.message_attachments(message_id,uploader_id,storage_path,file_name,mime_type,file_size)
  VALUES(v_message.id,v_user,p_attachment->>'storage_path',left(COALESCE(p_attachment->>'file_name','voice-note.webm'),255),v_mime,v_size);
  UPDATE public.conversations SET last_message_at=v_message.created_at,updated_at=now() WHERE id=p_conversation_id;
  INSERT INTO public.conversation_user_settings(conversation_id,user_id,request_status,request_updated_at,hidden_at)
  VALUES(p_conversation_id,v_user,'accepted',now(),NULL)
  ON CONFLICT(conversation_id,user_id) DO UPDATE SET hidden_at=NULL,updated_at=now();
  INSERT INTO public.conversation_user_settings(conversation_id,user_id,request_status,request_updated_at,hidden_at)
  VALUES(p_conversation_id,v_recipient,CASE WHEN v_connected THEN 'accepted' ELSE 'pending' END,now(),NULL)
  ON CONFLICT(conversation_id,user_id) DO UPDATE SET hidden_at=NULL,request_status=CASE WHEN v_connected THEN 'accepted' ELSE conversation_user_settings.request_status END,updated_at=now();
  RETURN jsonb_build_object('message',to_jsonb(v_message),'attachments',(SELECT jsonb_agg(to_jsonb(a)) FROM public.message_attachments a WHERE a.message_id=v_message.id),'chargedCredits',0);
END;
$voice$;

-- Bell and push deep links now anchor the exact message. Group notifications
-- fan out once to every other participant and still respect mute settings.
CREATE OR REPLACE FUNCTION public.notify_message_recipient()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $notify$
DECLARE v_recipient uuid;
BEGIN
  FOR v_recipient IN SELECT member FROM public.conversations c CROSS JOIN LATERAL unnest(c.participants) member
    WHERE c.id=NEW.conversation_id AND member<>NEW.sender_id
  LOOP
    IF EXISTS(SELECT 1 FROM public.conversation_user_settings s WHERE s.conversation_id=NEW.conversation_id AND s.user_id=v_recipient AND s.muted_until>now()) THEN CONTINUE; END IF;
    INSERT INTO public.community_notifications(user_id,actor_id,notification_type,conversation_id,message_id,metadata)
    VALUES(v_recipient,NEW.sender_id,'message',NEW.conversation_id,NEW.id,jsonb_build_object(
      'conversation_id',NEW.conversation_id,'message_id',NEW.id,
      'route','/messages?conversationId='||NEW.conversation_id||'&messageId='||NEW.id
    ));
  END LOOP;
  RETURN NEW;
END;
$notify$;

CREATE OR REPLACE FUNCTION public.get_message_page_v2(
  p_conversation_id uuid,
  p_limit integer DEFAULT 30,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL,
  p_anchor_message_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $message_page$
DECLARE v_payload jsonb; v_items jsonb;
BEGIN
  v_payload:=public.get_message_page_v1(p_conversation_id,p_limit,p_before_created_at,p_before_id,p_anchor_message_id);
  SELECT COALESCE(jsonb_agg(item || jsonb_build_object(
    'edited_at',m.edited_at,'context',m.context
  ) ORDER BY (item->>'created_at')::timestamptz,item->>'id'),'[]'::jsonb)
  INTO v_items FROM jsonb_array_elements(v_payload->'items') item
  JOIN public.messages m ON m.id=(item->>'id')::uuid;
  RETURN jsonb_set(v_payload,'{items}',v_items,true);
END;
$message_page$;

CREATE OR REPLACE FUNCTION public.get_inbox_v2(
  p_section text DEFAULT 'inbox',
  p_limit integer DEFAULT 30,
  p_cursor text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $inbox$
DECLARE v_user uuid:=auth.uid(); v_limit integer:=LEAST(GREATEST(COALESCE(p_limit,30),1),50); v_items jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  IF p_section NOT IN ('inbox','requests','archived') THEN RAISE EXCEPTION 'Invalid inbox section'; END IF;
  WITH rows AS (
    SELECT c.id,c.participants,c.is_group,c.name,c.group_purpose,c.context,
      COALESCE(c.last_message_at,c.created_at) sort_time,
      s.archived_at,s.hidden_at,s.muted_until,s.pinned_at,COALESCE(s.request_status,'accepted') request_status,
      other.id other_id,other.full_name,other.username,other.avatar_url,
      lm.id last_message_id,lm.sender_id last_sender_id,
      CASE WHEN lm.deleted_at IS NOT NULL THEN 'Message deleted' ELSE left(COALESCE(lm.content,''),160) END last_preview,
      (SELECT count(*)::integer FROM public.messages unread WHERE unread.conversation_id=c.id AND unread.sender_id<>v_user AND unread.is_read=false AND unread.deleted_at IS NULL) unread_count
    FROM public.conversations c
    LEFT JOIN public.conversation_user_settings s ON s.conversation_id=c.id AND s.user_id=v_user
    LEFT JOIN LATERAL (
      SELECT p.id,p.full_name,p.username,p.avatar_url FROM unnest(c.participants) participant
      JOIN public.public_profiles p ON p.id=participant WHERE participant<>v_user LIMIT 1
    ) other ON NOT c.is_group
    LEFT JOIN LATERAL (
      SELECT m.id,m.content,m.sender_id,m.deleted_at FROM public.messages m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC,m.id DESC LIMIT 1
    ) lm ON true
    WHERE v_user=ANY(c.participants) AND CASE p_section
      WHEN 'requests' THEN NOT c.is_group AND COALESCE(s.request_status,'accepted')='pending' AND s.archived_at IS NULL
      WHEN 'archived' THEN s.archived_at IS NOT NULL
      ELSE (c.is_group OR COALESCE(s.request_status,'accepted') NOT IN ('pending','refused')) AND s.archived_at IS NULL
        AND (s.hidden_at IS NULL OR COALESCE(c.last_message_at,c.created_at)>s.hidden_at)
    END
    ORDER BY (s.pinned_at IS NOT NULL) DESC,s.pinned_at DESC NULLS LAST,COALESCE(c.last_message_at,c.created_at) DESC,c.id DESC
    LIMIT v_limit
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',id,'participants',participants,'isGroup',is_group,'name',name,'groupPurpose',group_purpose,'context',context,
    'otherUser',CASE WHEN is_group THEN NULL ELSE jsonb_build_object('id',other_id,'fullName',full_name,'username',username,'avatarUrl',avatar_url) END,
    'lastMessageId',last_message_id,'lastMessagePreview',last_preview,'lastSenderId',last_sender_id,'lastMessageAt',sort_time,
    'unreadCount',unread_count,'requestStatus',request_status,'pinnedAt',pinned_at,'mutedUntil',muted_until,
    'archivedAt',archived_at,'hiddenAt',hidden_at
  ) ORDER BY (pinned_at IS NOT NULL) DESC,pinned_at DESC NULLS LAST,sort_time DESC,id DESC),'[]'::jsonb) INTO v_items FROM rows;
  RETURN jsonb_build_object('items',v_items,'nextCursor',NULL);
END;
$inbox$;

CREATE OR REPLACE FUNCTION public.search_message_recipients_v2(p_query text,p_limit integer DEFAULT 20)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $recipients$
  WITH candidates AS (
    SELECT p.id,p.full_name,p.username,p.avatar_url,
      COALESCE(p.positioning_line,p.startup_tagline,p.creative_niche) headline,
      public.are_users_connected(auth.uid(),p.id) connected,
      EXISTS(SELECT 1 FROM public.mentors m WHERE m.user_id=p.id AND COALESCE(m.is_active,true)) is_mentor
    FROM public.public_profiles p
    WHERE auth.uid() IS NOT NULL AND p.id<>auth.uid() AND length(trim(COALESCE(p_query,'')))>=2
      AND (p.full_name ILIKE '%'||trim(p_query)||'%' OR p.username ILIKE '%'||trim(p_query)||'%' OR p.startup_name ILIKE '%'||trim(p_query)||'%')
      AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE (b.blocker_id=auth.uid() AND b.blocked_id=p.id) OR (b.blocked_id=auth.uid() AND b.blocker_id=p.id))
    ORDER BY connected DESC,is_mentor DESC,p.full_name NULLS LAST,p.id
    LIMIT LEAST(GREATEST(COALESCE(p_limit,20),1),30)
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'fullName',full_name,'username',username,'avatarUrl',avatar_url,
    'headline',headline,'connected',connected,'isMentor',is_mentor) ORDER BY connected DESC,is_mentor DESC,full_name NULLS LAST),'[]'::jsonb) FROM candidates;
$recipients$;

CREATE OR REPLACE FUNCTION public.get_message_performance_summary_v1(p_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $summary$
DECLARE v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
  WITH scoped AS (
    SELECT * FROM public.message_performance_events WHERE created_at>=now()-make_interval(days=>LEAST(GREATEST(COALESCE(p_days,7),1),90))
  ), grouped AS (
    SELECT event_name,count(*) samples,round(avg(duration_ms))::integer average_ms,
      percentile_cont(0.5) WITHIN GROUP(ORDER BY duration_ms)::integer p50_ms,
      percentile_cont(0.95) WITHIN GROUP(ORDER BY duration_ms)::integer p95_ms,
      percentile_cont(0.99) WITHIN GROUP(ORDER BY duration_ms)::integer p99_ms
    FROM scoped GROUP BY event_name
  )
  SELECT jsonb_build_object('days',LEAST(GREATEST(COALESCE(p_days,7),1),90),'events',COALESCE(jsonb_agg(to_jsonb(grouped) ORDER BY event_name),'[]'::jsonb)) INTO v_result FROM grouped;
  RETURN v_result;
END;
$summary$;

DO $retention$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='cleanup-message-performance-events';
    PERFORM cron.schedule('cleanup-message-performance-events','23 3 * * *',
      'DELETE FROM public.message_performance_events WHERE created_at < now() - interval ''90 days''');
  END IF;
END;
$retention$;

GRANT EXECUTE ON FUNCTION public.record_message_performance_v1(text,integer,uuid,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.edit_direct_message_v1(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_message_context_v1(uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_message_group_v1(text,uuid[],text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_group_message_v1(uuid,text,text,uuid,jsonb,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_voice_message_v1(uuid,text,jsonb,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_message_page_v2(uuid,integer,timestamptz,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_inbox_v2(text,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_message_performance_summary_v1(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_message_recipients_v2(text,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.record_message_performance_v1(text,integer,uuid,text,jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.edit_direct_message_v1(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.set_message_context_v1(uuid,jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.create_message_group_v1(text,uuid[],text,jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.send_group_message_v1(uuid,text,text,uuid,jsonb,jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.send_voice_message_v1(uuid,text,jsonb,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_message_page_v2(uuid,integer,timestamptz,uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_inbox_v2(text,integer,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_message_performance_summary_v1(integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.search_message_recipients_v2(text,integer) FROM PUBLIC,anon;
