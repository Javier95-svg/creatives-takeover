-- =====================================================
-- Delete Javier Pena's Comments from Today
-- This migration deletes the 2 comments posted today
-- by Javier Pena in the community section
-- =====================================================

DO $$
DECLARE
  javier_user_id UUID;
  deleted_count INTEGER;
  comments_to_delete RECORD;
BEGIN
  -- Step 1: Find Javier Pena's user_id from profiles table
  SELECT id INTO javier_user_id
  FROM public.profiles
  WHERE LOWER(full_name) = LOWER('Javier Pena')
     OR LOWER(full_name) LIKE LOWER('%javier%pena%')
     OR LOWER(TRIM(full_name)) = LOWER('javier pena')
  LIMIT 1;
  
  IF javier_user_id IS NULL THEN
    RAISE WARNING 'Javier Pena profile not found';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found Javier Pena with user_id: %', javier_user_id;
  
  -- Step 2: Find and list comments posted today
  RAISE NOTICE 'Comments posted today by Javier Pena:';
  FOR comments_to_delete IN
    SELECT id, content, created_at, post_id
    FROM public.post_comments
    WHERE user_id = javier_user_id
      AND DATE(created_at) = CURRENT_DATE
    ORDER BY created_at DESC
  LOOP
    RAISE NOTICE '  - Comment ID: %, Content: %, Created: %, Post ID: %', 
      comments_to_delete.id, 
      LEFT(comments_to_delete.content, 50),
      comments_to_delete.created_at,
      comments_to_delete.post_id;
  END LOOP;
  
  -- Step 3: Delete comments posted today
  WITH deleted AS (
    DELETE FROM public.post_comments
    WHERE user_id = javier_user_id
      AND DATE(created_at) = CURRENT_DATE
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  -- Step 4: Verification
  IF deleted_count > 0 THEN
    RAISE NOTICE 'Successfully deleted % comment(s) posted today by Javier Pena', deleted_count;
  ELSE
    RAISE NOTICE 'No comments found for deletion (no comments posted today by Javier Pena)';
  END IF;
  
  -- Verify deletion
  SELECT COUNT(*) INTO deleted_count
  FROM public.post_comments
  WHERE user_id = javier_user_id
    AND DATE(created_at) = CURRENT_DATE;
  
  IF deleted_count = 0 THEN
    RAISE NOTICE 'Verification: No comments from today remain for Javier Pena';
  ELSE
    RAISE WARNING 'Verification: % comment(s) from today still exist for Javier Pena', deleted_count;
  END IF;
END $$;

-- =====================================================
-- Migration Complete!
-- =====================================================
-- Javier Pena's comments from today have been deleted
-- =====================================================

