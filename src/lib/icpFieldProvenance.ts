import type { IcpDraftDocument } from "@/lib/icpBuilderSession";

/**
 * Did the model actually answer this field, or did the generator backfill it?
 *
 * `normalizeDraftDocument` fills every unanswered field with readable prose
 * ("The cost of leaving this pain unsolved still needs to be made explicit").
 * That made a gap indistinguishable from an answer to anything downstream:
 * scoring credited the filler as a filled field, and the outcome contract's
 * quality checks passed on it, so both were measuring string presence rather
 * than content. The generator now records which is which in `fieldProvenance`.
 *
 * Kept dependency-free so node:test can load it.
 */

/**
 * Backfill sentences as of the release that introduced provenance tracking.
 *
 * This is a FROZEN HISTORICAL SNAPSHOT, not a mirror to keep in sync. It exists
 * only to classify drafts generated before `fieldProvenance` was written, and
 * those drafts contain exactly these strings forever. If the generator's
 * fallback wording changes later, do not update this list: newer drafts carry
 * their own provenance map and never reach this path.
 */
export const ICP_LEGACY_FALLBACK_STRINGS: ReadonlySet<string> = new Set([
  "The best-fit early customer still needs to be narrowed.",
  "Adjacent customers without the same urgent trigger are not the first segment to serve.",
  "The primary pain still needs direct customer language.",
  "Secondary pain 2 still needs interview evidence.",
  "Secondary pain 3 still needs interview evidence.",
  "The buying trigger still needs validation.",
  "The current manual or competing alternative still needs to be named in interviews.",
  "Tell me about the last time this problem happened.",
  "What did you do instead, and what did that cost?",
  "What made the problem urgent enough to act on?",
  "Where would you look for a solution like this?",
  "What proof would make you try or pay for a first version?",
  "Ideal customer",
  "Founder-aligned buyer",
  "The customer profile still needs a more specific description.",
  "The trigger context still needs clearer founder evidence.",
  "The specific buying trigger still needs to be clarified.",
  "The founder still needs to name one pain sharp enough to build around.",
  "The root cause still needs a sharper explanation.",
  "The consequence of this pain still needs clearer detail.",
  "The trigger moment still needs a clearer founder example.",
  "The cost of leaving this pain unsolved still needs to be made explicit.",
  "The first product promise still needs to be made more concrete.",
  "The immediate customer outcome still needs a sharper articulation.",
  "The founder advantage still needs a clearer niche-specific explanation.",
  "The source of the advantage is not yet explicit enough.",
  "Why this advantage is hard to copy still needs stronger proof.",
  "The incumbent gap still needs to be stated more sharply.",
  "The competitive landscape still needs more signal before it can be stated confidently.",
  "The exploitable competitive gap still needs clearer founder or market evidence.",
]);

/** Read a dotted path off the draft without pulling in a utility library. */
function readPath(draft: IcpDraftDocument, path: string): unknown {
  return path.split(".").reduce<unknown>((value, segment) => {
    if (value === null || value === undefined) return undefined;
    if (Array.isArray(value)) return value[Number(segment)];
    if (typeof value === "object") return (value as Record<string, unknown>)[segment];
    return undefined;
  }, draft);
}

/**
 * True when the field holds a real answer.
 *
 * Prefers the recorded provenance. Falls back to matching the frozen backfill
 * strings so drafts saved before this existed still classify correctly rather
 * than all reading as answered, which is what produced the constant pillars.
 */
export function fieldIsReal(draft: IcpDraftDocument, path: string): boolean {
  const recorded = draft.fieldProvenance?.[path];
  if (recorded) return recorded === "model";

  const value = readPath(draft, path);
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return !ICP_LEGACY_FALLBACK_STRINGS.has(trimmed);
}

/**
 * The ranked-pains list is always padded to three entries so the layout stays
 * stable, which is why counting its length was a check that could never fail.
 */
export function rankedPainIsReal(draft: IcpDraftDocument, index: number): boolean {
  const recorded = draft.fieldProvenance?.[`decisionBrief.rankedPains.${index}`];
  if (recorded) return recorded === "model";

  const pain = draft.decisionBrief?.rankedPains?.[index]?.pain;
  if (typeof pain !== "string") return false;
  const trimmed = pain.trim();
  if (!trimmed) return false;
  return !ICP_LEGACY_FALLBACK_STRINGS.has(trimmed);
}

/** Every open question the draft is carrying, for the validation queue. */
export function collectOpenQuestions(draft: IcpDraftDocument): string[] {
  const fromProvenance = Object.entries(draft.fieldProvenance ?? {})
    .filter(([, provenance]) => provenance === "fallback")
    .map(([path]) => path);
  return Array.from(new Set([...fromProvenance]));
}

/**
 * What each tracked path is called when a founder reads it.
 *
 * `collectOpenQuestions` returns the generator's dotted paths, which are the
 * right key to store and the wrong string to show anyone. The labels are
 * phrased as the thing that is still unknown rather than as a field name,
 * because the list is read as a to-do ("you still have to find out who signs
 * off"), not as a schema.
 *
 * Paths the generator stopped tracking keep their entry: an old draft still
 * carries them, and an unlabelled path falls back to a readable form of the
 * path itself rather than disappearing from the count.
 */
