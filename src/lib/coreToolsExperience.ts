const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases: Record<string, string[]> = {
  id: ['id', 'response id', 'record id'], date: ['date', 'created at', 'submitted at', 'timestamp'],
  respondent: ['respondent', 'name', 'full name', 'customer name'], email: ['email', 'email address'],
  feedback: ['feedback', 'main feedback', 'comments', 'customer feedback'], objections: ['objections', 'concerns'],
  segment: ['segment', 'customer segment'], incentivized: ['incentivized', 'incentive'],
  product_usage: ['product usage', 'product use'], metric: ['metric', 'metric name'], value: ['value', 'result'],
  unit: ['unit'], period_start: ['period start', 'start date'], period_end: ['period end', 'end date'],
};
/** Suggest only unambiguous matches. The founder still previews and accepts. */
export function suggestImportMapping(headers: string[]) {
  return Object.fromEntries(Object.entries(aliases).flatMap(([field, names]) => {
    const exact = headers.filter(header => normalize(header) === normalize(field));
    const candidates = exact.length ? exact : headers.filter(header => names.some(name => normalize(name) === normalize(header)));
    return candidates.length === 1 ? [[field, candidates[0]]] : [];
  }));
}
export function suggestDealStage(value: string): string {
  return ({ closedwon: 'customer', customer: 'customer', closedlost: 'lost', lost: 'lost', qualified: 'qualified', opportunity: 'opportunity', lead: 'lead' } as Record<string, string>)[normalize(value)] ?? '';
}
export const COHORT_EXAMPLES = [
  { id: 'software', name: 'Software or app', startEvent: 'First meaningful product use', returnEvent: 'Repeated meaningful product use', windowDays: 7 },
  { id: 'commerce', name: 'Shop or commerce', startEvent: 'First completed purchase', returnEvent: 'Another completed purchase', windowDays: 30 },
  { id: 'services', name: 'Services', startEvent: 'First completed engagement', returnEvent: 'Another paid engagement', windowDays: 30 },
  { id: 'audience', name: 'Content or audience', startEvent: 'First content engagement', returnEvent: 'Another content engagement', windowDays: 7 },
] as const;
export function weeklyDisciplineSeries(logs: Array<{ week_start_date: string; combined_score: number; calculation_version?: number }>) {
  const supported = logs.filter(log => log.calculation_version === 2 && Number.isFinite(Date.parse(log.week_start_date)));
  if (!supported.length) return [];
  const last = Math.max(...supported.map(log => Date.parse(log.week_start_date)));
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(last - (5 - index) * 604800000).toISOString().slice(0, 10);
    const log = supported.find(row => row.week_start_date.slice(0, 10) === date);
    return { date, score: log && Number.isFinite(Number(log.combined_score)) ? Number(log.combined_score) : null };
  });
}
