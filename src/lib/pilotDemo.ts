/**
 * The /enterprise pilot demo (2026-10-24): a visitor plays a sample founder in
 * a sample cohort. They consent and join, tick tasks and send a check-in, and
 * their own row appears on the program dashboard. Nothing is saved.
 *
 * The screens are the real cohort components; this file only supplies their
 * data. The visitor's row is built from what they did, and its stage, flags
 * and CSV come from the same functions the product uses (src/lib/cohorts.ts),
 * so the demo can't claim more than the product does.
 *
 * Pure, with no imports beyond the cohort logic, so node tests can run it.
 */
import type { CohortCheckin, CohortDashboardData, CohortMemberProgress, CohortSummary } from './cohorts.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

export const DEMO_COHORT_ID = 'demo-cohort';
export const DEMO_USER_ID = 'demo-you';
// The dashboard marks this row 'You'.
export const DEMO_USER_NAME = 'Sample founder';

/** A check-in as the visitor typed it, one item per line already split. */
export interface DemoCheckin {
  wins: string[];
  blockers: string[];
  nextWeekGoals: string[];
  helpNeeded: string | null;
  sentAt: string;
}

export interface PilotDemoState {
  agreed: boolean;
  joinedAt: string | null;
  doneTaskIds: string[];
  checkin: DemoCheckin | null;
  lastActivityAt: string | null;
}

export const INITIAL_PILOT_DEMO: PilotDemoState = {
  agreed: false,
  joinedAt: null,
  doneTaskIds: [],
  checkin: null,
  lastActivityAt: null,
};

export type PilotDemoAction =
  | { type: 'agree'; agreed: boolean }
  | { type: 'join'; at: string }
  | { type: 'toggleTask'; taskId: string; done: boolean; at: string }
  | { type: 'sendCheckin'; checkin: Omit<DemoCheckin, 'sentAt'>; at: string }
  | { type: 'reset' };

export function pilotDemoReducer(state: PilotDemoState, action: PilotDemoAction): PilotDemoState {
  switch (action.type) {
    case 'agree':
      return { ...state, agreed: action.agreed };
    case 'join':
      // As in the product, joining needs the founder's consent.
      if (!state.agreed || state.joinedAt) return state;
      return { ...state, joinedAt: action.at, lastActivityAt: action.at };
    case 'toggleTask': {
      if (!state.joinedAt) return state;
      const done = new Set(state.doneTaskIds);
      if (action.done) done.add(action.taskId);
      else done.delete(action.taskId);
      return { ...state, doneTaskIds: [...done], lastActivityAt: action.at };
    }
    case 'sendCheckin':
      if (!state.joinedAt) return state;
      return { ...state, checkin: { ...action.checkin, sentAt: action.at }, lastActivityAt: action.at };
    case 'reset':
      return INITIAL_PILOT_DEMO;
    default:
      return state;
  }
}

const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const startOfToday = (now: Date) => Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

/**
 * A 28-day sample cohort in its first week (it started three days ago), so
 * the flags that wait for week 2 stay quiet and only react to the visitor.
 */
export function demoCohort(now: Date = new Date()): CohortSummary {
  const start = startOfToday(now) - 3 * DAY_MS;
  return {
    cohortId: DEMO_COHORT_ID,
    cohortName: 'Spring cohort',
    programName: 'Sample Program',
    startDate: ymd(start),
    endDate: ymd(start + 27 * DAY_MS),
    status: 'active',
    checkinDay: 'monday',
    pilotPlan: 'rising',
  };
}

/** The visitor's row on the program dashboard, from what they did. Null before joining. */
export function demoMember(state: PilotDemoState): CohortMemberProgress | null {
  if (!state.joinedAt) return null;
  const checkins: CohortCheckin[] = state.checkin
    ? [{
      weekNumber: 1,
      checkinDate: state.checkin.sentAt.slice(0, 10),
      wins: state.checkin.wins,
      blockers: state.checkin.blockers,
      nextWeekGoals: state.checkin.nextWeekGoals,
      helpNeeded: state.checkin.helpNeeded,
      createdAt: state.checkin.sentAt,
    }]
    : [];
  return {
    userId: DEMO_USER_ID,
    name: DEMO_USER_NAME,
    email: null,
    status: 'active',
    joinedAt: state.joinedAt,
    lastActivityAt: state.lastActivityAt,
    // Ticking "Complete and save your ICP profile" is a task, not the saved
    // profile itself, so the visitor's stage stays at Identity, as it would.
    outcomes: [],
    completedTaskIds: [...state.doneTaskIds],
    interviews: { total: 0, verified: 0 },
    evidence: { replies: 0, interviewsCompleted: 0, commitments: 0, payments: 0, strangersActed: 0, strangersIdentified: 0, total: 0, verified: 0 },
    experimentsRun: 0,
    experimentDecisions: 0,
    assumptions: { total: 0, tested: 0 },
    checkins,
  };
}

