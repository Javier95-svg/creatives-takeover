import assert from 'node:assert/strict';
import test from 'node:test';
import { validateHomeActions } from '../src/lib/pulseHome.ts';
import {
  asksForInvestor, homeInvestorActions, investorProfileRoute, resolveInvestorSectors, resolveInvestorStages, type PulseAngel,
} from '../src/lib/pulseHomeRecommendations.ts';

const angel = (id: string, name: string, sectors: string[], stages: string[] = ['Seed'], extra: Partial<PulseAngel> = {}): PulseAngel => ({
  id: `aaaaaaaa-aaaa-4aaa-8aaa-${id.padStart(12, '0')}`, name, firm_name: `${name} Capital`, sectors, investment_stages: stages, picture: null, is_active: true, ...extra,
});

test('recognises investor requests and the sector they name', () => {
  assert.ok(asksForInvestor('Find me an investor at cybersecurity'));
  assert.ok(asksForInvestor('any angels for fintech?'));
  assert.equal(asksForInvestor('help me write a landing page'), false);
  assert.deepEqual(resolveInvestorSectors('Find me an investor at cybersecurity'), ['Cybersecurity']);
  assert.deepEqual(resolveInvestorSectors('angels for a cyber security startup'), ['Cybersecurity']);
  assert.deepEqual(resolveInvestorSectors('investors in AI and fintech'), ['AI & Machine Learning', 'FinTech']);
  assert.deepEqual(resolveInvestorSectors('find me an investor', ['saas', 'Not a sector']), ['SaaS']);
  assert.deepEqual(resolveInvestorSectors('find me an investor'), []);
  assert.deepEqual(resolveInvestorStages('pre-seed or series A angels'), ['Pre-Seed', 'Series A']);
  assert.deepEqual(resolveInvestorStages('a seed round'), ['Seed']);
});

test('recommends active angels by declared sector, specialists and stage fit first', () => {
  const angels = [
    angel('1', 'Generalist', ['Cybersecurity', 'SaaS', 'FinTech', 'HealthTech']),
    angel('2', 'Specialist', ['Cybersecurity']),
    angel('3', 'Stage fit', ['Cybersecurity', 'SaaS'], ['Pre-Seed']),
    angel('4', 'Inactive', ['Cybersecurity'], ['Seed'], { is_active: false }),
    angel('5', 'Other sector', ['EdTech']),
  ];
  const actions = homeInvestorActions(angels, ['Cybersecurity'], ['Pre-Seed']);
  assert.deepEqual(actions.map((action) => action.title), ['Stage fit', 'Specialist', 'Generalist']);
  assert.equal(actions[0].kind, 'investor');
  assert.equal(actions[0].route, '/investors?q=Stage%20fit&source=pulse');
  assert.match(actions[0].reason, /Invests in Cybersecurity/);
  assert.deepEqual(homeInvestorActions(angels, []), [], 'no sector, no evidence of fit');
});

test('investor cards survive validation with a rebuilt route, never the payload one', () => {
  const [card] = homeInvestorActions([angel('9', 'Jane Doe', ['Cybersecurity'])], ['Cybersecurity']);
  const [validated] = validateHomeActions([{ ...card, route: 'https://evil.example' }]);
  assert.equal(validated.route, investorProfileRoute('Jane Doe'));
  assert.deepEqual(validateHomeActions([{ ...card, id: 'not-a-uuid' }]), []);
  assert.equal(validateHomeActions([{ kind: 'browse', id: 'investors', title: 'Browse', reason: 'x', route: '/x' }])[0].route, '/investors');
});
