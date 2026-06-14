import { useCallback, useEffect, useRef, useState } from "react";
import { TrendingUp, X, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import {
  normalizePlanId,
  trackUpgradeClicked,
  trackUpgradePromptShown,
} from "@/lib/analytics";
import { normalizePlan } from "@/config/planPermissions";

const DISMISS_KEY = "show_starter_nudge_dismissed";

const readDismissedState = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DISMISS_KEY) === "true";
};

export const StarterDashboardNudge = () => {
  const { user } = useAuth();
  const { totalAvailable, subscriptionTier, loading: creditsLoading } = useCredits();
  const { createCheckout } = useSubscription();
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [dismissed, setDismissed] = useState(readDismissedState);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [primaryJourneyCardVisible, setPrimaryJourneyCardVisible] = useState(false);
  const shownTrackedRef = useRef(false);

  useEffect(() => {
    const refreshVisibility = () => {
      setPrimaryJourneyCardVisible(Boolean(document.querySelector("[data-journey-next-step-card='true']")));
    };

    const frame = window.requestAnimationFrame(refreshVisibility);
    window.addEventListener("ct:journey-next-step-visibility", refreshVisibility);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("ct:journey-next-step-visibility", refreshVisibility);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setOnboardingCompleted(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.warn("Unable to load dashboard nudge profile state", error);
        setOnboardingCompleted(false);
        return;
      }

      setOnboardingCompleted(Boolean(data?.onboarding_completed));
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const isVisible =
    normalizePlan(subscriptionTier) === "rookie" &&
    !creditsLoading &&
    onboardingCompleted &&
    totalAvailable < 20 &&
    !dismissed &&
    !primaryJourneyCardVisible;

  useEffect(() => {
    if (!isVisible || shownTrackedRef.current) return;
    shownTrackedRef.current = true;
    trackUpgradePromptShown({
      trigger: "dashboard_nudge",
      credits_remaining: totalAvailable,
      current_plan: "rookie",
      target_plan: "starter",
    });
  }, [isVisible, totalAvailable]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const handleStarterCheckout = useCallback(async () => {
    trackUpgradeClicked({
      from_plan: normalizePlanId(subscriptionTier),
      to_plan: "STARTER",
      location: "dashboard_nudge",
    });

    setIsCheckingOut(true);
    try {
      await createCheckout("starter", undefined, "monthly");
    } finally {
      setIsCheckingOut(false);
    }
  }, [createCheckout, subscriptionTier]);

  if (!isVisible) {
    return null;
  }

  return (
    <Card className="mb-6 border-2 border-info/70 bg-info/5 shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Unlock your full toolkit</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              You have {totalAvailable} credits left. Starter gives you 100 credits every month and unlocks validation tools for your next step.
            </p>
            <Button
              className="mt-4"
              onClick={() => void handleStarterCheckout()}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Upgrade - $9/mo
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="self-start rounded-full p-1 text-muted-foreground hover:bg-background/80 hover:text-foreground"
          aria-label="Dismiss Starter upgrade nudge"
        >
          <X className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  );
};

export default StarterDashboardNudge;
