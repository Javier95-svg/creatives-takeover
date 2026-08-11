-- Account deletion previously issued eight DELETE statements against every
-- public table with a user_id column. The production schema currently has
-- hundreds of those tables, so an otherwise small account cleanup could time
-- out before Auth deletion. Inventory matching tables once, then retry only
-- the tables that actually contain data for the account.

CREATE OR REPLACE FUNCTION public.cleanup_account_data_v1(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target record;
  target_table_name text;
  owned_table_names text[] := ARRAY[]::text[];
  cleanup_pass integer;
  maximum_passes integer;
  has_owned_rows boolean;
  rows_deleted bigint;
  deleted_in_pass bigint;
  diagnostic_state text;
  diagnostic_message text;
  diagnostic_detail text;
BEGIN
  BEGIN
    DELETE FROM public.services WHERE delivered_by_user_id = p_user_id;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS
      diagnostic_state = RETURNED_SQLSTATE,
      diagnostic_message = MESSAGE_TEXT,
      diagnostic_detail = PG_EXCEPTION_DETAIL;
    RAISE EXCEPTION USING
      ERRCODE = diagnostic_state,
      MESSAGE = format(
        'Account cleanup failed for public.services [%s]: %s',
        diagnostic_state,
        diagnostic_message
      ),
      DETAIL = diagnostic_detail;
  END;

  -- pg_catalog lets us explicitly select ordinary/partitioned base tables and
  -- exclude views (including security-invoker views that expose user_id).
  FOR target IN
    SELECT DISTINCT classes.relname AS table_name
    FROM pg_catalog.pg_attribute AS attributes
    JOIN pg_catalog.pg_class AS classes
      ON classes.oid = attributes.attrelid
    JOIN pg_catalog.pg_namespace AS namespaces
      ON namespaces.oid = classes.relnamespace
    JOIN pg_catalog.pg_type AS types
      ON types.oid = attributes.atttypid
    WHERE namespaces.nspname = 'public'
      AND attributes.attname = 'user_id'
      AND attributes.attnum > 0
      AND NOT attributes.attisdropped
      AND classes.relkind IN ('r', 'p')
      AND NOT classes.relispartition
      AND types.typname IN ('uuid', 'text', 'varchar')
    ORDER BY classes.relname
  LOOP
    BEGIN
      EXECUTE format(
        'SELECT EXISTS (SELECT 1 FROM public.%I WHERE user_id::text = $1::text)',
        target.table_name
      ) INTO has_owned_rows USING p_user_id;
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS
        diagnostic_state = RETURNED_SQLSTATE,
        diagnostic_message = MESSAGE_TEXT,
        diagnostic_detail = PG_EXCEPTION_DETAIL;
      RAISE EXCEPTION USING
        ERRCODE = diagnostic_state,
        MESSAGE = format(
          'Account cleanup inventory failed for public.%I [%s]: %s',
          target.table_name,
          diagnostic_state,
          diagnostic_message
        ),
        DETAIL = diagnostic_detail;
    END;

    IF has_owned_rows THEN
      owned_table_names := array_append(owned_table_names, target.table_name);
    END IF;
  END LOOP;

  -- A dependency chain cannot require more successful passes than the number
  -- of participating tables. Stop earlier as soon as a pass makes no progress.
  maximum_passes := GREATEST(cardinality(owned_table_names), 1);

  FOR cleanup_pass IN 1..maximum_passes LOOP
    deleted_in_pass := 0;

    FOREACH target_table_name IN ARRAY owned_table_names LOOP
      BEGIN
        EXECUTE format(
          'DELETE FROM public.%I WHERE user_id::text = $1::text',
          target_table_name
        ) USING p_user_id;
        GET DIAGNOSTICS rows_deleted = ROW_COUNT;
        deleted_in_pass := deleted_in_pass + rows_deleted;
      EXCEPTION
        WHEN foreign_key_violation THEN
          -- A later table in this pass may remove the dependent rows. The
          -- all-or-nothing verification below rejects any genuine blocker.
          NULL;
        WHEN OTHERS THEN
          GET STACKED DIAGNOSTICS
            diagnostic_state = RETURNED_SQLSTATE,
            diagnostic_message = MESSAGE_TEXT,
            diagnostic_detail = PG_EXCEPTION_DETAIL;
          RAISE EXCEPTION USING
            ERRCODE = diagnostic_state,
            MESSAGE = format(
              'Account cleanup failed for public.%I [%s]: %s',
              target_table_name,
              diagnostic_state,
              diagnostic_message
            ),
            DETAIL = diagnostic_detail;
      END;
    END LOOP;

    EXIT WHEN deleted_in_pass = 0;
  END LOOP;

  FOREACH target_table_name IN ARRAY owned_table_names LOOP
    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM public.%I WHERE user_id::text = $1::text)',
      target_table_name
    ) INTO has_owned_rows USING p_user_id;

    IF has_owned_rows THEN
      RAISE EXCEPTION USING
        ERRCODE = '23503',
        MESSAGE = format(
          'Account cleanup is blocked by public.%I',
          target_table_name
        );
    END IF;
  END LOOP;

  -- Profiles deliberately cannot have an Auth FK because the community also
  -- contains seed/demo profiles. Delete the real user's profile explicitly.
  BEGIN
    DELETE FROM public.profiles WHERE id = p_user_id;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS
      diagnostic_state = RETURNED_SQLSTATE,
      diagnostic_message = MESSAGE_TEXT,
      diagnostic_detail = PG_EXCEPTION_DETAIL;
    RAISE EXCEPTION USING
      ERRCODE = diagnostic_state,
      MESSAGE = format(
        'Account cleanup failed for public.profiles [%s]: %s',
        diagnostic_state,
        diagnostic_message
      ),
      DETAIL = diagnostic_detail;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_account_data_v1(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_account_data_v1(uuid)
  TO service_role;
