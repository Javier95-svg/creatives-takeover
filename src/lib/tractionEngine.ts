export type TractionDecision = 'double_down' | 'iterate' | 'kill';

export type TractionProductCategory =
  | 'saas'
  | 'marketplace'
  | 'community'
  | 'content_tool'
  | 'ecommerce'
  | 'ai_tool'
  | 'services'
  | 'other';

export type RetentionDiagnosis =
  | 'no_signal'
  | 'healthy'
  | 'onboarding_gap'
  | 'wrong_audience'
  | 'core_loop_gap';

export interface TractionExperimentInput {
  channel: string;
  hypothesis: string;
  actionTaken: string;
  targetMetric: string;
  targetValue: number;
  resultValue: number;
  timeInvestedHours: number;
  decision: TractionDecision;
}

export interface TractionRetentionInput {
  newUsers: number;
  sevenDayActiveUsers: number;
  thirtyDayActiveUsers: number;
  primaryAcquisitionChannel: string;
  productCategory: TractionProductCategory;
  revenue?: number;
}

export interface TractionScoreInput {
  experiments: TractionExperimentInput[];
  retention: TractionRetentionInput;
  previousLogDates: string[];
  currentWeekStart: string;
  previousScores: number[];
}

export interface TractionExperimentScore {
  pass: boolean;
  efficiencyScore: number;
  qualityScore: number;
}

