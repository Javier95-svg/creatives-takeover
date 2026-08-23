import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  FlaskConical,
  Globe2,
  ShieldQuestion,
  Target,
} from "lucide-react";

import {
  collectLabelledOpenQuestions,
  fieldIsReal,
  summarizeIcpAnswered,
} from "@/lib/icpFieldProvenance";
import {
  computeViabilityScore,
  type ViabilityBand,
  type ViabilityVerdict,
} from "@/lib/icpViabilityScore";
import type { IcpDraftDocument, IcpDraftRisk, IcpRiskType } from "@/lib/icpBuilderSession";
import type { IcpScoreCard } from "@/lib/icpScoreCard";

/**
 * The answer, above the evidence.
 *
 * The folio underneath is a good document, but it is a document: it opens on a
 * persona and asks the reader to assemble the verdict themselves. A founder who
 * typed one sentence and pressed "Assess viability" asked a yes-or-no question,
 * and the honest shape of an answer to that question is the call first and the
 * reasoning second.
 *
 * It is also the only part of the output that survives being screenshotted, so
 * the whole chain has to be legible in one screen: what market, against whom,
 * for which customer, at what price, at what risk, tested how, and therefore
 * do what. Everything below it exists to be checked, not to be read first.
 */

const VERDICT_STYLES: Record<ViabilityVerdict, { chip: string; rail: string; value: string }> = {
  build: {
    chip: "border-success/40 bg-success-subtle text-success",
    rail: "bg-success",
    value: "text-success",
  },
  narrow: {
    chip: "border-accent-teal/40 bg-accent-teal/10 text-accent-teal",
    rail: "bg-accent-teal",
    value: "text-accent-teal",
  },
  investigate: {
    chip: "border-warning/40 bg-warning-subtle text-warning",
    rail: "bg-warning",
    value: "text-warning",
  },
  stop: {
    chip: "border-destructive/40 bg-destructive-subtle text-destructive",
    rail: "bg-destructive",
    value: "text-destructive",
  },
};

const RISK_TYPE_LABELS: Record<IcpRiskType, string> = {
  demand: "Demand",
  willingness_to_pay: "Willingness to pay",
  competition: "Competition",
  channel: "Channel",
  execution: "Execution",
};

/**
 * The chain, named. Shown as completed steps rather than as navigation: the
 * value of running seven checks in two minutes is partly that the founder can
 * see all seven ran, including the ones that came back empty.
 */
const CHAIN_STEPS = [
  "Market",
  "Competitors",
  "Customer",
  "Willingness to pay",
  "Risks",
  "Experiment",
  "Recommendation",
] as const;