const emptyEvidence = { replies: 0, interviewsCompleted: 0, commitments: 0, payments: 0, strangersActed: 0, strangersIdentified: 0, total: 0, verified: 0 };

/** Five sample founders in week 1. Every name and number is fictional. */
function sampleMembers(now: Date): CohortMemberProgress[] {
  const start = startOfToday(now) - 3 * DAY_MS;
  const at = (days: number, hours = 10) => new Date(start + days * DAY_MS + hours * 3600_000).toISOString();
  // Recent activity counts back from now, so it never shows as in the future.
  const ago = (hours: number) => new Date(now.getTime() - hours * 3600_000).toISOString();
  const icpDone = (completedAt: string) => [{ tool: 'icp_builder', status: 'ready', completed_at: completedAt, updated_at: completedAt }];
  const checkin = (wins: string[], extra: Partial<CohortCheckin> = {}): CohortCheckin => ({
    weekNumber: 1,
    checkinDate: ago(26).slice(0, 10),
    wins,
    blockers: [],
    nextWeekGoals: ['Five more customer interviews'],
    helpNeeded: null,
    createdAt: ago(26),
    ...extra,
  });
  const member = (overrides: Partial<CohortMemberProgress> & Pick<CohortMemberProgress, 'userId' | 'name' | 'email'>): CohortMemberProgress => ({
    status: 'active',
    joinedAt: at(0, 9),
    lastActivityAt: ago(24),
    outcomes: [],
    completedTaskIds: [],
    interviews: { total: 0, verified: 0 },
    evidence: emptyEvidence,
    experimentsRun: 0,
    experimentDecisions: 0,
    assumptions: { total: 0, tested: 0 },
    checkins: [],
    ...overrides,
  });

  return [
    member({
      userId: 'demo-amara', name: 'Amara Okoye', email: 'amara@example.com', lastActivityAt: ago(2),
      outcomes: icpDone(at(1)), completedTaskIds: ['identity-icp-profile', 'identity-top-pains', 'identity-segments'],
      interviews: { total: 4, verified: 1 }, evidence: { ...emptyEvidence, total: 5, verified: 2, replies: 3 },
      experimentsRun: 1, assumptions: { total: 5, tested: 2 },
      checkins: [checkin(['Four interviews with clinic managers', 'Saved my customer profile'])],
    }),
    member({
      userId: 'demo-daniel', name: 'Daniel Brooks', email: 'daniel@example.com', lastActivityAt: ago(13),
      // His profile predates the cohort, so he joined a stage ahead.
      outcomes: icpDone(new Date(start - 40 * DAY_MS).toISOString()), completedTaskIds: ['identity-icp-profile', 'identity-top-pains'],
      interviews: { total: 2, verified: 0 }, evidence: { ...emptyEvidence, total: 2 }, assumptions: { total: 4, tested: 1 },
      checkins: [checkin(['Two interviews with logistics leads'])],
    }),
    member({
      userId: 'demo-lucia', name: 'Lucía Fernández', email: 'lucia@example.com', lastActivityAt: ago(20),
      completedTaskIds: ['identity-top-pains'], interviews: { total: 1, verified: 0 }, evidence: { ...emptyEvidence, total: 1 },
      checkins: [checkin(['First interview booked'], { blockers: ['No access to hospital buyers'], helpNeeded: 'An intro to a hospital procurement lead' })],
    }),
    member({
      userId: 'demo-priya', name: 'Priya Nair', email: 'priya@example.com', lastActivityAt: ago(5),
      outcomes: icpDone(at(2)), completedTaskIds: ['identity-icp-profile', 'identity-top-pains'],
      interviews: { total: 2, verified: 1 }, evidence: { ...emptyEvidence, total: 3, verified: 1 }, assumptions: { total: 3, tested: 1 },
    }),
    member({ userId: 'demo-tom', name: 'Tom Becker', email: 'tom@example.com', lastActivityAt: at(0, 11) }),
  ];
}

/** The program dashboard the demo shows: the sample cohort, with the visitor first once they've joined. */
export function demoDashboard(state: PilotDemoState, now: Date = new Date()): CohortDashboardData {
  const you = demoMember(state);
  return {
    cohort: { ...demoCohort(now), joinCode: null, staffCode: null },
    members: you ? [you, ...sampleMembers(now)] : sampleMembers(now),
    generatedAt: now.toISOString(),
  };
}
