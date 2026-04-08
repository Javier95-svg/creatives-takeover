-- Persist Gabor's nationality using the exact production mentor row currently present

UPDATE public.mentors
SET nationality = 'Hungary'
WHERE id = 'a7e88f4f-8ca0-4c20-8a5a-686e0da5820c'
   OR (
     LOWER(name) LIKE '%homik%'
     AND (
       LOWER(name) LIKE '%gabor%'
       OR LOWER(name) LIKE '%gábor%'
     )
   );
