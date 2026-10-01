import { calculateConsistencyStreak, type TractionScoreInput, type TractionScoreResult, type TractionScoreDimensionInsight } from './tractionEngine.ts';
import { cohortResult, type CohortMeasurement } from './coreTools.ts';

export const TRACTION_CALCULATION_VERSION = 2;
const score = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
export function calculateTractionMeasurement(input: TractionScoreInput & { cohort?: CohortMeasurement | null }, now = new Date()): TractionScoreResult & { calculationVersion: 2; retentionStatus: 'complete' | 'pending' | 'unknown' } {
  const cohort = cohortResult(input.cohort, now);
  const streak = calculateConsistencyStreak(input.previousLogDates, input.currentWeekStart);
  const experimentScores = input.experiments.map(experiment => {
    const fields = [experiment.channel, experiment.hypothesis, experiment.actionTaken, experiment.targetMetric, experiment.decision];
    const qualityScore = score(fields.filter(field => field?.trim()).length / fields.length * 80 + (experiment.targetValue > 0 && experiment.timeInvestedHours > 0 ? 20 : 0));
    const efficiencyScore = experiment.targetValue > 0 ? score(experiment.resultValue / experiment.targetValue * 100) : 0;
    return { pass: experiment.targetValue > 0 && experiment.resultValue >= experiment.targetValue, efficiencyScore, qualityScore, recommendedDecision: 'iterate' as const };
  });
  const mean = (values: number[]) => values.length ? score(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const consistencyScore = score(streak / 8 * 100), experimentQualityScore = mean(experimentScores.map(value => value.qualityScore));
  const channelEfficiencyScore = mean(experimentScores.map(value => value.efficiencyScore));
  const retentionHealthScore = cohort.rate == null ? 0 : score(cohort.rate * 100);
  const combinedScore = score((consistencyScore + experimentQualityScore) / 2);
  const dimensions: TractionScoreDimensionInsight[] = [
    { key: 'consistency', label: 'Weekly consistency', score: consistencyScore, detail: `${streak} consecutive weeks recorded.` },
    { key: 'experiment_quality', label: 'Experiment documentation', score: experimentQualityScore, detail: 'A stated hypothesis, action, target, effort, and decision make the work reviewable.' },
    { key: 'channel_efficiency', label: 'Progress against own targets', score: channelEfficiencyScore, detail: 'Each result is compared with its own target. Results per hour are meaningful only for the same metric and definition.' },
    { key: 'retention_health', label: 'Measured cohort retention', score: retentionHealthScore, detail: cohort.status === 'complete' ? `${input.cohort!.returned}/${input.cohort!.cohortSize} returned for ${input.cohort!.returnEvent} in the ${input.cohort!.windowDays}-day window.` : cohort.status === 'pending' ? 'This cohort has not finished its observation window.' : 'Retention is unknown. Select a starting cohort, return event, and complete observation window.' },
  ];
  const discipline = dimensions.slice(0, 2).sort((a, b) => b.score - a.score);
  const recommendation = cohort.status === 'unknown' ? 'Review the measured acquisition result and collect a defined returning-customer cohort.' : cohort.status === 'pending' ? 'Continue the experiment until the observation window closes.' : 'Review target attainment, customer return behavior, and evidence quality before choosing the next experiment.';
  return { calculationVersion: 2, retentionStatus: cohort.status, combinedScore, consistencyScore, experimentQualityScore, channelEfficiencyScore, retentionHealthScore,
    phaseSevenReady: false, consistencyStreakWeeks: streak, experimentScores, recommendedDecisions: experimentScores.map(() => 'iterate'),
    scoreDelta: Number.isFinite(input.previousScores[0]) ? combinedScore - input.previousScores[0] : null,
    dimensionInsights: dimensions, strongestDimension: discipline[0], priorityDimension: discipline[1], priorityAction: recommendation,
    channelQualitySignal: cohort.rate == null ? `Retention ${cohort.status}` : `${retentionHealthScore}% of the selected cohort returned.`, retentionDiagnosis: 'no_signal', prioritizedRecommendation: recommendation };
}
