import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAccessTokenSafely } from '@/integrations/supabase/auth';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ADMIN_SUBSCRIPTION, isAdminEmail } from '@/lib/admin';
import { normalizePlan } from '@/config/planPermissions';
import { captureEvent } from '@/lib/analytics';
import {
  redirectToHostedCheckout,
  startCheckout,
  type CheckoutBillingCycle,
  type CheckoutPlan,
} from '@/services/checkoutService';

export type { CheckoutBillingCycle } from '@/services/checkoutService';

const BILLING_STORAGE_KEY = 'ct_billing_details';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string;
  subscription_end: string | null;
}

export interface SubscriptionTier {
  tier_name: string;
  monthly_credits: number;
  price_cents: number;
  stripe_price_id?: string | null;
  stripe_price_id_monthly?: string | null;
  stripe_price_id_yearly?: string | null;
  [key: string]: unknown;
  features: Json | null;
}

export interface CheckoutPrefill {
  name?: string;
  email?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

type StoredBillingDetails = Partial<{
  fullName: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}>;

const DEFAULT_SUBSCRIPTION: SubscriptionData = {
  subscribed: false,
  subscription_tier: 'rookie',
  subscription_end: null,
};

const normalizeSubscriptionData = (
  email: string | null | undefined,
  data?: Partial<SubscriptionData> | null
): SubscriptionData => {
  if (isAdminEmail(email)) {
    return { ...ADMIN_SUBSCRIPTION };
  }

  return {
    subscribed: Boolean(data?.subscribed),
    subscription_tier: normalizePlan(data?.subscription_tier),
    subscription_end: data?.subscription_end ?? null,
  };
};

const normalizeTierRow = (row: Record<string, unknown>): SubscriptionTier => {
  const rawName = (row.tier_name || row.name || row.slug || '') as string;
  const tier_name = normalizePlan(rawName);

  const monthly_credits = Number(row.monthly_credits ?? row.credits ?? 0) || 0;
  const price_cents = Number(row.price_cents ?? row.price ?? 0) || 0;

  let features: Json = (row.features ?? row.feature_set ?? []) as Json;
  if (typeof features === 'string') {
    try {
      features = JSON.parse(features) as Json;
    } catch {
      features = features.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }

  return {
    tier_name,
    monthly_credits,
    price_cents,
    stripe_price_id: typeof row.stripe_price_id === 'string' ? row.stripe_price_id : null,
    stripe_price_id_monthly: typeof row.stripe_price_id_monthly === 'string' ? row.stripe_price_id_monthly : null,
    stripe_price_id_yearly: typeof row.stripe_price_id_yearly === 'string' ? row.stripe_price_id_yearly : null,
    features
  } as SubscriptionTier;
};

export function useSubscription(options?: { fetchTiers?: boolean }) {
  // Tiers are only needed by surfaces that render pricing/plan data. Globally
  // mounted consumers (e.g. CreditGateProvider) that only need actions can pass
  // { fetchTiers: false } to avoid an avoidable subscription_tiers fetch on every
  // route, including anonymous ones. Defaults to true for backward compatibility.
  const fetchTiersEnabled = options?.fetchTiers ?? true;
  const { user } = useAuth();
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTiers = async (): Promise<SubscriptionTier[]> => {
    const { data, error } = await supabase
      .from('subscription_tiers')
      .select('*');

    if (error) {
      console.error('Error fetching subscription tiers:', error);
      return [];
    }

    const normalized: SubscriptionTier[] = (data || []).map((row) => normalizeTierRow(row as Record<string, unknown>));
    const uniqueTiers = Array.from(
      normalized.reduce((map, tier) => {
        map.set(tier.tier_name, tier);
        return map;
      }, new Map<string, SubscriptionTier>()).values()
    );

    uniqueTiers.sort((a, b) => (a.price_cents ?? 0) - (b.price_cents ?? 0));

    return uniqueTiers;
  };

  const fetchSubscription = async (): Promise<SubscriptionData> => {
    if (!user) return DEFAULT_SUBSCRIPTION;
    if (isAdminEmail(user.email)) return { ...ADMIN_SUBSCRIPTION };

    try {
      const accessToken = await getAccessTokenSafely();

      if (!accessToken) {
        return normalizeSubscriptionData(user.email, DEFAULT_SUBSCRIPTION);
      }

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (error) {
        console.error('Error from check-subscription function:', error);
        return normalizeSubscriptionData(user.email, DEFAULT_SUBSCRIPTION);
      }

      if (data) {
        return normalizeSubscriptionData(user.email, data as Partial<SubscriptionData>);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }

    return normalizeSubscriptionData(user.email, DEFAULT_SUBSCRIPTION);
  };

  const tiersQuery = useQuery({
    queryKey: ['subscription-tiers'],
    queryFn: fetchTiers,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: fetchTiersEnabled,
  });

  const subscriptionQuery = useQuery({
    queryKey: ['subscription-status', user?.id],
    enabled: !!user?.id,
    queryFn: fetchSubscription,
    staleTime: 30_000,
    retry: false,
  });

  const tiers = tiersQuery.data ?? [];
  const subscriptionData = user
    ? normalizeSubscriptionData(user.email, subscriptionQuery.data ?? DEFAULT_SUBSCRIPTION)
    : DEFAULT_SUBSCRIPTION;
  const loading = tiersQuery.isLoading || subscriptionQuery.isLoading;

  const checkSubscription = async () => {
    if (!user) return null;
    const refreshed = await subscriptionQuery.refetch();
    return refreshed.data ?? null;
  };

  const createCheckout = async (
    tier: string,
    prefill?: CheckoutPrefill,
    billingCycle: CheckoutBillingCycle = 'monthly',
    purchaseSource = 'subscription_action',
  ) => {
    if (!user) {
      toast.error('Please sign in to subscribe');
      return null;
    }

    const getStoredBillingDetails = (): CheckoutPrefill | undefined => {
      if (typeof window === 'undefined') return undefined;
      const raw = window.localStorage.getItem(BILLING_STORAGE_KEY);
      if (!raw) return undefined;
      try {
        const parsed = JSON.parse(raw) as StoredBillingDetails;
        const result: CheckoutPrefill = {};
        if (typeof parsed.fullName === 'string') {
          result.name = parsed.fullName;
        }
        if (typeof parsed.email === 'string') {
          result.email = parsed.email;
        }

        const addressFields: NonNullable<CheckoutPrefill['address']> = {};
        if (typeof parsed.addressLine1 === 'string') {
          addressFields.line1 = parsed.addressLine1;
        }
        if (typeof parsed.addressLine2 === 'string') {
          addressFields.line2 = parsed.addressLine2;
        }
        if (typeof parsed.city === 'string') {
          addressFields.city = parsed.city;
        }
        if (typeof parsed.state === 'string') {
          addressFields.state = parsed.state;
        }
        if (typeof parsed.postalCode === 'string') {
          addressFields.postal_code = parsed.postalCode;
        }
        if (typeof parsed.country === 'string') {
          addressFields.country = parsed.country;
        }

        if (Object.keys(addressFields).length > 0) {
          result.address = addressFields;
        }

        return Object.keys(result).length > 0 ? result : undefined;
      } catch (error) {
        console.warn('Unable to parse stored billing details', error);
        return undefined;
      }
    };

    const sanitizePrefill = (raw?: CheckoutPrefill): CheckoutPrefill | undefined => {
      if (!raw) return undefined;
      const trim = (value?: string) => {
        if (typeof value !== 'string') return undefined;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      };

      const sanitized: CheckoutPrefill = {};
      const name = trim(raw.name);
      const email = trim(raw.email);
      if (name) sanitized.name = name;
      if (email) sanitized.email = email;

      if (raw.address) {
        const address = raw.address;
        const sanitizedAddress: NonNullable<CheckoutPrefill['address']> = {};
        const line1 = trim(address.line1);
        const line2 = trim(address.line2);
        const city = trim(address.city);
        const state = trim(address.state);
        const postal = trim(address.postal_code);
        const country = trim(address.country);
        if (country) {
          sanitizedAddress.country = country.toUpperCase();
        }
        if (line1) sanitizedAddress.line1 = line1;
        if (line2) sanitizedAddress.line2 = line2;
        if (city) sanitizedAddress.city = city;
        if (state) sanitizedAddress.state = state;
        if (postal) sanitizedAddress.postal_code = postal;

        if (Object.keys(sanitizedAddress).length > 0) {
          sanitized.address = sanitizedAddress;
        }
      }

      return Object.keys(sanitized).length > 0 ? sanitized : undefined;
    };

    let resolvedPrefill = sanitizePrefill(prefill ?? getStoredBillingDetails());

    const fallbackEmail = typeof user.email === 'string' ? user.email.trim() : '';
    if (fallbackEmail) {
      if (!resolvedPrefill) {
        resolvedPrefill = { email: fallbackEmail };
      } else if (!resolvedPrefill.email) {
        resolvedPrefill.email = fallbackEmail;
      }
    }

    const rawName = (user.user_metadata as Record<string, unknown> | null)?.full_name;
    const fallbackName = typeof rawName === 'string' ? rawName.trim() : '';
    if (fallbackName) {
      if (!resolvedPrefill) {
        resolvedPrefill = { name: fallbackName };
      } else if (!resolvedPrefill.name) {
        resolvedPrefill.name = fallbackName;
      }
    }

    try {
      setActionLoading(true);
      const normalizedTier = normalizePlan(tier);
      if (!['starter', 'rising', 'pro'].includes(normalizedTier)) {
        throw new Error('Select a valid paid plan.');
      }

      const checkout = await startCheckout({
        purchaseType: 'subscription',
        plan: normalizedTier as CheckoutPlan,
        billingCycle,
        purchaseSource,
        prefill: resolvedPrefill,
      });
      redirectToHostedCheckout(checkout.url);
      return checkout.url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error(error instanceof Error ? error.message : 'Checkout is temporarily unavailable. Please retry.');
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const createCreditPackCheckout = async (
    packId: string,
    purchaseSource?: string,
    purchaseContext?: { id: string; returnPath?: string },
  ) => {
    if (!user) {
      toast.error('Please sign in to purchase credits');
      return null;
    }

    try {
      setActionLoading(true);
      // Funnel start event — pairs with the server-side credit_pack_purchased
      // emitted by stripe-webhook once payment completes.
      captureEvent('credit_pack_checkout_started', {
        pack_id: packId,
        purchase_source: purchaseSource ?? 'unknown',
      });
      const checkout = await startCheckout({
        purchaseType: 'credit_pack',
        packId,
        purchaseSource,
        purchaseContextId: purchaseContext?.id,
        returnPath: purchaseContext?.returnPath,
      });
      redirectToHostedCheckout(checkout.url);
      return checkout.url;
    } catch (error) {
      console.error('Error creating credit pack checkout:', error);
      toast.error(error instanceof Error ? error.message : 'Checkout is temporarily unavailable. Please retry.');
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    if (!user) {
      toast.error('Please sign in to manage subscription');
      return;
    }

    try {
      setActionLoading(true);
      const accessToken = await getAccessTokenSafely();
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
      setActionLoading(false);
    }
  };

  const getTierInfo = (tierName: string) => {
    if (!tierName) return undefined;
    const normalized = normalizeSubscriptionTier(tierName);
    return tiers.find(t => String(t.tier_name).trim().toLowerCase() === normalized);
  };

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
      } catch {
        featureList = raw.split(',').map(s => s.trim()).filter(Boolean);
      }
    } else if (raw && typeof raw === 'object') {
      const rawRecord = raw as Record<string, unknown>;
      featureList = Object.keys(rawRecord).filter(k => Boolean(rawRecord[k]));
    }

    return featureList.includes(feature);
  };

  const getDaysUntilEnd = () => {
    if (!subscriptionData.subscription_end) return null;

    try {
      let end: string | number | Date = subscriptionData.subscription_end as string | number | Date;

      if (typeof end === 'number') {
        if (end < 1e12) end = end * 1000;
        end = new Date(end);
      } else if (typeof end === 'string') {
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

  return {
    subscriptionData,
    tiers,
    loading,
    actionLoading,
    createCheckout,
    createCreditPackCheckout,
    openCustomerPortal,
    checkSubscription,
    getTierInfo,
    hasFeatureAccess,
    getDaysUntilEnd,
    refreshSubscription: checkSubscription,
  };
}
