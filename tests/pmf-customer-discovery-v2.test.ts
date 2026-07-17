import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildDiscoveryQueries,
  normalizeDiscoveryFilters,
  normalizeValidationStage,
  rankDiscoveryPosts,
  scoreDiscoveryPost,
} from '../supabase/functions/_shared/pmf-discovery-search.ts';
import { retryWithBackoff } from '../supabase/functions/_shared/api-retry.ts';
import { mapHackerNewsHit } from '../supabase/functions/_shared/hackernews.ts';
import { buildDeterministicPeople } from '../supabase/functions/_shared/pmf-discovery-contract.ts';
import { toExternalMention } from '../supabase/functions/_shared/external-mentions.ts';

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

test('validation stage normalizes safely and reorders the query plan by intent', () => {
  assert.equal(normalizeValidationStage('solution_validation'), 'solution_validation');
  assert.equal(normalizeValidationStage('pricing'), 'pricing');
  assert.equal(normalizeValidationStage('nonsense'), 'problem_discovery');
  assert.equal(normalizeValidationStage(undefined), 'problem_discovery');

  const input = { productName: 'invoice automation', targetAudience: 'freelance designers', problem: 'late client payments' };
  const discoveryQueries = buildDiscoveryQueries(input, 'problem_discovery');
  const validationQueries = buildDiscoveryQueries(input, 'solution_validation');
  const pricingQueries = buildDiscoveryQueries(input, 'pricing');
  assert.equal(discoveryQueries[0], 'late client payments');
  assert.match(validationQueries[0], /looking for/);
  assert.match(pricingQueries[0], /cost OR pricing/);
  for (const queries of [discoveryQueries, validationQueries, pricingQueries]) {
    assert.equal(new Set(queries).size, queries.length);
    assert.ok(queries.length <= 5);
  }
});

test('stage boost lifts posts matching the stage intent without breaking the 0-100 bound', () => {
  const queries = ['invoicing tool'];
  const alternativesPost = post({ id: 'alt', title: 'Alternative to my invoicing tool', body: 'Switching from the current one.' });
  const neutral = scoreDiscoveryPost(alternativesPost, queries, new Set(), 'problem_discovery');
  const boosted = scoreDiscoveryPost(alternativesPost, queries, new Set(), 'solution_validation');
  assert.equal(neutral.inferredCategory, 'seeking_alternatives');
  assert.ok(boosted.rankScore > neutral.rankScore);
  assert.ok(boosted.rankScore <= 100);

  const moneyPost = post({ id: 'money', title: 'Invoicing tool pricing is expensive', body: 'The subscription cost is brutal.' });
  const pricingScore = scoreDiscoveryPost(moneyPost, queries, new Set(), 'pricing');
  const defaultScore = scoreDiscoveryPost(moneyPost, queries, new Set());
  assert.ok(pricingScore.rankScore > defaultScore.rankScore);
});

test('hacker news hits map into the shared post shape and unusable hits are dropped', () => {
  const mapped = mapHackerNewsHit({
    objectID: '412345',
    title: 'Ask HN: How do you chase late invoices?',
    story_text: '<p>Clients pay late &amp; it hurts cash flow.</p>',
    author: 'founder_hn',
    points: 42,
    num_comments: 17,
    created_at_i: Math.floor(Date.now() / 1000) - 86_400 * 3,
  });
  assert.ok(mapped);
  assert.equal(mapped?.id, 'hn-412345');
  assert.equal(mapped?.source, 'hackernews');
  assert.equal(mapped?.subreddit, '');
  assert.equal(mapped?.permalink, 'https://news.ycombinator.com/item?id=412345');
  assert.equal(mapped?.body, 'Clients pay late & it hurts cash flow.');
  assert.equal(mapped?.ageDays, 3);
  assert.equal(mapHackerNewsHit({ objectID: '1', title: 'No author' }), null);
  assert.equal(mapHackerNewsHit({ objectID: '2', author: 'someone' }), null);
});

