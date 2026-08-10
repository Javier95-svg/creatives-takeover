-- Account deletion needs explicit cleanup because profiles intentionally also
-- contain non-auth demo identities, while several legacy foreign keys predate
-- the project's current ON DELETE conventions.

ALTER TABLE public.articles
  DROP CONSTRAINT IF EXISTS articles_created_by_fkey,
  ADD CONSTRAINT articles_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.chatbot_conversations
  DROP CONSTRAINT IF EXISTS chatbot_conversations_user_id_fkey,
  ADD CONSTRAINT chatbot_conversations_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.chatbot_feedback
  DROP CONSTRAINT IF EXISTS chatbot_feedback_user_id_fkey,
  ADD CONSTRAINT chatbot_feedback_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.chatbot_attachments
  DROP CONSTRAINT IF EXISTS chatbot_attachments_user_id_fkey,
  ADD CONSTRAINT chatbot_attachments_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.pitch_deck_analyses
  DROP CONSTRAINT IF EXISTS pitch_deck_analyses_user_id_fkey,
  ADD CONSTRAINT pitch_deck_analyses_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.page_feedback
  DROP CONSTRAINT IF EXISTS page_feedback_user_id_fkey,
  ADD CONSTRAINT page_feedback_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_reviewed_by_fkey,
  ADD CONSTRAINT job_applications_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.featured_content
  DROP CONSTRAINT IF EXISTS featured_content_featured_by_fkey,
  ADD CONSTRAINT featured_content_featured_by_fkey
    FOREIGN KEY (featured_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.founder_journey_gifs
  ALTER COLUMN uploaded_by DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS founder_journey_gifs_uploaded_by_fkey,
  ADD CONSTRAINT founder_journey_gifs_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.stripe_checkout_sessions
  DROP CONSTRAINT IF EXISTS stripe_checkout_sessions_user_id_fkey,
  ADD CONSTRAINT stripe_checkout_sessions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Marketplace listings are personal account data, but completed discovery-call
-- records retain immutable mentor/service snapshots for billing and support.
-- Null the live listing pointers so providers can delete their listings without
-- erasing those historical records.
ALTER TABLE public.discovery_calls
  DROP CONSTRAINT IF EXISTS discovery_calls_mentor_id_fkey,
  ADD CONSTRAINT discovery_calls_mentor_id_fkey
    FOREIGN KEY (mentor_id) REFERENCES public.mentors(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS discovery_calls_service_id_fkey,
  ADD CONSTRAINT discovery_calls_service_id_fkey
    FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;

-- Posts intentionally support seeded profile IDs that are not Auth users, so
-- account cleanup deletes them by user_id instead of restoring an Auth FK.
-- Dependent comments and repost pointers must not block that deletion.
ALTER TABLE public.post_comments
  DROP CONSTRAINT IF EXISTS post_comments_post_id_fkey,
  ADD CONSTRAINT post_comments_post_id_fkey
    FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE;

ALTER TABLE public.community_posts
  DROP CONSTRAINT IF EXISTS community_posts_original_post_id_fkey,
  ADD CONSTRAINT community_posts_original_post_id_fkey
    FOREIGN KEY (original_post_id) REFERENCES public.community_posts(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.list_owned_storage_objects_for_account_deletion_v1(
  p_user_id uuid
)
RETURNS TABLE(bucket_id text, object_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT objects.bucket_id, objects.name
  FROM storage.objects
  WHERE objects.owner_id = p_user_id::text
  ORDER BY objects.bucket_id, objects.name;
$$;

REVOKE ALL ON FUNCTION public.list_owned_storage_objects_for_account_deletion_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_owned_storage_objects_for_account_deletion_v1(uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.cleanup_account_data_v1(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target record;
  cleanup_pass integer;
  has_remaining boolean;
BEGIN
  DELETE FROM public.services WHERE delivered_by_user_id = p_user_id;

  -- Delete every public account-owned row using the long-standing user_id
  -- convention. Multiple passes resolve legacy parent/child ordering; blocked
  -- rows are checked afterward so this transaction never silently leaves data.
  FOR cleanup_pass IN 1..8 LOOP
    FOR target IN
      SELECT columns.table_schema, columns.table_name, columns.column_name
      FROM information_schema.columns AS columns
      JOIN information_schema.tables AS tables
        ON tables.table_schema = columns.table_schema
       AND tables.table_name = columns.table_name
      WHERE columns.table_schema = 'public'
        AND columns.column_name = 'user_id'
        AND columns.udt_name IN ('uuid', 'text', 'varchar')
        AND tables.table_type = 'BASE TABLE'
      ORDER BY columns.table_name
    LOOP
      BEGIN
        EXECUTE format(
          'DELETE FROM %I.%I WHERE %I::text = $1::text',
          target.table_schema,
          target.table_name,
          target.column_name
        ) USING p_user_id;
      EXCEPTION WHEN foreign_key_violation THEN
        NULL;
      END;
    END LOOP;
  END LOOP;

  FOR target IN
    SELECT columns.table_schema, columns.table_name, columns.column_name
    FROM information_schema.columns AS columns
    JOIN information_schema.tables AS tables
      ON tables.table_schema = columns.table_schema
     AND tables.table_name = columns.table_name
    WHERE columns.table_schema = 'public'
      AND columns.column_name = 'user_id'
      AND columns.udt_name IN ('uuid', 'text', 'varchar')
      AND tables.table_type = 'BASE TABLE'
    ORDER BY columns.table_name
  LOOP
    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM %I.%I WHERE %I::text = $1::text)',
      target.table_schema,
      target.table_name,
      target.column_name
    ) INTO has_remaining USING p_user_id;

    IF has_remaining THEN
      RAISE EXCEPTION 'Account cleanup is blocked by %.%', target.table_schema, target.table_name;
    END IF;
  END LOOP;

  -- Profiles deliberately cannot have an Auth FK because the community also
  -- contains seed/demo profiles. Profile-owned tables already cascade or null
  -- their references, so the real user's profile is removed explicitly here.
  DELETE FROM public.profiles WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_account_data_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_account_data_v1(uuid)
  TO service_role;
