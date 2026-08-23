import type { IcpDraftDocument } from "@/lib/icpBuilderSession";
// Relative with an explicit extension, matching icpViabilityScore.ts: this
// module is loaded directly by node:test, which does not resolve the "@/"
// alias. The type-only import above is erased before resolution, so it stays.
import { computeViabilityScore } from "./icpViabilityScore.ts";
import { fieldIsReal, summarizeIcpAnswered } from "./icpFieldProvenance.ts";

/**
 * The shareable half of an assessment.
 *
 * Two separate reasons this is a distinct object rather than a view over the
 * draft:
 *
 * 1. The number has to be frozen. A share link is a claim a founder made in
 *    public ("my idea scored 78"), and recomputing it on read means an edit to
 *    the draft, a change to the weights, or a later scorer fix silently rewrites
 *    what they said. The card records what was true when they pressed share.
 *
 * 2. It has to be safe to publish. The public page fetches its snapshot from
 *    the client, so anything in that snapshot is readable by anyone with the
 *    link no matter what the UI chooses to render. Gating in the component
 *    would be theatre. This carries only fields we are content to give away,
 *    which is what lets a guest share before they have an account.
 *
 * Everything here is either the verdict itself or the context needed to make
 * the verdict mean something to a stranger. The build plan, the moat, the
 * pricing anchor, the experiment and the full interview plan are deliberately
 * absent: those are what an account buys.
 */

export interface IcpScoreCard {
  version: 1;
  /** 0 - 100, as displayed. Frozen at share time. */
  displayScore: number;
  /** The 1 - 10 internal score, kept so the two can be reconciled later. */
  rawScore: number;
  band: "strong" | "promising" | "needsWork";
  verdict: "build" | "narrow" | "investigate" | "stop";
  verdictLabel: string;
  /** One line naming the weakest driver. */
  summary: string;
  ungrounded: boolean;

  /**
   * 0 - 1. How well-evidenced the draft was, frozen alongside the score.
   *
   * The verdict is already damped by this, so publishing the score without it
   * hands a reader half the claim: 61/100 built on four answered fields and
   * 61/100 built on thirty are not the same statement. Optional because cards
   * shared before this existed cannot be back-filled, and a missing value must
   * read as "not recorded" rather than as zero.
   */
  rigor?: number;
  /** Fields the model answered, and fields it backfilled. Null before tracking. */
  answeredFields?: number;
  openQuestionCount?: number;

  /** The founder's own sentence, when we have it. */
  idea: string | null;
  personaName: string;
  roleLine: string;
  painLine: string;

  category: string | null;
  whoBuysToday: string | null;
  competitorNames: string[];
  /** Rank-1 risk only. The rest of the list is part of the gated document. */
  topRisk: string | null;

  headline: string | null;
  generatedAt: string;
}

/** Only fields the model actually answered travel onto a public card. */
function realOrNull(draft: IcpDraftDocument, path: string, value: string | undefined): string | null {
  if (!value || !value.trim()) return null;
  return fieldIsReal(draft, path) ? value.trim() : null;
}

export function buildIcpScoreCard(
  draft: IcpDraftDocument,
  options: { idea?: string | null; generatedAt?: string } = {},
): IcpScoreCard {
  const result = computeViabilityScore(draft);
  const topRisk = draft.risks?.[0];
  const answered = summarizeIcpAnswered(draft);

  return {
    version: 1,
    displayScore: result.displayScore,
    rawScore: result.score,
    band: result.band,
    verdict: result.verdict,
    verdictLabel: result.verdictLabel,
    summary: result.summary,
    ungrounded: result.ungrounded,

    rigor: result.rigor,
    answeredFields: answered?.answered,
    openQuestionCount: answered?.open,

    idea: options.idea?.trim() || null,
    personaName: draft.customer.personaName,
    roleLine: draft.customer.roleLine,
    painLine: draft.gatePreview?.painLine ?? draft.pain.quote,

    category: realOrNull(draft, "market.category", draft.market?.category),
    whoBuysToday: realOrNull(draft, "market.whoBuysToday", draft.market?.whoBuysToday),
    // Names only, never the URLs or the gap analysis: the list proves the
    // competitor check ran without handing over the finding.
    competitorNames: (draft.competition?.directCompetitors ?? [])
      .map((competitor) => competitor.name)
      .filter((name): name is string => Boolean(name && name.trim()))
      .slice(0, 5),
    topRisk: topRisk && fieldIsReal(draft, "risks.0") ? topRisk.risk : null,

    headline: realOrNull(draft, "recommendation.headline", draft.recommendation?.headline),
    generatedAt: options.generatedAt ?? new Date().toISOString(),
  };
}

/**
 * What the founder actually posts.
 *
 * X is the only one of the three networks that renders supplied text at all
 * (LinkedIn's share-offsite and Facebook's sharer both ignore it and read the
 * OG tags), so this string is the entire difference between a post that makes a
 * claim and a post that describes a document.
 *
 * It is band-aware because the interesting share is not only the good one. A
 * founder who scored 31 has a better post than one who scored 82: "here is what
 * would kill my idea" travels further than "my idea is fine", and it is the
 * honest framing of a low score rather than a consolation prize.
 *
 * Kept under ~240 characters so it survives X's limit once the ~23-character
 * URL is appended.
 */
/**
 * Below this the draft is mostly inference, which changes what the score means
 * and therefore what an honest share of it says. Matches the point at which the
 * scorer's damping term is already costing the verdict more than it grants.
 */
export const LOW_RIGOR_THRESHOLD = 0.5;

export function buildIcpShareText(card: IcpScoreCard | null): string {
  if (!card) return LEGACY_SHARE_COPY;

  const scoreLine = `${card.displayScore}/100`;

  if (card.verdict === "stop" || card.verdict === "investigate") {
    const risk = card.topRisk ? truncate(card.topRisk, 110) : null;
    return risk
      ? `I ran my startup idea through @CreativesTakeover. It scored ${scoreLine} and named what would kill it:

"${risk}"

Better to find that out now. Test yours:`
      : `I ran my startup idea through @CreativesTakeover and it scored ${scoreLine}. Market, competitors, customer, pricing and risks in two minutes. Better to find out now. Test yours:`;
  }

  /*
   * A good score on a thin draft is the most misleading post available, so it
   * is the one place the share text names the rigor explicitly. Every other
   * validator posts the number alone; the number plus the size of what is still
   * unknown is the whole claim, and it reads as confident rather than hedged.
   */
  if (typeof card.rigor === "number" && card.rigor < LOW_RIGOR_THRESHOLD && (card.openQuestionCount ?? 0) > 0) {
    return `My startup idea scored ${scoreLine} on @CreativesTakeover, and it told me I'm still guessing about ${card.openQuestionCount} things.

Most idea validators only score the pitch. This scores what you actually know.

Test yours:`;
  }

  return `My startup idea scored ${scoreLine} on @CreativesTakeover.

Market → competitors → customer → willingness to pay → risks → the experiment to run next. Two minutes.

Test yours:`;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Used for drafts shared before the score card existed. */
export const LEGACY_SHARE_COPY =
  "Just mapped my ICP using @CreativesTakeover — this is exactly who I'm building for. If you're an early-stage founder still guessing at your customer, run this. It takes 60 seconds.";

export function isIcpScoreCard(value: unknown): value is IcpScoreCard {
  if (!value || typeof value !== "object") return false;
  const card = value as Partial<IcpScoreCard>;
  return typeof card.displayScore === "number" && typeof card.verdict === "string";
}
