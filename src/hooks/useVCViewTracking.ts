import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from './useSubscription';
import { getMonthlyQuotaLimit, getQuotaStatus, normalizePlan } from '@/config/planPermissions';

export interface VCViewTrackingResult {
  success: boolean;
  message?: string;
  requiredTier?: 'starter' | 'rising' | 'pro';
  reason?: 'limit_reached' | 'auth' | 'error';
}

export const useVCViewTracking = () => {
  const [viewCount, setViewCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { subscriptionData } = useSubscription();

  const currentTier = normalizePlan(subscriptionData?.subscription_tier);
  const quotaStatus = getQuotaStatus('vc_search_profile', currentTier, viewCount);
  const limit = quotaStatus.limit;
  const hasUnlimitedViews = quotaStatus.hasUnlimited;
  const canViewMore = quotaStatus.canUse;
  const upgradeTarget = quotaStatus.upgradeTarget;

  useEffect(() => {
    fetchMonthlyViewCount();
  }, []);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const fetchMonthlyViewCount = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      setIsAuthenticated(true);

      const { data, error } = await supabase
        .rpc('get_monthly_vc_view_count', { p_user_id: user.id });

      if (error) {
        console.error('Error fetching VC view count:', error);
      } else {
        setViewCount(data || 0);
      }
    } catch (error) {
      console.error('Error fetching VC view count:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackVCView = async (vcId: string): Promise<VCViewTrackingResult> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          success: false,
          message: 'Please sign in to view VC profiles',
          reason: 'auth',
        };
      }

      // Check if can view more
      const { data: canView, error: checkError } = await supabase
        .rpc('can_view_vc', {
          p_user_id: user.id,
          p_tier: currentTier
        });

      if (checkError) {
        console.error('Error checking VC view limit:', checkError);
        throw checkError;
      }

      if (!canView && !hasUnlimitedViews) {
        const nextLimit = upgradeTarget ? getMonthlyQuotaLimit('vc_search_profile', upgradeTarget) : Infinity;
        return {
          success: false,
          message: currentTier === 'rookie'
            ? 'VC profile views are not available on the Rookie plan. Upgrade to Starter to unlock profile views.'
            : currentTier === 'starter'
              ? `You've used all ${limit} VC profile views this month. Upgrade to Rising for ${nextLimit} profile views per month.`
              : `You've used all ${limit} VC profile views this month. Upgrade to Pro for unlimited views.`,
          requiredTier: upgradeTarget,
          reason: 'limit_reached',
        };
      }

      // Track the view
      const { error: insertError } = await supabase
        .from('vc_views')
        .insert({
          user_id: user.id,
          vc_id: vcId,
          subscription_tier: currentTier,
        });

      if (insertError) {
        console.error('Error inserting VC view:', insertError);
        throw insertError;
      }

      // Update count
      setViewCount(prev => prev + 1);

      return { success: true };
    } catch (error: any) {
      console.error('Error tracking VC view:', error);
      return {
        success: false,
        message: error.message || 'Failed to track VC view',
        reason: 'error',
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
    trackVCView,
    loading,
    isAuthenticated,
    remaining: quotaStatus.remaining,
  };
};
