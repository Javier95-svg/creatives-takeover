import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIcpShareText, buildIcpXShareUrl, type IcpScoreCard } from '../src/lib/icpScoreCard.ts';
import { wrapScoreCardText } from '../src/lib/icpScoreCardExport.ts';

const idea = 'A service that helps small restaurants sell leftover food to nearby customers.';
const card: IcpScoreCard = {
  version: 1, displayScore: 51, rawScore: 5.1, band: 'promising', verdict: 'narrow',
  verdictLabel: 'Narrow it first', summary: 'Validate demand', ungrounded: false,
  idea, personaName: 'Local Restaurant Owner', roleLine: 'Owner of a small restaurant', painLine: 'Food waste',
  category: null, whoBuysToday: null, competitorNames: [], topRisk: 'Weak demand',
  headline: null, generatedAt: '2026-10-13T00:00:00Z',
};

for (const verdict of ['build', 'narrow', 'investigate', 'stop'] as const) {
  test(`the ${verdict} post shares the original idea, correct handle, and homepage`, () => {
    const text = buildIcpShareText({ ...card, verdict });
    assert.ok(text.includes(idea));
    assert.match(text, /51\/100 on @Creatives_Rule/);
    assert.ok(text.endsWith('Test yours: https://creatives-takeover.com'));
    assert.doesNotMatch(text, /@CreativesTakeover|Two minutes|Market →/);
  });
}

test('X contains one homepage URL and no public-score permalink', () => {
  const target = new URL(buildIcpXShareUrl(card));
  assert.equal(target.searchParams.get('text'), buildIcpShareText(card));
  assert.equal(target.searchParams.get('url'), null);
  assert.equal(target.searchParams.get('text')?.match(/https:\/\//g)?.length, 1);
});

test('legacy and sparse cards share safely without inventing the original idea', () => {
  assert.match(buildIcpShareText(null), /@Creatives_Rule/);
  assert.doesNotMatch(buildIcpShareText({ ...card, idea: null }), /null|undefined/);
  const text = buildIcpShareText({ ...card, rigor: 0.1, openQuestionCount: 12 });
  assert.match(text, /still guessing about 12 things/);
  assert.ok(text.includes(idea));
});

test('image wrapping preserves long ideas, explicit paragraphs, Unicode, and long words', () => {
  const measure = (text: string) => Array.from(text).length;
  const lines = wrapScoreCardText('Food waste café 🍎\n' + 'x'.repeat(25), measure, 10);
  assert.ok(lines.every(line => measure(line) <= 10));
  assert.equal(lines.join('').replace(/\s/g, ''), ('Food waste café 🍎' + 'x'.repeat(25)).replace(/\s/g, ''));
  assert.deepEqual(wrapScoreCardText('', measure, 10), ['']);
});
