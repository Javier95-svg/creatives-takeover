-- Insert default hero images
-- Position 1: Founder workspace with dashboard
INSERT INTO public.hero_images (position, image_url, alt_text, is_active)
VALUES (
  1,
  '/src/assets/hero-founder-workspace.svg',
  'Founder working at night with Creatives Takeover dashboard on screen',
  true
)
ON CONFLICT (position) DO UPDATE SET
  image_url = EXCLUDED.image_url,
  alt_text = EXCLUDED.alt_text,
  is_active = EXCLUDED.is_active;

