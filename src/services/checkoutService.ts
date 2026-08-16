import { captureEvent } from '@/lib/analytics';
import { getAccessTokenSafely } from '@/integrations/supabase/auth';
import { supabase } from '@/integrations/supabase/client';

export type CheckoutBillingCycle = 'monthly' | 'yearly';
export type CheckoutPlan = 'starter' | 'rising' | 'pro';

export interface StartCheckoutInput {
  purchaseType: 'subscription' | 'credit_pack' | 'service_offer';
  plan?: CheckoutPlan;
  billingCycle?: CheckoutBillingCycle;
  packId?: string;
  offerId?: string;
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

export async function startCheckout(input: StartCheckoutInput): Promise<StartCheckoutResult> {
  const accessToken = await getAccessTokenSafely();
  if (!accessToken) {
    captureEvent('checkout_start_failed', {
      purchase_type: input.purchaseType,
      plan: input.plan,
      billing_cycle: input.billingCycle,
      pack_id: input.packId,
      offer_id: input.offerId,
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
      offer_id: input.offerId,
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
