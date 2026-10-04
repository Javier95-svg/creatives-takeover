// Groups a play's logged Traction results into the six plan weeks, counted
// from when the play went live (the same anchor as getGTMPlanWeek), for the
// "Six weeks so far" strip on GTM Strategist's This week view.

export interface WeeklyResult {
  week: number;
  result: number | null;
  target: number | null;
  hit: boolean;
}

const WEEK_MS = 604_800_000;

export function weeklyResultsFromExperiments(
  rows: Array<{ result_value: number | string | null; target_value: number | string | null; created_at: string }>,
  startIso: string,
): WeeklyResult[] {
  const start = new Date(startIso).getTime();
  const weeks: WeeklyResult[] = [1, 2, 3, 4, 5, 6].map((week) => ({ week, result: null, target: null, hit: false }));
  if (!Number.isFinite(start)) return weeks;
  for (const row of rows) {
    const at = new Date(row.created_at).getTime();
    if (!Number.isFinite(at) || at < start) continue;
    const index = Math.min(5, Math.floor((at - start) / WEEK_MS));
    const result = Number(row.result_value);
    const target = Number(row.target_value);
    // The latest log in a week wins: rows arrive oldest first.
    weeks[index] = {
      week: index + 1,
      result: Number.isFinite(result) ? result : null,
      target: Number.isFinite(target) ? target : null,
      hit: Number.isFinite(result) && Number.isFinite(target) && result >= target,
    };
  }
  return weeks;
}
