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
  prioritizedRecommendation: string;
  phaseSevenReady: boolean;
  consistencyStreakWeeks: number;
  experimentScores: TractionExperimentScore[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

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

export const calculateConsistencyStreak = (previousLogDates: string[], currentWeekStart: string): number => {
  const weeks = new Set(previousLogDates.concat(currentWeekStart));
  let cursor = getWeekStartTime(currentWeekStart);
  let streak = 0;

  while (weeks.has(new Date(cursor).toISOString().slice(0, 10))) {
    streak += 1;
    cursor -= 7 * DAY_MS;
  }

  return streak;
};

export const scoreExperiment = (experiment: TractionExperimentInput): TractionExperimentScore => {
  const target = Math.max(0, experiment.targetValue);
  const result = Math.max(0, experiment.resultValue);
  const hours = Math.max(0.25, experiment.timeInvestedHours);
  const attainment = target > 0 ? result / target : result > 0 ? 1 : 0;
  const pass = target > 0 ? result >= target : result > 0;
  const efficiencyScore = clampScore(Math.min(attainment, 1.5) * 70 + Math.min(result / hours, 10) * 3);

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

export const calculateTractionScore = (input: TractionScoreInput): TractionScoreResult => {
  const experimentScores = input.experiments.map(scoreExperiment);
  const consistencyStreakWeeks = calculateConsistencyStreak(input.previousLogDates, input.currentWeekStart);
  const consistencyScore = clampScore((Math.min(consistencyStreakWeeks, 8) / 8) * 100);
  const channelEfficiencyScore = experimentScores.length
    ? clampScore(experimentScores.reduce((sum, score) => sum + score.efficiencyScore, 0) / experimentScores.length)
    : 0;
  const experimentQualityScore = experimentScores.length
    ? clampScore(experimentScores.reduce((sum, score) => sum + score.qualityScore, 0) / experimentScores.length)
    : 0;
  const retentionHealthScore = scoreRetention(input.retention);
  const combinedScore = clampScore(
    (consistencyScore + channelEfficiencyScore + experimentQualityScore + retentionHealthScore) / 4,
  );
  const recentScores = input.previousScores.slice(0, 2);
  const phaseSevenReady = [combinedScore, ...recentScores].length >= 3
    && [combinedScore, ...recentScores].every((score) => score >= 75);

  let channelQualitySignal = 'No acquisition quality signal yet.';
  if (input.retention.newUsers > 0) {
    channelQualitySignal = retentionHealthScore >= 75
      ? `${input.retention.primaryAcquisitionChannel || 'This channel'} is attracting users who retain at or above benchmark.`
      : `${input.retention.primaryAcquisitionChannel || 'This channel'} is bringing users who need better activation or fit.`;
  }

  let prioritizedRecommendation = 'Log a focused weekly experiment and retention snapshot to establish your baseline.';
  if (retentionHealthScore < 45 && channelEfficiencyScore >= 65) {
    prioritizedRecommendation = 'Your distribution is creating activity, but retention is weak. Tighten audience targeting and onboarding before scaling the channel.';
  } else if (retentionHealthScore >= 70 && consistencyScore < 50) {
    prioritizedRecommendation = 'Users are retaining, but your distribution rhythm is not consistent enough. Protect one weekly channel sprint block.';
  } else if (experimentQualityScore < 65) {
    prioritizedRecommendation = 'Make next week’s experiment more specific: one channel, one hypothesis, one measurable target, one decision.';
  } else if (channelEfficiencyScore < 50) {
    prioritizedRecommendation = 'Your channel is not producing enough output for the time invested. Iterate the angle or close the channel after the sprint.';
  } else if (phaseSevenReady) {
    prioritizedRecommendation = 'You have three consecutive strong traction weeks. Prepare the Phase 7 fundraising proof layer from this data.';
  } else if (combinedScore >= 75) {
    prioritizedRecommendation = 'Strong week. Repeat the same channel discipline and retention measurement to build a three-week readiness streak.';
  }

  return {
    combinedScore,
    consistencyScore,
    channelEfficiencyScore,
    experimentQualityScore,
    retentionHealthScore,
    channelQualitySignal,
    prioritizedRecommendation,
    phaseSevenReady,
    consistencyStreakWeeks,
    experimentScores,
  };
};
