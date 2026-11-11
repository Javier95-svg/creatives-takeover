-- Published MVP Builder sites are down: every *.creatives-takeover.com app
-- answered 404 "This site could not be loaded right now" (found 2026-11-11).
--
-- api/published-site.ts serves each app by calling get_published_mvp_file_v2
-- with the public (anon) key. 20261102100000_security_lockdown.sql revoked
-- EXECUTE from anon on every SECURITY DEFINER function not on its allowlist,
-- and this one was missing because the browser never calls it (the Vercel
-- route does), so the RPC has returned 401 for every visitor since then.
--
-- Granting anon is safe: the function returns files only for projects with
-- deployment_status = 'deployed', plus their public SEO fields, which is
-- exactly what any visitor of the published site already receives. The older
-- get_published_mvp_file has no callers and stays closed.

GRANT EXECUTE ON FUNCTION public.get_published_mvp_file_v2(text, text) TO anon, authenticated;
