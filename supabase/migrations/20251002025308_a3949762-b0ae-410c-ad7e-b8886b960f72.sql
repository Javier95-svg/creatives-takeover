-- Grant admin role to admin@creatives-takeover.com
INSERT INTO user_roles (user_id, role) 
VALUES ('b87c3c91-de0e-404b-b321-6dc918c0eb91', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;