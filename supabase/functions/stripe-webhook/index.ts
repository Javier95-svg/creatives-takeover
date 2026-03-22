import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

const FALLBACK_TIER_CREDITS: Record<string, number> = {
  free: 25,
  creator: 100,
  professional: 300,
};

const CREDIT_PACK_CREDITS: Record<string, number> = {
  pack_20: 20,
  pack_40: 40,
  pack_60: 60,
};

type BillingCycle = "monthly" | "yearly";

const normalizeSubscriptionTier = (value: unknown): string => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (normalized === "pro") return "professional";
  if (normalized === "creator" || normalized === "professional" || normalized === "free") {
    return normalized;
  }

  return "free";
};

const normalizeBillingCycle = (value: unknown): BillingCycle => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized === "yearly" || normalized === "year" ? "yearly" : "monthly";
};

const inferTierFromAmount = (amount: number, interval?: string | null): string => {
  if (!amount || amount <= 0) return "free";
  if (interval === "year") {
    if (amount <= 35000) return "creator";
    if (amount <= 80000) return "professional";
    return "free";
  }

  if (amount <= 3500) return "creator";
  if (amount <= 8000) return "professional";
  return "free";
};

const getTierCredits = async (supabaseAdmin: any, tier: string): Promise<number> => {
  const normalizedTier = normalizeSubscriptionTier(tier);
  const { data } = await supabaseAdmin
    .from("subscription_tiers")
    .select("monthly_credits")
    .eq("tier_name", normalizedTier)
    .maybeSingle();

  return Number(data?.monthly_credits ?? FALLBACK_TIER_CREDITS[normalizedTier] ?? FALLBACK_TIER_CREDITS.free);
};

const getStripeCustomerContext = async (customerId: string | null | undefined) => {
  if (!customerId) {
    return { email: null as string | null, metadataUserId: null as string | null };
  }

  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer && !("deleted" in customer && customer.deleted)) {
      return {
        email: typeof customer.email === "string" ? customer.email : null,
        metadataUserId: typeof customer.metadata?.supabase_user_id === "string"
          ? customer.metadata.supabase_user_id
          : null,
      };
    }
  } catch (error) {
    console.error("[Webhook] Unable to load customer context:", error);
  }

  return { email: null, metadataUserId: null };
};

const resolveUserId = async (
  supabaseAdmin: any,
  {
    explicitUserId,
    customerId,
    customerEmail,
    customerMetadataUserId,
  }: {
    explicitUserId?: string | null;
    customerId?: string | null;
    customerEmail?: string | null;
    customerMetadataUserId?: string | null;
  }
) => {
  if (explicitUserId) return explicitUserId;
  if (customerMetadataUserId) return customerMetadataUserId;

  if (customerId) {
    const { data } = await supabaseAdmin
      .from("subscribers")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (data?.user_id) return data.user_id;
  }

  if (customerEmail) {
    const { data } = await supabaseAdmin
      .from("subscribers")
      .select("user_id")
      .eq("email", customerEmail)
      .maybeSingle();

    if (data?.user_id) return data.user_id;
  }

  return null;
};

const resolveSubscriptionTier = (subscription: any): string => {
  const metadataTier = subscription?.metadata?.tier ?? subscription?.metadata?.subscription_tier;
  if (typeof metadataTier === "string" && metadataTier.trim().length > 0) {
    return normalizeSubscriptionTier(metadataTier);
  }

  const item = subscription?.items?.data?.[0];
  const amount = Number(item?.price?.unit_amount ?? 0);
  const interval = item?.price?.recurring?.interval ?? null;
  return inferTierFromAmount(amount, interval);
};

const resolveSubscriptionBillingCycle = (subscription: any): BillingCycle => {
  const metadataCycle = subscription?.metadata?.billing_cycle;
  if (typeof metadataCycle === "string" && metadataCycle.trim().length > 0) {
    return normalizeBillingCycle(metadataCycle);
  }

  return subscription?.items?.data?.[0]?.price?.recurring?.interval === "year"
    ? "yearly"
    : "monthly";
};

