import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "./useSubscription";
import { getMonthlyQuotaLimit, getQuotaStatus, normalizePlan } from "@/config/planPermissions";
import { useJourneyUpgradePrompt } from "@/hooks/useJourneyUpgradePrompt";

export interface AcceleratorViewTrackingResult {
  success: boolean;
  message?: string;
  requiredTier?: "starter" | "rising" | "pro";
  reason?: "limit_reached" | "auth" | "error";
}

export const useAcceleratorViewTracking = () => {
  const [viewCount, setViewCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { subscriptionData } = useSubscription();
  const { fireJourneyUpgradePrompt } = useJourneyUpgradePrompt();

  const currentTier = normalizePlan(subscriptionData?.subscription_tier);
  const quotaStatus = getQuotaStatus("accelerator_profile", currentTier, viewCount);
  const limit = quotaStatus.limit;
  const hasUnlimitedViews = quotaStatus.hasUnlimited;
  const canViewMore = quotaStatus.canUse;
  const upgradeTarget = quotaStatus.upgradeTarget;

  useEffect(() => {
    void fetchMonthlyViewCount();
  }, []);

  const fetchMonthlyViewCount = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);

      const { data, error } = await supabase.rpc("get_monthly_accelerator_view_count", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Error fetching accelerator view count:", error);
      } else {
        setViewCount(data || 0);
      }
    } catch (error) {
      console.error("Error fetching accelerator view count:", error);
    } finally {
      setLoading(false);
    }
  };

  const trackAcceleratorView = async (
    acceleratorId: string,
  ): Promise<AcceleratorViewTrackingResult> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          message: "Please sign in to view accelerator profiles",
          reason: "auth",
        };
      }

      const { data: canView, error: checkError } = await supabase.rpc(
        "can_view_accelerator",
        {
          p_user_id: user.id,
          p_tier: currentTier,
        },
      );

      if (checkError) {
        console.error("Error checking accelerator view limit:", checkError);
        throw checkError;
      }

      if (!canView && !hasUnlimitedViews) {
        if (currentTier === "rising") {
          fireJourneyUpgradePrompt("rising_quota_accelerator");
        }
        const nextLimit = upgradeTarget ? getMonthlyQuotaLimit("accelerator_profile", upgradeTarget) : Infinity;
        return {
          success: false,
          message:
            currentTier === "rookie"
              ? "Accelerator profile views are not available on the Rookie plan. Upgrade to Starter to unlock profile views."
              : currentTier === "starter"
                ? `You've used all ${limit} accelerator profile views this month. Upgrade to Rising for ${nextLimit} profile views per month.`
                : `You've used all ${limit} accelerator profile views this month. Upgrade to Pro for unlimited views.`,
          requiredTier: upgradeTarget,
          reason: "limit_reached",
        };
      }

      const { error: insertError } = await supabase.from("accelerator_views").insert({
        user_id: user.id,
        accelerator_id: acceleratorId,
        subscription_tier: currentTier,
      });

      if (insertError) {
        console.error("Error inserting accelerator view:", insertError);
        throw insertError;
      }

      setViewCount((prev) => prev + 1);

      return { success: true };
    } catch (error: unknown) {
      console.error("Error tracking accelerator view:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to track accelerator view",
        reason: "error",
      };
    }
  };

  return {
    viewCount,
    limit,
    hasUnlimitedViews,
    canViewMore,
    upgradeTarget,
    currentTier,
    trackAcceleratorView,
    loading,
    isAuthenticated,
    remaining: quotaStatus.remaining,
  };
};
