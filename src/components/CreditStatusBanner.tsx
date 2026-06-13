import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCredits } from "@/hooks/useCredits";
import { useCreditGate } from "@/contexts/CreditGateContext";
import { trackUpgradePromptShown } from "@/lib/analytics";

const CreditStatusBanner = () => {
  const { totalAvailable } = useCredits();
  const {
    shouldShowSoftGate,
    resetDateShort,
    openStarterCheckout,
    isStarterCheckoutLoading,
  } = useCreditGate();
  const trackedImpressionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!shouldShowSoftGate) return;
    const impressionKey = `${totalAvailable}:${resetDateShort}`;
    if (trackedImpressionKeyRef.current === impressionKey) return;
    trackedImpressionKeyRef.current = impressionKey;
    trackUpgradePromptShown({
      trigger: "soft_gate_banner",
      credits_remaining: totalAvailable,
      current_plan: "rookie",
      target_plan: "starter",
    });
  }, [resetDateShort, shouldShowSoftGate, totalAvailable]);

  if (!shouldShowSoftGate) return null;

  return (
    <div className="sticky top-0 z-30 border-b border-warning bg-warning-subtle px-4 py-3 text-warning shadow-sm">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-sm font-medium">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-warning" />
          <span>
            You have {totalAvailable} credits left this month — resets {resetDateShort}. Upgrade to Starter for 100 credits/month.
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          className="w-full bg-warning text-white hover:bg-warning sm:w-auto"
          onClick={openStarterCheckout}
          disabled={isStarterCheckoutLoading}
        >
          {isStarterCheckoutLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Upgrade — $9/mo
        </Button>
      </div>
    </div>
  );
};

export default CreditStatusBanner;
