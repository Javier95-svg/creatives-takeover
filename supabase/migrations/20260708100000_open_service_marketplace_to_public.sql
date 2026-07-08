-- Make the Service Marketplace browse/profile routes readable by anonymous
-- visitors. RLS still limits public reads to active services and keeps all
-- mutations admin-only.

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.services TO anon, authenticated;
