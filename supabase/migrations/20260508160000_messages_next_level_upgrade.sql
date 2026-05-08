-- Next-level direct messaging foundation: idempotent sends, receipts,
-- per-user conversation settings, safety tables, attachments, and search.

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS client_message_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS messages_client_message_unique_idx
ON public.messages (conversation_id, sender_id, client_message_id);

CREATE INDEX IF NOT EXISTS messages_conversation_created_id_idx
ON public.messages (conversation_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS messages_content_search_idx
ON public.messages
USING GIN (to_tsvector('simple', COALESCE(content, '')));

CREATE TABLE IF NOT EXISTS public.message_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS message_receipts_message_id_idx
ON public.message_receipts (message_id);

CREATE INDEX IF NOT EXISTS message_receipts_user_id_idx
ON public.message_receipts (user_id);

ALTER TABLE public.message_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_receipts_select_participants" ON public.message_receipts;
CREATE POLICY "message_receipts_select_participants"
ON public.message_receipts
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = message_id
      AND auth.uid() = ANY(c.participants)
  )
);

DROP POLICY IF EXISTS "message_receipts_upsert_self_participant" ON public.message_receipts;
CREATE POLICY "message_receipts_upsert_self_participant"
ON public.message_receipts
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = message_id
      AND auth.uid() = ANY(c.participants)
  )
);

DROP POLICY IF EXISTS "message_receipts_update_self_participant" ON public.message_receipts;
CREATE POLICY "message_receipts_update_self_participant"
ON public.message_receipts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.conversation_user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  archived_at TIMESTAMPTZ,
  muted_until TIMESTAMPTZ,
  pinned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS conversation_user_settings_user_idx
ON public.conversation_user_settings (user_id, pinned_at DESC, archived_at);

ALTER TABLE public.conversation_user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversation_settings_select_own" ON public.conversation_user_settings;
CREATE POLICY "conversation_settings_select_own"
ON public.conversation_user_settings
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "conversation_settings_insert_own_participant" ON public.conversation_user_settings;
CREATE POLICY "conversation_settings_insert_own_participant"
ON public.conversation_user_settings
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND auth.uid() = ANY(c.participants)
  )
);

DROP POLICY IF EXISTS "conversation_settings_update_own" ON public.conversation_user_settings;
CREATE POLICY "conversation_settings_update_own"
ON public.conversation_user_settings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx
ON public.user_blocks (blocked_id, blocker_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_blocks_select_own" ON public.user_blocks;
CREATE POLICY "user_blocks_select_own"
ON public.user_blocks
FOR SELECT
USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

DROP POLICY IF EXISTS "user_blocks_insert_own" ON public.user_blocks;
CREATE POLICY "user_blocks_insert_own"
ON public.user_blocks
FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "user_blocks_delete_own" ON public.user_blocks;
CREATE POLICY "user_blocks_delete_own"
ON public.user_blocks
FOR DELETE
USING (auth.uid() = blocker_id);

CREATE TABLE IF NOT EXISTS public.message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT 'other',
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, reporter_id)
);

ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_reports_select_own" ON public.message_reports;
CREATE POLICY "message_reports_select_own"
ON public.message_reports
FOR SELECT
USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "message_reports_insert_participant" ON public.message_reports;
CREATE POLICY "message_reports_insert_participant"
ON public.message_reports
FOR INSERT
WITH CHECK (
  auth.uid() = reporter_id
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = message_id
      AND auth.uid() = ANY(c.participants)
  )
);

CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS message_attachments_message_id_idx
ON public.message_attachments (message_id);

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_attachments_select_participants" ON public.message_attachments;
CREATE POLICY "message_attachments_select_participants"
ON public.message_attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE m.id = message_id
      AND auth.uid() = ANY(c.participants)
  )
);

