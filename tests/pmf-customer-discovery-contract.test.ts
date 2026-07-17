import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildDeterministicPeople,
  hasUsableDiscoveryOutput,
  totalAvailableCredits,
} from '../supabase/functions/_shared/pmf-discovery-contract.ts';
import { createRedditClient } from '../supabase/functions/_shared/reddit.ts';

const originalFetch = globalThis.fetch;
const originalDeno = (globalThis as any).Deno;

const setEdgeEnv = (values: Record<string, string | undefined>) => {
  (globalThis as any).Deno = { env: { get: (key: string) => values[key] } };
};

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  (globalThis as any).Deno = originalDeno;
});

test('missing Reddit credentials are explicit and never use anonymous endpoints', async () => {
  setEdgeEnv({});
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('fetch should not be called');
  };

  const client = await createRedditClient();
  assert.equal(client.sourceState.status, 'missing_credentials');
  assert.deepEqual(await client.searchReddit('founder pain'), []);
  assert.equal(fetchCalls, 0);
});

test('invalid Reddit OAuth credentials return authentication_failed', async () => {
  setEdgeEnv({ REDDIT_CLIENT_ID: 'client', REDDIT_CLIENT_SECRET: 'invalid-secret' });
  globalThis.fetch = async () => new Response('', { status: 401 });

  const client = await createRedditClient();
  assert.equal(client.sourceState.status, 'authentication_failed');
  assert.equal(client.sourceState.httpStatus, 401);
  assert.deepEqual(await client.searchReddit('founder pain'), []);
});

test('Reddit API rate limiting remains distinguishable from a valid empty result', async () => {
  setEdgeEnv({ REDDIT_CLIENT_ID: 'client', REDDIT_CLIENT_SECRET: 'secret' });
  let call = 0;
  globalThis.fetch = async () => {
    call += 1;
    if (call === 1) {
      return new Response(JSON.stringify({ access_token: 'token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('', { status: 429 });
  };

  const client = await createRedditClient();
  assert.deepEqual(await client.searchReddit('founder pain'), []);
  assert.equal(client.sourceState.status, 'rate_limited');
  assert.equal(client.sourceState.httpStatus, 429);
});

test('valid Reddit empty results keep the source available for NO_LEADS_FOUND handling', async () => {
  setEdgeEnv({ REDDIT_CLIENT_ID: 'client', REDDIT_CLIENT_SECRET: 'secret' });
  let call = 0;
  globalThis.fetch = async () => {
    call += 1;
    return call === 1
      ? new Response(JSON.stringify({ access_token: 'token' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      : new Response(JSON.stringify({ data: { children: [] } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const client = await createRedditClient();
  assert.deepEqual(await client.searchReddit('very specific pain'), []);
  assert.equal(client.sourceState.status, 'available');
});

test('deterministic fallback produces real, deduplicated contact candidates', () => {
  const posts = [
    { id: '1', title: 'Need a better tool', subreddit: 'startups', permalink: 'https://reddit.test/1', author: 'FounderA' },
    { id: '2', title: 'Same author again', subreddit: 'saas', permalink: 'https://reddit.test/2', author: 'foundera' },
    { id: '3', title: 'Deleted post', subreddit: 'startups', permalink: 'https://reddit.test/3', author: '[deleted]' },
    { id: '4', title: 'Looking for an alternative', subreddit: 'smallbusiness', permalink: 'https://reddit.test/4', author: 'FounderB' },
  ];

  const people = buildDeterministicPeople(posts, ['4'], new Map([['4', 'seeking_alternatives']]));
  assert.deepEqual(people.map((person) => person.username), ['FounderB', 'FounderA']);
  assert.equal(people[0].permalink, posts[3].permalink);
  assert.equal(people[0].category, 'seeking_alternatives');
});

test('success requires both a real thread and a usable person, and receipt uses total wallet credits', () => {
  assert.equal(hasUsableDiscoveryOutput([], []), false);
  assert.equal(hasUsableDiscoveryOutput([{}], []), false);
  assert.equal(hasUsableDiscoveryOutput([], [{}]), false);
  assert.equal(hasUsableDiscoveryOutput([{}], [{}]), true);
  assert.equal(totalAvailableCredits(21, 55), 76);
});

test('edge flow validates and persists output before deducting credits and completing', () => {
  const edge = readFileSync(
    new URL('../supabase/functions/pmf-customer-discovery/index.ts', import.meta.url),
    'utf8',
  );
  const validateAt = edge.indexOf('if (!hasUsableDiscoveryOutput(threads, people))');
  const persistAt = edge.indexOf(".from('pmf_customer_discovery' as any)");
  const deductAt = edge.indexOf('const creditResult = await checkAndDeductCredits');
  const completeAt = edge.indexOf("await emitDiscovery('pmf_customer_discovery_completed'");

  assert.ok(validateAt > 0);
  assert.ok(validateAt < persistAt);
  assert.ok(persistAt < deductAt);
  assert.ok(deductAt < completeAt);
  assert.match(edge, /REDDIT_CREDENTIALS_MISSING/);
  assert.match(edge, /REDDIT_AUTHENTICATION_FAILED/);
  assert.match(edge, /NO_LEADS_FOUND/);
  assert.match(edge, /DISCOVERY_PERSISTENCE_FAILED/);
});
