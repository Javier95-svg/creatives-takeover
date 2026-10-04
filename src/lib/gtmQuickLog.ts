import {
  calculateTractionScore,
  TRACTION_CALCULATION_VERSION,
  type TractionDecision,
  type TractionProductCategory,
} from './tractionEngine.ts';
import { evaluateDecisionReadiness, type DecisionReadiness } from './marketExperiment.ts';

// Builds a Traction Engine weekly log for one GTM play, so founders can log
// the week from GTM Strategist without opening a second tool. It uses the same
// scoring (calculateTractionScore) and decision rule (evaluateDecisionReadiness)
// as Traction Engine, so both tools store the same numbers.
//
// The weekly save replaces every experiment in that week, so the caller must
// only use this when the week has no log yet; otherwise send the founder to
// Traction Engine to edit the whole week.

export interface QuickLogInput {
  weekStart: string;
  sprintId: string;
  channel: string;
  hypothesis: string;
  metric: string;
  target: number;
  minimumSampleSize: number;
  reached: number;
  result: number;
  hours: number;
  /** The founder's decision; defaults to the recommended one. */
  decision?: TractionDecision;
  rationale?: string;
  productCategory?: TractionProductCategory;
  previousLogs: Array<{ week_start_date: string; combined_score: number | null }>;
}

export interface QuickLogPayload {
  readiness: DecisionReadiness;
  decision: TractionDecision;
  logPayload: Record<string, unknown>;
  experimentRows: Array<Record<string, unknown>>;
}

const nonNegative = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);

export function readinessForQuickLog(input: Pick<QuickLogInput, 'target' | 'result' | 'minimumSampleSize' | 'reached'>): DecisionReadiness {
  return evaluateDecisionReadiness({
    targetValue: input.target,
    observedValue: nonNegative(input.result),
    minimumSampleSize: Math.max(1, input.minimumSampleSize),
    sampleSize: nonNegative(input.reached),
    verificationModes: ['founder_reported'],
  });
}

export function buildQuickLogPayload(input: QuickLogInput): QuickLogPayload {
  const readiness = readinessForQuickLog(input);
  const decision = input.decision ?? readiness.recommendedDecision;
  const experiment = {
    channel: input.channel.trim(),
    hypothesis: input.hypothesis.trim(),
    actionTaken: `Ran the ${input.channel.trim()} play from GTM Strategist and reached ${nonNegative(input.reached)} people.`,
    targetMetric: input.metric.trim(),
    targetValue: input.target,
    resultValue: nonNegative(input.result),
    timeInvestedHours: nonNegative(input.hours),
    decision,
    sampleSize: nonNegative(input.reached),
  };
  // Retention is not asked here; both windows are left out of the score
  // instead of counting as zero.
  const retention = {
    newUsers: 0,
    sevenDayActiveUsers: 0,
    thirtyDayActiveUsers: 0,
    primaryAcquisitionChannel: experiment.channel,
    productCategory: input.productCategory ?? 'other',
    sevenDayStatus: 'pending' as const,
    thirtyDayStatus: 'pending' as const,
  };
  const previous = input.previousLogs.filter((log) => log.week_start_date !== input.weekStart);
  const score = calculateTractionScore({
    experiments: [experiment],
    retention,
    previousLogDates: previous.map((log) => log.week_start_date),
    previousScores: previous.map((log) => log.combined_score ?? 0),
    currentWeekStart: input.weekStart,
  });
  const experimentScore = score.experimentScores[0];

  return {
    readiness,
    decision,
    logPayload: {
      week_start_date: input.weekStart,
      new_users: 0,
      seven_day_active_users: 0,
      thirty_day_active_users: 0,
      primary_acquisition_channel: experiment.channel,
      product_category: retention.productCategory,
      revenue: null,
      combined_score: score.combinedScore,
      consistency_score: score.consistencyScore,
      channel_efficiency_score: score.channelEfficiencyScore,
      experiment_quality_score: score.experimentQualityScore,
      retention_health_score: score.retentionHealthScore,
      consistency_streak_weeks: score.consistencyStreakWeeks,
      channel_quality_signal: score.channelQualitySignal,
      prioritized_recommendation: score.prioritizedRecommendation,
      phase_seven_ready: score.phaseSevenReady,
      score_breakdown: {
        experimentScores: score.experimentScores,
        retentionSource: 'not_reported',
        retention: { method: 'cohort', sevenDayStatus: 'pending', thirtyDayStatus: 'pending' },
        recommendedDecisions: [readiness.recommendedDecision],
        loggedFrom: 'gtm_strategist',
      },
      verification_mode: 'founder_reported',
      calculation_version: TRACTION_CALCULATION_VERSION,
    },
    experimentRows: [{
      sprint_id: input.sprintId,
      channel: experiment.channel,
      hypothesis: experiment.hypothesis,
      action_taken: experiment.actionTaken,
      target_metric: experiment.targetMetric,
      target_value: experiment.targetValue,
      result_value: experiment.resultValue,
      time_invested_hours: experiment.timeInvestedHours,
      decision,
      recommended_decision: readiness.recommendedDecision,
      override_rationale: decision !== readiness.recommendedDecision ? (input.rationale?.trim() || null) : null,
      assumption_fingerprint: null,
      assumption_status: null,
      pass: experimentScore.pass,
      efficiency_score: experimentScore.efficiencyScore,
      quality_score: experimentScore.qualityScore,
      sample_size: experiment.sampleSize,
    }],
  };
}
