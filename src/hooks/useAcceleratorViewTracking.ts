import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "./useSubscription";
import { VC_VIEW_LIMITS } from "@/config/constants";

export interface AcceleratorViewTrackingResult {
  success: boolean;
  message?: string;
  requiredTier?: "rising" | "pro";
  reason?: "limit_reached" | "auth" | "error";
}

export const useAcceleratorViewTracking = () => {
  const [viewCount, setViewCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { subscriptionData } = useSubscription();

  const currentTier = subscriptionData?.subscription_tier || "rookie";
  const limit = VC_VIEW_LIMITS[currentTier as keyof typeof VC_VIEW_LIMITS] || 0;
  const hasUnlimitedViews = limit === -1;
  const canViewMore = hasUnlimitedViews || viewCount < limit;

  useEffect(() => {
    fetchMonthlyViewCount();
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
        return {
          success: false,
          message:
            currentTier === "rookie"
              ? "Accelerator profile views are not available on the Rookie plan. Upgrade to Rising to view up to 3 profiles per month."
              : `You've used all ${limit} accelerator profile views this month. Upgrade to Pro for unlimited views.`,
          requiredTier: currentTier === "rookie" ? "rising" : "pro",
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
    currentTier,
    trackAcceleratorView,
    loading,
    isAuthenticated,
    remaining: hasUnlimitedViews ? Infinity : Math.max(0, limit - viewCount),
  };
};