const syncSubscriptionState = async (
  supabaseAdmin: any,
  {
    userId,
    email,
    stripeCustomerId,
    tier,
    billingCycle,
    subscribed,
    subscriptionEnd,
    grantQuota,
  }: {
    userId: string;
    email: string;
    stripeCustomerId?: string | null;
    tier: string;
    billingCycle: BillingCycle | null;
    subscribed: boolean;
    subscriptionEnd: string | null;
    grantQuota: boolean;
  }
) => {
  const normalizedTier = subscribed ? normalizeSubscriptionTier(tier) : "free";
  const nextBillingCycle = subscribed ? billingCycle : null;
  const tierCredits = await getTierCredits(supabaseAdmin, normalizedTier);
  const nowIso = new Date().toISOString();

  await supabaseAdmin.from("subscribers").upsert({
    email,
    user_id: userId,
    stripe_customer_id: stripeCustomerId ?? null,
    subscribed,
    subscription_tier: normalizedTier,
    subscription_end: subscriptionEnd,
    updated_at: nowIso,
  }, { onConflict: "user_id" });

  await supabaseAdmin
    .from("profiles")
    .update({
      stripe_customer_id: stripeCustomerId ?? null,
      subscribed,
      subscription_tier: normalizedTier,
      subscription_end: subscriptionEnd,
      billing_cycle: nextBillingCycle,
      monthly_credits: tierCredits,
      updated_at: nowIso,
    })
    .eq("id", userId);

  const { data: currentCredits } = await supabaseAdmin
    .from("user_credits")
    .select("balance, monthly_quota, subscription_tier, last_reset_at")
    .eq("user_id", userId)
    .maybeSingle();

  const currentBalance = Number(currentCredits?.balance ?? 0);
  const currentQuota = Number(currentCredits?.monthly_quota ?? 0);
  const currentTier = normalizeSubscriptionTier(currentCredits?.subscription_tier ?? "free");
  const shouldLiftQuota = subscribed && (grantQuota || currentTier !== normalizedTier || currentQuota <= 0);
  const nextQuota = subscribed
    ? (shouldLiftQuota ? Math.max(currentQuota, tierCredits) : currentQuota)
    : (currentCredits ? Math.min(currentQuota, FALLBACK_TIER_CREDITS.free) : FALLBACK_TIER_CREDITS.free);
  const shouldAdjustFreeQuota = !subscribed && (!currentCredits || nextQuota !== currentQuota || currentTier !== "free");

  const nextLastResetAt = subscribed
    ? (shouldLiftQuota ? nowIso : (currentCredits?.last_reset_at ?? nowIso))
    : (shouldAdjustFreeQuota ? nowIso : (currentCredits?.last_reset_at ?? nowIso));

  if (currentCredits) {
    await supabaseAdmin
      .from("user_credits")
      .update({
        balance: currentBalance,
        monthly_quota: nextQuota,
        subscription_tier: normalizedTier,
        last_reset_at: nextLastResetAt,
      })
      .eq("user_id", userId);
  } else {
    await supabaseAdmin
      .from("user_credits")
      .insert({
        user_id: userId,
        balance: currentBalance,
        monthly_quota: nextQuota,
        subscription_tier: normalizedTier,
        last_reset_at: nextLastResetAt,
      });
  }

  if (subscribed && nextQuota > currentQuota) {
    await supabaseAdmin.from("credit_transactions").insert({
      user_id: userId,
      amount: nextQuota - currentQuota,
      tx_type: "grant",
      reason: `Stripe ${normalizedTier} subscription credit allocation`,
      feature: `Subscription - ${normalizedTier}`,
      metadata: {
        grantType: "monthly_quota",
        previousQuota: currentQuota,
        newQuota: nextQuota,
        billingCycle: nextBillingCycle,
      },
    });
  }
};