function ChainRibbon({ tone }: { tone: string }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2" aria-label="Validation chain">
      {CHAIN_STEPS.map((step, index) => (
        <li key={step} className="flex items-center gap-1.5">
          <span className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[0.7rem] font-medium text-foreground/70">
            {step}
          </span>
          {index < CHAIN_STEPS.length - 1 ? (
            <ArrowRight className={`h-3 w-3 shrink-0 ${tone}`} aria-hidden />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

/**
 * A panel that says what it does not know.
 *
 * Every field here can legitimately come back unanswered, and the generator
 * backfills those with readable prose. Rendered plainly that filler is
 * indistinguishable from a finding, which is exactly the failure the folio's
 * DraftValue already guards against, so the same rule applies up here.
 */
function Finding({
  draft,
  path,
  value,
  label,
}: {
  draft: IcpDraftDocument;
  path: string;
  value: string | undefined;
  label: string;
}) {
  if (!value) return null;
  const answered = fieldIsReal(draft, path);

  return (
    <div>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-foreground/50">{label}</p>
      <p className={`mt-1 text-sm leading-6 ${answered ? "text-foreground/80" : "italic text-foreground/50"}`}>
        {answered ? value : `Open question — ${value}`}
      </p>
    </div>
  );
}

function Panel({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-background/70 p-5">
      <div className="flex items-center gap-2">
        <span className="text-accent-teal" aria-hidden>
          {icon}
        </span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function RiskRow({ risk, draft, index }: { risk: IcpDraftRisk; draft: IcpDraftDocument; index: number }) {
  const answered = fieldIsReal(draft, `risks.${index}`);

  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[0.7rem] font-semibold tabular-nums text-foreground/70">
        {risk.rank}
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border/60 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-foreground/55">
            {RISK_TYPE_LABELS[risk.type]}
          </span>
        </p>
        <p className={`mt-1.5 text-sm leading-6 ${answered ? "text-foreground/85" : "italic text-foreground/55"}`}>
          {risk.risk}
        </p>
        <p className="mt-1 text-xs leading-5 text-foreground/55">
          <span className="font-semibold text-foreground/65">Settled by:</span> {risk.disprovedBy}
        </p>
      </div>
    </li>
  );
}

export interface IcpVerdictSpreadProps {
  draft: IcpDraftDocument;
  ideaDescription?: string;
  /** Rendered under the recommendation, e.g. the share bar on a public page. */
  action?: React.ReactNode;
  /**
   * Trims the spread to score, verdict and market read. Used for the public
   * score card a guest can share before they have an account.
   */
  compact?: boolean;
  /**
   * The verdict as recorded when a share link was created.
   *
   * A shared score is a public claim. Recomputing it on read means a later
   * scorer change rewrites what the founder said they scored, so a share always
   * renders its frozen card when it has one and only falls back to computing
   * for links created before the card existed.
   */
  frozenCard?: IcpScoreCard | null;
}

const BAND_LABELS: Record<ViabilityBand, string> = {
  strong: "Strong",
  promising: "Promising",
  needsWork: "Needs work",
};

/**
 * The second number.
 *
 * The verdict answers "is this idea any good". This answers "and how much do
 * you actually know", which is the half every other idea validator leaves out:
 * a confident report on four answered fields and a confident report on thirty
 * look identical once they are prose. The scorer already damps the verdict by
 * this value, so showing it is not adding a claim, it is showing the reader the
 * claim the number was already making.
 *
 * Deliberately phrased as answered-versus-open rather than as a percentage.
 * "11 of 42 answered" is checkable against the list below it; "26% rigor" is
 * another opaque score sitting next to an opaque score.
 */
function EvidenceReadout({
  rigor,
  answered,
  open,
}: {
  rigor: number | null;
  answered: number | null;
  open: number | null;
}) {
  if (rigor === null && answered === null) return null;

  const percent = rigor === null ? null : Math.round(rigor * 100);
  const tone = percent === null
    ? "text-foreground/60"
    : percent >= 60
      ? "text-success"
      : percent >= 35
        ? "text-warning"
        : "text-destructive";

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/55">Evidence</p>
      {answered !== null && open !== null ? (
        <p className={`text-sm font-semibold tabular-nums ${tone}`}>
          {answered} of {answered + open} answered
        </p>
      ) : null}
      {percent !== null ? (
        <div className="flex items-center gap-2">
          <div className="h-1 w-24 overflow-hidden rounded-full bg-foreground/10">
            <div
              className={`h-full rounded-full ${
                percent >= 60 ? "bg-success" : percent >= 35 ? "bg-warning" : "bg-destructive"
              }`}
              style={{ width: `${Math.max(percent, 2)}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-foreground/45">{percent}%</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The gaps, named.
 *
 * Every entry here is a field the generator backfilled with readable prose
 * rather than an answer. The spread already italicises those inline, but inline
 * italics are only visible to someone reading every panel; the point of the
 * count above is that it is visible to someone reading nothing, and this is
 * what makes the count checkable rather than another number to trust.
 */
function OpenQuestions({ items }: { items: Array<{ path: string; label: string }> }) {
  if (items.length === 0) return null;

  return (
    <details className="group mt-5 rounded-2xl border border-border/60 bg-background/60 p-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-foreground/80">
        <ShieldQuestion className="h-4 w-4 shrink-0 text-warning" aria-hidden />
        <span>
          Still guessing about {items.length} thing{items.length === 1 ? "" : "s"}
        </span>
        <span className="ml-auto text-xs font-normal text-foreground/45 group-open:hidden">Show</span>
        <span className="ml-auto hidden text-xs font-normal text-foreground/45 group-open:inline">Hide</span>
      </summary>
      <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.path} className="flex items-start gap-2 text-sm leading-6 text-foreground/70">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-warning" aria-hidden />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-5 text-foreground/50">
        Each one is a question the draft answered with a placeholder rather than a finding. The
        experiment above is how you close the ones that matter.
      </p>
    </details>
  );
}

export function IcpVerdictSpread({
  draft,
  ideaDescription,
  action,
  compact = false,
  frozenCard = null,
}: IcpVerdictSpreadProps) {
  const computed = useMemo(() => computeViabilityScore(draft), [draft]);
  const result = frozenCard
    ? {
        displayScore: frozenCard.displayScore,
        band: frozenCard.band,
        label: BAND_LABELS[frozenCard.band],
        verdict: frozenCard.verdict,
        verdictLabel: frozenCard.verdictLabel,
        summary: frozenCard.summary,
        ungrounded: frozenCard.ungrounded,
      }
    : computed;
  const styles = VERDICT_STYLES[result.verdict];
  const idea = (ideaDescription ?? frozenCard?.idea ?? "").trim();

  /*
   * Same rule as the score: a share is a claim someone made in public, so a
   * card that recorded its own evidence figures renders those, and only a card
   * from before they were recorded falls back to reading the draft. Otherwise a
   * later edit silently rewrites what a founder said they shared.
   */
  const answeredSummary = useMemo(() => summarizeIcpAnswered(draft), [draft]);
  const evidence = frozenCard && typeof frozenCard.rigor === "number"
    ? {
        rigor: frozenCard.rigor,
        answered: frozenCard.answeredFields ?? null,
        open: frozenCard.openQuestionCount ?? null,
      }
    : {
        rigor: computed.rigor,
        answered: answeredSummary?.answered ?? null,
        open: answeredSummary?.open ?? null,
      };
  const openQuestions = useMemo(() => collectLabelledOpenQuestions(draft), [draft]);

  const { market, pricing, risks, experiment, recommendation } = draft;
  // A draft generated before the chain existed still renders the verdict, which
  // is derived from dimensions those drafts already carry. Only the panels that
  // have no data are dropped.
  const hasChainDetail = Boolean(market || pricing || (risks && risks.length > 0) || experiment);

  return (
    <section
      data-icp-verdict-spread
      className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/40 p-6 sm:p-8"
      aria-label="Viability verdict"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
        <div className="min-w-0 flex-1">
          {idea ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">Your idea</p>
              <p className="mt-2 text-lg leading-7 text-foreground sm:text-xl sm:leading-8">{idea}</p>
            </>
          ) : null}

          <div className={`${idea ? "mt-5" : ""} flex flex-wrap items-center gap-3`}>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${styles.chip}`}
            >
              <Target className="h-4 w-4" aria-hidden />
              {result.verdictLabel}
            </span>
            <span className="text-xs text-foreground/50">{result.label} · {result.summary}</span>
          </div>

          {recommendation ? (
            <>
              <p
                className={`mt-4 text-xl font-semibold leading-8 sm:text-2xl sm:leading-9 ${
                  fieldIsReal(draft, "recommendation.headline") ? "text-foreground" : "italic text-foreground/55"
                }`}
              >
                {recommendation.headline}
              </p>
              <p className="mt-2.5 text-sm leading-6 text-foreground/70">{recommendation.reasoning}</p>
              <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-foreground/85">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-accent-teal" aria-hidden />
                <span>
                  <span className="font-semibold">Do this first:</span> {recommendation.nextMove}
                </span>
              </p>
            </>
          ) : null}
        </div>

        {/* The number, sized to be the thing a screenshot captures. */}
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/55">Viability</p>
          <p className={`text-6xl font-semibold leading-none tabular-nums sm:text-7xl ${styles.value}`}>
            {result.displayScore}
            <span className="text-2xl font-medium text-foreground/40">/100</span>
          </p>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-foreground/10">
            <div
              className={`h-full rounded-full ${styles.rail}`}
              style={{ width: `${Math.max(result.displayScore, 2)}%` }}
            />
          </div>

          {/* The two numbers sit together because neither means much alone. */}
          <div className="mt-3 border-t border-border/50 pt-3">
            <EvidenceReadout rigor={evidence.rigor} answered={evidence.answered} open={evidence.open} />
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-border/60 pt-5">
        <ChainRibbon tone="text-foreground/30" />
      </div>

      {/* Withheld on the public score card, which is the teaser, not the audit. */}
      {!compact ? <OpenQuestions items={openQuestions} /> : null}

      {!compact && hasChainDetail ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {market ? (
            <Panel icon={<Globe2 className="h-4 w-4" />} title="Market">
              <Finding draft={draft} path="market.category" value={market.category} label="Category" />
              <Finding draft={draft} path="market.whoBuysToday" value={market.whoBuysToday} label="Who pays today" />
              <Finding draft={draft} path="market.demandSignal" value={market.demandSignal} label="Demand signal" />
              <Finding draft={draft} path="market.whyNow" value={market.whyNow} label="Why now" />
            </Panel>
          ) : null}

          {pricing ? (
            <Panel icon={<Banknote className="h-4 w-4" />} title="Willingness to pay">
              <Finding draft={draft} path="pricing.hypothesis" value={pricing.hypothesis} label="Hypothesis" />
              <Finding draft={draft} path="pricing.anchor" value={pricing.anchor} label="What they pay today" />
              <Finding draft={draft} path="pricing.budgetOwner" value={pricing.budgetOwner} label="Who signs off" />
              <Finding draft={draft} path="pricing.model" value={pricing.model} label="Model" />
            </Panel>
          ) : null}

          {risks && risks.length > 0 ? (
            <Panel icon={<AlertTriangle className="h-4 w-4" />} title="What kills this">
              <ol className="space-y-3.5">
                {risks.map((risk, index) => (
                  <RiskRow key={risk.rank} risk={risk} draft={draft} index={index} />
                ))}
              </ol>
            </Panel>
          ) : null}

          {experiment ? (
            <Panel icon={<FlaskConical className="h-4 w-4" />} title="The experiment to run next">
              <div>
                <p
                  className={`text-sm font-semibold leading-6 ${
                    fieldIsReal(draft, "experiment.title") ? "text-foreground" : "italic text-foreground/55"
                  }`}
                >
                  {experiment.title}
                </p>
                <p className="mt-1 text-xs text-foreground/55">
                  {experiment.sampleSize} · {experiment.timeboxDays} day
                  {experiment.timeboxDays === 1 ? "" : "s"}
                </p>
              </div>
              <Finding draft={draft} path="experiment.method" value={experiment.method} label="Method" />
              {/* Pass and fail sit together on purpose: the point of writing
                  both down before the test is that they can be compared. */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-success/30 bg-success-subtle p-3">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-success">Pass</p>
                  <p className="mt-1 text-xs leading-5 text-foreground/75">{experiment.passSignal}</p>
                </div>
                <div className="rounded-2xl border border-destructive/30 bg-destructive-subtle p-3">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-destructive">Fail</p>
                  <p className="mt-1 text-xs leading-5 text-foreground/75">{experiment.failSignal}</p>
                </div>
              </div>
            </Panel>
          ) : null}
        </div>
      ) : null}

      {result.ungrounded ? (
        <p className="mt-5 flex items-start gap-2 rounded-2xl border border-warning/30 bg-warning-subtle p-3 text-xs leading-5 text-foreground/70">
          <ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
          <span>
            Nothing citable was retrieved for this idea, so the score is capped and the read above rests
            on inference. Treat the experiment as the first real evidence.
          </span>
        </p>
      ) : null}

      {action ? <div className="mt-6">{action}</div> : null}

      {/*
        * Attribution lives on the score box specifically, not just on the
        * document watermark below it. This box is the part that gets
        * screenshotted and shared, and a number travelling around LinkedIn
        * with nothing naming its source is a lost referral every time.
        */}
      <div className="mt-6 flex items-center gap-2 border-t border-border/50 pt-4">
        <img
          src="/lovable-uploads/04a4b9d0-4213-4186-ba00-c7acd22bad98.png"
          alt=""
          className="h-6 w-6 rounded-lg object-cover"
          draggable={false}
        />
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-foreground/45">
          Creatives Takeover
        </span>
        <span className="ml-auto text-[0.7rem] text-foreground/35">creatives-takeover.com</span>
      </div>
    </section>
  );
}

export type { ViabilityBand };
