export const POST_AUTH_CHECKOUT_INTENT_KEY = "post_auth_checkout_intent";
export const ANGELS_PRO_CHECKOUT_INTENT = "angels-pro";
export const ANGELS_PRO_CHECKOUT_URL = "https://buy.stripe.com/cNifZi0q5f4P7303nt0VO02";

const CHECKOUT_INTENT_URLS = {
  "starter-monthly": "https://buy.stripe.com/cNibJ22yd4qb2MK8HN0VO0R",
  "starter-yearly": "https://buy.stripe.com/cNidRadcR5ufafc7DJ0VO0S",
  "rising-monthly": "https://buy.stripe.com/bJe00k5KpcWH9b81fl0VO0P",
  "rising-yearly": "https://buy.stripe.com/3cI3cw1u9g8Tfzw0bh0VO0Q",
  "pro-monthly": "https://buy.stripe.com/8x23cw1u96yjfzw4rx0VO0N",
  "pro-yearly": "https://buy.stripe.com/6oU4gA4Glf4P5YW8HN0VO0O",
  [ANGELS_PRO_CHECKOUT_INTENT]: ANGELS_PRO_CHECKOUT_URL,
} as const;

type CheckoutIntent = keyof typeof CHECKOUT_INTENT_URLS;

type CheckoutUser = {
  email?: string | null;
  id?: string | null;
};

export function sanitizeCheckoutIntent(intent: string | null | undefined): CheckoutIntent | null {
  if (!intent) return null;
  const normalizedIntent = intent.trim() as CheckoutIntent;
  return normalizedIntent in CHECKOUT_INTENT_URLS ? normalizedIntent : null;
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
  return CHECKOUT_INTENT_URLS[safeIntent];
}

export function redirectToCheckoutIntent(
  intent: string | null | undefined,
  user?: CheckoutUser | null,
): void {
  if (typeof window === "undefined") return;

  const checkoutUrl = resolveCheckoutIntentUrl(intent);
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
