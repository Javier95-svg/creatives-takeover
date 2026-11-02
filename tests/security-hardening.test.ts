import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
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

const LEGACY_USER_ID_RPCS = [
  'check_and_award_badges', 'check_and_increment_usage', 'complete_daily_challenge', 'deduct_mvp_credits_atomic',
  'ensure_mvp_credit_balance', 'generate_referral_code', 'notify_task_deadline_expired',
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

test('the browser never asks the database to act for a user id it chose', () => {
  // These functions took p_user_id and acted for whoever it named. The browser
  // calls the *_mine versions, which use the session's own user.
  const offenders = sourceFiles('src').flatMap((file) => {
    const source = read(file);
    return LEGACY_USER_ID_RPCS.filter((name) => new RegExp('\\.rpc\\(\\s*[\'"`]' + name + '[\'"`]').test(source)).map((name) => `${file}: ${name}`);
  });
  assert.deepEqual(offenders, []);
  assert.doesNotMatch(read('src/lib/db/queries.ts'), /from\('user_credits'\)\s*\.update/);
});

test('a *_mine call falls back to the old function only while it does not exist yet', async () => {
  const result = await build({
    entryPoints: ['src/lib/callerRpc.ts'], bundle: true, platform: 'node', format: 'cjs', write: false,
    plugins: [{
      name: 'stub-supabase',
      setup(b) {
        b.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({ path: 'stub', namespace: 'stub' }));
        b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const supabase = {};', loader: 'js' }));
      },
    }],
  });
  const mod = { exports: {} as Record<string, unknown> };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), mod, mod.exports);
  const { rpcAsCaller } = mod.exports as { rpcAsCaller: (...args: unknown[]) => Promise<{ data: unknown; error: unknown }> };

  const calls: string[] = [];
  const client = (missing: boolean) => ({
    rpc: async (name: string) => {
      calls.push(name);
      return name.endsWith('_mine') && missing
        ? { data: null, error: { code: 'PGRST202', message: 'not found' } }
        : { data: name, error: null };
    },
  });
  const legacy = { name: 'generate_referral_code', args: { p_user_id: 'u1' } };

  assert.equal((await rpcAsCaller('generate_referral_code_mine', {}, legacy, client(false))).data, 'generate_referral_code_mine');
  assert.deepEqual(calls, ['generate_referral_code_mine']);
  calls.length = 0;
  assert.equal((await rpcAsCaller('generate_referral_code_mine', {}, legacy, client(true))).data, 'generate_referral_code');
  assert.deepEqual(calls, ['generate_referral_code_mine', 'generate_referral_code']);
});

test('edge functions that act for someone check who is calling', () => {
  // Each of these was callable with only the public anon key (audit 2026-11-01).
  const guarded = [
    'memory-manager', 'document-parser', 'chatbot-ai-engine', 'generate-recommendations',
    'send-push', 'send-article-notification-email', 'ai-model-router', 'embed-text', 'rag-chat',
    'speech-to-text', 'web-search', 'location-search', 'community-ai-moderator', 'bizmap-research',
    'rag-ingest', 'contact-form-submission', 'request-icp-draft-email', 'trigger-icp-sprint',
    'send-welcome-email', 'pmf-outcome-request', 'notify-admin', 'process-demo-try-drip',
    'process-icp-sprint-emails', 'send-weekly-scorecards', 'check-dormant-users', 'daily-challenge-generator',
    'daily-reminder-service', 'industry-news-feed', 'model-comparison-audit', 'process-icp-guest-drip',
    'task-reminder-service', 'churn-reactivation-service', 'news-aggregator',
    'market-intelligence-refresh', 'market-data-aggregator', 'rss-article-fetcher', 'trends-analyzer',
    'fetch-linkedin-metadata', 'send-retention-email', 'demo-studio-webhook-retry',
  ];
  const unguarded = guarded.filter((fn) => !/from ["']\.\.\/_shared\/guards\.ts["']/.test(read(`supabase/functions/${fn}/index.ts`)));
  assert.deepEqual(unguarded, []);

  const guards = read('supabase/functions/_shared/guards.ts');
  assert.match(guards, /auth\/v1\/admin\/users/, 'a service-role claim is confirmed by the auth server');
  assert.match(guards, /if \(!isServiceRoleToken\(token, ''\)\) return false;/);
  assert.match(read('supabase/functions/rag-ingest/index.ts'), /Boolean\(RAG_INGEST_KEY\) && /, 'an unset ingest key no longer opens the endpoint');
  assert.doesNotMatch(read('supabase/functions/_shared/middleware.ts'), /export async function extractUser/);
  assert.match(read('supabase/functions/supabase-integration/index.ts'), /match\(\/\^https:/);
});

test('the lockdown migration closes the self-service credit and storage holes', () => {
  const sql = read('supabase/migrations/20261102100000_security_lockdown.sql');
  assert.match(sql, /DROP POLICY IF EXISTS "Users can update their own credit row" ON public\.user_credits/);
  assert.match(sql, /CREATE TRIGGER guard_profile_billing_fields/);
  assert.match(sql, /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC/);
  assert.match(sql, /DROP POLICY IF EXISTS "Authenticated users can view collaboration files" ON storage\.objects/);
  for (const bucket of ['cv-uploads', 'message-attachments', 'chatbot-attachments', 'dashboard-files', 'collaboration-files']) {
    assert.match(sql, new RegExp(`'${bucket}'`), bucket);
  }
  for (const name of LEGACY_USER_ID_RPCS) assert.match(sql, new RegExp('FUNCTION public\\.' + name + '_mine\\('), name);
});