async function handleCheckoutCompleted(session: any, supabaseAdmin: any) {
  console.log("[Checkout] Processing checkout.session.completed");

  const customerId = typeof session.customer === "string" ? session.customer : null;
  const customerEmailFromSession =
    typeof session.customer_details?.email === "string"
      ? session.customer_details.email
      : (typeof session.metadata?.user_email === "string" ? session.metadata.user_email : null);
  const customerContext = await getStripeCustomerContext(customerId);
  const customerEmail = customerEmailFromSession ?? customerContext.email;
  const explicitUserId = typeof session.metadata?.user_id === "string"
    ? session.metadata.user_id
    : (typeof session.client_reference_id === "string" ? session.client_reference_id : null);
  const resolvedUserId = await resolveUserId(supabaseAdmin, {
    explicitUserId,
    customerId,
    customerEmail,
    customerMetadataUserId: customerContext.metadataUserId,
  });

  if (session.mode === "payment") {
    await handleCreditPackPurchase(session, supabaseAdmin, resolvedUserId, customerEmail, customerId);
    return;
  }

  const tier = normalizeSubscriptionTier(session.metadata?.tier ?? session.metadata?.subscription_tier);
  const billingCycle = normalizeBillingCycle(session.metadata?.billing_cycle);

  if (!resolvedUserId || !customerEmail || tier === "free") {
    console.error("[Checkout] Missing subscription context", {
      resolvedUserId,
      customerEmail,
      tier,
      metadata: session.metadata,
    });
    return;
  }

  let subscriptionEnd: string | null = null;
  if (typeof session.subscription === "string") {
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
  }

  await syncSubscriptionState(supabaseAdmin, {
    userId: resolvedUserId,
    email: customerEmail,
    stripeCustomerId: customerId,
    tier,
    billingCycle,
    subscribed: true,
    subscriptionEnd,
    grantQuota: true,
  });

  console.log(`[Checkout] Subscription synced for ${resolvedUserId} (${tier}, ${billingCycle})`);
}

async function handleCreditPackPurchase(
  session: any,
  supabaseAdmin: any,
  resolvedUserId: string | null,
  customerEmail: string | null,
  customerId: string | null
) {
  console.log("[CreditPack] Processing one-time credit pack purchase");

  const packId = typeof session.metadata?.pack_id === "string" ? session.metadata.pack_id : null;
  if (!packId || !CREDIT_PACK_CREDITS[packId]) {
    console.error("[CreditPack] Invalid or missing pack_id in metadata:", session.metadata);
    return;
  }

  if (!resolvedUserId) {
    console.error("[CreditPack] Could not resolve user for purchase", {
      customerEmail,
      customerId,
      metadata: session.metadata,
    });
    return;
  }

  const creditsToAdd = CREDIT_PACK_CREDITS[packId];

  const { error: rpcError } = await supabaseAdmin.rpc("increment_credit_balance", {
    p_user_id: resolvedUserId,
    p_amount: creditsToAdd,
  });

  if (rpcError) {
    console.warn("[CreditPack] RPC increment failed, using fallback:", rpcError.message);
    const { data: currentCredits } = await supabaseAdmin
      .from("user_credits")
      .select("balance")
      .eq("user_id", resolvedUserId)
      .maybeSingle();

    const newBalance = Number(currentCredits?.balance ?? 0) + creditsToAdd;
    const { error: fallbackError } = await supabaseAdmin
      .from("user_credits")
      .upsert({
        user_id: resolvedUserId,
        balance: newBalance,
      }, { onConflict: "user_id" });

    if (fallbackError) {
      console.error("[CreditPack] Fallback credit update failed:", fallbackError);
      throw fallbackError;
    }
  }

  await supabaseAdmin.from("credit_transactions").insert({
    user_id: resolvedUserId,
    amount: creditsToAdd,
    tx_type: "purchase",
    reason: `Credit pack purchase: ${packId} (${creditsToAdd} credits)`,
    feature: "Credit Pack",
    metadata: {
      packId,
      stripeSessionId: session.id,
      customerEmail,
      customerId,
    },
  });

  console.log(`[CreditPack] Added ${creditsToAdd} credits to user ${resolvedUserId} (${packId})`);
}

