-- Update hashtags to proper capitalization
-- This migration updates specific hashtags in the stories_articles table

DO $$
DECLARE
  story_record RECORD;
  updated_tags TEXT[];
  tag TEXT;
  normalized_tag TEXT;
BEGIN
  FOR story_record IN 
    SELECT id, hashtags 
    FROM public.stories_articles 
    WHERE hashtags IS NOT NULL 
      AND array_length(hashtags, 1) > 0
  LOOP
    updated_tags := ARRAY[]::TEXT[];
    
    FOREACH tag IN ARRAY story_record.hashtags
    LOOP
      normalized_tag := LOWER(REPLACE(tag, '#', ''));
      
      CASE normalized_tag
        WHEN 'startuplife' THEN
          updated_tags := array_append(updated_tags, '#StartupLife');
        WHEN 'entrepreneurship' THEN
          updated_tags := array_append(updated_tags, '#Entrepreneurship');
        WHEN 'leadership' THEN
          updated_tags := array_append(updated_tags, '#Leadership');
        WHEN 'startupgrowth' THEN
          updated_tags := array_append(updated_tags, '#StartupGrowth');
        ELSE
          -- Keep other tags as-is
          updated_tags := array_append(updated_tags, tag);
      END CASE;
    END LOOP;
    
    -- Only update if tags were actually changed
    IF updated_tags != story_record.hashtags THEN
      UPDATE public.stories_articles
      SET hashtags = updated_tags
      WHERE id = story_record.id;
    END IF;
  END LOOP;
END $$;


