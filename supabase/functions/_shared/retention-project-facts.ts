import { cleanFact } from "./email-voice.ts";

// What we know for sure about a founder's project, read fresh from the
// database at send time. Every field is optional: each lookup is isolated so
// a missing table or row drops that one fact instead of failing the email.
// Values are cleaned and truncated here, once, before any template or model
// sees them.

type Database = { from: (table: string) => any };

export interface ProjectFacts {
  firstName: string;
  projectTitle: string | null;
  ideaSummary: string | null;
  customer: string | null;
  gtmPlanTitle: string | null;
  routineGoal: string | null;
  routineHabit: string | null;
  todayTask: string | null;
  daysAway: number | null;
}

export const EMPTY_FACTS: ProjectFacts = {
  firstName: "there",
  projectTitle: null,
  ideaSummary: null,
  customer: null,
  gtmPlanTitle: null,
  routineGoal: null,
  routineHabit: null,
  todayTask: null,
  daysAway: null,
};

// Phrases that fit "your routine to ...", keyed by profiles.routine_primary_goal.
const ROUTINE_GOAL_PHRASES: Record<string, string> = {
  validate_idea: "validate your idea",
  find_cofounders: "find a cofounder",
  grow_audience: "grow your audience",
  launch_product: "launch your product",
  raise_funding: "raise funding",
};

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function firstNameFrom(fullName: string | null | undefined, email?: string | null): string {
  const raw = cleanFact(fullName, 60) ?? cleanFact(email?.split("@")[0], 60);
  const first = raw?.split(/\s+/)[0]?.replace(/[^\p{L}'.]/gu, "");
  if (!first || first.length < 2) return "there";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function routineGoalPhrase(goal: unknown): string | null {
  return typeof goal === "string" ? ROUTINE_GOAL_PHRASES[goal] ?? null : null;
}

/** The first active routine task, preferring one scheduled for today. */
export function pickRoutineHabit(config: unknown, now = new Date()): string | null {
  const tasks = Array.isArray(record(config).tasks) ? record(config).tasks as unknown[] : [];
  const active = tasks
    .map(record)
    .filter((task) => task.active !== false && typeof task.title === "string")
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
  const today = active.find((task) => Array.isArray(task.days) && (task.days as unknown[]).includes(now.getUTCDay()));
  return cleanFact((today ?? active[0])?.title, 70);
}

function daysSince(values: unknown[], now: number): number | null {
  const times = values
    .map((value) => typeof value === "string" ? Date.parse(value) : NaN)
    .filter((time) => Number.isFinite(time) && time <= now);
  if (!times.length) return null;
  return Math.floor((now - Math.max(...times)) / 86_400_000);
}

async function safe<T>(label: string, run: () => Promise<{ data: T | null; error: unknown }>): Promise<T | null> {
  try {
    const { data, error } = await run();
    if (error) {
      console.warn(`retention-project-facts: ${label} unavailable`, error);
      return null;
    }
    return data;
  } catch (error) {
    console.warn(`retention-project-facts: ${label} failed`, error);
    return null;
  }
}

export async function loadProjectFacts(
  db: Database,
  userId: string,
  fallbackName?: { fullName?: string | null; email?: string | null },
  now = Date.now(),
): Promise<ProjectFacts> {
  const [profile, project, icp, gtm, task] = await Promise.all([
    safe<Record<string, unknown>>("profile", () =>
      db.from("profiles")
        .select("full_name,routine_primary_goal,routine_config,last_seen_at,last_activity_at,last_active_at")
        .eq("id", userId).maybeSingle()),
    safe<Record<string, unknown>>("project", () =>
      db.from("projects").select("title,idea_summary,status")
        .eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle()),
    safe<Record<string, unknown>>("icp", () =>
      db.from("icp_analysis_results").select("target_audience,business_description")
        .eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle()),
    safe<Record<string, unknown>>("gtm", () =>
      db.from("gtm_plans").select("plan_title")
        .eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle()),
    safe<Record<string, unknown>>("task", () =>
      db.from("daily_tasks").select("task_text")
        .eq("user_id", userId).is("completed_at", null).is("dismissed_at", null)
        .order("created_at", { ascending: false }).limit(1).maybeSingle()),
  ]);

  const p = record(profile);
  return {
    firstName: firstNameFrom((p.full_name as string | null) ?? fallbackName?.fullName, fallbackName?.email),
    projectTitle: cleanFact(record(project).title, 60),
    ideaSummary: cleanFact(record(project).idea_summary, 140),
    customer: cleanFact(record(icp).target_audience, 90) ?? cleanFact(record(icp).business_description, 90),
    gtmPlanTitle: cleanFact(record(gtm).plan_title, 60),
    routineGoal: routineGoalPhrase(p.routine_primary_goal),
    routineHabit: pickRoutineHabit(p.routine_config, new Date(now)),
    todayTask: cleanFact(record(task).task_text, 90),
    daysAway: daysSince([p.last_seen_at, p.last_activity_at, p.last_active_at], now),
  };
}

/** Names of the facts that were present, for logging without the contents. */
export function factKeys(facts: ProjectFacts): string[] {
  return (Object.keys(facts) as Array<keyof ProjectFacts>)
    .filter((key) => key !== "firstName" && facts[key] !== null);
}
