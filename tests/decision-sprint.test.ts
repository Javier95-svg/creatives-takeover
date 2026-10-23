import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  CHECK_QUESTIONS,
  buildSprintSeed,
  canOpenStep,
  createSprintIdea,
  furthestStep,
  ideaReason,
  parseSprintDraft,
  pickSprintDraft,
  rankIdeas,
  scoreIdea,
  sprintStorageKey,
  type CheckAnswer,
  type SprintDraft,
  type SprintIdea,
} from '../src/lib/decisionSprint.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const idea = (id: string, answers: CheckAnswer[] = [], fields = { name: id, customer: 'freelancers', problem: 'late payments' }): SprintIdea => ({
  id,
  ...fields,
  answers: Object.fromEntries(answers.map((answer, index) => [CHECK_QUESTIONS[index].key, answer])),
});

const draft = (ideas: SprintIdea[], updatedAt: string): SprintDraft => ({
  id: 'd', ideas, activeIdeaId: ideas[0].id, chosenIdeaId: null, updatedAt,
});

test('an empty idea has no score (the old page showed 60/100)', () => {
  assert.equal(scoreIdea(createSprintIdea()), null);
  assert.equal(scoreIdea(idea('a', [2, 2, 2, 2])), null, 'four of five answered is still unscored');
  assert.equal(scoreIdea(idea('a', [2, 2, 2, 2, 2])), 100);
  assert.equal(scoreIdea(idea('a', [0, 0, 0, 0, 0])), 0);
  assert.equal(scoreIdea(idea('a', [2, 1, 1, 0, 2])), 60);
});

test('ranking: highest first, ties keep the order added, unscored last', () => {
  const ranked = rankIdeas([
    idea('unscored', [2]),
    idea('mid', [1, 1, 1, 1, 1]),
    idea('top', [2, 2, 2, 2, 1]),
    idea('mid-later', [2, 0, 1, 1, 1]),
  ]);
  assert.deepEqual(ranked.map((entry) => entry.id), ['top', 'mid', 'mid-later', 'unscored']);
});

test('steps unlock in order', () => {
  const blank = [createSprintIdea()];
  assert.equal(canOpenStep(blank, 1), true);
  assert.equal(canOpenStep(blank, 2), false);
  assert.equal(canOpenStep(blank, 3), false);

  const named = [idea('a'), idea('b', [], { name: 'b', customer: '', problem: 'x' })];
  assert.equal(canOpenStep(named, 2), false, 'every idea needs all three fields');

  const filled = [idea('a', [2, 2, 2, 2, 2]), idea('b', [1])];
  assert.equal(canOpenStep(filled, 2), true);
  assert.equal(canOpenStep(filled, 3), false, 'every idea needs all five answers');
  assert.equal(furthestStep(filled), 2);
  assert.equal(furthestStep([idea('a', [2, 2, 2, 2, 2])]), 3);
});

test('the reason names the strongest and weakest answers', () => {
  assert.equal(ideaReason(idea('a', [2, 1, 0, 2, 2])), 'The problem hurts often, but you have not seen people ask for a fix.');
  assert.equal(ideaReason(idea('a', [1, 2, 1, 1, 1])), 'People already pay to solve it, but the problem may not hurt often enough.');
  assert.equal(ideaReason(idea('a', [2, 2, 2, 2, 2])), 'The problem hurts often, and no answer was a No.');
});

test('old drafts keep name, customer and problem; the old sliders are asked again', () => {
  const parsed = parseSprintDraft({
    id: 'validation-draft-1',
    activeIdeaId: 'idea-1',
    chosenIdeaId: 'idea-1',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ideas: [{
      id: 'idea-1', name: 'Invoice nudges', oneLiner: 'x', targetCustomer: 'freelancers', coreProblem: 'late payments',
      currentAlternative: '', unfairAdvantage: '', marketSignals: [], risks: '',
      criteria: { problemSeverity: 3, frequency: 3, willingnessToPay: 3, reachableCustomer: 3, differentiation: 3, founderAdvantage: 3, earlyEvidence: 3 },
    }],
  });
  assert.ok(parsed);
  assert.deepEqual(parsed.ideas[0], { id: 'idea-1', name: 'Invoice nudges', customer: 'freelancers', problem: 'late payments', answers: {} });
  assert.equal(parsed.chosenIdeaId, 'idea-1');
  assert.equal(parseSprintDraft({ ideas: [] }), null);
  assert.equal(parseSprintDraft(null), null);
});

test('each account has its own local copy, and the newest draft wins', () => {
  assert.equal(sprintStorageKey('user-1'), 'validateDecisionSprint:user-1');
  assert.equal(sprintStorageKey(null), 'validateDecisionSprint:guest');
  assert.notEqual(sprintStorageKey('user-1'), sprintStorageKey('user-2'));

  const older = draft([idea('local')], '2026-10-01T00:00:00.000Z');
  const newer = draft([idea('remote')], '2026-10-02T00:00:00.000Z');
  assert.equal(pickSprintDraft({ local: older, remote: newer }).draft, newer, 'a newer cloud draft beats the local copy');
  assert.equal(pickSprintDraft({ local: newer, remote: older }).draft, newer);

  const guest = draft([idea('guest')], '2026-10-03T00:00:00.000Z');
  assert.deepEqual(pickSprintDraft({ local: null, remote: null, guest }), { draft: guest, fromGuest: true });
  assert.equal(pickSprintDraft({ local: null, remote: older, guest }).draft, older, 'a guest draft never replaces the account\'s own');
});

test('the chosen idea is handed to ICP Builder as its seed', () => {
  assert.equal(buildSprintSeed(idea('Invoice nudges')), 'Invoice nudges for freelancers. Problem: late payments');
});

test('the page uses the module, keys storage per account and is builder-only', () => {
  const page = read('../src/pages/ValidateJourneyPage.tsx');
  assert.match(page, /from "@\/lib\/decisionSprint"/);
  assert.match(page, /sprintStorageKey\(userId\)/);
  assert.match(page, /account\.userType === "founder"/);
  assert.match(page, /navigate\("\/project-setup", \{ replace: true \}\)/);
  assert.match(page, /buildIcpSeedReturnPath\(buildSprintSeed\(pickedIdea\)\)/);
  assert.doesNotMatch(page, /Save validation draft/, 'one auto-save path, no separate save buttons');

  const sidebar = read('../src/components/dashboard/DashboardSidebar.tsx');
  assert.match(sidebar, /item\.toolKey === 'decision_sprint' && userType !== 'builder'/);
  assert.match(sidebar, /item\.toolKey === 'project_setup' && userType !== 'founder'/);
});
