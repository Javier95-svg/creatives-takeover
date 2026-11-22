import type { IcpDraftAlternative, IcpDraftDocument, IcpValueForm } from "./icpBuilderSession.ts";

/**
 * Where an idea sits on two questions: how much people want it, and how hard it
 * is to get elsewhere.
 *
 * An idea needs both to be worth paying for. Wanted but easy to get elsewhere
 * is a commodity; hard to get but unwanted has no buyers. Founders tend to judge
 * the first and skip the second, so the draft shows them side by side.
 *
 * Derived from the viability dimensions the generator already commits to, so it
 * costs no extra model call and can never disagree with the score beside it:
 *   wanted       = mean(painSeverity, willingnessToPay)
 *   hard to find = mean(competitiveIntensity, founderEdge)
 * Presentation only. Nothing computes on it, and the score is unchanged.
 */

export type ValueQuadrant = "valuable" | "easy_to_replace" | "unwanted" | "weak";

export interface ValuePosition {
  /** 0 - 100. */
  wanted: number;
  /** 0 - 100. */
  hardToFind: number;
  quadrant: ValueQuadrant;
  label: string;
  /** What to work on next, in one sentence. */
  advice: string;
}

/** Inclusive: 50 and above counts as high on that axis. */
export const VALUE_POSITION_THRESHOLD = 50;

const QUADRANT_COPY: Record<ValueQuadrant, { label: string; advice: string }> = {
  valuable: {
    label: "Wanted and hard to get elsewhere",
    advice: "This is where the money is. Keep checking that the alternatives stay hard to use.",
  },
  easy_to_replace: {
    label: "Wanted, but easy to get elsewhere",
    advice: "People want this, but they can get it elsewhere. Work on what they could not get from anyone else.",
  },
  unwanted: {
    label: "Hard to get elsewhere, but not much wanted",
    advice: "Few others offer this, and few people seem to want it. Check demand before building more.",
  },
  weak: {
    label: "Not much wanted, and easy to get elsewhere",
    advice: "Neither half is there yet. Change who it is for or what it gives them before testing further.",
  },
};

function score(draft: IcpDraftDocument, key: keyof NonNullable<IcpDraftDocument["viabilityAssessment"]>): number {
  const raw = draft.viabilityAssessment?.[key]?.score;
  return typeof raw === "number" && Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 100) : 0;
}

export function computeValuePosition(draft: IcpDraftDocument): ValuePosition | null {
  if (!draft.viabilityAssessment) return null;
  const wanted = Math.round((score(draft, "painSeverity") + score(draft, "willingnessToPay")) / 2);
  const hardToFind = Math.round((score(draft, "competitiveIntensity") + score(draft, "founderEdge")) / 2);
  const highWanted = wanted >= VALUE_POSITION_THRESHOLD;
  const highHard = hardToFind >= VALUE_POSITION_THRESHOLD;
  const quadrant: ValueQuadrant = highWanted
    ? highHard ? "valuable" : "easy_to_replace"
    : highHard ? "unwanted" : "weak";
  return { wanted, hardToFind, quadrant, ...QUADRANT_COPY[quadrant] };
}

/**
 * What the customer gets, only when the generator actually answered it. The
 * unanswered field holds placeholder prose ("...still needs to be stated"),
 * which must never be handed to another tool as if it were the value.
 */
export function answeredWhatTheyGet(draft: IcpDraftDocument): string {
  const value = draft.build.whatTheyGet?.trim() ?? "";
  if (!value) return "";
  if (draft.fieldProvenance && draft.fieldProvenance["build.whatTheyGet"] !== "model") return "";
  return value;
}

/**
 * The alternatives a later tool has to beat, easiest first. "Do nothing" is
 * left out: it is not a product to position against, and it reads oddly in a
 * competitor list.
 */
export function alternativesToBeat(draft: IcpDraftDocument, limit = 3): IcpDraftAlternative[] {
  const order: Record<IcpDraftAlternative["ease"], number> = { easy: 0, some_effort: 1, hard: 2 };
  return (draft.alternatives ?? [])
    .filter((alternative) => alternative.kind !== "do_nothing" && alternative.option.trim().length > 0)
    .slice()
    .sort((a, b) => order[a.ease] - order[b.ease])
    .slice(0, limit);
}

export const DESIRE_FORMS: ReadonlySet<IcpValueForm> = new Set(["identity", "pleasure", "belonging", "growth"]);

export function isDesireForm(form: IcpValueForm | null | undefined): boolean {
  return Boolean(form && DESIRE_FORMS.has(form));
}

export const VALUE_FORM_LABELS: Record<IcpValueForm, string> = {
  fix: "Fixes a problem",
  protect: "Prevents a risk or worry",
  save: "Saves time, money or effort",
  identity: "Says something about who they are",
  pleasure: "Is a pleasure to use or have",
  belonging: "Gives them a group to belong to",
  growth: "Helps them grow",
};

export const ALTERNATIVE_KIND_LABELS: Record<IcpDraftAlternative["kind"], string> = {
  competitor: "Another product",
  diy: "Do it themselves",
  do_nothing: "Do nothing",
  other: "Other",
};

export const ALTERNATIVE_EASE_LABELS: Record<IcpDraftAlternative["ease"], string> = {
  easy: "Easy for them",
  some_effort: "Some effort",
  hard: "Hard for them",
};
