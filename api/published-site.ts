// Vercel Edge Function — serves published MVP Builder sites.
//
// When a project is "Published", it gets a locked subdomain_slug and a public URL
// {slug}.creatives-takeover.com. A wildcard domain (*.creatives-takeover.com) on
// the Vercel project plus a host-scoped rewrite in vercel.json sends those requests
// here. We resolve the slug + requested path to the project's stored files via the
// SECURITY DEFINER RPC get_published_mvp_file (anon-safe) and return the file with
// the correct content type.
//
// Scope/limitations:
// - Best for self-contained / static (html_single) projects, including multi-file
//   static sites (each asset path is looked up on demand).
// - React/Vite projects store source, not a build, so they cannot be served as-is.

export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://rcjlaybjnozqbsoxzboa.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
const BASE_DOMAIN = 'creatives-takeover.com';
const RESERVED_LABELS = new Set(['www', 'app', 'api', 'mail', 'admin', 'staging']);

const CONTENT_TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  txt: 'text/plain; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  webmanifest: 'application/manifest+json',
};

function contentTypeFor(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return CONTENT_TYPES[ext] ?? 'text/html; charset=utf-8';
}

function notFound(message: string): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Site not found</title>
<style>body{font-family:system-ui,sans-serif;background:#0b0b0f;color:#e5e7eb;display:grid;place-items:center;min-height:100vh;margin:0}
.card{max-width:28rem;text-align:center;padding:2rem}h1{font-size:1.25rem;margin:0 0 .5rem}p{color:#9ca3af;margin:0}</style>
</head><body><div class="card"><h1>Site not found</h1><p>${message}</p></div></body></html>`;
  return new Response(html, {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
  });
}

function resolveSlug(req: Request): string | null {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get('slug');
  if (fromQuery) return fromQuery.toLowerCase();

  // Fall back to the Host header: <slug>.creatives-takeover.com
  const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0];
  if (!host.endsWith(`.${BASE_DOMAIN}`)) return null;
  const label = host.slice(0, -1 * (`.${BASE_DOMAIN}`.length)).split('.').pop() ?? '';
  if (!label || RESERVED_LABELS.has(label)) return null;
  return label;
}

export default async function handler(req: Request): Promise<Response> {
  const slug = resolveSlug(req);
  if (!slug) {
    return notFound('This address is not a published project.');
  }
  if (!SUPABASE_KEY) {
    return notFound('Publishing is temporarily unavailable.');
  }

  // Path comes from the vercel.json rewrite (?p=:path). Default to index.html for the
  // root; guard against an unsubstituted ":path" token when the rewrite param is empty.
  const url = new URL(req.url);
  let requestedPath = url.searchParams.get('p') ?? '';
  if (requestedPath.startsWith(':')) requestedPath = '';

  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_published_mvp_file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ p_slug: slug, p_path: requestedPath }),
    });

    if (!resp.ok) {
      return notFound('This site could not be loaded right now.');
    }

    const rows = (await resp.json()) as Array<{ content: string | null; filename: string | null }>;
    const file = Array.isArray(rows) ? rows[0] : null;
    if (!file || file.content == null) {
      return notFound('There is no published page at this address yet.');
    }

    return new Response(file.content, {
      status: 200,
      headers: {
        'Content-Type': contentTypeFor((file.filename ?? requestedPath) || 'index.html'),
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch {
    return notFound('This site could not be loaded right now.');
  }
}
