import { useEffect } from "react";
import { Coins, Lock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCreditActions } from "@/hooks/useCreditActions";
import { useCreditQuote } from "@/hooks/useCreditQuote";
import type { CreditFeature } from "@/config/constants";
import { PLAN_LABELS } from "@/config/planPermissions";
import { trackCreditCostDisclosed } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface CreditCostNoticeProps {
  feature: CreditFeature;
  featureName?: string;
  className?: string;
  variant?: "inline" | "panel";
  showFree?: boolean;
}

export function CreditCostNotice({
  feature,
  featureName,
  className,
  variant = "panel",
  showFree = false,
}: CreditCostNoticeProps) {
  const { getCreditActionQuote } = useCreditActions();
  const quote = getCreditActionQuote(feature, { featureName });
  const authoritativeQuote = useCreditQuote(feature, {
    source: "credit_cost_notice",
    enabled: quote.status !== "locked",
  });
  const serverQuote = authoritativeQuote.data;
  const requiredCredits = serverQuote?.cost ?? quote.requiredCredits;
  const totalAvailable = serverQuote?.available ?? quote.totalAvailable;
  const balanceAfter = serverQuote?.balanceAfter ?? Math.max(0, totalAvailable - requiredCredits);
  const isFree = quote.status !== "locked" && requiredCredits === 0;

  useEffect(() => {
    trackCreditCostDisclosed({
      feature_key: quote.feature,
      credit_cost: requiredCredits,
      current_plan: quote.currentTier,
      credits_available: totalAvailable,
      status: isFree ? "free" : quote.status,
      source_tool: quote.featureName,
    });
  }, [isFree, quote.currentTier, quote.feature, quote.featureName, quote.status, requiredCredits, totalAvailable]);

  if (isFree && !showFree) {
    return null;
  }

  const icon = quote.status === "locked"
    ? <Lock className="h-3.5 w-3.5" />
    : isFree
    ? <Sparkles className="h-3.5 w-3.5" />
    : <Coins className="h-3.5 w-3.5" />;

  const copy = quote.status === "locked"
    ? `Unlock with ${PLAN_LABELS[quote.requiredTier ?? "pro"]}`
    : isFree
    ? "Free on your plan"
    : serverQuote
    ? `Costs ${requiredCredits} credits · ${balanceAfter} after this action${serverQuote.affordable ? "" : ` · ${serverQuote.recommendedPurchase === "top_up" ? "Top-up recommended" : "Plan recommended"}`}`
    : `Costs ${requiredCredits} credits · ${totalAvailable} available`;

  if (variant === "inline") {
    return (
      <Badge variant={quote.status === "locked" ? "outline" : "secondary"} className={cn("gap-1", className)}>
        {icon}
        {copy}
      </Badge>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border/60 bg-muted/45 px-3 py-2 text-sm text-muted-foreground",
        quote.status === "locked" && "border-warning/30 bg-warning/10 text-warning dark:text-warning",
        className
      )}
    >
      {icon}
      <span>{copy}</span>
    </div>
  );
}
