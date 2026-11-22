/**
 * Wanting something is half of value; the other half is not being able to get
 * it easily elsewhere. PMF Lab's rubric measures the first half (pain, urgency,
 * consistency, demand). This measures the second from what interviewees said
 * they would use instead, and gates "Build" on it deterministically, the same
 * way the evidence ladder gates it on sample size.
 */

export type AlternativeEase = "easy" | "some_effort" | "hard" | "none";

export interface AlternativeEvidence {
  intervieweeName?: string;
  currentAlternative?: string | null;
  alternativeEase?: AlternativeEase | string | null;
}

export interface ScarcityCheck {
  /** Interviews where the founder recorded how easy the alternative is. */
  recorded: number;
  /** Interviews where the alternative is hard to use, or nothing as good exists. */
  hardToReplace: number;
  /** Interviews where the alternative is easy. */
  easyToReplace: number;
  /** The easy alternatives people named, most frequent first. */
  easyAlternatives: string[];
  /** True when at least `required` interviewees could not easily get this elsewhere. */
  passed: boolean;
  required: number;
}

export const HARD_TO_REPLACE_REQUIRED = 3;

const EASE = new Set(["easy", "some_effort", "hard", "none"]);

export function assessAlternativeScarcity(
  interviews: AlternativeEvidence[],
  required = HARD_TO_REPLACE_REQUIRED,
): ScarcityCheck {
  const recorded = interviews.filter((item) => typeof item.alternativeEase === "string" && EASE.has(item.alternativeEase));
  const hardToReplace = recorded.filter((item) => item.alternativeEase === "hard" || item.alternativeEase === "none").length;
  const easy = recorded.filter((item) => item.alternativeEase === "easy");
  const counts = new Map<string, { label: string; count: number }>();
  for (const item of easy) {
    const label = (item.currentAlternative ?? "").trim();
    if (!label) continue;
    const key = label.toLowerCase();
    const entry = counts.get(key) ?? { label, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return {
    recorded: recorded.length,
    hardToReplace,
    easyToReplace: easy.length,
    easyAlternatives: [...counts.values()].sort((a, b) => b.count - a.count).map((entry) => entry.label).slice(0, 3),
    passed: hardToReplace >= required,
    required,
  };
}

/**
 * "Build" needs buyers who cannot easily get this elsewhere. Without them the
 * honest call is to narrow to the people who cannot, so a would-be "Build" is
 * held at "Narrow". Other decisions are left alone.
 */
export function applyScarcityGate<D extends string>(decision: D, check: ScarcityCheck): D | "narrow" {
  return decision === "build" && !check.passed ? "narrow" : decision;
}

/** One sentence for the report explaining the gate, or null when it did not apply. */
export function describeScarcityGate(check: ScarcityCheck): string {
  if (check.passed) {
    return `${check.hardToReplace} interviewee${check.hardToReplace === 1 ? "" : "s"} could not easily get this elsewhere, which clears the bar of ${check.required}.`;
  }
  if (check.recorded === 0) {
    return `No interview records what people would use instead. Build needs at least ${check.required} interviewees who could not easily get this elsewhere.`;
  }
  const named = check.easyAlternatives.length > 0 ? ` They named easy options such as ${check.easyAlternatives.join(", ")}.` : "";
  return `Only ${check.hardToReplace} of ${check.recorded} interviewees could not easily get this elsewhere; Build needs ${check.required}.${named} Narrow to the people for whom the alternatives fall short.`;
}
