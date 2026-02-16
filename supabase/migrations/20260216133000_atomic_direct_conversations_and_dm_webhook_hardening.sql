-- Ensure direct conversations are uniquely keyed per user pair and created atomically.
-- Also harden DM email queueing by requiring a webhook secret before dispatch.

-- 1) Add normalized direct-conversation key columns.
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS direct_user_a UUID GENERATED ALWAYS AS (
  CASE
    WHEN is_group = false AND array_length(participants, 1) = 2
      THEN LEAST(participants[1], participants[2])
    ELSE NULL
  END
) STORED;

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS direct_user_b UUID GENERATED ALWAYS AS (
  CASE
    WHEN is_group = false AND array_length(participants, 1) = 2
      THEN GREATEST(participants[1], participants[2])
    ELSE NULL
  END
) STORED;

-- 2) Canonicalize participant ordering for existing direct conversations.
UPDATE public.conversations
SET participants = ARRAY[
  LEAST(participants[1], participants[2]),
  GREATEST(participants[1], participants[2])
]::UUID[]
WHERE is_group = false
  AND array_length(participants, 1) = 2
  AND participants[1] IS DISTINCT FROM LEAST(participants[1], participants[2]);

-- 3) Merge existing duplicate direct conversations before adding uniqueness.
WITH ranked AS (
  SELECT
    id,
    first_value(id) OVER (
      PARTITION BY direct_user_a, direct_user_b
      ORDER BY COALESCE(last_message_at, created_at) DESC, created_at DESC, id DESC
    ) AS canonical_id,
    row_number() OVER (
      PARTITION BY direct_user_a, direct_user_b
      ORDER BY COALESCE(last_message_at, created_at) DESC, created_at DESC, id DESC
    ) AS rank_in_pair
  FROM public.conversations
  WHERE is_group = false
    AND direct_user_a IS NOT NULL
    AND direct_user_b IS NOT NULL
),
dupes AS (
  SELECT id AS duplicate_id, canonical_id
  FROM ranked
  WHERE rank_in_pair > 1
)
UPDATE public.messages m
SET conversation_id = d.canonical_id
FROM dupes d
WHERE m.conversation_id = d.duplicate_id;

DO $$
BEGIN
  IF to_regclass('public.community_notifications') IS NOT NULL THEN
    WITH ranked AS (
      SELECT
        id,
        first_value(id) OVER (
          PARTITION BY direct_user_a, direct_user_b
          ORDER BY COALESCE(last_message_at, created_at) DESC, created_at DESC, id DESC
        ) AS canonical_id,
        row_number() OVER (
          PARTITION BY direct_user_a, direct_user_b
          ORDER BY COALESCE(last_message_at, created_at) DESC, created_at DESC, id DESC
        ) AS rank_in_pair
      FROM public.conversations
      WHERE is_group = false
        AND direct_user_a IS NOT NULL
        AND direct_user_b IS NOT NULL
    ),
    dupes AS (
      SELECT id AS duplicate_id, canonical_id
      FROM ranked
      WHERE rank_in_pair > 1
    )
    UPDATE public.community_notifications n
    SET conversation_id = d.canonical_id
    FROM dupes d
    WHERE n.conversation_id = d.duplicate_id;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.message_email_notifications') IS NOT NULL THEN
    WITH ranked AS (
      SELECT
        id,
        first_value(id) OVER (
          PARTITION BY direct_user_a, direct_user_b
          ORDER BY COALESCE(last_message_at, created_at) DESC, created_at DESC, id DESC
        ) AS canonical_id,
        row_number() OVER (
          PARTITION BY direct_user_a, direct_user_b
          ORDER BY COALESCE(last_message_at, created_at) DESC, created_at DESC, id DESC
        ) AS rank_in_pair
      FROM public.conversations
      WHERE is_group = false
        AND direct_user_a IS NOT NULL
        AND direct_user_b IS NOT NULL
    ),
    dupes AS (
      SELECT id AS duplicate_id, canonical_id
      FROM ranked
      WHERE rank_in_pair > 1
    )
    UPDATE public.message_email_notifications q
    SET conversation_id = d.canonical_id
    FROM dupes d
    WHERE q.conversation_id = d.duplicate_id;
  END IF;
END $$;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY direct_user_a, direct_user_b
      ORDER BY COALESCE(last_message_at, created_at) DESC, created_at DESC, id DESC
    ) AS rank_in_pair
  FROM public.conversations
  WHERE is_group = false
    AND direct_user_a IS NOT NULL
    AND direct_user_b IS NOT NULL
)
DELETE FROM public.conversations c
USING ranked r
WHERE c.id = r.id
  AND r.rank_in_pair > 1;

-- 4) Keep conversation timestamps aligned after merge operations.
UPDATE public.conversations c
SET last_message_at = latest.latest_message_at
FROM (
  SELECT conversation_id, MAX(created_at) AS latest_message_at
  FROM public.messages
  GROUP BY conversation_id
) latest
WHERE c.id = latest.conversation_id
  AND c.last_message_at IS DISTINCT FROM latest.latest_message_at;

UPDATE public.conversations c
SET last_message_at = NULL
WHERE c.last_message_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.conversation_id = c.id
  );

