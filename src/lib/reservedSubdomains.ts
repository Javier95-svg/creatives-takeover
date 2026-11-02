// Subdomain labels a published site or launch page may never use. Published
// work lives at {slug}.creatives-takeover.com, so labels like login, billing or
// support would let anyone host a convincing phishing page on our domain.
// Used by api/published-site.ts, middleware.ts and src/lib/demoStudio/api.ts.
// supabase/functions/mvp-builder-publish keeps a copy (Deno cannot import from
// src); tests/security-hardening.test.ts fails if the two differ.
export const RESERVED_SUBDOMAIN_LABELS: ReadonlySet<string> = new Set([
  'abuse', 'account', 'accounts', 'admin', 'api', 'app', 'assets', 'auth', 'beta', 'billing',
  'blog', 'careers', 'cdn', 'checkout', 'creatives', 'creativestakeover', 'ct', 'dashboard',
  'dev', 'docs', 'e', 'ftp', 'help', 'id', 'internal', 'jobs', 'legal', 'login', 'mail', 'my',
  'no-reply', 'noreply', 'ns1', 'ns2', 'oauth', 'official', 'password', 'pay', 'payment',
  'payments', 'portal', 'postmaster', 'preview', 'privacy', 'reset', 'secure', 'security',
  'signin', 'signup', 'smtp', 'sso', 'staging', 'static', 'status', 'support', 'team', 'test',
  'verify', 'webmail', 'www',
]);