export const ICP_FIELD_LABELS: Readonly<Record<string, string>> = {
  "customer.personaName": "What to call this customer",
  "customer.roleLine": "The buyer's role and context",
  "customer.summary": "Who this customer actually is",
  "customer.triggerContext": "The situation they are in when they act",
  "customer.actionTrigger": "What makes them start looking",

  "pain.quote": "The pain in the customer's own words",
  "pain.rootCause": "What actually causes the pain",
  "pain.whyItHurts": "Why the pain is worth paying to remove",
  "pain.triggerMoment": "The moment the pain becomes urgent",
  "pain.costOfInaction": "What it costs them to do nothing",

  "decisionBrief.primarySegment": "The one segment to serve first",
  "decisionBrief.nonFitSegment": "The segment to deliberately not serve",
  "decisionBrief.buyingTrigger": "The event that makes them buy",
  "decisionBrief.currentAlternative": "What they use instead today",

  "build.valueProposition": "The promise the product makes",
  "build.outcome": "The outcome the customer gets",

  "moat.edge": "The founder's unfair advantage",
  "moat.edgeSource": "Where that advantage comes from",
  "moat.whyHardToCopy": "Why it is hard to copy",
  "moat.incumbentGap": "The gap incumbents leave open",

  "competition.summary": "Who else is solving this",
  "competition.exploitableGap": "The gap worth attacking",

  "market.category": "The category this competes in",
  "market.whoBuysToday": "Who already pays for this",
  "market.demandSignal": "Evidence that demand exists",
  "market.whyNow": "Why this is possible now",

  "pricing.hypothesis": "What to charge",
  "pricing.anchor": "What they pay for this today",
  "pricing.budgetOwner": "Who signs off on the spend",
  "pricing.model": "How the pricing is structured",

  "experiment.hypothesis": "What the next test is trying to prove",
  "experiment.title": "The next test to run",
  "experiment.method": "How to run that test",
  "experiment.sampleSize": "How many people the test needs",
  "experiment.passSignal": "What counts as a pass",
  "experiment.failSignal": "What counts as a fail",

  "recommendation.headline": "The call on this idea",
  "recommendation.reasoning": "Why that is the call",
  "recommendation.nextMove": "The first move to make",
};

/** Indexed paths are generated, so they are labelled by prefix rather than listed. */
const INDEXED_FIELD_LABELS: ReadonlyArray<[prefix: string, label: (position: number) => string]> = [
  ["decisionBrief.rankedPains.", (position) => `Customer pain #${position}`],
  ["decisionBrief.interviewValidationPlan.", (position) => `Interview question #${position}`],
  ["risks.", (position) => `Risk #${position}`],
];

/**
 * Turn a tracked path into something a founder can read.
 *
 * Never returns an empty string. An unmapped path is a labelling gap, not a
 * reason to drop a genuine unknown out of the list.
 */
export function labelForIcpField(path: string): string {
  const exact = ICP_FIELD_LABELS[path];
  if (exact) return exact;

  for (const [prefix, label] of INDEXED_FIELD_LABELS) {
    if (!path.startsWith(prefix)) continue;
    const index = Number(path.slice(prefix.length));
    if (Number.isInteger(index) && index >= 0) return label(index + 1);
  }

  // "pain.costOfInaction" -> "Pain cost of inaction". Ugly, but honest and rare.
  return path
    .split(".")
    .flatMap((segment) => segment.replace(/([a-z0-9])([A-Z])/g, "$1 $2").split(" "))
    .filter(Boolean)
    .map((word) => word.toLowerCase())
    .join(" ")
    .replace(/^./, (character) => character.toUpperCase());
}

export interface IcpOpenQuestion {
  path: string;
  label: string;
}

/**
 * The open questions, labelled and ordered for display.
 *
 * Ordered by the label map's own key order rather than by the provenance
 * object's insertion order, so two drafts with the same gaps list them the
 * same way. Unmapped paths sort last.
 */
export function collectLabelledOpenQuestions(draft: IcpDraftDocument): IcpOpenQuestion[] {
  const order = Object.keys(ICP_FIELD_LABELS);
  const rank = (path: string) => {
    const index = order.indexOf(path);
    return index === -1 ? order.length : index;
  };

  return collectOpenQuestions(draft)
    .map((path) => ({ path, label: labelForIcpField(path) }))
    .sort((left, right) => rank(left.path) - rank(right.path) || left.path.localeCompare(right.path));
}

/**
 * How much of the draft is answered rather than backfilled.
 *
 * Separate from the scorer's `rigor`, which weights three pillars and feeds the
 * verdict. This is the plain count behind it, so the interface can say "11 of
 * 42 answered" next to a number the founder would otherwise have to take on
 * faith. Returns nulls rather than zeros for a draft that predates provenance
 * tracking: no data is not the same claim as nothing answered.
 */
export function summarizeIcpAnswered(draft: IcpDraftDocument): {
  answered: number;
  open: number;
  tracked: number;
} | null {
  const entries = Object.entries(draft.fieldProvenance ?? {});
  if (entries.length === 0) return null;

  const open = entries.filter(([, provenance]) => provenance === "fallback").length;
  return { answered: entries.length - open, open, tracked: entries.length };
}
