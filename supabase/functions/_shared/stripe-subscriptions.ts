export type StripeBillingCycle = "monthly" | "yearly";

export type StripeSubscriptionRpcEvent = {
  stripeEventId: string;
  stripeEventType: string;
};

const toIsoOrNull = (unixSeconds: unknown) => (
  typeof unixSeconds === "number" && Number.isFinite(unixSeconds)
    ? new Date(unixSeconds * 1000).toISOString()
    : null
);

export const normalizeStripeBillingCycle = (value: unknown): StripeBillingCycle => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized === "year" || normalized === "yearly" ? "yearly" : "monthly";
};

export const getStripeSubscriptionPriceId = (subscription: any): string | null => {
  const priceId = subscription?.items?.data?.[0]?.price?.id;
  return typeof priceId === "string" && priceId.trim().length > 0 ? priceId.trim() : null;
};

export const getStripeSubscriptionBillingCycle = (subscription: any): StripeBillingCycle => {
  return normalizeStripeBillingCycle(subscription?.items?.data?.[0]?.price?.recurring?.interval);
};

// Stripe's 2025 "Basil" releases moved the billing period off the subscription
// and onto its items, and moved an invoice's subscription pointer under
// `parent`. Objects we fetch through the SDK come back in the pinned
// 2023-10-16 shape, but `event.data.object` arrives in the *endpoint's* API
// version (currently 2026-01-28.clover), so a delivered payload can carry
// either shape. These readers accept both — the legacy path first, then the
// newer location. Reading only the legacy path fails silently: the field is
// simply undefined, so renewals look like non-subscription invoices and get
// skipped without an error.
const firstFiniteNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
};

export const getStripeSubscriptionPeriodStart = (subscription: any): number | null =>
  firstFiniteNumber(
    subscription?.current_period_start,
    subscription?.items?.data?.[0]?.current_period_start,
  );

export const getStripeSubscriptionPeriodEnd = (subscription: any): number | null =>
  firstFiniteNumber(
    subscription?.current_period_end,
    subscription?.items?.data?.[0]?.current_period_end,
  );

const asStripeId = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (value && typeof value === "object") {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string" && id.trim().length > 0) return id.trim();
  }
  return null;
};

/** Subscription id from an invoice payload, across API versions. */
export const getStripeInvoiceSubscriptionId = (invoice: any): string | null =>
  asStripeId(invoice?.subscription)
  ?? asStripeId(invoice?.parent?.subscription_details?.subscription)
  ?? asStripeId(invoice?.lines?.data?.[0]?.parent?.subscription_item_details?.subscription);

export const buildApplyStripeSubscriptionCheckoutRpcPayload = ({
  userId,
  email,
  stripeCustomerId,
  subscription,
  event,
}: {
  userId: string;
  email: string;
  stripeCustomerId: string | null;
  subscription: any;
  event: StripeSubscriptionRpcEvent;
}) => ({
  p_user_id: userId,
  p_email: email,
  p_stripe_customer_id: stripeCustomerId,
  p_stripe_subscription_id: typeof subscription?.id === "string" ? subscription.id : null,
  p_stripe_price_id: getStripeSubscriptionPriceId(subscription),
  p_stripe_event_id: event.stripeEventId,
  p_stripe_event_type: event.stripeEventType,
  p_billing_cycle: getStripeSubscriptionBillingCycle(subscription),
  p_subscription_end: toIsoOrNull(getStripeSubscriptionPeriodEnd(subscription)),
  p_billing_anchor_at: toIsoOrNull(
    subscription?.billing_cycle_anchor ?? getStripeSubscriptionPeriodStart(subscription),
  ),
  p_current_period_start: toIsoOrNull(getStripeSubscriptionPeriodStart(subscription)),
  p_current_period_end: toIsoOrNull(getStripeSubscriptionPeriodEnd(subscription)),
});

export const buildDowngradeStripeSubscriptionToRookieRpcPayload = ({
  userId,
  stripeCustomerId,
  subscription,
  event,
}: {
  userId: string;
  stripeCustomerId: string | null;
  subscription: any;
  event: StripeSubscriptionRpcEvent;
}) => ({
  p_user_id: userId,
  p_stripe_customer_id: stripeCustomerId,
  p_stripe_subscription_id: typeof subscription?.id === "string" ? subscription.id : null,
  p_stripe_event_id: event.stripeEventId,
  p_stripe_event_type: event.stripeEventType,
});
