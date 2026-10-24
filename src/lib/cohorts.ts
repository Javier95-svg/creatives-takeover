/**
 * Cohort mode (2026-10-19): the logic behind the founder's cohort view and the
 * program dashboard, kept pure so node tests can check it.
 *
 * Data comes from cohort_context_v1 and cohort_dashboard_v1
 * (supabase/migrations/20261019090000_cohort_mode_v1.sql, counted over the
 * program period since 20261023120000_cohort_pilot_readiness.sql). Staff see
 * progress, not content: stage results, counts by verification level,
 * experiments, decisions, completed tasks, last activity and weekly check-ins.
 */
import { FOUNDER_STAGE_LABELS } from './bizmapStageOrder.ts';
import { deriveFounderProgress, OPERATING_STAGE_ORDER, type JourneyOutcomeSignal } from './founderProgress.ts';

export type CohortStatus = 'upcoming' | 'active' | 'completed';

/** The plan a program gives its founders for the cohort dates, or null. */
export type CohortPilotPlan = 'starter' | 'rising' | 'pro' | null;

export interface CohortSummary {
  cohortId: string;
  cohortName: string;
  programName: string | null;
  startDate: string;
  endDate: string;
  status: CohortStatus;
  checkinDay?: string | null;
  joinedAt?: string | null;
  pilotPlan?: CohortPilotPlan;
}

export interface CohortContext {
  member: CohortSummary | null;
  staff: CohortSummary[];
}

export const EMPTY_COHORT_CONTEXT: CohortContext = { member: null, staff: [] };

export interface CohortCheckin {
  weekNumber: number;
  checkinDate: string;
  wins: string[];
  blockers: string[];
  nextWeekGoals: string[];
  helpNeeded: string | null;
  createdAt: string;
}

export interface CohortMemberProgress {
  userId: string;
  name: string;
  email: string | null;
  status: string;
  joinedAt: string;
  lastActivityAt: string | null;
  outcomes: JourneyOutcomeSignal[];
  completedTaskIds: string[];
  interviews: { total: number; verified: number };
  evidence: {
    replies: number;
    interviewsCompleted: number;
    commitments: number;
    payments: number;
    strangersActed: number;
    strangersIdentified: number;
    total: number;
    verified: number;
  };
  /** Experiments started in the program period (not drafts). */
  experimentsRun: number;
  experimentDecisions: number;
  /** Assumptions in the founder's plan, and how many an interview or experiment settled. */
  assumptions: { total: number; tested: number };
  checkins: CohortCheckin[];
}

