-- Make content column nullable to allow media-only comments
ALTER TABLE post_comments 
ALTER COLUMN content DROP NOT NULL;

ALTER TABLE post_comments 
ALTER COLUMN content SET DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN post_comments.content IS 'Comment text content - nullable to allow media-only comments';