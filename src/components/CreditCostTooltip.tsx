import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Coins } from "lucide-react";
import { getCreditCost } from "@/config/constants";
import { cn } from "@/lib/utils";

interface CreditCostTooltipProps {
  feature: string;
  children: React.ReactNode;
  className?: string;
  showIcon?: boolean;
  variant?: 'default' | 'compact' | 'inline';
}

/**
 * CreditCostTooltip - Shows credit cost for a feature in a tooltip
 * 
 * @param feature - The feature name (must match a key in CREDIT_COSTS)
 * @param children - The element to wrap with the tooltip
 * @param className - Additional CSS classes
 * @param showIcon - Whether to show an info icon
 * @param variant - Display variant: 'default' (full info), 'compact' (just cost), 'inline' (text only)
 */
export function CreditCostTooltip({ 
  feature, 
  children, 
  className,
  showIcon = true,
  variant = 'default'
}: CreditCostTooltipProps) {
  const cost = getCreditCost(feature);
  
  // If feature doesn't consume credits, don't show tooltip
  if (cost === null) {
    return <>{children}</>;
  }

  const costText = `${cost} credit${cost !== 1 ? 's' : ''}`;

  if (variant === 'inline') {
    return (
      <span className={cn("inline-flex items-center gap-1 text-muted-foreground text-sm", className)}>
        {children}
        <span className="text-xs">({costText})</span>
      </span>
    );
  }

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn("inline-flex items-center gap-1 cursor-help", className)}>
              {children}
              {showIcon && <Info className="h-3 w-3 text-muted-foreground" />}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">{costText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Default variant - full information
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center gap-1 cursor-help", className)}>
            {children}
            {showIcon && <Info className="h-3 w-3 text-muted-foreground" />}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="flex items-start gap-2">
            <Coins className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Credit Cost</p>
              <p className="text-xs text-muted-foreground">
                This action requires <span className="font-semibold text-foreground">{costText}</span>.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Your remaining balance will be shown before confirmation.
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * CreditCostBadge - Simple badge showing credit cost
 */
interface CreditCostBadgeProps {
  feature: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CreditCostBadge({ feature, className, size = 'sm' }: CreditCostBadgeProps) {
  const cost = getCreditCost(feature);
  
  if (cost === null) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-2.5 py-1.5'
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary font-medium",
        sizeClasses[size],
        className
      )}
    >
      <Coins className="h-3 w-3" />
      {cost}
    </span>
  );
}

