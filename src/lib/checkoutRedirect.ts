import { supabase } from "@/integrations/supabase/client";

export const POST_AUTH_CHECKOUT_INTENT_KEY = "post_auth_checkout_intent";
export const ANGELS_PRO_CHECKOUT_INTENT = "angels-pro";
export const ANGELS_PRO_CHECKOUT_URL = "https://buy.stripe.com/cNifZi0q5f4P7303nt0VO02";

const CHECKOUT_INTENTS = {
  "starter-monthly": { plan: "starter", billingCycle: "monthly", fallbackUrl: "https://buy.stripe.com/cNibJ22yd4qb2MK8HN0VO0R" },
  "starter-yearly": { plan: "starter", billingCycle: "yearly", fallbackUrl: "https://buy.stripe.com/cNidRadcR5ufafc7DJ0VO0S" },
  "rising-monthly": { plan: "rising", billingCycle: "monthly", fallbackUrl: "https://buy.stripe.com/bJe00k5KpcWH9b81fl0VO0P" },
  "rising-yearly": { plan: "rising", billingCycle: "yearly", fallbackUrl: "https://buy.stripe.com/3cI3cw1u9g8Tfzw0bh0VO0Q" },
  "pro-monthly": { plan: "pro", billingCycle: "monthly", fallbackUrl: "https://buy.stripe.com/8x23cw1u96yjfzw4rx0VO0N" },
  "pro-yearly": { plan: "pro", billingCycle: "yearly", fallbackUrl: "https://buy.stripe.com/6oU4gA4Glf4P5YW8HN0VO0O" },
  [ANGELS_PRO_CHECKOUT_INTENT]: { plan: null, billingCycle: null, fallbackUrl: ANGELS_PRO_CHECKOUT_URL },
} as const;

type CheckoutIntent = keyof typeof CHECKOUT_INTENTS;

type CheckoutUser = {
  email?: string | null;
  id?: string | null;
};

export function sanitizeCheckoutIntent(intent: string | null | undefined): CheckoutIntent | null {
  if (!intent) return null;
  const normalizedIntent = intent.trim() as CheckoutIntent;
  return normalizedIntent in CHECKOUT_INTENTS ? normalizedIntent : null;
}

export function appendCheckoutIntentParam(path: string, intent: string | null | undefined): string {
  const safeIntent = sanitizeCheckoutIntent(intent);
  if (!safeIntent) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}checkout=${encodeURIComponent(safeIntent)}`;
}

export function persistCheckoutIntent(intent: string | null | undefined): void {
  const safeIntent = sanitizeCheckoutIntent(intent);
  if (!safeIntent) {
    localStorage.removeItem(POST_AUTH_CHECKOUT_INTENT_KEY);
    return;
  }

  localStorage.setItem(POST_AUTH_CHECKOUT_INTENT_KEY, safeIntent);
}

export function getCheckoutIntent(): CheckoutIntent | null {
  const storedIntent = localStorage.getItem(POST_AUTH_CHECKOUT_INTENT_KEY);
  return sanitizeCheckoutIntent(storedIntent);
}

export function consumeCheckoutIntent(): CheckoutIntent | null {
  const safeIntent = getCheckoutIntent();
  localStorage.removeItem(POST_AUTH_CHECKOUT_INTENT_KEY);
  return safeIntent;
}

export function resolveCheckoutIntentUrl(intent: string | null | undefined): string | null {
  const safeIntent = sanitizeCheckoutIntent(intent);
  if (!safeIntent) return null;
  return CHECKOUT_INTENTS[safeIntent].fallbackUrl;
}

const normalizePaymentLink = (value: unknown) => {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

export async function resolveCheckoutIntentUrlFromDb(
  intent: string | null | undefined,
  user?: CheckoutUser | null,
): Promise<string | null> {
  const safeIntent = sanitizeCheckoutIntent(intent);
  if (!safeIntent) return null;

  const config = CHECKOUT_INTENTS[safeIntent];
  if (!config.plan || !config.billingCycle) return config.fallbackUrl;

  try {
    const { data, error } = await supabase
      .from("subscription_tiers")
      .select("*")
      .eq("tier_name", config.plan)
      .maybeSingle();

    if (error || !data) {
      return config.fallbackUrl;
    }

    const row = data as Record<string, unknown>;
    const dbLink = config.billingCycle === "yearly"
      ? normalizePaymentLink(row.stripe_payment_link_yearly ?? row.yearly_payment_link ?? row.stripe_payment_link)
      : normalizePaymentLink(row.stripe_payment_link_monthly ?? row.monthly_payment_link ?? row.stripe_payment_link);

    if (dbLink) return dbLink;
  } catch (error) {
    console.warn("Unable to resolve checkout URL from subscription tiers", error);
  }

  if (user?.id) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (accessToken) {
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: {
            purchaseType: "subscription",
            tier: config.plan,
            billingCycle: config.billingCycle,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!error && typeof data?.url === "string" && data.url.trim().length > 0) {
          return data.url;
        }
      }
    } catch (error) {
      console.warn("Unable to create checkout session for stored intent", error);
    }
  }

  return config.fallbackUrl;
}

export function redirectToCheckoutIntent(
  intent: string | null | undefined,
  user?: CheckoutUser | null,
): void {
  void redirectToResolvedCheckoutIntent(intent, user);
}

async function redirectToResolvedCheckoutIntent(
  intent: string | null | undefined,
  user?: CheckoutUser | null,
): Promise<void> {
  if (typeof window === "undefined") return;

  const checkoutUrl = await resolveCheckoutIntentUrlFromDb(intent, user);
  if (!checkoutUrl) return;

  try {
    const url = new URL(checkoutUrl);
    const isStripePaymentLink = url.hostname.toLowerCase() === "buy.stripe.com";

    if (isStripePaymentLink) {
      if (user?.email && !url.searchParams.has("prefilled_email")) {
        url.searchParams.set("prefilled_email", user.email);
      }

      if (user?.id && !url.searchParams.has("client_reference_id")) {
        url.searchParams.set("client_reference_id", user.id);
      }
    }

    window.location.assign(url.toString());
  } catch (error) {
    console.warn("Unable to enrich checkout URL, redirecting as-is", error);
    window.location.assign(checkoutUrl);
  }
}
