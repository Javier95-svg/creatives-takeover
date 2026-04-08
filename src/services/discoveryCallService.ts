import { supabase } from '@/integrations/supabase/client';
import { createIdempotencyKey } from '@/lib/idempotency';

export const PENDING_DISCOVERY_CALL_KEY = 'pending_calendly_redirect';

export interface DiscoveryCallQuotaStatus {
  success: boolean;
  plan: 'rookie' | 'starter' | 'rising' | 'pro';
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  includedLimit: number | null;
  upgradeTarget: 'starter' | 'rising' | 'pro' | null;
  overageCreditCost: number;
  hasUnlimited: boolean;
  includedCallsBooked: number;
  overageCallsBooked: number;
  usedCalls: number;
  remainingIncluded: number | null;
  requiresCredits: boolean;
  canBookNow: boolean;
  totalCreditsAvailable: number;
}

export interface DiscoveryCallIntentResponse {
  success: boolean;
  callId?: string;
  status?: string;
  providerBookingUrl?: string;
  quotaStatus?: DiscoveryCallQuotaStatus;
  error?: string;
  errorCode?: string;
  requiredTier?: 'starter' | 'rising' | 'pro';
  requiredCredits?: number;
}

export interface DiscoveryCallBookingItem {
  id: string;
  mentorId: string;
  mentorName: string;
  mentorPicture: string | null;
  status:
    | 'intent_created'
    | 'scheduled'
    | 'completed'
    | 'cancelled_early'
    | 'cancelled_late'
    | 'founder_no_show'
    | 'mentor_no_show';
  scheduledFor: string | null;
  durationMinutes: number;
  meetingUrl: string | null;
  providerBookingUrl: string | null;
  creditChargeAmount: number;
  consumptionMode: 'none' | 'included' | 'overage' | 'unlimited';
  cancelledAt: string | null;
  cancelledReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PendingDiscoveryCallRedirect {
  url: string;
  mentorId?: string;
  mentorName?: string;
  source?: string;
}

async function invokeDiscoveryCallService<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('discovery-call-service', { body });

  if (error) {
    throw new Error(error.message || 'Discovery call request failed');
  }

  return data as T;
}

export function storePendingDiscoveryCallRedirect(payload: PendingDiscoveryCallRedirect) {
  localStorage.setItem(PENDING_DISCOVERY_CALL_KEY, JSON.stringify(payload));
}

export function readPendingDiscoveryCallRedirect(): PendingDiscoveryCallRedirect | null {
  const rawValue = localStorage.getItem(PENDING_DISCOVERY_CALL_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as PendingDiscoveryCallRedirect;
    if (parsed && typeof parsed.url === 'string') {
      return parsed;
    }
  } catch {
    return { url: rawValue };
  }

  return { url: rawValue };
}

export function clearPendingDiscoveryCallRedirect() {
  localStorage.removeItem(PENDING_DISCOVERY_CALL_KEY);
}

export async function getDiscoveryCallQuotaStatus() {
  return invokeDiscoveryCallService<DiscoveryCallQuotaStatus>({ action: 'getQuotaStatus' });
}

export async function createDiscoveryCallIntent(input: {
  mentorId: string;
  source: string;
  mentorName?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}) {
  const idempotencyKey = input.idempotencyKey || createIdempotencyKey('discovery-call-intent');
  return invokeDiscoveryCallService<DiscoveryCallIntentResponse>({
    action: 'createIntent',
    mentorId: input.mentorId,
    source: input.source,
    idempotencyKey,
    metadata: {
      ...(input.metadata || {}),
      mentorName: input.mentorName,
    },
  });
}

export async function listMyDiscoveryCalls() {
  return invokeDiscoveryCallService<{ success: boolean; bookings: DiscoveryCallBookingItem[] }>({
    action: 'listMine',
  });
}

export function buildDiscoveryCallRedirectUrl(baseUrl: string, callId: string) {
  const normalizedUrl = /^https?:\/\//i.test(baseUrl) ? baseUrl : `https://${baseUrl}`;
  const url = new URL(normalizedUrl);
  url.searchParams.set('ct_discovery_call_id', callId);
  url.searchParams.set('utm_source', 'creatives_takeover');
  url.searchParams.set('utm_medium', 'mentor_marketplace');
  url.searchParams.set('utm_campaign', 'discovery_call');
  url.searchParams.set('utm_content', callId);
  return url.toString();
}

export async function resumePendingDiscoveryCallRedirect() {
  const pendingRedirect = readPendingDiscoveryCallRedirect();
  if (!pendingRedirect) {
    return false;
  }

  clearPendingDiscoveryCallRedirect();

  if (!pendingRedirect.mentorId) {
    window.open(pendingRedirect.url, '_blank', 'noopener,noreferrer');
    return true;
  }

  const intent = await createDiscoveryCallIntent({
    mentorId: pendingRedirect.mentorId,
    mentorName: pendingRedirect.mentorName,
    source: pendingRedirect.source || 'post_auth_redirect',
    metadata: { resumedAfterAuth: true },
  });

  if (!intent.success || !intent.callId) {
    return false;
  }

  window.open(buildDiscoveryCallRedirectUrl(pendingRedirect.url, intent.callId), '_blank', 'noopener,noreferrer');
  return true;
}