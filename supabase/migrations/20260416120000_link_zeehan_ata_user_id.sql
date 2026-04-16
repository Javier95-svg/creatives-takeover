-- Link Zeehan Ata's mentor profile to his messaging account so the Message CTA opens DMs

UPDATE public.mentors
SET user_id = 'ccd28831-1874-4fa1-9088-b8a74f854b9c'
WHERE LOWER(name) LIKE '%ata%'
  AND (
    LOWER(name) LIKE '%zeehan%'
    OR LOWER(name) LIKE '%zeeshan%'
  );
