// IndexNow submission endpoint. Pings the IndexNow network (Bing, Yandex, and
// participating engines) the moment content is published so new/updated URLs are
// discovered in minutes instead of waiting for the next crawl.
//
// Key verification file lives at /<KEY>.txt (public/). Only URLs on our own host
// are accepted, so the endpoint can't be abused to submit third-party URLs.

export const config = { runtime: 'edge' };

const KEY = '8e2b1f9c4a7d63e05b8f2c1a9d4e7b30';
const HOST = 'creatives-takeover.com';
const SITE = 'https://creatives-takeover.com';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return json({ ok: true });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  let body: { url?: string; urls?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  const raw = Array.isArray(body.urls) ? body.urls : typeof body.url === 'string' ? [body.url] : [];
  const urlList = raw
    .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    .map((u) => (u.startsWith('http') ? u : `${SITE}${u.startsWith('/') ? '' : '/'}${u}`))
    .filter((u) => u.startsWith(SITE))
    .slice(0, 100);

  if (!urlList.length) return json({ error: 'no valid on-site urls' }, 400);

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: HOST,
        key: KEY,
        keyLocation: `${SITE}/${KEY}.txt`,
        urlList,
      }),
    });
    return json({ submitted: urlList.length, indexnowStatus: res.status });
  } catch (error) {
    return json({ error: 'submission failed', detail: String(error) }, 502);
  }
}