test('deterministic people carry per-source profile urls', () => {
  const people = buildDeterministicPeople([
    { id: 'r1', title: 'Reddit pain', subreddit: 'freelance', permalink: 'https://reddit.test/r1', author: 'reddit_user', source: 'reddit' },
    { id: 'hn-2', title: 'HN pain', subreddit: '', permalink: 'https://news.ycombinator.com/item?id=2', author: 'hn_user', source: 'hackernews' },
  ]);
  assert.equal(people.length, 2);
  assert.equal(people[0].source, 'reddit');
  assert.equal(people[0].profileUrl, 'https://www.reddit.com/user/reddit_user');
  assert.equal(people[1].source, 'hackernews');
  assert.equal(people[1].profileUrl, 'https://news.ycombinator.com/user?id=hn_user');
});

test('external mentions extract handles safely and reject off-platform urls', () => {
  const xMention = toExternalMention({ title: 'Founder thread', url: 'https://x.com/maker_jane/status/123' }, 'x');
  assert.equal(xMention?.platform, 'x');
  assert.equal(xMention?.username, 'maker_jane');

  const reserved = toExternalMention({ title: 'Search page', url: 'https://x.com/search?q=invoices' }, 'x');
  assert.ok(reserved);
  assert.equal(reserved?.username, undefined);

  const linkedinProfile = toExternalMention({ title: 'Profile', url: 'https://www.linkedin.com/in/jane-doe-123/' }, 'linkedin');
  assert.equal(linkedinProfile?.username, 'jane-doe-123');
  const linkedinPost = toExternalMention({ title: 'Post', url: 'https://www.linkedin.com/posts/jane-doe_invoicing-activity-9' }, 'linkedin');
  assert.equal(linkedinPost?.username, 'jane-doe');

  assert.equal(toExternalMention({ title: 'Spoof', url: 'https://evil.example/x.com/fake' }, 'x'), null);
  assert.equal(toExternalMention({ title: 'Spoof', url: 'https://linkedin.com.evil.example/in/fake' }, 'linkedin'), null);
  assert.equal(toExternalMention({ title: 'No url' }, 'x'), null);
});

test('multi-source migration widens sources, adds opt-in, and scopes function grants', () => {
  const migration = read('supabase/migrations/20260716180000_pmf_discovery_multi_source_network.sql');
  assert.match(migration, /CHECK \(source IN \('reddit', 'platform', 'hackernews', 'x', 'linkedin', 'web'\)\)/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS platform_user_id UUID REFERENCES public\.profiles\(id\) ON DELETE SET NULL/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS validation_interviews_opt_in BOOLEAN NOT NULL DEFAULT false/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.match_validation_users/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.match_validation_users[\s\S]*TO authenticated, service_role/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.finalize_pmf_discovery_leads[\s\S]*FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /WHERE p\.validation_interviews_opt_in/);
  const returnsTable = migration.match(/match_validation_users[\s\S]*?RETURNS TABLE \(([\s\S]*?)\)\s*LANGUAGE/)?.[1] || '';
  assert.match(returnsTable, /activity_bucket TEXT/);
  assert.doesNotMatch(returnsTable, /last_active_at/, 'precise last_active_at must not be exposed to callers');
});

test('client surfaces stage selector, community matches, external mentions, and multi-source pipeline', () => {
  const discovery = read('src/components/pmf/PMFCustomerDiscovery.tsx');
  const pipeline = read('src/components/pmf/PMFDiscoveryPipeline.tsx');
  const matches = read('src/components/pmf/PMFCommunityMatches.tsx');
  const account = read('src/pages/Account.tsx');
  assert.match(discovery, /What are you validating right now\?/);
  assert.match(discovery, /PMFCommunityMatches/);
  assert.match(discovery, /externalMentions/);
  assert.match(discovery, /Attach a demo to your outreach/);
  assert.match(discovery, /aria-label="Scan history"/);
  assert.match(pipeline, /All sources/);
  assert.match(pipeline, /LEAD_SOURCE_LABEL/);
  assert.match(pipeline, /fetchLeadActivities/);
  assert.match(matches, /match_validation_users|fetchValidationMatches/);
  assert.match(matches, /startConversation/);
  assert.match(account, /ValidationNetworkCard/);
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
