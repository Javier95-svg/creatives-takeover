import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from './useSubscription';
import {
  getMonthlyQuotaLimit,
  getQuotaStatus,
  normalizePlan,
  PLAN_LABELS,
  type Plan,
} from '@/config/planPermissions';
import { useJourneyUpgradePrompt } from '@/hooks/useJourneyUpgradePrompt';

export interface DirectoryViewTrackingResult {
  success: boolean;
  message?: string;
  requiredTier?: Plan;
  reason?: 'limit_reached' | 'auth' | 'error';
}

export interface DirectoryViewContext {
  planId?: string | null;
  playId?: string | null;
}

/**
 * Monthly quota metering for the Directories tool, mirroring useVCViewTracking.
 * Every plan can open a few directories per month (Rookie 3 / Starter 10 /
 * Rising 15 / Pro unlimited — see MONTHLY_FREE_QUOTAS.directory_visits); opens
 * are recorded in directory_views and counted per calendar month.
 */
export const useDirectoryViewTracking = () => {
  const [viewCount, setViewCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { subscriptionData } = useSubscription();
  const { fireJourneyUpgradePrompt } = useJourneyUpgradePrompt();

  const currentTier = normalizePlan(subscriptionData?.subscription_tier);
  const quotaStatus = getQuotaStatus('directories', currentTier, viewCount);
  const limit = quotaStatus.limit;
  const hasUnlimited = quotaStatus.hasUnlimited;
  const canViewMore = quotaStatus.canUse;
  const upgradeTarget = quotaStatus.upgradeTarget;
  const remaining = quotaStatus.remaining;

  const fetchMonthlyViewCount = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      setIsAuthenticated(true);

      const { data, error } = await supabase.rpc('get_monthly_directory_view_count', {
        p_user_id: user.id,
      });
      if (error) {
        console.error('Error fetching directory view count:', error);
      } else {
        setViewCount(data || 0);
      }
    } catch (error) {
      console.error('Error fetching directory view count:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMonthlyViewCount();
  }, [fetchMonthlyViewCount]);

  const trackDirectoryView = useCallback(
    async (directoryKey: string, context: DirectoryViewContext = {}): Promise<DirectoryViewTrackingResult> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return { success: false, message: 'Please sign in to open directories.', reason: 'auth' };
        }

        // Re-read the authoritative count so the quota can't be bypassed by stale state.
        const { data: freshCount } = await supabase.rpc('get_monthly_directory_view_count', {
          p_user_id: user.id,
        });
        const used = typeof freshCount === 'number' ? freshCount : viewCount;
        const status = getQuotaStatus('directories', currentTier, used);

        if (!status.hasUnlimited && used >= status.limit) {
          setViewCount(used);
          if (upgradeTarget) {
            fireJourneyUpgradePrompt('starter_tool_directories');
          }
          const nextLimit = upgradeTarget
            ? getMonthlyQuotaLimit('directories', upgradeTarget)
            : Infinity;
          const upsell = upgradeTarget
            ? Number.isFinite(nextLimit)
              ? ` Upgrade to ${PLAN_LABELS[upgradeTarget]} for ${nextLimit} per month.`
              : ` Upgrade to ${PLAN_LABELS[upgradeTarget]} for unlimited visits.`
            : '';
          return {
            success: false,
            message: `You've used all ${status.limit} directory visits this month.${upsell}`,
            requiredTier: upgradeTarget,
            reason: 'limit_reached',
          };
        }

        const { error: insertError } = await supabase.from('directory_views').insert({
          user_id: user.id,
          directory_key: directoryKey,
          subscription_tier: currentTier,
          gtm_plan_id: context.planId ?? null,
          gtm_play_id: context.playId ?? null,
        });
        if (insertError) {
          console.error('Error inserting directory view:', insertError);
          throw insertError;
        }

        setViewCount(used + 1);
        return { success: true };
      } catch (error: unknown) {
        console.error('Error tracking directory view:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to record directory visit.',
          reason: 'error',
        };
      }
    },
    [currentTier, fireJourneyUpgradePrompt, upgradeTarget, viewCount]
  );

  return {
    viewCount,
    limit,
    hasUnlimited,
    canViewMore,
    upgradeTarget,
    currentTier,
    trackDirectoryView,
    loading,
    isAuthenticated,
    remaining,
    refresh: fetchMonthlyViewCount,
  };
};
