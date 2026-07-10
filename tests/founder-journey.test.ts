import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildFounderJourneySnapshot,
  EMPTY_FOUNDER_JOURNEY_EXTRAS,
  type BuildFounderJourneyInputs,
  type FounderJourneyExtras,
} from '../src/lib/founderJourney.ts';
import { getFoundationalMilestones, type ToolCompletionSignals } from '../src/lib/taskCalendar.ts';

function makeInputs(overrides: {
  currentStage?: BuildFounderJourneyInputs['currentStage'];
  stageState?: BuildFounderJourneyInputs['stageState'];
  toolSignals?: ToolCompletionSignals;
  extras?: Partial<FounderJourneyExtras>;
} = {}): BuildFounderJourneyInputs {
  const toolSignals = overrides.toolSignals ?? {};
  return {
    currentStage: overrides.currentStage ?? 'IDENTITY',
    stageState: overrides.stageState ?? {},
    toolSignals,
    extras: { ...EMPTY_FOUNDER_JOURNEY_EXTRAS, ...overrides.extras },
    foundationalMilestones: getFoundationalMilestones(toolSignals),
  };
}

const ALL_TOOL_SIGNALS: ToolCompletionSignals = {
  icpCompleted: true,
  waitlistCompleted: true,
  pmfCompleted: true,
  mvpCompleted: true,
  techStackCompleted: true,
  gtmCompleted: true,
};

test('fresh account: empty snapshot with ICP as the next action', () => {
  const snapshot = buildFounderJourneySnapshot(makeInputs());

  assert.equal(snapshot.isEmpty, true);
  assert.equal(snapshot.stagesCompleted, 0);
  assert.equal(snapshot.progressPercent, 0);
  assert.equal(snapshot.lastTouched, null);
  assert.equal(snapshot.nextAction?.key, 'tool:icp-builder');
  assert.equal(snapshot.nextAction?.route, '/icp-builder');

  const identity = snapshot.stages.find((node) => node.stage === 'IDENTITY');
  assert.equal(identity?.status, 'current');
  assert.ok(snapshot.stages.filter((node) => node.status === 'upcoming').length === 6);
  assert.ok(snapshot.tools.every((tile) => tile.status === 'not_started'));
});

test('stage completion follows stageState and marks the current stage', () => {
  const snapshot = buildFounderJourneySnapshot(
    makeInputs({
      currentStage: 'VALIDATING',
      stageState: {
        IDENTITY: { completed: true, completedAt: '2026-06-01T00:00:00.000Z' },
        PROTOTYPE: { completed: true, completedAt: '2026-06-10T00:00:00.000Z' },
      },
      toolSignals: { icpCompleted: true, waitlistCompleted: true },
    }),
  );

  assert.equal(snapshot.stagesCompleted, 2);
  assert.equal(snapshot.progressPercent, 29);
  assert.equal(snapshot.stages.find((node) => node.stage === 'IDENTITY')?.status, 'complete');
  assert.equal(snapshot.stages.find((node) => node.stage === 'VALIDATING')?.status, 'current');
  assert.equal(snapshot.stages.find((node) => node.stage === 'LAUNCH')?.status, 'upcoming');
  assert.equal(snapshot.isEmpty, false);
});

test('TRACTION stage completes from phase-7 readiness (display-only)', () => {
  const extras: Partial<FounderJourneyExtras> = {
    traction: {
      latestScore: 81,
      weekStartDate: '2026-07-06',
      phaseSevenReady: true,
      updatedAt: '2026-07-08T09:00:00.000Z',
    },
  };
  const snapshot = buildFounderJourneySnapshot(makeInputs({ extras }));

  assert.equal(snapshot.stages.find((node) => node.stage === 'TRACTION')?.status, 'complete');
  const tile = snapshot.tools.find((entry) => entry.key === 'traction-engine');
  assert.equal(tile?.status, 'done');
  assert.equal(tile?.outputLine, 'Traction score 81');
  assert.equal(tile?.highlight, 'Phase 7 ready');
});

test('traction logs without phase-7 readiness show as started, not complete', () => {
  const snapshot = buildFounderJourneySnapshot(
    makeInputs({
      extras: {
        traction: { latestScore: 55, weekStartDate: '2026-07-06', phaseSevenReady: false, updatedAt: null },
      },
    }),
  );

  assert.equal(snapshot.stages.find((node) => node.stage === 'TRACTION')?.status, 'upcoming');
  assert.equal(snapshot.stages.find((node) => node.stage === 'TRACTION')?.hasActivity, true);
  assert.equal(snapshot.tools.find((entry) => entry.key === 'traction-engine')?.status, 'started');
});

