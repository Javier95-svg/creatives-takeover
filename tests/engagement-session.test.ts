import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ENGAGEMENT_SESSION_TIMEOUT_MS,
  createEngagementSession,
  engagementSummarySignature,
  resolveEngagementSection,
  shouldStartNewEngagementSession,
} from '../src/lib/engagementSession.ts';

test('engagement sessions roll after thirty minutes of inactivity', () => {
  const state = createEngagementSession(1_000, 'dashboard', 'session-1');
  assert.equal(shouldStartNewEngagementSession(state, 1_000 + ENGAGEMENT_SESSION_TIMEOUT_MS - 1), false);
  assert.equal(shouldStartNewEngagementSession(state, 1_000 + ENGAGEMENT_SESSION_TIMEOUT_MS), true);
});

test('engagement sections follow the existing product navigation', () => {
  assert.equal(resolveEngagementSection('/dashboard/tasks'), 'dashboard');
  assert.equal(resolveEngagementSection('/pmf-lab'), 'bizmap');
  assert.equal(resolveEngagementSection('/vc-search'), 'insighta');
  assert.equal(resolveEngagementSection('/mentorship/some-mentor'), 'network');
  assert.equal(resolveEngagementSection('/newspaper/story'), 'resources');
});

test('summary signatures change only when measurable engagement changes', () => {
  const state = createEngagementSession(1_000, 'dashboard', 'session-1');
  const initial = engagementSummarySignature(state);
  state.activeSeconds += 15;
  assert.notEqual(engagementSummarySignature(state), initial);
});
