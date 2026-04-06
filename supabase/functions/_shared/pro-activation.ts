import { normalizePlan } from './plan-enforcement.ts';

export type ProActivationSource = 'checkout' | 'subscription' | 'invoice';

interface ProActivationTransitionArgs {
  previousTier: string | null | undefined;
  nextTier: string | null | undefined;
  wasSubscribed: boolean | null | undefined;
  isSubscribed: boolean | null | undefined;
  source: ProActivationSource;
}

export function shouldEnqueueProActivation(args: ProActivationTransitionArgs): boolean {
  const nextTier = normalizePlan(args.nextTier);
  if (!args.isSubscribed || nextTier !== 'pro') {
    return false;
  }

  if (args.source === 'checkout') {
    return true;
  }

  const previousTier = normalizePlan(args.previousTier);
  return !args.wasSubscribed || previousTier !== 'pro';
}

export function buildProActivationIdempotencyKey({
  stripeEventId,
  userId,
  subscriptionId,
}: {
  stripeEventId: string;
  userId: string;
  subscriptionId?: string | null;
}): string {
  return `pro_activation:${stripeEventId}:${userId}:${subscriptionId ?? 'none'}`;
}

export function getProActivationRetryDelayMinutes(attemptNumber: number): number {
  const safeAttempt = Math.max(1, Math.floor(attemptNumber));
  return Math.min(360, 5 * (2 ** (safeAttempt - 1)));
}