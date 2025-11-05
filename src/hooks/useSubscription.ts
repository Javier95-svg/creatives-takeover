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
  // Separate loading flags so UI waits for both tiers and subscription checks
  const [loadingTiers, setLoadingTiers] = useState(true);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const loading = loadingTiers || loadingSubscription;
  const { user } = useAuth();

  // Fetch subscription tiers
  const fetchTiers = async () => {
    setLoadingTiers(true);
    try {
      const { data, error } = await supabase
        .from('subscription_tiers')
        .select('*');

      if (error) {
        console.error('Error fetching subscription tiers:', error);
        setTiers([]);
        return;
      }

      // Normalize and validate tiers coming from Supabase to avoid UI breakage
      const normalized: SubscriptionTier[] = (data || []).map((row: any) => {
        // Determine canonical tier_name from common fields
        const rawName = (row.tier_name || row.name || row.slug || '') as string;
        const tier_name = String(rawName).trim().toLowerCase();

        const monthly_credits = Number(row.monthly_credits ?? row.credits ?? 0) || 0;
        const price_cents = Number(row.price_cents ?? row.price ?? 0) || 0;

        // Features can be stored as JSON/string/array; keep as-is for backward compatibility
        let features: any = row.features ?? row.feature_set ?? [];
        // If features is a JSON string, attempt to parse safely
        if (typeof features === 'string') {
          try {
            features = JSON.parse(features);
          } catch (err) {
            // fallback to comma-separated list
            features = features.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }

        return {
          tier_name,
          monthly_credits,
          price_cents,
          features
        } as SubscriptionTier;
      });

      // Sort normalized tiers by price_cents ascending to keep UI order stable
      normalized.sort((a, b) => (a.price_cents ?? 0) - (b.price_cents ?? 0));

      setTiers(normalized);
    } catch (error) {
      console.error('Error fetching subscription tiers:', error);
      setTiers([]);
    } finally {
      setLoadingTiers(false);
    }
  };

  // Check current subscription status
  const checkSubscription = async () => {
    setLoadingSubscription(true);

    // If no user, reset to defaults and skip calling Supabase functions
    if (!user) {
      setSubscriptionData({
        subscribed: false,
        subscription_tier: 'free',
        subscription_end: null
      });
      setLoadingSubscription(false);
      return;
    }

    try {
      const sessionResp = await supabase.auth.getSession();
      const accessToken = sessionResp?.data?.session?.access_token;

      if (!accessToken) {
        // No token: assume not subscribed for safety
        setSubscriptionData(prev => ({ ...prev, subscribed: false, subscription_tier: prev.subscription_tier || 'free' }));
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (error) {
        console.error('Error from check-subscription function:', error);
        return;
      }

      if (data) {
        setSubscriptionData({
          subscribed: Boolean(data.subscribed),
          subscription_tier: String(data.subscription_tier ?? 'free').toLowerCase(),
          subscription_end: data.subscription_end ?? null
        });
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      console.debug('Failed to check subscription status:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  // Create checkout session
  const createCheckout = async (tier: string) => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      return null;
    }

    try {
      setLoadingSubscription(true);
      const sessionResp = await supabase.auth.getSession();
      const accessToken = sessionResp?.data?.session?.access_token;
      if (!accessToken) {
        toast.error('Unable to create checkout: no auth session');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tier },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (error) {
        console.error('create-checkout function error:', error);
        toast.error('Failed to create checkout session');
        return null;
      }

      if (data && data.url) {
        window.open(data.url, '_blank');
        return data.url;
      }

      console.error('create-checkout: no URL returned', data);
      toast.error('Failed to create checkout session');
      return null;
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Failed to create checkout session');
      return null;
    } finally {
      setLoadingSubscription(false);
    }
  };

  // Open customer portal
  const openCustomerPortal = async () => {
    if (!user) {
      toast.error('Please sign in to manage subscription');
      return;
    }

    try {
      setLoadingSubscription(true);
      const sessionResp = await supabase.auth.getSession();
      const accessToken = sessionResp?.data?.session?.access_token;
      if (!accessToken) {
        toast.error('Unable to open portal: no auth session');
        return;
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (error) {
        console.error('customer-portal function error:', error);
        toast.error('Failed to open subscription management');
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        console.error('customer-portal: no URL returned', data);
        toast.error('Failed to open subscription management');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open subscription management');
    } finally {
      setLoadingSubscription(false);
    }
  };

  // Get tier info by name
  const getTierInfo = (tierName: string) => {
    if (!tierName) return undefined;
    const normalized = String(tierName).trim().toLowerCase();
    return tiers.find(t => String(t.tier_name).trim().toLowerCase() === normalized);
  };

  // Check if user has access to a feature
  const hasFeatureAccess = (feature: string) => {
    const currentTier = getTierInfo(subscriptionData.subscription_tier);
    if (!currentTier) return false;

    let featureList: string[] = [];
    const raw = currentTier.features;

    if (Array.isArray(raw)) {
      featureList = raw.map(String);
    } else if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) featureList = parsed.map(String);
      } catch (err) {
        // fallback to comma-separated
        featureList = raw.split(',').map(s => s.trim()).filter(Boolean);
      }
    } else if (raw && typeof raw === 'object') {
      // If stored as an object with keys, return keys that are truthy
      featureList = Object.keys(raw).filter(k => raw[k]);
    }

    return featureList.includes(feature);
  };

  // Get days until subscription ends
  const getDaysUntilEnd = () => {
    if (!subscriptionData.subscription_end) return null;

    try {
      let end = subscriptionData.subscription_end as any;

      // Handle numeric timestamps in seconds
      if (typeof end === 'number') {
        // seconds -> ms if plausible
        if (end < 1e12) end = end * 1000;
        end = new Date(end);
      } else if (typeof end === 'string') {
        // If it's a plain number string, convert
        if (/^\d+$/.test(end)) {
          const n = Number(end);
          end = n < 1e12 ? new Date(n * 1000) : new Date(n);
        } else {
          end = new Date(end);
        }
      } else {
        end = new Date(end);
      }

      if (isNaN(end.getTime())) return null;

      const now = new Date();
      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays;
    } catch (err) {
      console.error('getDaysUntilEnd parse error', err);
      return null;
    }
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