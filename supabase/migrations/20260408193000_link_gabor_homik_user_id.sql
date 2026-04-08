-- Link Gabor Homik's mentor profile to his messaging account so the Message CTA opens DMs

UPDATE public.mentors
SET user_id = '5658607e-80ca-4478-8b3b-74148f1b959d'
WHERE id = 'a7e88f4f-8ca0-4c20-8a5a-686e0da5820c'
   OR (
     LOWER(name) LIKE '%homik%'
     AND (
       LOWER(name) LIKE '%gabor%'
       OR LOWER(name) LIKE '%gábor%'
     )
   );
