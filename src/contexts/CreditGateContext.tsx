import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCredits } from "@/hooks/useCredits";
import { useSubscription } from "@/hooks/useSubscription";
import { trackUpgradePromptShown } from "@/lib/analytics";
import { normalizePlan } from "@/config/planPermissions";

const TOOL_CREDIT_GATE_PATHS = [
  "/icp-builder",
  "/go-to-market",
  "/validate",
  "/decision-sprint",
  "/waitlist",
  "/insighta-test",
  "/bizmap-ai/chat",
];

type CreditGateContextValue = {
  showHardGate: () => boolean;
  shouldShowSoftGate: boolean;
  resetDateShort: string;
  resetDateLong: string;
  openStarterCheckout: () => Promise<void>;
  isStarterCheckoutLoading: boolean;
};

const CreditGateContext = createContext<CreditGateContextValue | undefined>(undefined);

const formatResetDate = (value: string | null, options: Intl.DateTimeFormatOptions, fallback: string) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-US", options).format(date);
};

const isToolCreditGateRoute = (pathname: string) => (
  TOOL_CREDIT_GATE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
);

export const CreditGateProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { totalAvailable, subscriptionTier, currentPeriodEnd } = useCredits();
  const { createCheckout } = useSubscription();
  const [hardGateOpen, setHardGateOpen] = useState(false);
  const [isStarterCheckoutLoading, setIsStarterCheckoutLoading] = useState(false);

  const currentPlan = normalizePlan(subscriptionTier);
  const isCoveredToolRoute = isToolCreditGateRoute(location.pathname);
  const shouldGateRookieCredits = isCoveredToolRoute && currentPlan === "rookie";
  const shouldShowSoftGate = shouldGateRookieCredits && totalAvailable > 0 && totalAvailable <= 20;
  const shouldHardGate = shouldGateRookieCredits && totalAvailable === 0;

  const resetDateShort = useMemo(
    () => formatResetDate(currentPeriodEnd, { month: "short", day: "numeric" }, "your reset date"),
    [currentPeriodEnd],
  );
  const resetDateLong = useMemo(
    () => formatResetDate(
      currentPeriodEnd,
      { weekday: "long", month: "long", day: "numeric" },
      "your next reset date",
    ),
    [currentPeriodEnd],
  );

  const openStarterCheckout = useCallback(async () => {
    setIsStarterCheckoutLoading(true);
    try {
      await createCheckout("starter", undefined, "monthly");
    } finally {
      setIsStarterCheckoutLoading(false);
    }
  }, [createCheckout]);

  const showHardGate = useCallback(() => {
    if (!shouldHardGate) return false;
    trackUpgradePromptShown({
      trigger: "hard_gate_modal",
      credits_remaining: 0,
      current_plan: "rookie",
      target_plan: "starter",
    });
    setHardGateOpen(true);
    return true;
  }, [shouldHardGate]);

  const value = useMemo<CreditGateContextValue>(() => ({
    showHardGate,
    shouldShowSoftGate,
    resetDateShort,
    resetDateLong,
    openStarterCheckout,
    isStarterCheckoutLoading,
  }), [
    showHardGate,
    shouldShowSoftGate,
    resetDateShort,
    resetDateLong,
    openStarterCheckout,
    isStarterCheckoutLoading,
  ]);

  return (
    <CreditGateContext.Provider value={value}>
      {children}
      <Dialog
        open={hardGateOpen}
        onOpenChange={(open) => {
          if (open) setHardGateOpen(true);
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              You've used all your credits for this month
            </DialogTitle>
            <DialogDescription>
              Your credits reset on {resetDateLong}. Upgrade to Starter now to keep building without interruption.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setHardGateOpen(false)}
            >
              Wait until {resetDateShort}
            </Button>
            <Button
              type="button"
              onClick={openStarterCheckout}
              disabled={isStarterCheckoutLoading}
            >
              {isStarterCheckoutLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upgrade to Starter — $9/mo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CreditGateContext.Provider>
  );
};

export const useCreditGate = () => {
  const context = useContext(CreditGateContext);
  if (!context) {
    throw new Error("useCreditGate must be used within CreditGateProvider");
  }
  return context;
};
