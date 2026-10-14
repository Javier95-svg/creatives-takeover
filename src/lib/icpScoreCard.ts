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

/** Retained for consumers that distinguish sparse assessments. */
export const LOW_RIGOR_THRESHOLD = 0.5;
export const ICP_TEST_YOURS_URL = "https://creatives-takeover.com";

/** The founder's own description, rather than promotional copy about the tool. */
export function buildIcpShareText(card: IcpScoreCard | null): string {
  if (!card) return LEGACY_SHARE_COPY;
  const uncertainty = typeof card.rigor === "number" && card.rigor < LOW_RIGOR_THRESHOLD && (card.openQuestionCount ?? 0) > 0
    ? `, and I'm still guessing about ${card.openQuestionCount} things`
    : "";
  return [
    `My startup idea scored ${card.displayScore}/100 on @Creatives_Rule${uncertainty}.`,
    card.idea?.trim(),
    `Test yours: ${ICP_TEST_YOURS_URL}`,
  ].filter(Boolean).join("\n\n");
}

/** The homepage is already in the text; do not append a score permalink. */
export function buildIcpXShareUrl(card: IcpScoreCard | null): string {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(buildIcpShareText(card))}`;
}

/** Older cards may have no original description or recorded score. */
export const LEGACY_SHARE_COPY = `I mapped my ideal customer on @Creatives_Rule.\n\nTest yours: ${ICP_TEST_YOURS_URL}`;

export function isIcpScoreCard(value: unknown): value is IcpScoreCard {
  if (!value || typeof value !== "object") return false;
  const card = value as Partial<IcpScoreCard>;
  return typeof card.displayScore === "number" && typeof card.verdict === "string";
}
