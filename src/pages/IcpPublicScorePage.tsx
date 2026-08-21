import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";

import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { readGuestScoreCard } from "@/lib/guestActivationArtifacts";
import type { IcpScoreCard } from "@/lib/icpScoreCard";
import { buildArtifactReferralPath, trackArtifactReferralClicked } from "@/lib/artifactReferral";

/**
 * What a stranger sees when a founder shares their score.
 *
 * This page is the entry point of the referral loop, so it is built around one
 * job: make the number legible enough that the reader wants their own. It shows
 * the verdict, the idea it was passed, and the parts of the chain that prove a
 * real assessment ran - never the draft itself, which is what an account buys.
 *
 * The card is served whole by the edge function rather than recomputed here.
 * There is no draft on this page to recompute from, and the number a founder
 * posted publicly must not move afterwards.
 */

const VERDICT_STYLES: Record<IcpScoreCard["verdict"], { value: string; chip: string }> = {
  build: { value: "text-success", chip: "border-success/40 bg-success-subtle text-success" },
  narrow: { value: "text-accent-teal", chip: "border-accent-teal/40 bg-accent-teal/10 text-accent-teal" },
  investigate: { value: "text-warning", chip: "border-warning/40 bg-warning-subtle text-warning" },
  stop: { value: "text-destructive", chip: "border-destructive/40 bg-destructive-subtle text-destructive" },
};

export default function IcpPublicScorePage() {
  const { slug } = useParams<{ slug: string }>();
  const [card, setCard] = useState<IcpScoreCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!slug) {
        setLoading(false);
        return;
      }
      const result = await readGuestScoreCard(slug);
      if (!cancelled) {
        setCard(result);
        setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <Card className="rounded-2xl border-border">
          <CardContent className="flex items-center gap-3 px-6 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading this idea score...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <Card className="max-w-lg rounded-2xl border-border">
          <CardContent className="space-y-4 p-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              This idea score is no longer available.
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              The link may have expired or been replaced. You can still score your own idea in two minutes.
            </p>
            <Button asChild>
              <Link
                to={buildArtifactReferralPath("icp")}
                onClick={() => trackArtifactReferralClicked("icp", "missing_state")}
              >
                Score my idea free
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const styles = VERDICT_STYLES[card.verdict] ?? VERDICT_STYLES.investigate;

  return (
    <div className="min-h-screen bg-background px-4 py-12 sm:px-6">
      <SEO
        title={`This startup idea scored ${card.displayScore}/100 | Creatives Takeover`}
        description={`${card.idea ?? card.roleLine} · ${card.verdictLabel}. ${card.summary}`.slice(0, 155)}
        image={`https://creatives-takeover.com/api/og-icp?idea=${slug ?? ""}`}
        url={`/idea/${slug ?? ""}`}
        type="article"
      />

      <div className="mx-auto max-w-3xl">
        <section className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/40 p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
            <div className="min-w-0 flex-1">
              {card.idea ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/55">The idea</p>
                  <p className="mt-2 text-lg leading-7 text-foreground sm:text-xl sm:leading-8">{card.idea}</p>
                </>
              ) : null}

              <div className={`${card.idea ? "mt-5" : ""} flex flex-wrap items-center gap-3`}>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${styles.chip}`}
                >
                  {card.verdictLabel}
                </span>
                <span className="text-xs text-foreground/50">{card.summary}</span>
              </div>

              {card.headline ? (
                <p className="mt-4 text-xl font-semibold leading-8 text-foreground sm:text-2xl">{card.headline}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foreground/55">Viability</p>
              <p className={`text-6xl font-semibold leading-none tabular-nums sm:text-7xl ${styles.value}`}>
                {card.displayScore}
                <span className="text-2xl font-medium text-foreground/40">/100</span>
              </p>
            </div>
          </div>

          {/* Proof the chain ran, without handing over what it concluded. */}
          <dl className="mt-6 grid gap-4 border-t border-border/60 pt-5 sm:grid-cols-2">
            {card.category ? (
              <div>
                <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-foreground/50">Market</dt>
                <dd className="mt-1 text-sm leading-6 text-foreground/80">{card.category}</dd>
              </div>
            ) : null}
            {card.whoBuysToday ? (
              <div>
                <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-foreground/50">
                  Who pays today
                </dt>
                <dd className="mt-1 text-sm leading-6 text-foreground/80">{card.whoBuysToday}</dd>
              </div>
            ) : null}
            {card.competitorNames.length > 0 ? (
              <div>
                <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-foreground/50">
                  Up against
                </dt>
                <dd className="mt-1 text-sm leading-6 text-foreground/80">{card.competitorNames.join(", ")}</dd>
              </div>
            ) : null}
            {card.topRisk ? (
              <div>
                <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-foreground/50">
                  Biggest risk
                </dt>
                <dd className="mt-1 text-sm leading-6 text-foreground/80">{card.topRisk}</dd>
              </div>
            ) : null}
          </dl>

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
          </div>
        </section>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Market, competitors, customer, willingness to pay, risks and the experiment to run next. Two minutes.
          </p>
          <Link
            to={buildArtifactReferralPath("icp")}
            onClick={() => trackArtifactReferralClicked("icp", "footer")}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent-teal px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Score my idea free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
