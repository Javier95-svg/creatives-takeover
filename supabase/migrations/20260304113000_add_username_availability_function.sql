CREATE OR REPLACE FUNCTION public.is_username_available(
  candidate TEXT,
  current_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_candidate TEXT;
BEGIN
  normalized_candidate := lower(COALESCE(candidate, ''));
  normalized_candidate := regexp_replace(normalized_candidate, '\s+', '', 'g');
  normalized_candidate := regexp_replace(normalized_candidate, '[^a-z0-9_]', '', 'g');
  normalized_candidate := regexp_replace(normalized_candidate, '^_+|_+$', '', 'g');

  IF normalized_candidate = '' THEN
    RETURN FALSE;
  END IF;

  IF char_length(normalized_candidate) < 3 OR char_length(normalized_candidate) > 30 THEN
    RETURN FALSE;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE lower(p.username) = normalized_candidate
      AND (current_user_id IS NULL OR p.id <> current_user_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.is_username_available(TEXT, UUID) TO authenticated;
