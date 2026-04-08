-- Persist Gabor Hornik's nationality so the Hungary flag renders from mentor data

UPDATE public.mentors
SET nationality = 'Hungary'
WHERE LOWER(name) LIKE '%hornik%'
  AND (
    LOWER(name) LIKE '%gabor%'
    OR LOWER(name) LIKE '%gábor%'
  );
