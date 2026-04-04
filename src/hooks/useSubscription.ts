import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAccessTokenSafely } from '@/integrations/supabase/auth';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ADMIN_SUBSCRIPTION, isAdminEmail } from '@/lib/admin';

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
  stripe_payment_link?: string | null;
  stripe_payment_link_monthly?: string | null;
  stripe_payment_link_yearly?: string | null;
  monthly_payment_link?: string | null;
  yearly_payment_link?: string | null;
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

export type CheckoutBillingCycle = 'monthly' | 'yearly';

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

type CreditPackRow = Database['public']['Tables']['credit_packs']['Row'];

const DEFAULT_SUBSCRIPTION: SubscriptionData = {
  subscribed: false,
  subscription_tier: 'rookie',
  subscription_end: null,
};

const normalizeSubscriptionTier = (value: unknown): SubscriptionData['subscription_tier'] => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';

  if (['professional', 'pro', 'elite', 'team', 'teams'].includes(normalized)) {
    return 'pro';
  }

  if (['creator', 'rising'].includes(normalized)) {
    return 'rising';
  }

  if (normalized === 'starter') {
    return 'starter';
  }

  if (['free', 'rookie'].includes(normalized)) {
    return 'rookie';
  }

  return 'rookie';
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
    subscription_tier: normalizeSubscriptionTier(data?.subscription_tier),
    subscription_end: data?.subscription_end ?? null,
  };
};

const normalizePaymentLink = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeTierRow = (row: Record<string, unknown>): SubscriptionTier => {
  const rawName = (row.tier_name || row.name || row.slug || '') as string;
  const normalizedRawName = String(rawName).trim().toLowerCase();
  const tier_name = normalizedRawName === 'enterprise'
    ? 'enterprise'
    : normalizeSubscriptionTier(rawName);

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
    stripe_payment_link: normalizePaymentLink(row.stripe_payment_link),
    stripe_payment_link_monthly: normalizePaymentLink(
      row.stripe_payment_link_monthly ?? row.monthly_stripe_payment_link ?? row.monthly_payment_link
    ),
    stripe_payment_link_yearly: normalizePaymentLink(
      row.stripe_payment_link_yearly ?? row.yearly_stripe_payment_link ?? row.yearly_payment_link ?? row.annual_payment_link
    ),
    monthly_payment_link: normalizePaymentLink(row.monthly_payment_link),
    yearly_payment_link: normalizePaymentLink(row.yearly_payment_link ?? row.annual_payment_link),
    features
  } as SubscriptionTier;
};

const resolveTierPaymentLink = (
  tier: SubscriptionTier | null | undefined,
  billingCycle: CheckoutBillingCycle
) => {
  if (!tier) return null;

  const candidates = billingCycle === 'yearly'
    ? [
      tier.stripe_payment_link_yearly,
      tier.yearly_payment_link,
      tier.stripe_payment_link,
    ]
    : [
      tier.stripe_payment_link_monthly,
      tier.monthly_payment_link,
      tier.stripe_payment_link,
    ];

  for (const candidate of candidates) {
    const link = normalizePaymentLink(candidate);
    if (link) return link;
  }

  return null;
};

const resolveCreditPackPaymentLink = (pack: CreditPackRow | null | undefined) => {
  return normalizePaymentLink(pack?.stripe_payment_link);
};

export function useSubscription() {
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

    const filtered = normalized.filter(tier => tier.tier_name !== 'enterprise');
    filtered.sort((a, b) => (a.price_cents ?? 0) - (b.price_cents ?? 0));

    return filtered;
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
    if (!user) return;
    await subscriptionQuery.refetch();
  };

  const openCheckout = (url: string) => {
    if (typeof window === 'undefined') return;
    try {
      const checkoutUrl = new URL(url);
      const isStripePaymentLink = checkoutUrl.hostname.toLowerCase() === 'buy.stripe.com';

      if (isStripePaymentLink) {
        if (user?.email && !checkoutUrl.searchParams.has('prefilled_email')) {
          checkoutUrl.searchParams.set('prefilled_email', user.email);
        }

        if (user?.id && !checkoutUrl.searchParams.has('client_reference_id')) {
          checkoutUrl.searchParams.set('client_reference_id', user.id);
        }
      }

      window.location.assign(checkoutUrl.toString());
    } catch (error) {
      console.warn('Unable to enrich checkout URL, redirecting as-is', error);
      window.location.assign(url);
    }
  };

  const fetchTierByName = async (tierName: string) => {
    const normalizedTierName = normalizeSubscriptionTier(tierName);
    const cachedTier = tiersQuery.data?.find(
      (tier) => String(tier.tier_name).trim().toLowerCase() === normalizedTierName
    );
    if (cachedTier) return cachedTier;

    const { data, error } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('tier_name', normalizedTierName)
      .maybeSingle();

    if (error) {
      console.error('Error fetching subscription tier payment link:', error);
      return null;
    }

    return data ? normalizeTierRow(data) : null;
  };

  const fetchCreditPackById = async (packId: string) => {
    const { data, error } = await supabase
      .from('credit_packs')
      .select('*')
      .eq('id', packId)
      .eq('active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching credit pack payment link:', error);
      return null;
    }

    return data;
  };

  const createCheckout = async (
    tier: string,
    prefill?: CheckoutPrefill,
    billingCycle: CheckoutBillingCycle = 'monthly'
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
      const tierRecord = await fetchTierByName(tier);
      const paymentLink = resolveTierPaymentLink(tierRecord, billingCycle);
      if (paymentLink) {
        openCheckout(paymentLink);
        return paymentLink;
      }

      const accessToken = await getAccessTokenSafely();
      if (!accessToken) {
        toast.error('Unable to create checkout: no auth session');
        return null;
      }

      const payload: {
        purchaseType: 'subscription';
        tier: string;
        billingCycle: CheckoutBillingCycle;
        prefill?: CheckoutPrefill;
      } = {
        purchaseType: 'subscription',
        tier,
        billingCycle,
      };
      if (resolvedPrefill) {
        payload.prefill = resolvedPrefill;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: payload,
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
        openCheckout(data.url);
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
      setActionLoading(false);
    }
  };

  const createCreditPackCheckout = async (packId: string) => {
    if (!user) {
      toast.error('Please sign in to purchase credits');
      return null;
    }

    try {
      setActionLoading(true);
      const creditPack = await fetchCreditPackById(packId);
      const paymentLink = resolveCreditPackPaymentLink(creditPack);
      if (paymentLink) {
        openCheckout(paymentLink);
        return paymentLink;
      }
      const accessToken = await getAccessTokenSafely();
      if (!accessToken) {
        toast.error('Unable to create checkout: no auth session');
        return null;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          purchaseType: 'credit_pack',
          packId,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (error) {
        console.error('create-checkout credit pack function error:', error);
        toast.error('Failed to create credit pack checkout session');
        return null;
      }

      if (data?.url) {
        openCheckout(data.url);
        return data.url;
      }

      console.error('create-checkout credit pack: no URL returned', data);
      toast.error('Failed to create credit pack checkout session');
      return null;
    } catch (error) {
      console.error('Error creating credit pack checkout:', error);
      toast.error('Failed to create credit pack checkout session');
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
