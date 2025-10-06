-- Update Carlos Rodriguez profile avatars to show male instead of female
UPDATE profiles 
SET avatar_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face'
WHERE full_name = 'Carlos Rodriguez' 
AND avatar_url = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face';