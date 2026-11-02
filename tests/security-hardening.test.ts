import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { RESERVED_SUBDOMAIN_LABELS } from '../src/lib/reservedSubdomains.ts';

const read = (path: string) => readFileSync(path, 'utf8');

async function bundle(path: string) {
  const result = await build({ entryPoints: [path], bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false });
  const mod = { exports: {} as Record<string, unknown> };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
  return mod.exports;
}

type Handler = (req: Request) => Promise<Response | undefined>;

async function withStubbedFetch(run: (calls: string[]) => Promise<void>) {
  const previousFetch = globalThis.fetch;
  const previousKey = process.env.VITE_SUPABASE_KEY;
  const calls: string[] = [];
  process.env.VITE_SUPABASE_KEY = 'test-key';
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push(`${String(input)} ${typeof init?.body === 'string' ? init.body : ''}`.trim());
    return Response.json([{ content: '<html><head></head><body>ok</body></html>', filename: 'index.html', seo_indexable: false }]);
  }) as typeof fetch;
  try {
    await run(calls);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.VITE_SUPABASE_KEY;
    else process.env.VITE_SUPABASE_KEY = previousKey;
  }
}

const request = (url: string, host = new URL(url).host) => new Request(url, { headers: { host } });

test('member sites are never served from the main domain or a preview host', async () => {
  // A member's HTML or JavaScript served from creatives-takeover.com itself runs
  // with the main site's origin, where the signed-in session lives.
  await withStubbedFetch(async (calls) => {
    const { default: handler } = (await bundle('api/published-site.ts')) as { default: Handler };
    for (const url of [
      'https://creatives-takeover.com/api/published-site?slug=victim&p=app.js',
      'https://creatives-takeover-git-main.vercel.app/api/published-site?slug=victim&p=index.html',
      'https://login.creatives-takeover.com/api/published-site?p=index.html',
      'https://support.creatives-takeover.com/api/published-site?p=index.html',
    ]) {
      const response = await handler(request(url));
      assert.equal(response?.status, 404, url);
    }
    assert.deepEqual(calls, [], 'no site lookup happens for these hosts');
  });
});

test('a published site is chosen by its own subdomain, never by ?slug', async () => {
  await withStubbedFetch(async (calls) => {
    const { default: handler } = (await bundle('api/published-site.ts')) as { default: Handler };
    const response = await handler(request('https://acme.creatives-takeover.com/api/published-site?p=index.html&slug=victim'));
    assert.equal(response?.status, 200);
    assert.equal(calls.length, 1);
    assert.match(calls[0], /"p_slug":"acme"/);
    assert.doesNotMatch(calls[0], /victim/);
  });
});

test('the root proxy forwards on the site subdomain and skips reserved labels', async () => {
  await withStubbedFetch(async (calls) => {
    const { default: middleware } = (await bundle('middleware.ts')) as { default: Handler };
    const proxied = await middleware(request('https://acme.creatives-takeover.com/'));
    assert.equal(proxied?.status, 200);
    const target = new URL(calls[0].split(' ')[0]);
    assert.equal(target.host, 'acme.creatives-takeover.com');
    assert.equal(target.pathname, '/api/published-site');
    assert.equal(target.searchParams.has('slug'), false);

    calls.length = 0;
    assert.equal(await middleware(request('https://login.creatives-takeover.com/')), undefined);
    assert.equal(await middleware(request('https://creatives-takeover.com/')), undefined);
    assert.deepEqual(calls, []);
  });
});

test('sensitive subdomains are reserved everywhere a slug is chosen or served', () => {
  for (const label of ['admin', 'api', 'app', 'auth', 'billing', 'e', 'login', 'mail', 'status', 'support', 'www']) {
    assert.ok(RESERVED_SUBDOMAIN_LABELS.has(label), label);
  }

  // The publish function runs on Deno and keeps its own copy of the list.
  const publish = read('supabase/functions/mvp-builder-publish/index.ts');
  const copy = publish.match(/const RESERVED_SUBDOMAIN_LABELS = new Set\(\[([\s\S]*?)\]\);/);
  assert.ok(copy, 'mvp-builder-publish declares RESERVED_SUBDOMAIN_LABELS');
  const copied = [...copy[1].matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(copied.sort(), [...RESERVED_SUBDOMAIN_LABELS].sort());
  assert.match(publish, /if \(RESERVED_SUBDOMAIN_LABELS\.has\(base\)\) taken\.add\(base\);/);

  for (const file of ['api/published-site.ts', 'middleware.ts', 'src/lib/demoStudio/api.ts']) {
    const source = read(file);
    assert.match(source, /from '(?:\.\.?\/src\/lib|@\/lib)\/reservedSubdomains'/, file);
    assert.doesNotMatch(source, /new Set\(\['www'/, `${file} keeps no private copy`);
  }
});
