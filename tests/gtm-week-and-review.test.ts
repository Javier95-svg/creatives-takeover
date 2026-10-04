import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { getGTMPlanWeek, type GTMPlanV2, type GTMPlay } from '../src/lib/gtmV2.ts';
import { getGTMNextStep, type GTMProgressState } from '../src/lib/gtmNextStep.ts';
import { describeGTMPlanChanges } from '../src/lib/gtmReviewDiff.ts';

const DAY = 86_400_000;
const NOW = new Date('2026-10-04T12:00:00Z').getTime();

const play = (overrides: Partial<GTMPlay> = {}): GTMPlay => ({
  id: 'play-1',
  channelId: 'linkedin',
  channelName: 'LinkedIn posts',
  status: 'backlog',
  audience: 'Fleet owners',
  buyingTrigger: 'Receipts pile up at month end',
  offer: 'Free receipt cleanup',
  message: 'Stop chasing receipts.',
  hypothesis: '10 signups a week',
  actions: [],
  metric: 'Signups',
  target: 10,
  weeklyTimeHours: 3,
  weeklyBudget: 0,
  requiredAssets: [],
  recommendedDirectoryIds: [],
  ...overrides,
});

test('week 1 starts when the play went live, not when the plan was written', () => {
  const writtenThreeWeeksAgo = new Date(NOW - 21 * DAY).toISOString();
  // Before anything is live, the plan date is all there is.
  assert.equal(getGTMPlanWeek({ generatedAt: writtenThreeWeeksAgo, plays: [play()] }, NOW), 4);
  // Live for two days: still week 1, even though the plan is three weeks old.
  const live = play({ status: 'active', activatedAt: new Date(NOW - 2 * DAY).toISOString() });
  assert.equal(getGTMPlanWeek({ generatedAt: writtenThreeWeeksAgo, plays: [live] }, NOW), 1);
  assert.equal(getGTMPlanWeek({ generatedAt: 'not a date', plays: [] }, NOW), 1);
  assert.equal(getGTMPlanWeek({ generatedAt: new Date(NOW - 90 * DAY).toISOString(), plays: [] }, NOW), 6);
});

const state = (overrides: Partial<GTMProgressState> = {}): GTMProgressState => ({
  channel: 'LinkedIn posts',
  hasActivePlay: true,
  openTaskCount: 0,
  hasResult: true,
  reviewedThisWeek: false,
  hasProposal: false,
  ...overrides,
});

test('the next step follows a fixed order and names one action', () => {
  assert.equal(getGTMNextStep(state({ hasProposal: true, hasActivePlay: false }))?.action, 'compare_review');
  assert.equal(getGTMNextStep(state({ hasActivePlay: false, openTaskCount: 3 }))?.action, 'start_play');
  assert.equal(getGTMNextStep(state({ openTaskCount: 2, hasResult: false }))?.action, 'do_tasks');
  assert.equal(getGTMNextStep(state({ hasResult: false }))?.action, 'log_result');
  assert.equal(getGTMNextStep(state())?.action, 'review_week');
  assert.equal(getGTMNextStep(state({ reviewedThisWeek: true })), null);
  assert.equal(getGTMNextStep(state({ channel: null })), null);
  assert.match(getGTMNextStep(state({ openTaskCount: 1 }))?.title ?? '', /last task/);
});

test('a review proposal is described as plain changes against the current plan', () => {
  const current = {
    sixWeekPlan: [{ week: 2, objective: 'Post twice', actions: ['Post on Monday'] }],
    plays: [play({ status: 'active' }), play({ id: 'play-2', channelName: 'Cold email' })],
    assumptions: ['Owners read LinkedIn', 'Price is not the blocker'],
    assets: [{ id: 'a1', playId: 'play-1', type: 'outreach_sequence', title: 'Outreach', content: 'old', status: 'draft' }],
  } as unknown as GTMPlanV2;
  const proposed = {
    ...current,
    sixWeekPlan: [{ week: 2, objective: 'Switch to cold email', actions: ['Send 20 emails'] }],
    plays: [play({ status: 'paused' }), play({ id: 'play-2', channelName: 'Cold email', status: 'active', target: 15 })],
    assumptions: ['Price is not the blocker', 'Owners answer email'],
    assets: [{ ...current.assets![0], content: 'new' }],
  } as unknown as GTMPlanV2;

  const changes = describeGTMPlanChanges(current, proposed, 2);
  assert.deepEqual(changes.current, { objective: 'Post twice', actions: ['Post on Monday'] });
  assert.equal(changes.proposed?.objective, 'Switch to cold email');
  assert.deepEqual(changes.playChanges, [
    'Pause LinkedIn posts.',
    'Start Cold email.',
    'Raise the Cold email target from 10 to 15 signups a week.',
  ]);
  assert.deepEqual(changes.assumptionsAdded, ['Owners answer email']);
  assert.deepEqual(changes.assumptionsRemoved, ['Owners read LinkedIn']);
  assert.equal(changes.draftsRewritten, 1);
});

test('the weekly review previews without writing and re-checks the decision on apply', () => {
  const review = readFileSync(new URL('../supabase/functions/gtm-plan-review/index.ts', import.meta.url), 'utf8');
  const hook = readFileSync(new URL('../src/hooks/useGTMStrategist.ts', import.meta.url), 'utf8');
  const previewAt = review.indexOf("if (mode === 'preview')");
  assert.ok(previewAt > 0, 'preview branch exists');
  // Every write comes after the preview return.
  for (const write of ['.delete()', '.insert(', '.update(', '.upsert(']) {
    const first = review.indexOf(write);
    assert.ok(first === -1 || first > previewAt, `${write} happens after the preview return`);
  }
  assert.match(review, /proposal\?\.decision !== decision/);
  assert.match(review, /stale_proposal/);
  // Calls without a mode keep the old one-step behaviour.
  assert.match(review, /: 'auto'/);
  assert.match(hook, /mode: 'preview'/);
  assert.match(hook, /mode: 'apply', proposal: reviewProposal\.proposal/);
  assert.match(hook, /activatedAt: play\.activatedAt \?\? new Date\(\)\.toISOString\(\)/);
});

test('the GTM page uses its own colour, route wallpaper and a single next step', () => {
  const page = readFileSync(new URL('../src/pages/GTMStrategistPage.tsx', import.meta.url), 'utf8');
  const workspace = readFileSync(new URL('../src/components/gtm/GTMWorkspace.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  assert.match(page, /theme="gtm"/);
  assert.match(page, /wallpaper=\{<GTMRouteWallpaper \/>\}/);
  assert.match(css, /\.tool-theme-gtm \{[\s\S]*--primary: var\(--tool-gtm\)/);
  assert.equal(workspace.match(/<NextStepCard\b/g)?.length, 1);
  assert.match(workspace, /\['week', 'This week'\], \['plan', 'Plan'\], \['review', 'Review'\]/);
  assert.doesNotMatch(workspace, /FirstCustomerProofWorkspace/);
});