test('fundraising tile formats the deck score and flags stage activity', () => {
  const snapshot = buildFounderJourneySnapshot(
    makeInputs({
      extras: {
        pitchDeck: { overallScore: 82, verdict: 'Strong', createdAt: '2026-07-01T12:00:00.000Z' },
      },
    }),
  );

  const tile = snapshot.tools.find((entry) => entry.key === 'pitch-deck-analyzer');
  assert.equal(tile?.status, 'done');
  assert.equal(tile?.outputLine, 'Deck score 82 — Strong');
  assert.equal(snapshot.stages.find((node) => node.stage === 'FUNDRAISING')?.hasActivity, true);
  assert.equal(snapshot.stages.find((node) => node.stage === 'FUNDRAISING')?.status, 'upcoming');
});

test('demo studio tile prefers published demo count over waitlist signal', () => {
  const snapshot = buildFounderJourneySnapshot(
    makeInputs({
      toolSignals: { waitlistCompleted: true },
      extras: {
        demoStudio: { projectName: 'IronLog', publishedDemoCount: 2, updatedAt: '2026-07-05T10:00:00.000Z' },
      },
    }),
  );

  const tile = snapshot.tools.find((entry) => entry.key === 'demo-studio');
  assert.equal(tile?.status, 'done');
  assert.equal(tile?.outputLine, '2 published demos');
});

test('MVP tile shows the live subdomain when a site is deployed', () => {
  const snapshot = buildFounderJourneySnapshot(
    makeInputs({
      extras: {
        mvpPublished: {
          subdomainSlug: 'ironlog',
          deploymentUrl: 'https://ironlog.creatives-takeover.com',
          updatedAt: '2026-07-07T08:00:00.000Z',
        },
      },
    }),
  );

  const tile = snapshot.tools.find((entry) => entry.key === 'mvp-builder');
  assert.equal(tile?.status, 'done');
  assert.equal(tile?.outputLine, 'Live at ironlog.creatives-takeover.com');
});

test('tech stack alone marks the MVP tile as started', () => {
  const snapshot = buildFounderJourneySnapshot(makeInputs({ toolSignals: { techStackCompleted: true } }));

  const tile = snapshot.tools.find((entry) => entry.key === 'mvp-builder');
  assert.equal(tile?.status, 'started');
  assert.equal(tile?.outputLine, 'Tech stack saved — scope your MVP');
});

test('next action falls through foundations → traction → pitch deck → null', () => {
  const withFoundationsDone = makeInputs({ toolSignals: ALL_TOOL_SIGNALS });
  assert.equal(buildFounderJourneySnapshot(withFoundationsDone).nextAction?.key, 'traction-weekly-log');

  const withTractionReady = makeInputs({
    toolSignals: ALL_TOOL_SIGNALS,
    extras: {
      traction: { latestScore: 90, weekStartDate: '2026-07-06', phaseSevenReady: true, updatedAt: null },
    },
  });
  assert.equal(buildFounderJourneySnapshot(withTractionReady).nextAction?.key, 'pitch-deck-analysis');

  const withEverything = makeInputs({
    toolSignals: ALL_TOOL_SIGNALS,
    extras: {
      traction: { latestScore: 90, weekStartDate: '2026-07-06', phaseSevenReady: true, updatedAt: null },
      pitchDeck: { overallScore: 75, verdict: 'Promising', createdAt: '2026-07-02T00:00:00.000Z' },
    },
  });
  assert.equal(buildFounderJourneySnapshot(withEverything).nextAction, null);
});

test('lastTouched picks the most recently updated tool', () => {
  const snapshot = buildFounderJourneySnapshot(
    makeInputs({
      stageState: {
        IDENTITY: { completed: true, completedAt: '2026-06-01T00:00:00.000Z' },
      },
      toolSignals: { icpCompleted: true },
      extras: {
        traction: { latestScore: 40, weekStartDate: '2026-07-06', phaseSevenReady: false, updatedAt: '2026-07-08T09:00:00.000Z' },
        pitchDeck: { overallScore: 60, verdict: 'Needs work', createdAt: '2026-07-03T00:00:00.000Z' },
      },
    }),
  );

  assert.equal(snapshot.lastTouched?.label, 'Traction Engine');
  assert.equal(snapshot.lastTouched?.route, '/traction-engine');
});
