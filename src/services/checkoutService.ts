import { captureEvent } from '@/lib/analytics';
import { getAccessTokenSafely } from '@/integrations/supabase/auth';
import { supabase } from '@/integrations/supabase/client';
import { supabaseBrowserConfig } from '@/integrations/supabase/env';

export type CheckoutBillingCycle = 'monthly' | 'yearly';
export type CheckoutPlan = 'starter' | 'rising' | 'pro';

export interface StartCheckoutInput {
  purchaseType: 'subscription' | 'credit_pack';
  plan?: CheckoutPlan;
  billingCycle?: CheckoutBillingCycle;
  packId?: string;
  purchaseSource?: string;
  purchaseContextId?: string;
  returnPath?: string;
  prefill?: {
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
  };
}

export interface StartCheckoutResult {
  url: string;
}

let checkoutWarmupPromise: Promise<void> | null = null;

/**
 * Starts the cold, anonymous part of checkout before the user selects a pack.
 * The request cannot create a session or charge anything: create-checkout
 * returns immediately for OPTIONS requests. It warms the Edge Function and
 * lets the browser reuse its Supabase connection for the authenticated POST.
 */
export function warmCheckoutPath(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (checkoutWarmupPromise) return checkoutWarmupPromise;

  const stripeOrigin = 'https://checkout.stripe.com';
  if (!document.head.querySelector(`link[rel="preconnect"][href="${stripeOrigin}"]`)) {
    const preconnect = document.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = stripeOrigin;
    document.head.appendChild(preconnect);
  }

  checkoutWarmupPromise = fetch(
    `${supabaseBrowserConfig.url.replace(/\/$/, '')}/functions/v1/create-checkout`,
    {
      method: 'OPTIONS',
      headers: { apikey: supabaseBrowserConfig.publishableKey },
      mode: 'cors',
      credentials: 'omit',
    },
  )
    .then(() => undefined)
    .catch(() => {
      // Warm-up is opportunistic. The real checkout request remains the source
      // of truth and keeps its existing error handling.
    });

  return checkoutWarmupPromise;
}

export async function startCheckout(input: StartCheckoutInput): Promise<StartCheckoutResult> {
  const accessToken = await getAccessTokenSafely();
  if (!accessToken) {
    captureEvent('checkout_start_failed', {
      purchase_type: input.purchaseType,
      plan: input.plan,
      billing_cycle: input.billingCycle,
      pack_id: input.packId,
      purchase_source: input.purchaseSource ?? 'unknown',
      error_code: 'AUTH_SESSION_MISSING',
    });
    throw new Error('Your session expired. Sign in again and retry checkout.');
  }

  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: input,
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let responseData = data as Record<string, unknown> | null;
  const errorContext = error && 'context' in error
    ? (error as { context?: unknown }).context
    : null;
  if (errorContext && typeof (errorContext as { clone?: unknown }).clone === 'function') {
    try {
      responseData = await (errorContext as Response).clone().json() as Record<string, unknown>;
    } catch {
      // Keep the SDK response/error when the edge response is not JSON.
    }
  }

  const url = typeof responseData?.url === 'string' ? responseData.url.trim() : '';
  if (error || !url) {
    const errorCode = typeof responseData?.errorCode === 'string'
      ? responseData.errorCode
      : error
        ? 'EDGE_FUNCTION_ERROR'
        : 'CHECKOUT_URL_MISSING';

    captureEvent('checkout_start_failed', {
      purchase_type: input.purchaseType,
      plan: input.plan,
      billing_cycle: input.billingCycle,
      pack_id: input.packId,
      purchase_source: input.purchaseSource ?? 'unknown',
      error_code: errorCode,
    });

    throw new Error(
      typeof responseData?.error === 'string'
        ? responseData.error
        : error?.message || 'Checkout is temporarily unavailable. Please retry.',
    );
  }

  return { url };
}

export function redirectToHostedCheckout(url: string): void {
  if (typeof window === 'undefined') return;
  window.location.assign(url);
}