DROP POLICY IF EXISTS "message_attachments_insert_sender" ON public.message_attachments;
CREATE POLICY "message_attachments_insert_sender"
ON public.message_attachments
FOR INSERT
WITH CHECK (
  auth.uid() = uploader_id
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = message_id
      AND m.sender_id = auth.uid()
  )
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  false,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/zip'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "message_attachments_storage_select_participants" ON storage.objects;
CREATE POLICY "message_attachments_storage_select_participants"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id::TEXT = (storage.foldername(name))[1]
      AND auth.uid() = ANY(c.participants)
  )
);

DROP POLICY IF EXISTS "message_attachments_storage_insert_participants" ON storage.objects;
CREATE POLICY "message_attachments_storage_insert_participants"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments'
  AND EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id::TEXT = (storage.foldername(name))[1]
      AND auth.uid() = ANY(c.participants)
  )
);

DROP POLICY IF EXISTS "message_attachments_storage_delete_owner" ON storage.objects;
CREATE POLICY "message_attachments_storage_delete_owner"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'message-attachments'
  AND owner = auth.uid()
);

CREATE OR REPLACE FUNCTION public.enforce_message_not_blocked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant UUID;
BEGIN
  SELECT participant
  INTO v_participant
  FROM public.conversations c
  CROSS JOIN LATERAL unnest(c.participants) AS participant
  WHERE c.id = NEW.conversation_id
    AND participant <> NEW.sender_id
  LIMIT 1;

  IF v_participant IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_blocks ub
    WHERE (ub.blocker_id = v_participant AND ub.blocked_id = NEW.sender_id)
       OR (ub.blocker_id = NEW.sender_id AND ub.blocked_id = v_participant)
  ) THEN
    RAISE EXCEPTION 'This conversation is blocked'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_enforce_not_blocked ON public.messages;
CREATE TRIGGER messages_enforce_not_blocked
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_message_not_blocked();

CREATE OR REPLACE FUNCTION public.mark_message_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient UUID;
BEGIN
  FOR v_recipient IN
    SELECT participant
    FROM public.conversations c
    CROSS JOIN LATERAL unnest(c.participants) AS participant
    WHERE c.id = NEW.conversation_id
      AND participant <> NEW.sender_id
  LOOP
    INSERT INTO public.message_receipts (message_id, user_id, delivered_at)
    VALUES (NEW.id, v_recipient, now())
    ON CONFLICT (message_id, user_id)
    DO UPDATE SET delivered_at = COALESCE(public.message_receipts.delivered_at, EXCLUDED.delivered_at),
                  updated_at = now();
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_mark_delivered ON public.messages;
CREATE TRIGGER messages_mark_delivered
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.mark_message_delivered();

CREATE OR REPLACE FUNCTION public.touch_message_receipts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS message_receipts_touch_updated_at ON public.message_receipts;
CREATE TRIGGER message_receipts_touch_updated_at
BEFORE UPDATE ON public.message_receipts
FOR EACH ROW
EXECUTE FUNCTION public.touch_message_receipts_updated_at();

CREATE OR REPLACE FUNCTION public.search_messages(
  p_query TEXT,
  p_conversation_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  content TEXT,
  message_type TEXT,
  attachments JSONB,
  client_message_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  rank REAL
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    m.conversation_id,
    m.sender_id,
    m.content,
    m.message_type,
    m.attachments,
    m.client_message_id,
    m.created_at,
    m.updated_at,
    ts_rank(to_tsvector('simple', COALESCE(m.content, '')), plainto_tsquery('simple', COALESCE(p_query, ''))) AS rank
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  WHERE COALESCE(trim(p_query), '') <> ''
    AND auth.uid() = ANY(c.participants)
    AND (p_conversation_id IS NULL OR m.conversation_id = p_conversation_id)
    AND to_tsvector('simple', COALESCE(m.content, '')) @@ plainto_tsquery('simple', p_query)
  ORDER BY rank DESC, m.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

GRANT EXECUTE ON FUNCTION public.search_messages(TEXT, UUID, INTEGER, INTEGER) TO authenticated;
