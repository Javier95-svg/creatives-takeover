/**
 * What the platform measured for one founder and one week (Phase 5, 2026-11-11).
 * The cohort fields come from visits to the founder's published MVP apps; the
 * rest are that week's signups (MVP lead forms, demo pages, waitlists), survey
 * responses and qualified GTM pipeline entries.
 */
export interface WeeklySignals {
  weekStart: string;
  cohortNewVisitors: number;
  cohortBack7d: number;
  cohortBack30d: number;
  totalVisitors: number;
  signups: number;
  surveyResponses: number;
  pipelineQualified: number;
  pipelineCustomers: number;
}

/** The cohort numbers a founder applied from the measured block. */
export interface AppliedSignals {
  weekStart: string;
  newUsers: number;
  sevenDayActiveUsers: number;
  thirtyDayActiveUsers: number;
}

const toCount = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
};

export function parseWeeklySignals(row: unknown, weekStart: string): WeeklySignals | null {
  if (!row || typeof row !== 'object') return null;
  const value = row as Record<string, unknown>;
  return {
    weekStart,
    cohortNewVisitors: toCount(value.cohort_new_visitors),
    cohortBack7d: toCount(value.cohort_back_7d),
    cohortBack30d: toCount(value.cohort_back_30d),
    totalVisitors: toCount(value.total_visitors),
    signups: toCount(value.signups),
    surveyResponses: toCount(value.survey_responses),
    pipelineQualified: toCount(value.pipeline_qualified),
    pipelineCustomers: toCount(value.pipeline_customers),
  };
}

export const isWeekStart = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

/** True when anything was measured that week, so the block is worth showing. */
export function hasMeasuredActivity(signals: WeeklySignals | null): boolean {
  if (!signals) return false;
  return signals.totalVisitors > 0 || signals.signups > 0 || signals.surveyResponses > 0 || signals.pipelineQualified > 0;
}

/**
 * A week is sent as platform-measured only while the cohort fields still hold
 * the numbers applied for the same cohort week. Any edit makes it founder
 * reported again. The database re-checks this on save
 * (enforce_traction_platform_verification), so the claim cannot be inflated.
 */
export function isPlatformMeasured(
  retention: { cohortWeekStart: string; newUsers: number; sevenDayActiveUsers: number; thirtyDayActiveUsers: number },
  applied: AppliedSignals | null,
): boolean {
  return Boolean(applied)
    && applied!.weekStart === retention.cohortWeekStart
    && applied!.newUsers === retention.newUsers
    && applied!.sevenDayActiveUsers === retention.sevenDayActiveUsers
    && applied!.thirtyDayActiveUsers === retention.thirtyDayActiveUsers
    && applied!.newUsers > 0;
}
