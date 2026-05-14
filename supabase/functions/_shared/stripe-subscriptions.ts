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
  p_subscription_end: toIsoOrNull(subscription?.current_period_end),
  p_billing_anchor_at: toIsoOrNull(subscription?.billing_cycle_anchor ?? subscription?.current_period_start),
  p_current_period_start: toIsoOrNull(subscription?.current_period_start),
  p_current_period_end: toIsoOrNull(subscription?.current_period_end),
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
