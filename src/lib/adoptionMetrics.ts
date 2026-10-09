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
}

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