async function handleSubscriptionChange(subscription: any, supabaseAdmin: any) {
  console.log("[Subscription] Processing subscription change");

  const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
  const customerContext = await getStripeCustomerContext(customerId);
  const customerEmail = customerContext.email;
  const explicitUserId = typeof subscription.metadata?.user_id === "string"
    ? subscription.metadata.user_id
    : null;
  const resolvedUserId = await resolveUserId(supabaseAdmin, {
    explicitUserId,
    customerId,
    customerEmail,
    customerMetadataUserId: customerContext.metadataUserId,
  });

  if (!resolvedUserId || !customerEmail) {
    console.error("[Subscription] Missing user context", { customerId, customerEmail });
    return;
  }

  const status = typeof subscription.status === "string" ? subscription.status : "";
  const isSubscribed = ["active", "trialing", "past_due"].includes(status);
  const tier = isSubscribed ? resolveSubscriptionTier(subscription) : "free";
  const billingCycle = isSubscribed ? resolveSubscriptionBillingCycle(subscription) : null;
  const subscriptionEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  await syncSubscriptionState(supabaseAdmin, {
    userId: resolvedUserId,
    email: customerEmail,
    stripeCustomerId: customerId,
    tier,
    billingCycle,
    subscribed: isSubscribed,
    subscriptionEnd,
    grantQuota: false,
  });

  console.log(`[Subscription] Synced ${resolvedUserId}: ${tier} (${status})`);
}

async function handleSubscriptionDeleted(subscription: any, supabaseAdmin: any) {
  console.log("[Subscription] Processing subscription deletion");

  const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
  const customerContext = await getStripeCustomerContext(customerId);
  const customerEmail = customerContext.email;
  const explicitUserId = typeof subscription.metadata?.user_id === "string"
    ? subscription.metadata.user_id
    : null;
  const resolvedUserId = await resolveUserId(supabaseAdmin, {
    explicitUserId,
    customerId,
    customerEmail,
    customerMetadataUserId: customerContext.metadataUserId,
  });

  if (!resolvedUserId || !customerEmail) {
    console.error("[Subscription] Missing user context for deletion", { customerId, customerEmail });
    return;
  }

  await syncSubscriptionState(supabaseAdmin, {
    userId: resolvedUserId,
    email: customerEmail,
    stripeCustomerId: customerId,
    tier: "free",
    billingCycle: null,
    subscribed: false,
    subscriptionEnd: null,
    grantQuota: false,
  });

  console.log(`[Subscription] Downgraded ${resolvedUserId} to free`);
}

async function handleInvoicePaid(invoice: any) {
  console.log("[Invoice] Received invoice.paid", {
    customer: invoice.customer,
    billingReason: invoice.billing_reason,
  });
}

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

  let eventId: string | null = null;

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    eventId = event.id;

    console.log(`[Webhook] Received event: ${event.type}`);

    const object = event.data.object as any;
    const customerId = typeof object.customer === "string" ? object.customer : null;
    const customerEmail =
      typeof object.customer_details?.email === "string"
        ? object.customer_details.email
        : (typeof object.customer_email === "string" ? object.customer_email : null);

    const { data: existingEvent } = await supabaseAdmin
      .from("stripe_webhook_events")
      .select("processed")
      .eq("event_id", event.id)
      .maybeSingle();

    if (existingEvent?.processed) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!existingEvent) {
      await supabaseAdmin.from("stripe_webhook_events").insert({
        event_id: event.id,
        event_type: event.type,
        customer_id: customerId,
        customer_email: customerEmail,
        subscription_id: typeof object.subscription === "string" ? object.subscription : null,
        payload: event,
        processed: false,
      });
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(object, supabaseAdmin);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChange(object, supabaseAdmin);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(object, supabaseAdmin);
        break;
      case "invoice.paid":
        await handleInvoicePaid(object);
        break;
      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    await supabaseAdmin
      .from("stripe_webhook_events")
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("event_id", event.id);

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[Webhook] Error:", err.message);

    if (eventId) {
      await supabaseAdmin
        .from("stripe_webhook_events")
        .update({
          error_message: err.message,
          processed: false,
        })
        .eq("event_id", eventId);
    }

    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});
