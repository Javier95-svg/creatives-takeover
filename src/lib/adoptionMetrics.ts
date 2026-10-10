/**
 * Shapes and helpers for the admin Adoption page. The numbers come from
 * admin_adoption_metrics(), which reports by the sidebar's sections (Dashboard,
 * BizMap, Network, Insighta, Community, Content, Bonus) and their tools, from
 * first-party data only: section visits, tool activity and the actions each
 * section's own tables record.
 */

export interface AdoptionSummary {
  activeAccounts7d: number;
  activeAccounts30d: number;
  newAccounts30d: number;
  newAccountsActivated30d: number;
  accountsWithResultEver: number;
  /** Cookie choices saved by accounts active in the last 30 days (absent before 20261013120000). */
  consentGranted30d?: number;
  consentDenied30d?: number;
  /** Accounts with any active time recorded in the last 30 days. */
  timedAccounts30d?: number;
  /** Accounts in the report, how many chose their segment, and builders who moved to Founder (absent before 20261014130000). */
  accounts?: number;
  statedAccounts?: number;
  medianHoursToFirstResult?: number | null;
  builderToFounder?: number;
}

/** The two primary segments the report can be filtered by. */
export const ADOPTION_SEGMENTS = ['founder', 'builder'] as const;
export type AdoptionSegment = typeof ADOPTION_SEGMENTS[number];

export interface AdoptionWeek {
  week: string;
  newAccounts: number;
  activeAccounts: number;
  accountsWithResult: number;
}

/** One sidebar tool, last 30 days unless named "Ever". */
export interface AdoptionToolStat {
  tool: string;
  visited30d: number;
  engaged30d: number;
  actions30d: number;
  engagedEver: number;
  /** Active time from accounts that accepted analytics, and how many of them. */
  seconds30d?: number;
  timedAccounts30d?: number;
}

/** One sidebar section; its totals also count section pages that are no tool, such as Messages. */
export interface AdoptionSectionStat extends Omit<AdoptionToolStat, 'tool'> {
  section: string;
  tools: AdoptionToolStat[];
}

export interface AdoptionCohort {
  week: string;
  accounts: number;
  /** Each measure is null until every account in the cohort has passed its window. */
  activated7d: number | null;
  activeWeek1: number | null;
  activeWeek4: number | null;
}

export interface AdoptionMetrics {
  generatedAt: string;
  summary: AdoptionSummary;
  weekly: AdoptionWeek[];
  sections: AdoptionSectionStat[];
  cohorts: AdoptionCohort[];
}

/** "2 of 6 (33%)", or "n/a" when there is nothing to divide by. */
export function share(part: number | null | undefined, whole: number | null | undefined): string {
  if (part == null || !whole) return 'n/a';
  return `${part} of ${whole} (${Math.round((part / whole) * 100)}%)`;
}

/** "45 m", "2 h 5 m", "<1 m", or a dash when nothing was recorded. */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '–';
  if (seconds < 60) return '<1 m';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} m`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 ? `${hours} h ${minutes % 60} m` : `${hours} h`;
}

/** "20 min", "5 h", "3 days", or "n/a". */
export function formatHours(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours)) return 'n/a';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} days`;
}

/** One row of the Founders and Builders comparison, from each segment's report. */
export function segmentComparison(founder: AdoptionMetrics, builder: AdoptionMetrics) {
  const row = (label: string, hint: string, pick: (metrics: AdoptionMetrics) => string) =>
    ({ label, hint, founder: pick(founder), builder: pick(builder) });
  return [
    row('Accounts', 'How many chose their segment; the rest are inferred from older data.',
      (m) => `${m.summary.accounts ?? 0} (${m.summary.statedAccounts ?? 0} chose)`),
    row('Active, last 30 days', 'Any section visit or action.', (m) => share(m.summary.activeAccounts30d, m.summary.accounts)),
    row('Did something real, ever', 'A result, message, booking, post or completed task.', (m) => share(m.summary.accountsWithResultEver, m.summary.accounts)),
    row('Activated within 7 days', 'New accounts in the last 30 days.', (m) => share(m.summary.newAccountsActivated30d, m.summary.newAccounts30d)),
    row('Came back in week 2', 'Finished sign-up cohorts, last 12 weeks.', (m) => { const t = cohortTotals(m.cohorts).week1; return share(t.value, t.accounts); }),
    row('Time to first result', 'Median, sign-ups in the last 12 weeks.', (m) => formatHours(m.summary.medianHoursToFirstResult)),
    row('Most engaged section', 'Last 30 days.', (m) => topSection(m.sections)?.section ?? 'None yet'),
  ];
}

/** Time spent and, when more than one account contributed, the average per account. */
export function timeSpent(stat: Pick<AdoptionToolStat, 'seconds30d' | 'timedAccounts30d'>): { total: string; perAccount: string | null } {
  const accounts = stat.timedAccounts30d ?? 0;
  return {
    total: formatDuration(stat.seconds30d),
    perAccount: accounts > 1 && stat.seconds30d ? formatDuration(stat.seconds30d / accounts) : null,
  };
}

/** The section most accounts engaged with in the last 30 days, or null when none did. */
export function topSection(sections: AdoptionSectionStat[]): AdoptionSectionStat | null {
  const ranked = [...sections].sort((a, b) => b.engaged30d - a.engaged30d || b.visited30d - a.visited30d);
  return ranked[0] && (ranked[0].engaged30d > 0 || ranked[0].visited30d > 0) ? ranked[0] : null;
}

/** Totals for a set of cohorts, counting only cohorts whose window has passed. */
export function cohortTotals(cohorts: AdoptionCohort[]) {
  const sum = (pick: (cohort: AdoptionCohort) => number | null) => {
    const ready = cohorts.filter((cohort) => pick(cohort) != null);
    return {
      accounts: ready.reduce((total, cohort) => total + cohort.accounts, 0),
      value: ready.reduce((total, cohort) => total + (pick(cohort) ?? 0), 0),
    };
  };
  return {
    activated: sum((cohort) => cohort.activated7d),
    week1: sum((cohort) => cohort.activeWeek1),
    week4: sum((cohort) => cohort.activeWeek4),
  };
}
