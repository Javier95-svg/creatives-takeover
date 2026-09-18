/**
 * Project limits mirror public.project_limit_for_plan. The database is the
 * authority and refuses anything over the limit; this copy exists so the UI can
 * say what the limit is before someone hits that refusal.
 */
export const PROJECT_LIMIT_BY_PLAN: Record<string, number> = {
  rookie: 1,
  starter: 1,
  rising: 3,
  pro: 5,
};

/** Unknown or missing plans get the most restrictive limit, as in the database. */
export function projectLimitForPlan(plan: string | null | undefined): number {
  return PROJECT_LIMIT_BY_PLAN[String(plan ?? '').trim().toLowerCase()] ?? 1;
}

/**
 * The limit trigger raises this. Postgres prefixes it, so match on the marker
 * rather than the whole string.
 */
export const PROJECT_LIMIT_ERROR = 'PROJECT_LIMIT_REACHED';

export function isProjectLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String((error as { message?: string })?.message ?? '');
  return message.includes(PROJECT_LIMIT_ERROR);
}

/** What to tell someone who just hit the limit, naming both ways out. */
export function projectLimitMessage(plan: string | null | undefined): string {
  const limit = projectLimitForPlan(plan);
  return limit === 1
    ? 'Your plan runs one project at a time. Archive it to start another, or upgrade to run several side by side.'
    : `Your plan runs ${limit} projects at a time. Archive one to start another, or upgrade for more.`;
}
