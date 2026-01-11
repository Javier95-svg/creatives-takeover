import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from './useSubscription';
import { VC_VIEW_LIMITS } from '@/config/constants';

export interface VCViewTrackingResult {
  success: boolean;
  message?: string;
  requiredTier?: 'creator' | 'professional';
}

export const useVCViewTracking = () => {
  const [viewCount, setViewCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const { subscriptionData } = useSubscription();

  const currentTier = subscriptionData?.subscription_tier || 'free';
  const limit = VC_VIEW_LIMITS[currentTier as keyof typeof VC_VIEW_LIMITS] || 0;
  const hasUnlimitedViews = limit === -1;
  const canViewMore = hasUnlimitedViews || viewCount < limit;

  useEffect(() => {
    fetchMonthlyViewCount();
  }, []);

  const fetchMonthlyViewCount = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

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
        return {
          success: false,
          message: `You've reached your monthly limit of ${limit} VC profile views. Upgrade to ${currentTier === 'free' ? 'Creator for 25 views' : 'Professional for unlimited views'}.`,
          requiredTier: currentTier === 'free' ? 'creator' : 'professional',
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
      };
    }
  };

  return {
    viewCount,
    limit,
    hasUnlimitedViews,
    canViewMore,
    trackVCView,
    loading,
    remaining: hasUnlimitedViews ? Infinity : Math.max(0, limit - viewCount),
  };
};
