import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildDiscoveryQueries,
  normalizeDiscoveryFilters,
  rankDiscoveryPosts,
  scoreDiscoveryPost,
} from '../supabase/functions/_shared/pmf-discovery-search.ts';
import { retryWithBackoff } from '../supabase/functions/_shared/api-retry.ts';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const post = (overrides: Record<string, unknown> = {}) => ({
  id: 'post-1',
  title: 'Looking for an alternative invoicing tool',
  body: 'Our current workflow is frustrating and expensive.',
  subreddit: 'freelance',
  upvotes: 80,
  comments: 20,
  permalink: 'https://reddit.test/post-1',
  author: 'real_founder',
  createdUtc: Date.now() / 1000,
  ageDays: 4,
  ...overrides,
});

test('v2 query planner is deterministic, unique, and bounded to five variants', () => {
  const queries = buildDiscoveryQueries({
    productName: 'invoice automation',
    targetAudience: 'freelance designers',
    problem: 'late client payments',
  });
  assert.equal(queries.length, 5);
  assert.equal(new Set(queries).size, queries.length);
  assert.equal(queries[0], 'late client payments');
  assert.ok(queries.every((query) => query.length <= 250));
});

test('filter normalization enforces time and subreddit limits', () => {
  const filters = normalizeDiscoveryFilters({
    timeRange: 'month',
    includeSubreddits: ['r/startups', 'saas', 'one', 'two', 'three', 'overflow'],
    excludeSubreddits: Array.from({ length: 30 }, (_, index) => `r/spam_${index}`),
  });
  assert.equal(filters.timeRange, 'month');
  assert.equal(filters.includeSubreddits.length, 5);
  assert.equal(filters.includeSubreddits[0], 'startups');
  assert.equal(filters.excludeSubreddits.length, 20);
});

test('ranking rewards relevant recent intent and penalizes promotional spam', () => {
  const queries = ['alternative invoicing tool', 'freelance invoicing'];
  const strong = scoreDiscoveryPost(post(), queries);
  const spam = scoreDiscoveryPost(post({ id: 'spam', title: 'Buy now with my promo code', body: 'Sponsored affiliate discount code' }), queries);
  assert.equal(strong.inferredCategory, 'seeking_alternatives');
  assert.equal(strong.intentScore, 25);
  assert.equal(strong.freshnessScore, 15);
  assert.ok(strong.rankScore > spam.rankScore);
  assert.equal(spam.spamPenalty, 30);
});

test('ranking deduplicates posts, marks prior evidence, and caps returned results', () => {
  const candidates = Array.from({ length: 130 }, (_, index) => post({ id: `post-${index}`, permalink: `https://reddit.test/${index}`, upvotes: index }));
  candidates.push(candidates[0]);
  const ranked = rankDiscoveryPosts(candidates, ['invoicing tool'], new Set(['post-99']), 30);
  assert.equal(ranked.length, 30);
  assert.equal(new Set(ranked.map((item) => item.id)).size, 30);
  const seen = ranked.find((item) => item.id === 'post-99');
  assert.equal(seen?.isNew, false);
});

test('retry utility honors Retry-After and reports retry diagnostics', async () => {
  let calls = 0;
  const retries: Array<{ delayMs: number; status?: number }> = [];
  const result = await retryWithBackoff(async () => {
    calls += 1;
    if (calls === 1) {
      const response = new Response('', { status: 429, headers: { 'Retry-After': '0' } });
      throw Object.assign(new Error('rate limited'), { status: 429, response });
    }
    return 'ok';
  }, {
    maxAttempts: 2,
    initialDelay: 100,
    maxDelay: 100,
    respectRetryAfter: true,
    onRetry: ({ delayMs, status }) => retries.push({ delayMs, status }),
  });
  assert.equal(result, 'ok');
  assert.equal(calls, 2);
  assert.deepEqual(retries, [{ delayMs: 0, status: 429 }]);
});

test('lead migration enforces ownership, lifecycle, and service-only finalization', () => {
  const migration = read('supabase/migrations/20260716150000_pmf_discovery_lead_pipeline.sql');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.pmf_discovery_leads/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.pmf_discovery_lead_activities/);
  assert.match(migration, /status IN \('new', 'saved', 'contacted', 'interview_scheduled', 'interviewed', 'dismissed'\)/);
  assert.match(migration, /UNIQUE \(user_id, source, normalized_username\)/);
  assert.match(migration, /auth\.uid\(\) = user_id/);
  assert.match(migration, /pmf_discovery_leads\.occurrence_count \+ 1/);
  assert.doesNotMatch(migration, /status = EXCLUDED\.status/);
  assert.match(migration, /REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION[\s\S]*TO service_role/);
});

test('edge orchestration gates health, bounds search, and finalizes leads before completion', () => {
  const edge = read('supabase/functions/pmf-customer-discovery/index.ts');
  const deductAt = edge.indexOf('const creditResult = await checkAndDeductCredits');
  const finalizeAt = edge.indexOf("serviceClient.rpc('finalize_pmf_discovery_leads'");
  const completeAt = edge.indexOf("await emitDiscovery('pmf_customer_discovery_completed'");
  assert.match(edge, /body\.action === 'health'/);
  assert.match(edge, /\.from\('user_roles'\)/);
  assert.match(edge, /mapWithConcurrency\(searchJobs\.slice\(0, searchVersion === 2 \? 10 : 4\), 3/);
  assert.match(edge, /pmf_customer_discovery_degraded/);
  assert.ok(deductAt > 0 && deductAt < finalizeAt && finalizeAt < completeAt);
});

test('client surfaces flags, filters, pipeline, export, and interview linkage', () => {
  const discovery = read('src/components/pmf/PMFCustomerDiscovery.tsx');
  const pipeline = read('src/components/pmf/PMFDiscoveryPipeline.tsx');
  const interview = read('src/components/pmf/PMFEvidenceForm.tsx');
  const workflow = read('.github/workflows/supabase-production-deploy.yml');
  assert.match(discovery, /pmf-discovery-search-v2/);
  assert.match(discovery, /pmf-discovery-pipeline-v1/);
  assert.match(discovery, /includeSubreddits/);
  assert.match(pipeline, /Export CSV/);
  assert.match(pipeline, /Active leads/);
  assert.match(interview, /sourceLeadId/);
  assert.match(workflow, /workflow_run:/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /version: 2\.98\.2/);
});