-- 5) Enforce DB-level uniqueness for direct conversations.
CREATE UNIQUE INDEX IF NOT EXISTS conversations_direct_pair_unique_idx
ON public.conversations (direct_user_a, direct_user_b);

-- 6) Atomic direct conversation creation/retrieval.
CREATE OR REPLACE FUNCTION public.create_or_get_direct_conversation(p_other_user_id UUID)
RETURNS public.conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self UUID := auth.uid();
  v_user_a UUID;
  v_user_b UUID;
  v_conversation public.conversations;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '42501';
  END IF;

  IF p_other_user_id IS NULL THEN
    RAISE EXCEPTION 'Recipient user id is required'
      USING ERRCODE = '22004';
  END IF;

  IF v_self = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot create a direct conversation with yourself'
      USING ERRCODE = '22023';
  END IF;

  v_user_a := LEAST(v_self, p_other_user_id);
  v_user_b := GREATEST(v_self, p_other_user_id);

  -- Serialize same-pair inserts to avoid race conditions under heavy concurrency.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user_a::text || ':' || v_user_b::text, 0));

  INSERT INTO public.conversations (participants, is_group, last_message_at)
  VALUES (ARRAY[v_user_a, v_user_b]::UUID[], false, now())
  ON CONFLICT (direct_user_a, direct_user_b)
  DO UPDATE
    SET updated_at = now()
  RETURNING * INTO v_conversation;

  RETURN v_conversation;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_or_get_direct_conversation(UUID) TO authenticated;

COMMENT ON FUNCTION public.create_or_get_direct_conversation(UUID)
IS 'Atomically returns an existing 1:1 conversation or creates it without race-condition duplicates.';

-- 7) Harden DM email queueing: fail fast when webhook secret is missing.
CREATE OR REPLACE FUNCTION public.queue_dm_email_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participants UUID[];
  v_recipient_id UUID;
  v_request_id BIGINT;
  v_webhook_secret TEXT;
  v_webhook_url TEXT := 'https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/send-dm-notification-email';
BEGIN
  SELECT participants
    INTO v_participants
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  IF v_participants IS NULL OR array_length(v_participants, 1) <> 2 THEN
    RAISE LOG '[DM_EMAIL_QUEUE] Skip message %: not a one-to-one conversation', NEW.id;
    RETURN NEW;
  END IF;

  SELECT participant_id
    INTO v_recipient_id
  FROM unnest(v_participants) AS participant_id
  WHERE participant_id <> NEW.sender_id
  LIMIT 1;

  IF v_recipient_id IS NULL OR v_recipient_id = NEW.sender_id THEN
    RAISE LOG '[DM_EMAIL_QUEUE] Skip message %: recipient unresolved', NEW.id;
    RETURN NEW;
  END IF;

  INSERT INTO public.message_email_notifications (
    message_id,
    conversation_id,
    sender_id,
    recipient_id,
    status,
    metadata
  ) VALUES (
    NEW.id,
    NEW.conversation_id,
    NEW.sender_id,
    v_recipient_id,
    'pending',
    jsonb_build_object(
      'source', 'messages_trigger',
      'queued_at_iso', now()::text
    )
  )
  ON CONFLICT (message_id, recipient_id) DO NOTHING;

  IF NOT FOUND THEN
    RAISE LOG '[DM_EMAIL_QUEUE] Duplicate queue skipped for message %, recipient %', NEW.id, v_recipient_id;
    RETURN NEW;
  END IF;

  v_webhook_secret := nullif(current_setting('app.settings.dm_email_webhook_secret', true), '');

  IF v_webhook_secret IS NULL THEN
    UPDATE public.message_email_notifications
    SET
      status = 'failed',
      last_error = 'Missing app.settings.dm_email_webhook_secret',
      metadata = metadata || jsonb_build_object(
        'queue_failed_at_iso', now()::text
      )
    WHERE message_id = NEW.id
      AND recipient_id = v_recipient_id;

    RAISE LOG '[DM_EMAIL_QUEUE] Failed for message %: missing webhook secret', NEW.id;
    RETURN NEW;
  END IF;

  SELECT net.http_post(
    url := v_webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-dm-webhook-secret', v_webhook_secret
    ),
    body := jsonb_build_object(
      'messageId', NEW.id,
      'conversationId', NEW.conversation_id,
      'senderId', NEW.sender_id,
      'recipientId', v_recipient_id
    )
  )
  INTO v_request_id;

  UPDATE public.message_email_notifications
  SET
    status = 'sending',
    net_request_id = v_request_id,
    metadata = metadata || jsonb_build_object(
      'dispatched_at_iso', now()::text
    )
  WHERE message_id = NEW.id
    AND recipient_id = v_recipient_id;

  RAISE LOG '[DM_EMAIL_QUEUE] Queued email for message %, recipient %, request_id %', NEW.id, v_recipient_id, v_request_id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    UPDATE public.message_email_notifications
    SET
      status = 'failed',
      last_error = SQLERRM,
      metadata = metadata || jsonb_build_object(
        'queue_failed_at_iso', now()::text
      )
    WHERE message_id = NEW.id
      AND recipient_id = v_recipient_id;

    RAISE LOG '[DM_EMAIL_QUEUE] Failed for message %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
