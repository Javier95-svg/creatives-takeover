-- Update Maya Chen profile avatar to ensure it shows a female picture
UPDATE profiles 
SET avatar_url = 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face'
WHERE full_name = 'Maya Chen';