import { FOUNDER_TOOL_CATALOG } from '../config/founderToolCatalog.ts';

/**
 * Shapes and helpers for the admin Adoption page. The numbers come from
 * admin_adoption_metrics(), which reads first-party data only: tool activity
 * recorded for signed-in users and the results each tool saves.
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

export interface AdoptionTool {
  tool: string;
  opened30d: number;
  started30d: number;
  withResult30d: number;
  results30d: number;
  withResultEver: number;
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
  tools: AdoptionTool[];
  cohorts: AdoptionCohort[];
}

const EXTRA_TOOL_LABELS: Record<string, string> = {
  insighta_research: 'Insighta saved research',
};

export function toolLabel(key: string): string {
  return FOUNDER_TOOL_CATALOG.find((tool) => tool.key === key)?.name ?? EXTRA_TOOL_LABELS[key] ?? key.replace(/_/g, ' ');
}

/** "2 of 6 (33%)", or "n/a" when there is nothing to divide by. */
export function share(part: number | null | undefined, whole: number | null | undefined): string {
  if (part == null || !whole) return 'n/a';
  return `${part} of ${whole} (${Math.round((part / whole) * 100)}%)`;
}

/** Tools ordered by how many accounts got a result, then by reach. */
export function rankTools(tools: AdoptionTool[]): AdoptionTool[] {
  return [...tools].sort((a, b) =>
    b.withResult30d - a.withResult30d
    || b.opened30d - a.opened30d
    || b.withResultEver - a.withResultEver
    || toolLabel(a.tool).localeCompare(toolLabel(b.tool)));
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
