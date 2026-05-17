import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Compass, Eye, Loader2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { normalizePlan, PLAN_LABELS } from "@/config/planPermissions";
import { useMonthlyQuotas } from "@/hooks/useMonthlyQuotas";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import {
  buildJourneyRecommendation,
  PLAN_JOURNEY_PROMISES,
  type JourneyRecommendationSignal,
} from "@/lib/journeyUpgradeCatalog";
import {
  trackJourneyRecommendationClicked,
  trackJourneyRecommendationShown,
} from "@/lib/analytics";

const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const emptySignal: JourneyRecommendationSignal = {
  hasIcp: false,
  hasWaitlist: false,
  hasPmf: false,
  hasMvp: false,
  hasTechStack: false,
  hasGtm: false,
  hasPitchDeck: false,
  investorPressure: false,
};

function getDismissKey(userId: string, recommendationId: string) {
  return `ct_journey_next_step:${userId}:${recommendationId}`;
}

function isDismissed(userId: string, recommendationId: string) {
  try {
    const raw = window.localStorage.getItem(getDismissKey(userId, recommendationId));
    return Boolean(raw) && Date.now() - Number(raw) < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

async function hasAnyRecord(table: string, userId: string, orderColumn = "created_at") {
  const { data, error } = await supabase
    .from(table as any)
    .select("id")
    .eq("user_id", userId)
    .order(orderColumn, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn(`Unable to read ${table} for journey recommendation`, error);
    return false;
  }

  return Boolean(data);
}

export function JourneyNextStepCard() {
  const { user } = useAuth();
  const { subscriptionData, createCheckout } = useSubscription();
  const { quotas } = useMonthlyQuotas();
  const [signal, setSignal] = useState<JourneyRecommendationSignal>(emptySignal);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const shownRef = useRef<string | null>(null);

  const currentPlan = normalizePlan(subscriptionData?.subscription_tier);
  const effectiveSignal = useMemo<JourneyRecommendationSignal>(() => ({
    ...signal,
    investorPressure:
      signal.investorPressure ||
      (currentPlan === "rising" && (quotas.vc_profiles_viewed >= 8 || quotas.accelerator_profiles_viewed >= 8)),
  }), [currentPlan, quotas.accelerator_profiles_viewed, quotas.vc_profiles_viewed, signal]);
  const recommendation = useMemo(
    () => buildJourneyRecommendation(currentPlan, effectiveSignal),
    [currentPlan, effectiveSignal]
  );

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const [
        hasIcp,
        hasWaitlist,
        hasPmfAnalysis,
        hasPmfEvidence,
        hasMvp,
        hasTechStack,
        hasGtm,
        hasPitchDeck,
      ] = await Promise.all([
        hasAnyRecord("icp_analysis_results", user.id, "updated_at"),
        hasAnyRecord("waitlist_pages", user.id, "updated_at"),
        hasAnyRecord("pmf_analysis_results", user.id, "created_at"),
        hasAnyRecord("pmf_validation_evidence", user.id, "updated_at"),
        hasAnyRecord("mvp_builder_artifacts", user.id, "updated_at"),
        hasAnyRecord("tech_stack_reports", user.id, "updated_at"),
        hasAnyRecord("gtm_plans", user.id, "updated_at"),
        hasAnyRecord("pitch_deck_analyses", user.id, "created_at"),
      ]);

      if (cancelled) return;

      setSignal({
        hasIcp,
        hasWaitlist,
        hasPmf: hasPmfAnalysis || hasPmfEvidence,
        hasMvp,
        hasTechStack,
        hasGtm,
        hasPitchDeck,
        investorPressure: hasPitchDeck,
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    setDismissed(isDismissed(user.id, recommendation.id));
  }, [recommendation.id, user?.id]);

  const isVisible = Boolean(user?.id) && !loading && !dismissed;

  useEffect(() => {
    if (!isVisible || shownRef.current === recommendation.id) return;
    shownRef.current = recommendation.id;
    trackJourneyRecommendationShown({
      recommendation_id: recommendation.id,
      current_plan: currentPlan,
      target_plan: recommendation.targetPlan,
      stage: recommendation.tool.stage,
      tool_name: recommendation.tool.toolName,
      is_locked: recommendation.isLocked,
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  }, [currentPlan, isVisible, recommendation]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("ct:journey-next-step-visibility", {
      detail: { visible: isVisible },
    }));
  }, [isVisible]);

  const dismiss = useCallback(() => {
    if (!user?.id) return;
    try {
      window.localStorage.setItem(getDismissKey(user.id, recommendation.id), String(Date.now()));
    } catch {
      // localStorage can be unavailable in private contexts.
    }
    setDismissed(true);
    window.dispatchEvent(new CustomEvent("ct:journey-next-step-visibility", {
      detail: { visible: false },
    }));
  }, [recommendation.id, user?.id]);

  const trackClick = useCallback(
    (destination: "tool_preview" | "plan") => {
      trackJourneyRecommendationClicked({
        recommendation_id: recommendation.id,
        current_plan: currentPlan,
        target_plan: recommendation.targetPlan,
        stage: recommendation.tool.stage,
        tool_name: recommendation.tool.toolName,
        destination,
        is_locked: recommendation.isLocked,
        route: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
    },
    [currentPlan, recommendation],
  );

  const handlePlanClick = useCallback(async () => {
    if (!recommendation.targetPlan) return;
    trackClick("plan");
    setCheckingOut(true);
    try {
      await createCheckout(recommendation.targetPlan, undefined, "monthly");
    } finally {
      setCheckingOut(false);
    }
  }, [createCheckout, recommendation.targetPlan, trackClick]);

  if (!isVisible) return null;

  const currentPlanLabel = PLAN_LABELS[currentPlan];

  return (
    <Card data-journey-next-step-card="true" className="mb-6 border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card shadow-sm">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Compass className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full">
                  {currentPlanLabel}: {PLAN_JOURNEY_PROMISES[currentPlan]}
                </Badge>
                {recommendation.targetPlan ? (
                  <Badge variant="secondary" className="rounded-full">
                    Next layer: {PLAN_LABELS[recommendation.targetPlan]}
                  </Badge>
                ) : null}
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">{recommendation.headline}</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {recommendation.description}
                </p>
              </div>
              <p className="rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm text-muted-foreground">
                {recommendation.tool.proofCopy}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            <Button asChild variant={recommendation.isLocked ? "outline" : "default"}>
              <Link to={recommendation.tool.route} onClick={() => trackClick("tool_preview")}>
                {recommendation.isLocked ? <Eye className="mr-2 h-4 w-4" /> : null}
                {recommendation.primaryLabel}
              </Link>
            </Button>
            {recommendation.targetPlan ? (
              <Button variant="ghost" onClick={() => void handlePlanClick()} disabled={checkingOut}>
                {checkingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {recommendation.secondaryLabel}
                {!checkingOut ? <ArrowRight className="ml-1 h-3.5 w-3.5" /> : null}
              </Button>
            ) : null}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
              aria-label="Dismiss recommendation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default JourneyNextStepCard;