export interface CohortDashboardData {
  cohort: CohortSummary & { joinCode: string | null; staffCode: string | null };
  members: CohortMemberProgress[];
  generatedAt: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** A YYYY-MM-DD date as UTC midnight, so weeks don't shift with time zones. */
const dateOnly = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

const todayUtc = (now: Date) => Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

/** Weeks in the cohort, counting a partial last week as a week. */
export function cohortTotalWeeks(startDate: string, endDate: string): number {
  const days = Math.floor((dateOnly(endDate) - dateOnly(startDate)) / DAY_MS) + 1;
  return Math.max(1, Math.ceil(days / 7));
}

/** The current week, 1-based; 0 before the cohort starts; capped at the last week. */
export function cohortWeek(startDate: string, endDate: string, now: Date = new Date()): number {
  const elapsed = todayUtc(now) - dateOnly(startDate);
  if (elapsed < 0) return 0;
  return Math.min(cohortTotalWeeks(startDate, endDate), Math.floor(elapsed / DAY_MS / 7) + 1);
}

export interface MemberStage {
  /** Index into the six operating stages, 0-based. */
  index: number;
  label: string;
  /** Identity is complete: the founder has an ideal customer profile, the base of the validation plan. */
  planReady: boolean;
  /** Validation is complete: a Build, Narrow, Pivot or Stop decision with evidence behind it. */
  decisionReached: boolean;
}

/**
 * The stage a founder was at when they joined: the same rules, using only the
 * stage results completed by then. The report compares it with memberStage.
 */
export function memberStageAtJoin(member: Pick<CohortMemberProgress, 'outcomes' | 'joinedAt'>): MemberStage {
  const joined = Date.parse(member.joinedAt);
  return memberStage(member.outcomes.filter((outcome) => {
    const completed = outcome.completed_at ? Date.parse(outcome.completed_at) : Number.NaN;
    return Number.isFinite(completed) && completed <= joined;
  }));
}

/** The founder's stage, worked out with the same rules as their own dashboard. */
export function memberStage(outcomes: readonly JourneyOutcomeSignal[]): MemberStage {
  const progress = deriveFounderProgress({
    outcomes,
    firstCustomerSprintCompletedAt: null,
    fundraisingReadinessCompletedAt: null,
    pitchDeckCompletedAt: null,
    savedInvestorCount: 0,
  });
  const index = Math.max(0, OPERATING_STAGE_ORDER.indexOf(progress.currentStage));
  return {
    index,
    label: FOUNDER_STAGE_LABELS[index],
    planReady: Boolean(progress.completedAt.IDENTITY),
    decisionReached: Boolean(progress.completedAt.VALIDATING),
  };
}

export function checkinForWeek(member: Pick<CohortMemberProgress, 'checkins'>, week: number): CohortCheckin | null {
  return member.checkins.find((checkin) => checkin.weekNumber === week) ?? null;
}

export type AttentionKey = 'quiet' | 'missed_checkin' | 'blocked' | 'help' | 'no_plan' | 'no_interviews' | 'no_experiment';

export interface AttentionReason {
  key: AttentionKey;
  label: string;
}

const QUIET_DAYS = 7;

/** Interviews logged in the program period, in PMF Lab or as evidence. */
export const memberInterviews = (member: Pick<CohortMemberProgress, 'interviews' | 'evidence'>) =>
  member.interviews.total + member.evidence.interviewsCompleted;

/**
 * Why a founder needs attention this week. Only rules a program manager can act
 * on: gone quiet, missed last week's check-in, reported a blocker or asked for
 * help, still has no customer profile after the first week, no interview logged
 * by week 2, or no experiment started by week 3.
 */
export function attentionReasons(
  member: CohortMemberProgress,
  week: number,
  now: Date = new Date(),
): AttentionReason[] {
  if (week === 0) return [];
  const reasons: AttentionReason[] = [];

  const lastActivity = member.lastActivityAt ? Date.parse(member.lastActivityAt) : null;
  const quietDays = lastActivity === null ? null : Math.floor((now.getTime() - lastActivity) / DAY_MS);
  if (quietDays === null || quietDays >= QUIET_DAYS) {
    reasons.push({ key: 'quiet', label: quietDays === null ? 'No activity yet' : `Quiet for ${quietDays} days` });
  }

  if (week >= 2 && !checkinForWeek(member, week - 1)) {
    reasons.push({ key: 'missed_checkin', label: `No check-in for week ${week - 1}` });
  }

  const latest = [...member.checkins].sort((a, b) => b.weekNumber - a.weekNumber)[0];
  if (latest && latest.weekNumber >= week - 1) {
    if (latest.blockers.some((blocker) => blocker.trim())) reasons.push({ key: 'blocked', label: 'Reported a blocker' });
    if (latest.helpNeeded?.trim()) reasons.push({ key: 'help', label: 'Asked for help' });
  }

  if (week >= 2 && !memberStage(member.outcomes).planReady) {
    reasons.push({ key: 'no_plan', label: 'No customer profile yet' });
  }

  if (week >= 2 && memberInterviews(member) === 0) {
    reasons.push({ key: 'no_interviews', label: 'No interviews logged' });
  }

  if (week >= 3 && member.experimentsRun === 0) {
    reasons.push({ key: 'no_experiment', label: 'No experiment started' });
  }

  return reasons;
}

export interface CohortKpis {
  founders: number;
  plansReady: number;
  medianInterviews: number;
  experimentsRun: number;
  checkinsThisWeek: number;
  needAttention: number;
  decisions: number;
}

const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export function cohortKpis(members: CohortMemberProgress[], week: number, now: Date = new Date()): CohortKpis {
  const stages = members.map((member) => memberStage(member.outcomes));
  return {
    founders: members.length,
    plansReady: stages.filter((stage) => stage.planReady).length,
    medianInterviews: median(members.map(memberInterviews)),
    experimentsRun: members.reduce((sum, member) => sum + member.experimentsRun, 0),
    checkinsThisWeek: week === 0 ? 0 : members.filter((member) => checkinForWeek(member, week)).length,
    needAttention: members.filter((member) => attentionReasons(member, week, now).length > 0).length,
    decisions: stages.filter((stage) => stage.decisionReached).length,
  };
}

const csvCell = (value: string | number | null | undefined) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * One row per founder, for the weekly summary and the final report. Activity
 * counts cover the program period only (from joining to the cohort's end).
 */
export function cohortCsv(data: CohortDashboardData, week: number, now: Date = new Date()): string {
  const header = [
    'Founder', 'Email', 'Joined', 'Stage at join', 'Stage', 'Customer profile', 'Decision reached', 'Tasks completed',
    'Assumptions (tested / total)', 'Interviews (verified / total)', 'Evidence (verified / total)',
    'Experiments run', 'Experiment decisions', 'Check-ins',
    'Last activity', `Check-in week ${week}`, 'Needs attention',
  ];
  const rows = data.members.map((member) => {
    const stage = memberStage(member.outcomes);
    return [
      member.name,
      member.email,
      member.joinedAt.slice(0, 10),
      memberStageAtJoin(member).label,
      stage.label,
      stage.planReady ? 'Yes' : 'No',
      stage.decisionReached ? 'Yes' : 'No',
      member.completedTaskIds.length,
      `${member.assumptions.tested} / ${member.assumptions.total}`,
      `${member.interviews.verified} / ${memberInterviews(member)}`,
      `${member.evidence.verified} / ${member.evidence.total}`,
      member.experimentsRun,
      member.experimentDecisions,
      member.checkins.length,
      member.lastActivityAt ? member.lastActivityAt.slice(0, 10) : '',
      checkinForWeek(member, week) ? 'Yes' : 'No',
      attentionReasons(member, week, now).map((reason) => reason.label).join('; '),
    ].map(csvCell).join(',');
  });
  return [header.map(csvCell).join(','), ...rows].join('\n');
}

/** Invite codes: no 0/O or 1/I/L, so they survive being read aloud or retyped. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateInviteCode(length = 10, random: (size: number) => Uint8Array = (size) => {
  const bytes = new Uint8Array(size);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}): string {
  return Array.from(random(length), (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

/** Lines typed in a check-in box become list items; blank lines are dropped. */
export function linesToList(text: string): string[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 10);
}

export const cohortInviteUrl = (origin: string, code: string) => `${origin.replace(/\/$/, '')}/join/${code}`;
