-- Update avatars for seeded demo authors to look human
UPDATE public.profiles SET avatar_url = 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=400&h=400&fit=crop&crop=face'
WHERE full_name = 'Maya Chen';

UPDATE public.profiles SET avatar_url = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face'
WHERE full_name = 'Carlos Rodriguez';

UPDATE public.profiles SET avatar_url = 'https://images.unsplash.com/photo-1544005314-0ceecf7a77ce?w=400&h=400&fit=crop&crop=face'
WHERE full_name = 'Priya Sharma';

UPDATE public.profiles SET avatar_url = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face'
WHERE full_name = 'Jordan Park';