export interface TractionScoreResult {
  combinedScore: number;
  consistencyScore: number;
  channelEfficiencyScore: number;
  experimentQualityScore: number;
  retentionHealthScore: number;
  channelQualitySignal: string;
  retentionDiagnosis: RetentionDiagnosis;
  prioritizedRecommendation: string;
  phaseSevenReady: boolean;
  consistencyStreakWeeks: number;
  experimentScores: TractionExperimentScore[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export const PRODUCT_CATEGORY_LABELS: Record<TractionProductCategory, string> = {
  saas: 'SaaS',
  marketplace: 'Marketplace',
  community: 'Community',
  content_tool: 'Content tool',
  ecommerce: 'E-commerce',
  ai_tool: 'AI tool',
  services: 'Services',
  other: 'Other',
};

const RETENTION_BENCHMARKS: Record<TractionProductCategory, { sevenDay: number; thirtyDay: number }> = {
  saas: { sevenDay: 0.45, thirtyDay: 0.25 },
  marketplace: { sevenDay: 0.35, thirtyDay: 0.18 },
  community: { sevenDay: 0.5, thirtyDay: 0.3 },
  content_tool: { sevenDay: 0.4, thirtyDay: 0.22 },
  ecommerce: { sevenDay: 0.3, thirtyDay: 0.15 },
  ai_tool: { sevenDay: 0.42, thirtyDay: 0.22 },
  services: { sevenDay: 0.35, thirtyDay: 0.18 },
  other: { sevenDay: 0.35, thirtyDay: 0.18 },
};

// Baseline results-per-hour considered "excellent" for each category.
// Scoring: actual r/h divided by baseline, clamped to [0, 1.5], mapped to 0–100.
const EFFICIENCY_BASELINES: Record<TractionProductCategory, number> = {
  saas: 5,
  marketplace: 4,
  community: 8,
  content_tool: 6,
  ecommerce: 10,
  ai_tool: 6,
  services: 3,
  other: 5,
};

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const getWeekStartTime = (weekStart: string) => {
  const date = new Date(`${weekStart}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

export const getCurrentWeekStart = (date = new Date()): string => {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + diffToMonday);
  return utc.toISOString().slice(0, 10);
};

/** Returns how many weeks into the 6-week sprint cycle a sprint is (1-based). */
export const getSprintWeekNumber = (cycleStartDate: string, currentWeekStart: string): number => {
  const startMs = getWeekStartTime(cycleStartDate);
  const currentMs = getWeekStartTime(currentWeekStart);
  if (startMs === 0 || currentMs < startMs) return 1;
  return Math.min(Math.floor((currentMs - startMs) / WEEK_MS) + 1, 6);
};

/** Returns true when a sprint has reached or passed the 6-week boundary. */
export const isSprintAtBoundary = (cycleStartDate: string, currentWeekStart: string): boolean =>
  getSprintWeekNumber(cycleStartDate, currentWeekStart) >= 6;

export const calculateConsistencyStreak = (previousLogDates: string[], currentWeekStart: string): number => {
  const weeks = new Set(previousLogDates.concat(currentWeekStart));
  let cursor = getWeekStartTime(currentWeekStart);
  let streak = 0;

  while (weeks.has(new Date(cursor).toISOString().slice(0, 10))) {
    streak += 1;
    cursor -= WEEK_MS;
  }

  return streak;
};

export const scoreExperiment = (
  experiment: TractionExperimentInput,
  productCategory: TractionProductCategory = 'other',
): TractionExperimentScore => {
  const target = Math.max(0, experiment.targetValue);
  const result = Math.max(0, experiment.resultValue);
  const hours = Math.max(0.25, experiment.timeInvestedHours);
  const pass = target > 0 ? result >= target : result > 0;

  // Channel efficiency: result-per-hour normalised against the category baseline.
  // A founder hitting 1× baseline scores 67; hitting 1.5× baseline scores 100.
  const baseline = EFFICIENCY_BASELINES[productCategory] ?? EFFICIENCY_BASELINES.other;
  const resultPerHour = result / hours;
  const efficiencyScore = clampScore((Math.min(resultPerHour / baseline, 1.5) / 1.5) * 100);

  const fields = [
    experiment.channel,
    experiment.hypothesis,
    experiment.actionTaken,
    experiment.targetMetric,
    experiment.decision,
  ];
  const completeness = fields.filter((field) => field.trim().length > 0).length / fields.length;
  const specificity =
    experiment.hypothesis.trim().length >= 40 && experiment.actionTaken.trim().length >= 40 ? 1 : 0.65;
  const metricQuality = target > 0 && experiment.timeInvestedHours > 0 ? 1 : 0.55;

  return {
    pass,
    efficiencyScore,
    qualityScore: clampScore((completeness * 0.45 + specificity * 0.35 + metricQuality * 0.2) * 100),
  };
};

export const scoreRetention = (retention: TractionRetentionInput): number => {
  const newUsers = Math.max(0, retention.newUsers);
  if (newUsers === 0) return 0;

  const benchmarks = RETENTION_BENCHMARKS[retention.productCategory] ?? RETENTION_BENCHMARKS.other;
  const sevenDayRate = Math.max(0, retention.sevenDayActiveUsers) / newUsers;
  const thirtyDayRate = Math.max(0, retention.thirtyDayActiveUsers) / newUsers;
  const sevenDayScore = Math.min(sevenDayRate / benchmarks.sevenDay, 1.3) / 1.3;
  const thirtyDayScore = Math.min(thirtyDayRate / benchmarks.thirtyDay, 1.3) / 1.3;

  return clampScore((sevenDayScore * 0.45 + thirtyDayScore * 0.55) * 100);
};

/**
 * Three-way root-cause diagnosis based on the 7-day vs 30-day retention pattern:
 * - Both below benchmark → wrong audience (users aren't a fit from the start)
 * - 7-day below, 30-day proportionally OK → onboarding gap (users don't activate but those who do stay)
 * - 7-day OK, 30-day below → core loop gap (users activate but don't form a habit)
 */
export const diagnoseRetention = (retention: TractionRetentionInput): RetentionDiagnosis => {
  const newUsers = Math.max(0, retention.newUsers);
  if (newUsers === 0) return 'no_signal';

  const benchmarks = RETENTION_BENCHMARKS[retention.productCategory] ?? RETENTION_BENCHMARKS.other;
  const sevenDayRate = Math.max(0, retention.sevenDayActiveUsers) / newUsers;
  const thirtyDayRate = Math.max(0, retention.thirtyDayActiveUsers) / newUsers;

  const sevenDayOk = sevenDayRate >= benchmarks.sevenDay * 0.8;
  const thirtyDayOk = thirtyDayRate >= benchmarks.thirtyDay * 0.8;

  if (sevenDayOk && thirtyDayOk) return 'healthy';
  if (!sevenDayOk && !thirtyDayOk) return 'wrong_audience';
  if (!sevenDayOk && thirtyDayOk) return 'onboarding_gap';
  return 'core_loop_gap'; // sevenDayOk && !thirtyDayOk
};

const DIAGNOSIS_SIGNALS: Record<RetentionDiagnosis, string> = {
  no_signal: 'No acquisition quality signal yet.',
  healthy: ' is attracting users who retain at or above benchmark.',
  wrong_audience: ' is bringing in users who churn quickly at both 7 and 30 days — likely an audience fit problem, not an onboarding problem.',
  onboarding_gap: ' users are churning before activation, but those who do activate stick around. The fix is onboarding, not targeting.',
  core_loop_gap: ' users activate but do not form a habit by day 30. The core product loop needs a stronger return trigger.',
};

const buildChannelSignal = (channel: string, diagnosis: RetentionDiagnosis): string => {
  if (diagnosis === 'no_signal') return DIAGNOSIS_SIGNALS.no_signal;
  const label = channel.trim() || 'This channel';
  return `${label}${DIAGNOSIS_SIGNALS[diagnosis]}`;
};

type RecommendationSignal = {
  severity: number;
  message: string;
};

export const calculateTractionScore = (input: TractionScoreInput): TractionScoreResult => {
  const experimentScores = input.experiments.map((exp) =>
    scoreExperiment(exp, input.retention.productCategory),
  );
  const consistencyStreakWeeks = calculateConsistencyStreak(input.previousLogDates, input.currentWeekStart);
  const consistencyScore = clampScore((Math.min(consistencyStreakWeeks, 8) / 8) * 100);
  const channelEfficiencyScore = experimentScores.length
    ? clampScore(experimentScores.reduce((sum, s) => sum + s.efficiencyScore, 0) / experimentScores.length)
    : 0;
  const experimentQualityScore = experimentScores.length
    ? clampScore(experimentScores.reduce((sum, s) => sum + s.qualityScore, 0) / experimentScores.length)
    : 0;
  const retentionHealthScore = scoreRetention(input.retention);
  const combinedScore = clampScore(
    (consistencyScore + channelEfficiencyScore + experimentQualityScore + retentionHealthScore) / 4,
  );
  const recentScores = input.previousScores.slice(0, 2);
  const phaseSevenReady =
    [combinedScore, ...recentScores].length >= 3 &&
    [combinedScore, ...recentScores].every((s) => s >= 75);

  const retentionDiagnosis = diagnoseRetention(input.retention);
  const channelQualitySignal = buildChannelSignal(
    input.retention.primaryAcquisitionChannel,
    retentionDiagnosis,
  );

  // Priority-ranked recommendation: collect all signals, surface the highest-severity one.
  const signals: RecommendationSignal[] = [];

  if (phaseSevenReady) {
    signals.push({
      severity: 100,
      message: 'You have three consecutive strong traction weeks. Prepare the Phase 7 fundraising proof layer from this data.',
    });
  }
  if (retentionDiagnosis === 'wrong_audience' && channelEfficiencyScore >= 60) {
    signals.push({
      severity: 90,
      message: 'Your distribution is driving activity, but the channel is attracting users who churn within a week. Tighten audience targeting before scaling further.',
    });
  }
  if (retentionDiagnosis === 'onboarding_gap') {
    signals.push({
      severity: 85,
      message: 'Users are not activating after signup. The channel is not the problem — your onboarding flow is. Fix activation before spending more time on distribution.',
    });
  }
  if (retentionDiagnosis === 'core_loop_gap') {
    signals.push({
      severity: 80,
      message: 'Users activate but do not return by day 30. Strengthen the product\'s core return trigger before expecting retention to hold at scale.',
    });
  }
  if (consistencyScore < 40) {
    signals.push({
      severity: 75,
      message: 'Your distribution rhythm is too inconsistent to build compounding traction. Protect one fixed weekly sprint block and show up every week.',
    });
  }
  if (experimentQualityScore < 60) {
    signals.push({
      severity: 70,
      message: 'Make next week\'s experiment more specific: one channel, one hypothesis, one measurable target, one decision.',
    });
  }
  if (channelEfficiencyScore < 45) {
    signals.push({
      severity: 65,
      message: 'Your channel is not producing enough results for the time invested. Iterate the angle or close this channel after the sprint.',
    });
  }
  if (retentionHealthScore >= 70 && consistencyScore < 55) {
    signals.push({
      severity: 60,
      message: 'Users are retaining well, but your distribution is inconsistent. You have a product worth growing — protect a weekly sprint block.',
    });
  }
  if (combinedScore >= 75 && !phaseSevenReady) {
    signals.push({
      severity: 50,
      message: 'Strong week. Repeat the same channel discipline and retention measurement to build a three-week Phase 7 readiness streak.',
    });
  }

  const topSignal = signals.sort((a, b) => b.severity - a.severity)[0];
  const prioritizedRecommendation =
    topSignal?.message ?? 'Log a focused weekly experiment and retention snapshot to establish your baseline.';

  return {
    combinedScore,
    consistencyScore,
    channelEfficiencyScore,
    experimentQualityScore,
    retentionHealthScore,
    channelQualitySignal,
    retentionDiagnosis,
    prioritizedRecommendation,
    phaseSevenReady,
    consistencyStreakWeeks,
    experimentScores,
  };
};
