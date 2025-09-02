import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string;
  subscription_end: string | null;
}

interface SubscriptionTier {
  tier_name: string;
  monthly_credits: number;
  price_cents: number;
  features: any; // Use any for Json type from Supabase
}

export function useSubscription() {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({
    subscribed: false,
    subscription_tier: 'free',
    subscription_end: null
  });
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Fetch subscription tiers
  const fetchTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_tiers')
        .select('*')
        .order('price_cents', { ascending: true });

      if (error) throw error;
      setTiers(data || []);
    } catch (error) {
      console.error('Error fetching subscription tiers:', error);
    }
  };

  // Check current subscription status
  const checkSubscription = async () => {
    if (!user) {
      setSubscriptionData({
        subscribed: false,
        subscription_tier: 'free',
        subscription_end: null
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

      if (data) {
        setSubscriptionData({
          subscribed: data.subscribed || false,
          subscription_tier: data.subscription_tier || 'free',
          subscription_end: data.subscription_end || null
        });
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      toast.error('Failed to check subscription status');
    } finally {
      setLoading(false);
    }
  };

  // Create checkout session
  const createCheckout = async (tier: string) => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      return null;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Open checkout in new tab
        window.open(data.url, '_blank');
        return data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Failed to create checkout session');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Open customer portal
  const openCustomerPortal = async () => {
    if (!user) {
      toast.error('Please sign in to manage subscription');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Open portal in new tab
        window.open(data.url, '_blank');
      } else {
        throw new Error('No portal URL received');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open subscription management');
    } finally {
      setLoading(false);
    }
  };

  // Get tier info by name
  const getTierInfo = (tierName: string) => {
    return tiers.find(t => t.tier_name === tierName);
  };

  // Check if user has access to a feature
  const hasFeatureAccess = (feature: string) => {
    const currentTier = getTierInfo(subscriptionData.subscription_tier);
    if (!currentTier?.features) return false;
    
    // Handle features as array or string
    const featureList = Array.isArray(currentTier.features) 
      ? currentTier.features 
      : typeof currentTier.features === 'string' 
        ? JSON.parse(currentTier.features) 
        : [];
    
    return featureList.includes(feature);
  };

  // Get days until subscription ends
  const getDaysUntilEnd = () => {
    if (!subscriptionData.subscription_end) return null;
    
    const endDate = new Date(subscriptionData.subscription_end);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Initialize on mount and when user changes
  useEffect(() => {
    fetchTiers();
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [user]);

  return {
    subscriptionData,
    tiers,
    loading,
    createCheckout,
    openCustomerPortal,
    checkSubscription,
    getTierInfo,
    hasFeatureAccess,
    getDaysUntilEnd,
    refreshSubscription: checkSubscription
  };
}