-- Make conversation selection one fast blocking read. Related rows are grouped
-- once per page instead of running three correlated lookups per message.

CREATE INDEX IF NOT EXISTS message_attachments_message_id_v2_idx
  ON public.message_attachments (message_id);

CREATE INDEX IF NOT EXISTS message_receipts_message_id_v2_idx
  ON public.message_receipts (message_id);

CREATE INDEX IF NOT EXISTS message_reactions_message_id_v2_idx
  ON public.message_reactions (message_id);

CREATE INDEX IF NOT EXISTS messages_conversation_cursor_v2_idx
  ON public.messages (conversation_id, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.get_message_page_v1(
  p_conversation_id uuid,
  p_limit integer DEFAULT 30,
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
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
  v_anchor_created_at timestamptz;
  v_anchor_id uuid;
  v_items jsonb := '[]'::jsonb;
  v_has_more boolean := false;
  v_oldest_cursor jsonb;
BEGIN
  IF v_user IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = p_conversation_id
      AND v_user = ANY(c.participants)
  ) THEN
    RAISE EXCEPTION 'Conversation unavailable' USING ERRCODE = '42501';
  END IF;

  IF p_anchor_message_id IS NOT NULL THEN
    SELECT m.created_at, m.id
    INTO v_anchor_created_at, v_anchor_id
    FROM public.messages m
    WHERE m.id = p_anchor_message_id
      AND m.conversation_id = p_conversation_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Message unavailable';
    END IF;
  END IF;

  WITH page_plus AS MATERIALIZED (
    SELECT m.*
    FROM public.messages m
    WHERE m.conversation_id = p_conversation_id
      AND CASE
        WHEN v_anchor_created_at IS NOT NULL
          THEN (m.created_at, m.id) <= (v_anchor_created_at, v_anchor_id)
        WHEN p_before_created_at IS NOT NULL AND p_before_id IS NOT NULL
          THEN (m.created_at, m.id) < (p_before_created_at, p_before_id)
        ELSE true
      END
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT v_limit + 1
  ),
  visible AS MATERIALIZED (
    SELECT *
    FROM page_plus
    ORDER BY created_at DESC, id DESC
    LIMIT v_limit
  ),
  attachment_groups AS (
    SELECT
      a.message_id,
      jsonb_agg(to_jsonb(a) ORDER BY a.created_at, a.id) AS rows
    FROM public.message_attachments a
    JOIN visible v ON v.id = a.message_id
    GROUP BY a.message_id
  ),
  receipt_groups AS (
    SELECT
      r.message_id,
      jsonb_agg(to_jsonb(r)) AS rows
    FROM public.message_receipts r
    JOIN visible v ON v.id = r.message_id
    GROUP BY r.message_id
  ),
  reaction_groups AS (
    SELECT
      reaction.message_id,
      jsonb_agg(
        jsonb_build_object(
          'emoji', reaction.emoji,
          'user_id', reaction.user_id
        )
      ) AS rows
    FROM public.message_reactions reaction
    JOIN visible v ON v.id = reaction.message_id
    GROUP BY reaction.message_id
  ),
  mapped AS MATERIALIZED (
    SELECT
      m.*,
      jsonb_build_object(
        'id', profile.id,
        'fullName', profile.full_name,
        'avatarUrl', profile.avatar_url
      ) AS sender,
      COALESCE(attachments.rows, '[]'::jsonb) AS attachment_rows,
      COALESCE(receipts.rows, '[]'::jsonb) AS receipts,
      COALESCE(reactions.rows, '[]'::jsonb) AS reaction_rows
    FROM visible m
    LEFT JOIN public.public_profiles profile ON profile.id = m.sender_id
    LEFT JOIN attachment_groups attachments ON attachments.message_id = m.id
    LEFT JOIN receipt_groups receipts ON receipts.message_id = m.id
    LEFT JOIN reaction_groups reactions ON reactions.message_id = m.id
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', mapped.id,
          'conversation_id', mapped.conversation_id,
          'sender_id', mapped.sender_id,
          'content', CASE
            WHEN mapped.deleted_at IS NOT NULL THEN 'Message deleted'
            ELSE mapped.content
          END,
          'message_type', mapped.message_type,
          'client_message_id', mapped.client_message_id,
          'is_read', mapped.is_read,
          'reply_to_id', mapped.reply_to_id,
          'created_at', mapped.created_at,
          'updated_at', mapped.updated_at,
          'deleted_at', mapped.deleted_at,
          'sender', mapped.sender,
          'attachment_rows', CASE
            WHEN mapped.deleted_at IS NULL THEN mapped.attachment_rows
            ELSE '[]'::jsonb
          END,
          'receipts', mapped.receipts,
          'reaction_rows', mapped.reaction_rows
        )
        ORDER BY mapped.created_at, mapped.id
      ),
      '[]'::jsonb
    ),
    (SELECT count(*) > v_limit FROM page_plus),
    (
      SELECT jsonb_build_object('createdAt', oldest.created_at, 'id', oldest.id)
      FROM mapped oldest
      ORDER BY oldest.created_at, oldest.id
      LIMIT 1
    )
  INTO v_items, v_has_more, v_oldest_cursor
  FROM mapped;

  RETURN jsonb_build_object(
    'items', v_items,
    'hasMore', v_has_more,
    'oldestCursor', v_oldest_cursor,
    'anchorMessageId', p_anchor_message_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_message_page_v1(uuid, integer, timestamptz, uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_message_page_v1(uuid, integer, timestamptz, uuid, uuid)
  TO authenticated, service_role;
