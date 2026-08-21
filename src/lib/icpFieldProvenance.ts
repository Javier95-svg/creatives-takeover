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
