import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from './useSubscription';

export interface UsageLimit {
  current_usage: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
}

export interface FeatureUsage {
  [featureName: string]: UsageLimit;
}

export function useUsageLimits() {
  const { user } = useAuth();
  const { subscriptionData } = useSubscription();
  const [usage, setUsage] = useState<FeatureUsage>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch usage for a specific feature
  const fetchUsage = useCallback(async (featureName: string): Promise<UsageLimit | null> => {
    if (!user) return null;

    try {
      const { data, error: fetchError } = await supabase.rpc('get_feature_usage', {
        p_user_id: user.id,
        p_feature_name: featureName
      });

      if (fetchError) {
        console.error('Error fetching usage:', fetchError);
        return null;
      }

      if (data) {
        return {
          current_usage: data.current_usage || 0,
          limit: data.limit || 0,
          remaining: data.remaining || 0,
          unlimited: data.unlimited || false
        };
      }

      return null;
    } catch (err) {
      console.error('Error in fetchUsage:', err);
      return null;
    }
  }, [user]);

  // Check if user can use a feature (and increment if allowed)
  const checkAndIncrement = useCallback(async (
    featureName: string,
    incrementBy: number = 1
  ): Promise<{ allowed: boolean; usage?: UsageLimit; message?: string }> => {
    if (!user) {
      return {
        allowed: false,
        message: 'Please sign in to use this feature'
      };
    }

    try {
      const { data, error: checkError } = await supabase.rpc('check_and_increment_usage', {
        p_user_id: user.id,
        p_feature_name: featureName,
        p_increment_by: incrementBy
      });

      if (checkError) {
        console.error('Error checking usage:', checkError);
        return {
          allowed: false,
          message: 'Unable to check usage limits. Please try again.'
        };
      }

      if (data) {
        const usageLimit: UsageLimit = {
          current_usage: data.current_usage || 0,
          limit: data.limit || 0,
          remaining: data.remaining || 0,
          unlimited: data.unlimited || (data.limit === -1)
        };

        // Update local state
        setUsage(prev => ({
          ...prev,
          [featureName]: usageLimit
        }));

        return {
          allowed: data.allowed || false,
          usage: usageLimit,
          message: data.message || undefined
        };
      }

      return {
        allowed: false,
        message: 'Unable to verify usage limits'
      };
    } catch (err) {
      console.error('Error in checkAndIncrement:', err);
      return {
        allowed: false,
        message: 'An error occurred while checking usage limits'
      };
    }
  }, [user]);

  // Get usage for multiple features
  const fetchMultipleUsage = useCallback(async (featureNames: string[]) => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const usagePromises = featureNames.map(name => fetchUsage(name));
      const results = await Promise.all(usagePromises);

      const usageMap: FeatureUsage = {};
      featureNames.forEach((name, index) => {
        if (results[index]) {
          usageMap[name] = results[index]!;
        }
      });

      setUsage(usageMap);
    } catch (err) {
      console.error('Error fetching multiple usage:', err);
      setError('Failed to load usage limits');
    } finally {
      setLoading(false);
    }
  }, [user, fetchUsage]);

  // Get usage for a single feature from cache or fetch
  const getUsage = useCallback((featureName: string): UsageLimit | null => {
    return usage[featureName] || null;
  }, [usage]);

  // Check if user has remaining usage
  const hasRemainingUsage = useCallback((featureName: string): boolean => {
    const featureUsage = usage[featureName];
    if (!featureUsage) return true; // If not tracked, assume allowed
    if (featureUsage.unlimited) return true;
    return featureUsage.remaining > 0;
  }, [usage]);

  // Get formatted usage string
  const getUsageString = useCallback((featureName: string): string => {
    const featureUsage = usage[featureName];
    if (!featureUsage) return '';
    if (featureUsage.unlimited) return 'Unlimited';
    return `${featureUsage.current_usage} / ${featureUsage.limit}`;
  }, [usage]);

  // Refresh usage for a feature
  const refreshUsage = useCallback(async (featureName: string) => {
    const updated = await fetchUsage(featureName);
    if (updated) {
      setUsage(prev => ({
        ...prev,
        [featureName]: updated
      }));
    }
  }, [fetchUsage]);

  // Get tier-based limits (from subscription tier)
  const getTierLimit = useCallback((featureName: string): number => {
    const tier = subscriptionData.subscription_tier;
    
    // Default limits based on tier
    const defaultLimits: Record<string, Record<string, number>> = {
      free: {
        reports: 0,
        market_intelligence: 0,
        collaborators: 0
      },
      creator: {
        reports: 5,
        market_intelligence: 10,
        collaborators: 3
      },
      professional: {
        reports: -1, // unlimited
        market_intelligence: -1,
        collaborators: -1
      }
    };

    return defaultLimits[tier]?.[featureName] ?? 0;
  }, [subscriptionData.subscription_tier]);

  return {
    usage,
    loading,
    error,
    fetchUsage,
    fetchMultipleUsage,
    checkAndIncrement,
    getUsage,
    hasRemainingUsage,
    getUsageString,
    refreshUsage,
    getTierLimit
  };
}

