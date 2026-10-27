import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { ADOPTION_SECTIONS, WORKSPACE_SECTION_TOOLS } from '../src/lib/workspaceSections.ts';
import { WORKSPACE_CAPABILITIES, workspaceCapabilitiesForType } from '../src/lib/workspaceCapabilities.ts';
import { searchPulsePedia } from '../src/lib/pulsePedia.ts';
import { parseMentorSearch, rankMentorsForSearch } from '../src/lib/pulseMentorSearch.ts';
import { validateHomeActions } from '../src/lib/pulseHome.ts';
import type { Mentor } from '../src/types/mentor.ts';
import { requestedPulseResources, searchPulseResources } from '../supabase/functions/_shared/pulse-resources.ts';

test('every workspace tool has one role-aware Pulse capability', () => {
  const names = new Set(WORKSPACE_CAPABILITIES.map(capability => capability.name));
  for (const section of ADOPTION_SECTIONS) for (const tool of WORKSPACE_SECTION_TOOLS[section]) assert.ok(names.has(tool), `${tool} is missing`);
  assert.ok(workspaceCapabilitiesForType('mentor').some(capability => capability.name === 'Startup Pedia'));
  assert.ok(!workspaceCapabilitiesForType('investor').some(capability => capability.name === 'Startup Pedia'));
});

test('Startup Pedia ranks exact titles, acronyms and aliases with canonical actions', () => {
  for (const [query, slug] of [['ideal customer profile', 'ideal-customer-profile'], ['CAC', 'customer-acquisition-cost'], ['product market fit', 'product-market-fit']] as const) {
    const result = searchPulsePedia(query);
    assert.ok(result.actions.slice(0, 3).some(action => action.id === slug), `${query} did not retrieve ${slug}`);
    assert.ok(result.evidence.every(item => item.passage.length <= 700));
    assert.deepEqual(validateHomeActions(result.actions).map(action => action.route), result.actions.map(action => action.route));
  }
});

const mentor = (id: string, overrides: Partial<Mentor> = {}): Mentor => ({
  id, name: `Mentor ${id.slice(-2)}`, bio: '', hourly_rate: 10000, expertise: ['Fundraising'],
  industries: ['SaaS'], languages: ['es'], startup_stages: ['FUNDRAISING'], coaching_formats: ['Hourly Rate Basis'],
  timezone: 'America/Lima', location: 'Lima, Peru', is_active: true, created_at: '2026-01-01', updated_at: '2026-01-01', ...overrides,
});

test('mentor search enforces structured traits and labels legacy text fallback', () => {
  const query = parseMentorSearch('Find a Spanish fundraising mentor for a SaaS startup', {
    expertise: ['Fundraising'], industries: ['SaaS'], languages: ['es'], startupStages: [], coachingFormats: [], keywords: [],
  });
  const exact = mentor('00000000-0000-4000-8000-000000000001');
  const wrong = mentor('00000000-0000-4000-8000-000000000002', { languages: ['en'] });
  const legacy = mentor('00000000-0000-4000-8000-000000000003', { languages: [], bio: 'Spanish fundraising advisor for SaaS founders.' });
  const results = rankMentorsForSearch([wrong, legacy, exact], query);
  assert.deepEqual(results.map(result => result.mentor.id), [exact.id, legacy.id]);
  assert.equal(results[0].band, 'A');
  assert.equal(results[1].band, 'C');
  assert.match(results[1].reason, /legacy profile text|Verify/i);
});

test('equally qualified mentors rotate by exposure without popularity boosts', () => {
  const mentors = [
    mentor('00000000-0000-4000-8000-000000000011', { is_featured: true, rating: 5, review_count: 100 }),
    mentor('00000000-0000-4000-8000-000000000012', { is_featured: false, rating: 1, review_count: 0 }),
    mentor('00000000-0000-4000-8000-000000000013'), mentor('00000000-0000-4000-8000-000000000014'),
  ];
  const query = parseMentorSearch('Find a fundraising mentor', { expertise: ['Fundraising'] });
  const impressions: Record<string, number> = {};
  for (let turn = 0; turn < 8; turn++) {
    const picked = rankMentorsForSearch(mentors, query, { impressions, seed: 'same-day' }).slice(0, 3);
    for (const result of picked) impressions[result.mentor.id] = (impressions[result.mentor.id] ?? 0) + 1;
  }
  const spread = Math.max(...Object.values(impressions)) - Math.min(...Object.values(impressions));
  assert.ok(spread <= 1, `exposure spread was ${spread}`);
  assert.equal(rankMentorsForSearch(mentors, query, { impressions: {}, seed: 'same-day' }).find(result => result.mentor.id === mentors[0].id)?.band, 'A');
});

test('mentor migration is optional, owner-scoped and retains only 90 days', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261025160000_pulse_mentor_discovery.sql', import.meta.url), 'utf8');
  assert.match(sql, /ADD COLUMN IF NOT EXISTS industries/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /user_id = auth\.uid\(\)/);
  assert.match(sql, /interval '90 days'/);
  assert.doesNotMatch(sql, /GRANT INSERT[\s\S]+authenticated/);
});

test('hybrid retrieval recognizes directory families and keeps static directory links internal', async () => {
  assert.deepEqual(requestedPulseResources('Find a SaaS accelerator and launch directories'), ['accelerator', 'directory']);
  const [result] = await searchPulseResources({} as never, ['directory'], 'developer tools');
  assert.equal(result.state, 'available');
  assert.ok(result.actions.length > 0);
  const validated = validateHomeActions(result.actions);
  assert.ok(validated.every(action => action.route.startsWith('/directories?source=pulse&directory=')));
  assert.ok(validated.every(action => !action.route.includes('http')));
});
