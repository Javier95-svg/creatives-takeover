import {
  redirectToHostedCheckout,
  startCheckout,
  type CheckoutBillingCycle,
  type CheckoutPlan,
} from "@/services/checkoutService";

export const POST_AUTH_CHECKOUT_INTENT_KEY = "post_auth_checkout_intent";
export const ANGELS_PRO_CHECKOUT_INTENT = "angels-pro";

const CHECKOUT_INTENTS = {
  "starter-monthly": { plan: "starter", billingCycle: "monthly", purchaseSource: "pricing_page" },
  "starter-yearly": { plan: "starter", billingCycle: "yearly", purchaseSource: "pricing_page" },
  "rising-monthly": { plan: "rising", billingCycle: "monthly", purchaseSource: "pricing_page" },
  "rising-yearly": { plan: "rising", billingCycle: "yearly", purchaseSource: "pricing_page" },
  "pro-monthly": { plan: "pro", billingCycle: "monthly", purchaseSource: "pricing_page" },
  "pro-yearly": { plan: "pro", billingCycle: "yearly", purchaseSource: "pricing_page" },
  [ANGELS_PRO_CHECKOUT_INTENT]: { plan: "pro", billingCycle: "monthly", purchaseSource: "angels" },
} as const;

export type CheckoutIntentKey = keyof typeof CHECKOUT_INTENTS;

export interface CheckoutIntent {
  plan: CheckoutPlan;
  billingCycle: CheckoutBillingCycle;
  purchaseSource: string;
}

function isCheckoutIntent(value: unknown): value is CheckoutIntent {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CheckoutIntent>;
  return ['starter', 'rising', 'pro'].includes(candidate.plan ?? '')
    && ['monthly', 'yearly'].includes(candidate.billingCycle ?? '')
    && typeof candidate.purchaseSource === 'string'
    && candidate.purchaseSource.trim().length > 0;
}

export function sanitizeCheckoutIntent(intent: string | null | undefined): CheckoutIntentKey | null {
  if (!intent) return null;
  const normalizedIntent = intent.trim() as CheckoutIntentKey;
  return normalizedIntent in CHECKOUT_INTENTS ? normalizedIntent : null;
}

export function resolveCheckoutIntent(intent: CheckoutIntentKey | CheckoutIntent | string | null | undefined): CheckoutIntent | null {
  if (isCheckoutIntent(intent)) {
    return {
      plan: intent.plan,
      billingCycle: intent.billingCycle,
      purchaseSource: intent.purchaseSource.trim().slice(0, 64),
    };
  }

  const safeIntent = sanitizeCheckoutIntent(typeof intent === 'string' ? intent : null);
  if (!safeIntent) return null;
  return { ...CHECKOUT_INTENTS[safeIntent] };
}

export function appendCheckoutIntentParam(path: string, intent: string | null | undefined): string {
  const safeIntent = sanitizeCheckoutIntent(intent);
  if (!safeIntent) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}checkout=${encodeURIComponent(safeIntent)}`;
}

export function persistCheckoutIntent(intent: string | null | undefined): void {
  const resolvedIntent = resolveCheckoutIntent(intent);
  if (!resolvedIntent) {
    localStorage.removeItem(POST_AUTH_CHECKOUT_INTENT_KEY);
    return;
  }

  localStorage.setItem(POST_AUTH_CHECKOUT_INTENT_KEY, JSON.stringify(resolvedIntent));
}

export function getCheckoutIntent(): CheckoutIntent | null {
  const storedIntent = localStorage.getItem(POST_AUTH_CHECKOUT_INTENT_KEY);
  if (!storedIntent) return null;
  try {
    const parsed = JSON.parse(storedIntent) as unknown;
    if (isCheckoutIntent(parsed)) return resolveCheckoutIntent(parsed);
  } catch {
    // Legacy storage used a string key; resolve it below.
  }
  return resolveCheckoutIntent(storedIntent);
}

export function consumeCheckoutIntent(): CheckoutIntent | null {
  const safeIntent = getCheckoutIntent();
  localStorage.removeItem(POST_AUTH_CHECKOUT_INTENT_KEY);
  return safeIntent;
}

export async function redirectToCheckoutIntent(
  intent: CheckoutIntent | CheckoutIntentKey | string | null | undefined,
): Promise<boolean> {
  const resolvedIntent = resolveCheckoutIntent(intent);
  if (!resolvedIntent || typeof window === 'undefined') return false;

  const checkout = await startCheckout({
    purchaseType: 'subscription',
    plan: resolvedIntent.plan,
    billingCycle: resolvedIntent.billingCycle,
    purchaseSource: resolvedIntent.purchaseSource,
  });
  redirectToHostedCheckout(checkout.url);
  return true;
}
