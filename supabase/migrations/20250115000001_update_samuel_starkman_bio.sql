-- Update Samuel Starkman's bio
UPDATE public.mentors
SET bio = 'Hello, I''m Sam. I''m a Data Engineer with a background in cybersecurity and machine learning. 



I''ve been crunching numbers and building data pipelines for over a decade while documenting my journey on social media. My specialty lies in getting your project idea from 0 to 1 while teaching you how to build and automate with AI. Some of the projects I''ve built recently are:



- Lexica: a word-of-the-day texter.

- Market Pulse: an automated stock market analysis email system.

- Sequence: a Wordle-inspired memory game.

- OneHome: an iOS app to track and manage your home services.



If you''re looking to your rough idea into a working product, build automations with AI, or get unstuck technically, I would be happy to help.',
    updated_at = now()
WHERE LOWER(name) LIKE '%samuel%' 
  AND LOWER(name) LIKE '%starkman%';

