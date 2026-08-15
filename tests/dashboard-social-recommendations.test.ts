import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  buildDashboardCandidateQueue,
  dashboardPriorityBand,
  isReactiveSocialAction,
} from '../src/lib/socialRecommendation.ts';
import type { DashboardAction } from '../src/types/dashboardSnapshot.ts';

function action(overrides: Partial<DashboardAction> & Pick<DashboardAction, 'key'>): DashboardAction {
  return {
    kind: 'recommendation',
    toolKey: 'dashboard',
    entityId: null,
    title: overrides.key,
    description: null,
    urgency: 'medium',
    reasonCodes: [],
    estimatedMinutes: 5,
    dueAt: null,
    actionKind: 'open_tool',
    ...overrides,
  };
}

test('incoming replies outrank ordinary and urgent tasks', () => {
  const reply = action({ key: 'reply', kind: 'human_reply', priorityBand: 'human_reply', urgency: 'high' });
  const urgentTask = action({ key: 'task', kind: 'task', urgency: 'high', dueAt: new Date().toISOString() });
  const queue = buildDashboardCandidateQueue([urgentTask], [reply]);
  assert.equal(queue[0].key, 'reply');
  assert.equal(isReactiveSocialAction(queue[0]), true);
});

test('incoming requests are protected ahead of tasks', () => {
  const request = action({ key: 'request', kind: 'human_reply', priorityBand: 'human_request', urgency: 'high' });
  const task = action({ key: 'task', kind: 'task', urgency: 'high' });
  const queue = buildDashboardCandidateQueue([task], [request]);
  assert.equal(queue[0].key, 'request');
});

test('proactive outreach is withheld when an urgent commitment exists', () => {
  const outreach = action({ key: 'outreach', priorityBand: 'proactive_social' });
  const task = action({ key: 'task', kind: 'task', urgency: 'high', dueAt: new Date().toISOString() });
  const queue = buildDashboardCandidateQueue([task], [outreach]);
  assert.deepEqual(queue.map((item) => item.key), ['task']);
});

test('proactive outreach leads when no urgent commitment exists', () => {
  const outreach = action({ key: 'outreach', priorityBand: 'proactive_social' });
  const journey = action({ key: 'journey', kind: 'journey' });
  const queue = buildDashboardCandidateQueue([journey], [outreach]);
  assert.deepEqual(queue.map((item) => item.key), ['outreach', 'journey']);
  assert.equal(dashboardPriorityBand(journey), 'general');
});

test('candidate keys are deduplicated', () => {
  const duplicate = action({ key: 'same', priorityBand: 'human_reply', kind: 'human_reply' });
  const queue = buildDashboardCandidateQueue([duplicate], [duplicate]);
  assert.equal(queue.length, 1);
});

test('migration keeps completed social interactions authoritative and owner-readable', () => {
  const sql = readFileSync('supabase/migrations/20260815120000_dashboard_social_interactions.sql', 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.social_interaction_events/i);
  assert.match(sql, /GRANT SELECT ON TABLE public\.social_interaction_events TO authenticated/i);
  assert.doesNotMatch(sql, /GRANT (INSERT|UPDATE|DELETE).*social_interaction_events TO authenticated/i);
  assert.match(sql, /AFTER INSERT ON public\.messages/i);
  assert.match(sql, /get_dashboard_snapshot_v3/i);
  assert.match(sql, /now\(\)-interval '7 days'/i);
});

test('service marketplace in-app messages are free in both catalogs', () => {
  const client = readFileSync('src/config/constants.ts', 'utf8');
  const server = readFileSync('supabase/functions/_shared/credit-constants.ts', 'utf8');
  const hook = readFileSync('src/hooks/useServiceMarketplaceContact.ts', 'utf8');
  assert.match(client, /SERVICE_MARKETPLACE_MESSAGE:\s*0/);
  assert.match(server, /SERVICE_MARKETPLACE_MESSAGE:\s*0/);
  assert.doesNotMatch(hook, /deductCredits\("SERVICE_MARKETPLACE_MESSAGE"/);
  assert.match(hook, /deductCredits\("SERVICE_MARKETPLACE_EMAIL"/);
});
