import { useEffect } from "react";
import { Coins, Lock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCreditActions } from "@/hooks/useCreditActions";
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

  useEffect(() => {
    trackCreditCostDisclosed({
      feature_key: quote.feature,
      credit_cost: quote.requiredCredits,
      current_plan: quote.currentTier,
      credits_available: quote.totalAvailable,
      status: quote.status,
      source_tool: quote.featureName,
    });
  }, [quote.currentTier, quote.feature, quote.featureName, quote.requiredCredits, quote.status, quote.totalAvailable]);

  if (quote.status === "free" && !showFree) {
    return null;
  }

  const icon = quote.status === "locked"
    ? <Lock className="h-3.5 w-3.5" />
    : quote.status === "free"
    ? <Sparkles className="h-3.5 w-3.5" />
    : <Coins className="h-3.5 w-3.5" />;

  const copy = quote.status === "locked"
    ? `Unlock with ${PLAN_LABELS[quote.requiredTier ?? "pro"]}`
    : quote.status === "free"
    ? "Free on your plan"
    : `Costs ${quote.requiredCredits} credits - You have ${quote.totalAvailable} remaining`;

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
        quote.status === "locked" && "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100",
        className
      )}
    >
      {icon}
      <span>{copy}</span>
    </div>
  );
}
