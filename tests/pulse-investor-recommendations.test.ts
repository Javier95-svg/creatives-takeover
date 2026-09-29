import assert from 'node:assert/strict';
import test from 'node:test';
import { validateHomeActions } from '../src/lib/pulseHome.ts';
import {
  asksForInvestor, asksForMore, fundingStagesForCycleStage, investorProfileRoute, rankInvestors,
  resolveInvestorSectors, resolveInvestorStages, type PulseAngel,
} from '../src/lib/pulseHomeRecommendations.ts';

const angel = (id: number, name: string, sectors: string[], stages: string[] = ['Seed'], extra: Partial<PulseAngel> = {}): PulseAngel => ({
  id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(id).padStart(12, '0')}`, name, firm_name: `${name} Capital`, sectors, investment_stages: stages, picture: null, is_active: true, ...extra,
});

test('recognises investor requests, follow-ups, sectors and rounds', () => {
  assert.ok(asksForInvestor('Find me an investor on fintech'));
  assert.equal(asksForInvestor('help me write a landing page'), false);
  assert.ok(asksForMore('show me more'));
  assert.ok(asksForMore('any others?'));
  assert.equal(asksForMore('write a long email to my investors about the next quarter and what we learned from the pilot so far, including the numbers and risks'), false);
  assert.deepEqual(resolveInvestorSectors('Find me an investor on fintech', ['SaaS', 'nonsense']), { requested: ['FinTech'], fromProject: ['SaaS'] });
  assert.deepEqual(resolveInvestorSectors('find me an investor', ['SaaS']), { requested: [], fromProject: ['SaaS'] });
  assert.deepEqual(resolveInvestorStages('pre-seed or series A angels'), ['Pre-Seed', 'Series A']);
  assert.deepEqual(fundingStagesForCycleStage(3), ['Pre-Seed']);
  assert.deepEqual(fundingStagesForCycleStage(6), ['Seed', 'Series A']);
  assert.deepEqual(fundingStagesForCycleStage(null), []);
});

test('the project stage lifts angels who invest at that round', () => {
  const angels = [angel(1, 'Series A only', ['FinTech'], ['Series A']), angel(2, 'Pre-seed', ['FinTech'], ['Pre-Seed'])];
  const { actions } = rankInvestors(angels, { requested: ['FinTech'], projectStages: ['Pre-Seed'], seed: 'u:2026-09-29' });
  assert.equal(actions[0].title, 'Pre-seed');
  assert.match(actions[0].reason, /Pre-Seed \(fits your stage\)/);
  // A round the user names beats the implied one.
  const named = rankInvestors(angels, { requested: ['FinTech'], stages: ['Series A'], projectStages: ['Pre-Seed'] });
  assert.equal(named.actions[0].title, 'Series A only');
  assert.match(named.actions[0].reason, /Series A \(your round\)/);
});

test('ties rotate by seed instead of A to Z, and stay stable for the same seed', () => {
  const angels = Array.from({ length: 30 }, (_, index) => angel(index + 1, `Angel ${String(index + 1).padStart(2, '0')}`, ['FinTech', 'SaaS', 'EdTech']));
  const pick = (seed: string) => rankInvestors(angels, { requested: ['FinTech'], seed }).actions.map((action) => action.title).join('|');
  assert.equal(pick('user-a:2026-09-29'), pick('user-a:2026-09-29'));
  const variants = new Set(['user-a:2026-09-29', 'user-b:2026-09-29', 'user-a:2026-09-30', 'user-c:2026-10-01'].map(pick));
  assert.ok(variants.size > 1, 'different users or days see different ties');
  assert.notEqual(pick('user-a:2026-09-29'), 'Angel 01|Angel 02|Angel 03');
});

test('"show me more" skips angels already shown and reports what is left', () => {
  const angels = Array.from({ length: 5 }, (_, index) => angel(index + 1, `Angel ${index + 1}`, ['FinTech']));
  const first = rankInvestors(angels, { requested: ['FinTech'], seed: 's' });
  assert.equal(first.totalMatches, 5);
  assert.equal(first.remaining, 2);
  const second = rankInvestors(angels, { requested: ['FinTech'], seed: 's', excludeIds: first.actions.map((action) => action.id) });
  assert.equal(second.actions.length, 2);
  assert.equal(second.remaining, 0);
  assert.ok(second.actions.every((action) => !first.actions.some((shown) => shown.id === action.id)));
  const third = rankInvestors(angels, { requested: ['FinTech'], seed: 's', excludeIds: angels.map((item) => item.id) });
  assert.deepEqual([third.actions.length, third.totalMatches], [0, 5]);
});

test('project sectors are labelled on the card, never silent', () => {
  const angels = [angel(1, 'Both', ['FinTech', 'SaaS']), angel(2, 'FinTech only', ['FinTech', 'EdTech', 'HealthTech'])];
  const { actions } = rankInvestors(angels, { requested: ['FinTech'], fromProject: ['SaaS'] });
  assert.equal(actions[0].title, 'Both');
  assert.match(actions[0].reason, /Invests in FinTech \+ SaaS \(your project\)/);
  const fromContext = rankInvestors(angels, { requested: [], fromProject: ['SaaS'] });
  assert.match(fromContext.actions[0].reason, /Invests in SaaS \(your project’s sector\)/);
  assert.deepEqual(rankInvestors(angels, { requested: [] }).actions, [], 'no sector, no evidence of fit');
});

test('inactive angels never appear, and cards validate with a rebuilt route and the Pro flag', () => {
  const { actions } = rankInvestors([angel(1, 'Gone', ['FinTech'], ['Seed'], { is_active: false }), angel(2, 'Jane Doe', ['FinTech'])], { requested: ['FinTech'] });
  assert.deepEqual(actions.map((action) => action.title), ['Jane Doe']);
  const [validated] = validateHomeActions([{ ...actions[0], route: 'https://evil.example', locked: true }]);
  assert.equal(validated.route, investorProfileRoute('Jane Doe'));
  assert.equal(validated.locked, true);
  assert.deepEqual(validateHomeActions([{ ...actions[0], id: 'not-a-uuid' }]), []);
});
