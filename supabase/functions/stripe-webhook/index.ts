import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { resolveMonthlyBillingWindow } from "../_shared/billing-period.ts";
import { normalizePlan as normalizeSubscriptionTier, PLAN_MONTHLY_CREDITS } from "../_shared/plan-enforcement.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

const CREDIT_PACK_CREDITS: Record<string, number> = {
  pack_20: 20,
  pack_40: 40,
  pack_60: 60,
};

type BillingCycle = "monthly" | "yearly";

const normalizeBillingCycle = (value: unknown): BillingCycle => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized === "yearly" || normalized === "year" ? "yearly" : "monthly";
};

const inferTierFromAmount = (amount: number, interval?: string | null): string => {
  if (!amount || amount <= 0) return "rookie";
  if (interval === "year") {
    if (amount === 7900) return "starter";
    if (amount === 23900) return "rising";
    if (amount === 58900) return "pro";
    return "rookie";
  }

  if (amount === 900) return "starter";
  if (amount === 2900) return "rising";
  if (amount === 6500) return "pro";
  return "rookie";
};

const getTierCredits = async (supabaseAdmin: any, tier: string): Promise<number> => {
  const normalizedTier = normalizeSubscriptionTier(tier);
  const { data } = await supabaseAdmin
    .from("subscription_tiers")
    .select("monthly_credits")
    .eq("tier_name", normalizedTier)
    .maybeSingle();

  return Number(data?.monthly_credits ?? PLAN_MONTHLY_CREDITS[normalizedTier]);
};

const toIsoOrNull = (unixSeconds?: number | null) => (
  typeof unixSeconds === "number" && Number.isFinite(unixSeconds)
    ? new Date(unixSeconds * 1000).toISOString()
    : null
);

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

const mergeMetadata = (...sources: Array<Record<string, unknown> | null | undefined>) => {
  return sources.reduce<Record<string, unknown>>((acc, source) => {
    if (!source) return acc;

    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined && value !== null) {
        acc[key] = value;
      }
    }

    return acc;
  }, {});
};

const getMetadataString = (
  metadata: Record<string, unknown> | null | undefined,
  keys: string[]
): string | null => {
  if (!metadata) return null;

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
};

const parsePositiveInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }

  return null;
};

const getPaymentLinkMetadata = async (paymentLinkId: string | null | undefined) => {
  if (!paymentLinkId) return {} as Record<string, unknown>;

  try {
    const paymentLink = await stripe.paymentLinks.retrieve(paymentLinkId);
    return (paymentLink.metadata ?? {}) as Record<string, unknown>;
  } catch (error) {
    console.error("[Webhook] Unable to load payment link metadata:", error);
    return {} as Record<string, unknown>;
  }
};

const getCreditPackByLookup = async (
  supabaseAdmin: any,
  {
    packId,
    credits,
    amountCents,
  }: {
    packId?: string | null;
    credits?: number | null;
    amountCents?: number | null;
  }
) => {
  if (packId) {
    const { data } = await supabaseAdmin
      .from("credit_packs")
      .select("id, credits, price_cents, label")
      .eq("id", packId)
      .eq("active", true)
      .maybeSingle();

    if (data) return data;
  }

  if (credits) {
    const { data } = await supabaseAdmin
      .from("credit_packs")
      .select("id, credits, price_cents, label")
      .eq("credits", credits)
      .eq("active", true)
      .maybeSingle();

    if (data) return data;
  }

  if (amountCents) {
    const { data } = await supabaseAdmin
      .from("credit_packs")
      .select("id, credits, price_cents, label")
      .eq("price_cents", amountCents)
      .eq("active", true)
      .maybeSingle();

    if (data) return data;
  }

  return null;
};

const resolveCreditPackPurchase = async (
  supabaseAdmin: any,
  metadata: Record<string, unknown>,
  amountCents: number | null
) => {
  const packId = getMetadataString(metadata, ["pack_id", "packId"]);
  const metadataCredits = parsePositiveInteger(
    getMetadataString(metadata, ["credits", "credit_amount", "creditAmount", "top_up_credits"])
  );

  const pack = await getCreditPackByLookup(supabaseAdmin, {
    packId,
    credits: metadataCredits,
    amountCents,
  });

  if (pack) {
    return {
      id: String(pack.id),
      credits: Number(pack.credits),
      price_cents: Number(pack.price_cents),
      label: typeof pack.label === "string" ? pack.label : null,
    };
  }

  if (packId && CREDIT_PACK_CREDITS[packId]) {
    return {
      id: packId,
      credits: CREDIT_PACK_CREDITS[packId],
      price_cents: amountCents ?? 0,
      label: null,
    };
  }

  if (metadataCredits) {
    return {
      id: packId ?? `credits_${metadataCredits}`,
      credits: metadataCredits,
      price_cents: amountCents ?? 0,
      label: null,
    };
  }

  return null;
};

const getExistingCreditPurchase = async (
  supabaseAdmin: any,
  userId: string,
  idempotencyKey: string
) => {
  const { data } = await supabaseAdmin
    .from("credit_transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("tx_type", "purchase")
    .eq("feature", "Credit Pack")
    .contains("metadata", { idempotencyKey })
    .maybeSingle();

  return data;
};

const createCreditPurchaseNotification = async (
  supabaseAdmin: any,
  {
    userId,
    creditsAdded,
    packId,
  }: {
    userId: string;
    creditsAdded: number;
    packId: string;
  }
) => {
  try {
    await supabaseAdmin.from("community_notifications").insert({
      user_id: userId,
      actor_id: userId,
      notification_type: "credit_purchase_completed",
      metadata: {
        creditsAdded,
        packId,
        route: "/pricing#credit-packs",
        message: `${creditsAdded} credits were added to your balance.`,
      },
    });
  } catch (error) {
    console.error("[CreditPack] Unable to create confirmation notification:", error);
  }
};

const resetSubscriptionQuotaForInvoice = async (
  supabaseAdmin: any,
  {
    userId,
    tier,
    billingCycle,
    invoiceId,
    subscriptionId,
    amountPaid,
    appliedAt,
    billingAnchorAt,
  }: {
    userId: string;
    tier: string;
    billingCycle: BillingCycle;
    invoiceId: string;
    subscriptionId: string | null;
    amountPaid: number;
    appliedAt: string;
    billingAnchorAt: string | null;
  }
) => {
  const normalizedTier = normalizeSubscriptionTier(tier);
  if (normalizedTier === "rookie") return;
  if (billingCycle !== "monthly") return;

  const tierCredits = await getTierCredits(supabaseAdmin, normalizedTier);
  const idempotencyKey = `stripe:subscription_quota:${invoiceId}`;
  const idempotencyStatus = await supabaseAdmin.rpc("idempotency_try_begin", {
    p_id: idempotencyKey,
  });

  if (idempotencyStatus !== "started") {
    console.log(`[Invoice] Skipping duplicate subscription credit reset (${idempotencyStatus})`, {
      idempotencyKey,
      userId,
      invoiceId,
    });
    return;
  }

  try {
    const { data: currentCredits } = await supabaseAdmin
      .from("user_credits")
      .select("balance, monthly_quota, subscription_tier")
      .eq("user_id", userId)
      .maybeSingle();

    const previousQuota = Number(currentCredits?.monthly_quota ?? 0);
    const currentBalance = Number(currentCredits?.balance ?? 0);

    if (currentCredits) {
      const billingWindow = resolveMonthlyBillingWindow(billingAnchorAt ?? appliedAt, new Date(appliedAt));
      await supabaseAdmin
        .from("user_credits")
        .update({
          balance: currentBalance,
          monthly_quota: tierCredits,
          subscription_tier: normalizedTier,
          last_reset_at: appliedAt,
          last_credit_grant: appliedAt,
          billing_anchor_at: billingWindow.anchorAt.toISOString(),
          current_period_start: billingWindow.periodStart.toISOString(),
          current_period_end: billingWindow.periodEnd.toISOString(),
        })
        .eq("user_id", userId);
    } else {
      const billingWindow = resolveMonthlyBillingWindow(billingAnchorAt ?? appliedAt, new Date(appliedAt));
      await supabaseAdmin
        .from("user_credits")
        .insert({
          user_id: userId,
          balance: currentBalance,
          monthly_quota: tierCredits,
          subscription_tier: normalizedTier,
          last_reset_at: appliedAt,
          last_credit_grant: appliedAt,
          billing_anchor_at: billingWindow.anchorAt.toISOString(),
          current_period_start: billingWindow.periodStart.toISOString(),
          current_period_end: billingWindow.periodEnd.toISOString(),
        });
    }

    await supabaseAdmin.from("credit_transactions").insert({
      user_id: userId,
      amount: tierCredits - previousQuota,
      tx_type: "reset",
      reason: `Stripe ${normalizedTier} subscription credits refreshed after payment confirmation`,
      feature: `Subscription - ${normalizedTier}`,
      metadata: {
        idempotencyKey,
        grantType: "billing_cycle_reset",
        previousQuota,
        newQuota: tierCredits,
        invoiceId,
        subscriptionId,
        billingCycle,
        amountPaid,
      },
    });

    await supabaseAdmin.rpc("idempotency_mark_completed", {
      p_id: idempotencyKey,
      p_result: {
        status: "quota_reset",
        userId,
        tier: normalizedTier,
        previousQuota,
        newQuota: tierCredits,
        invoiceId,
      },
    });

    console.log(`[Invoice] Refreshed ${normalizedTier} quota for ${userId}: ${previousQuota} -> ${tierCredits}`);
  } catch (error) {
    await supabaseAdmin.rpc("idempotency_clear", {
      p_id: idempotencyKey,
    });
    throw error;
  }
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
    billingAnchorAt,
    stripeCurrentPeriodStart,
    stripeCurrentPeriodEnd,
  }: {
    userId: string;
    email: string;
    stripeCustomerId?: string | null;
    tier: string;
    billingCycle: BillingCycle | null;
    subscribed: boolean;
    subscriptionEnd: string | null;
    grantQuota: boolean;
    billingAnchorAt?: string | null;
    stripeCurrentPeriodStart?: string | null;
    stripeCurrentPeriodEnd?: string | null;
  }
) => {
  const normalizedTier = subscribed ? normalizeSubscriptionTier(tier) : "rookie";
  const nextBillingCycle = subscribed ? billingCycle : null;
  const tierCredits = await getTierCredits(supabaseAdmin, normalizedTier);
  const nowIso = new Date().toISOString();
  const resolvedAnchor = billingAnchorAt ?? nowIso;
  const monthlyBillingWindow = resolveMonthlyBillingWindow(resolvedAnchor, new Date(nowIso));

  await supabaseAdmin.from("subscribers").upsert({
    email,
    user_id: userId,
    stripe_customer_id: stripeCustomerId ?? null,
    subscribed,
    subscription_tier: normalizedTier,
    subscription_end: subscriptionEnd,
    billing_anchor_at: resolvedAnchor,
    current_period_start: subscribed
      ? (stripeCurrentPeriodStart ?? monthlyBillingWindow.periodStart.toISOString())
      : monthlyBillingWindow.periodStart.toISOString(),
    current_period_end: subscribed
      ? (stripeCurrentPeriodEnd ?? subscriptionEnd ?? monthlyBillingWindow.periodEnd.toISOString())
      : monthlyBillingWindow.periodEnd.toISOString(),
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
    .select("balance, monthly_quota, subscription_tier, last_reset_at, billing_anchor_at, current_period_start, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  const currentBalance = Number(currentCredits?.balance ?? 0);
  const currentQuota = Number(currentCredits?.monthly_quota ?? 0);
  const currentTier = normalizeSubscriptionTier(currentCredits?.subscription_tier ?? "rookie");
  const shouldLiftQuota = subscribed && (grantQuota || currentTier !== normalizedTier || currentQuota <= 0);
  const nextQuota = subscribed
    ? (shouldLiftQuota ? Math.max(currentQuota, tierCredits) : currentQuota)
    : (currentCredits ? Math.min(currentQuota, PLAN_MONTHLY_CREDITS.rookie) : PLAN_MONTHLY_CREDITS.rookie);
  const shouldAdjustRookieQuota = !subscribed && (!currentCredits || nextQuota !== currentQuota || currentTier !== "rookie");

  const nextLastResetAt = subscribed
    ? (shouldLiftQuota ? nowIso : (currentCredits?.last_reset_at ?? nowIso))
    : (shouldAdjustRookieQuota ? nowIso : (currentCredits?.last_reset_at ?? nowIso));
  const nextAnchorAt = subscribed
    ? resolvedAnchor
    : (billingAnchorAt ?? (currentCredits?.billing_anchor_at as string | null | undefined) ?? nowIso);
  const nextMonthlyWindow = resolveMonthlyBillingWindow(nextAnchorAt, new Date(nowIso));

  if (currentCredits) {
    await supabaseAdmin
      .from("user_credits")
      .update({
        balance: currentBalance,
        monthly_quota: nextQuota,
        subscription_tier: normalizedTier,
        last_reset_at: nextLastResetAt,
        billing_anchor_at: nextMonthlyWindow.anchorAt.toISOString(),
        current_period_start: nextMonthlyWindow.periodStart.toISOString(),
        current_period_end: nextMonthlyWindow.periodEnd.toISOString(),
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
        billing_anchor_at: nextMonthlyWindow.anchorAt.toISOString(),
        current_period_start: nextMonthlyWindow.periodStart.toISOString(),
        current_period_end: nextMonthlyWindow.periodEnd.toISOString(),
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
  const paymentLinkId = typeof session.payment_link === "string" ? session.payment_link : null;
  const paymentLinkMetadata = await getPaymentLinkMetadata(paymentLinkId);
  const combinedMetadata = mergeMetadata(
    paymentLinkMetadata,
    session.metadata as Record<string, unknown> | null | undefined
  );

  const customerEmailFromSession =
    typeof session.customer_details?.email === "string"
      ? session.customer_details.email
      : getMetadataString(combinedMetadata, ["user_email", "customer_email"]);
  const customerContext = await getStripeCustomerContext(customerId);
  const customerEmail = customerEmailFromSession ?? customerContext.email;
  const explicitUserId =
    getMetadataString(combinedMetadata, ["user_id"]) ??
    (typeof session.client_reference_id === "string" ? session.client_reference_id : null);
  const resolvedUserId = await resolveUserId(supabaseAdmin, {
    explicitUserId,
    customerId,
    customerEmail,
    customerMetadataUserId: customerContext.metadataUserId,
  });

  if (session.mode === "payment") {
    await handleCreditPackPurchase({
      supabaseAdmin,
      resolvedUserId,
      customerEmail,
      customerId,
      metadata: combinedMetadata,
      amountCents: Number(session.amount_total ?? session.amount_subtotal ?? 0) || null,
      checkoutSessionId: typeof session.id === "string" ? session.id : null,
      paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
      paymentLinkId,
      sourceEventType: "checkout.session.completed",
    });
    return;
  }

  const metadataTier = getMetadataString(combinedMetadata, ["tier", "subscription_tier"]);
  const metadataBillingCycle = getMetadataString(combinedMetadata, ["billing_cycle"]);

  let tier = metadataTier ? normalizeSubscriptionTier(metadataTier) : "rookie";
  let billingCycle: BillingCycle = metadataBillingCycle
    ? normalizeBillingCycle(metadataBillingCycle)
    : "monthly";
  let subscriptionEnd: string | null = null;

  if (typeof session.subscription === "string") {
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

    if (!metadataTier) {
      tier = resolveSubscriptionTier(subscription);
    }

    if (!metadataBillingCycle) {
      billingCycle = resolveSubscriptionBillingCycle(subscription);
    }
  }

  if (!resolvedUserId || !customerEmail || tier === "rookie") {
    console.error("[Checkout] Missing subscription context", {
      resolvedUserId,
      customerEmail,
      tier,
      metadata: combinedMetadata,
      paymentLinkId,
    });
    return;
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

async function handleCreditPackPurchase({
  supabaseAdmin,
  resolvedUserId,
  customerEmail,
  customerId,
  metadata,
  amountCents,
  checkoutSessionId,
  paymentIntentId,
  paymentLinkId,
  sourceEventType,
}: {
  supabaseAdmin: any;
  resolvedUserId: string | null;
  customerEmail: string | null;
  customerId: string | null;
  metadata: Record<string, unknown>;
  amountCents: number | null;
  checkoutSessionId: string | null;
  paymentIntentId: string | null;
  paymentLinkId: string | null;
  sourceEventType: string;
}) {
  console.log("[CreditPack] Processing credit pack purchase");

  const purchaseType = getMetadataString(metadata, ["purchase_type"]);
  const explicitPackId = getMetadataString(metadata, ["pack_id", "packId"]);
  const explicitCredits = parsePositiveInteger(
    getMetadataString(metadata, ["credits", "credit_amount", "creditAmount", "top_up_credits"])
  );

  if (purchaseType !== "credit_pack" && !paymentLinkId && !explicitPackId && !explicitCredits) {
    console.log("[CreditPack] Skipping non-credit-pack payment event");
    return;
  }

  const purchase = await resolveCreditPackPurchase(supabaseAdmin, metadata, amountCents);
  if (!purchase) {
    console.error("[CreditPack] Unable to resolve purchased credit pack", {
      metadata,
      amountCents,
      paymentLinkId,
      checkoutSessionId,
      paymentIntentId,
    });
    return;
  }

  if (!resolvedUserId) {
    console.error("[CreditPack] Could not resolve user for purchase", {
      customerEmail,
      customerId,
      metadata,
      amountCents,
      paymentLinkId,
    });
    return;
  }

  const purchaseReference = paymentIntentId ?? checkoutSessionId ?? `${purchase.id}:${resolvedUserId}`;
  const idempotencyKey = `stripe:credit_purchase:${purchaseReference}`;
  const idempotencyStatus = await supabaseAdmin.rpc("idempotency_try_begin", {
    p_id: idempotencyKey,
  });

  if (idempotencyStatus !== "started") {
    const existingPurchase = await getExistingCreditPurchase(supabaseAdmin, resolvedUserId, idempotencyKey);
    if (existingPurchase && idempotencyStatus !== "completed") {
      await supabaseAdmin.rpc("idempotency_mark_completed", {
        p_id: idempotencyKey,
        p_result: {
          status: "already_recorded",
          transactionId: existingPurchase.id,
        },
      });
    }

    console.log(`[CreditPack] Skipping duplicate purchase event (${idempotencyStatus})`, {
      idempotencyKey,
      resolvedUserId,
    });
    return;
  }

  try {
    const { error: rpcError } = await supabaseAdmin.rpc("increment_credit_balance", {
      p_user_id: resolvedUserId,
      p_amount: purchase.credits,
    });

    if (rpcError) {
      console.warn("[CreditPack] RPC increment failed, using fallback:", rpcError.message);
      const { data: currentCredits } = await supabaseAdmin
        .from("user_credits")
        .select("balance, monthly_quota, subscription_tier, last_reset_at")
        .eq("user_id", resolvedUserId)
        .maybeSingle();

      const nextBalance = Number(currentCredits?.balance ?? 0) + purchase.credits;
      const { error: fallbackError } = await supabaseAdmin
        .from("user_credits")
        .upsert({
          user_id: resolvedUserId,
          balance: nextBalance,
          monthly_quota: Number(currentCredits?.monthly_quota ?? 25),
          subscription_tier: normalizeSubscriptionTier(currentCredits?.subscription_tier ?? "rookie"),
          last_reset_at: currentCredits?.last_reset_at ?? new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (fallbackError) {
        console.error("[CreditPack] Fallback credit update failed:", fallbackError);
        throw fallbackError;
      }
    }

    await supabaseAdmin.from("credit_transactions").insert({
      user_id: resolvedUserId,
      amount: purchase.credits,
      tx_type: "purchase",
      reason: `Credit pack purchase: ${purchase.id} (${purchase.credits} credits)`,
      feature: "Credit Pack",
      metadata: {
        idempotencyKey,
        packId: purchase.id,
        packLabel: purchase.label,
        creditsAdded: purchase.credits,
        priceCents: purchase.price_cents,
        stripeSessionId: checkoutSessionId,
        stripePaymentIntentId: paymentIntentId,
        stripePaymentLinkId: paymentLinkId,
        customerEmail,
        customerId,
        sourceEventType,
      },
    });

    await createCreditPurchaseNotification(supabaseAdmin, {
      userId: resolvedUserId,
      creditsAdded: purchase.credits,
      packId: purchase.id,
    });

    await supabaseAdmin.rpc("idempotency_mark_completed", {
      p_id: idempotencyKey,
      p_result: {
        status: "credited",
        userId: resolvedUserId,
        creditsAdded: purchase.credits,
        packId: purchase.id,
        stripeSessionId: checkoutSessionId,
        stripePaymentIntentId: paymentIntentId,
      },
    });

    console.log(`[CreditPack] Added ${purchase.credits} credits to user ${resolvedUserId} (${purchase.id})`);
  } catch (error) {
    await supabaseAdmin.rpc("idempotency_clear", {
      p_id: idempotencyKey,
    });
    throw error;
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: any, supabaseAdmin: any) {
  console.log("[PaymentIntent] Processing payment_intent.succeeded");

  if (paymentIntent.invoice) {
    console.log("[PaymentIntent] Skipping invoice-backed payment intent");
    return;
  }

  const metadata = (paymentIntent.metadata ?? {}) as Record<string, unknown>;
  const purchaseType = getMetadataString(metadata, ["purchase_type"]);
  const explicitPackId = getMetadataString(metadata, ["pack_id", "packId"]);
  const explicitCredits = parsePositiveInteger(
    getMetadataString(metadata, ["credits", "credit_amount", "creditAmount", "top_up_credits"])
  );

  if (purchaseType !== "credit_pack" && !explicitPackId && !explicitCredits) {
    console.log("[PaymentIntent] Skipping non-credit-pack payment intent");
    return;
  }

  const customerId = typeof paymentIntent.customer === "string" ? paymentIntent.customer : null;
  const customerContext = await getStripeCustomerContext(customerId);
  const customerEmail =
    typeof paymentIntent.receipt_email === "string"
      ? paymentIntent.receipt_email
      : customerContext.email;
  const explicitUserId = getMetadataString(metadata, ["user_id"]);
  const resolvedUserId = await resolveUserId(supabaseAdmin, {
    explicitUserId,
    customerId,
    customerEmail,
    customerMetadataUserId: customerContext.metadataUserId,
  });

  await handleCreditPackPurchase({
    supabaseAdmin,
    resolvedUserId,
    customerEmail,
    customerId,
    metadata,
    amountCents: Number(paymentIntent.amount_received ?? paymentIntent.amount ?? 0) || null,
    checkoutSessionId: null,
    paymentIntentId: typeof paymentIntent.id === "string" ? paymentIntent.id : null,
    paymentLinkId: null,
    sourceEventType: "payment_intent.succeeded",
  });
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
  const tier = isSubscribed ? resolveSubscriptionTier(subscription) : "rookie";
  const billingCycle = isSubscribed ? resolveSubscriptionBillingCycle(subscription) : null;
  const subscriptionEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  const stripeCurrentPeriodStart = toIsoOrNull(subscription.current_period_start ?? null);
  const billingAnchorAt = toIsoOrNull(subscription.billing_cycle_anchor ?? subscription.current_period_start ?? null);

  await syncSubscriptionState(supabaseAdmin, {
    userId: resolvedUserId,
    email: customerEmail,
    stripeCustomerId: customerId,
    tier,
    billingCycle,
    subscribed: isSubscribed,
    subscriptionEnd,
    grantQuota: false,
    billingAnchorAt,
    stripeCurrentPeriodStart,
    stripeCurrentPeriodEnd: subscriptionEnd,
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
    tier: "rookie",
    billingCycle: null,
    subscribed: false,
    subscriptionEnd: null,
    grantQuota: false,
    billingAnchorAt: new Date().toISOString(),
    stripeCurrentPeriodStart: null,
    stripeCurrentPeriodEnd: null,
  });

  console.log(`[Subscription] Downgraded ${resolvedUserId} to rookie`);
}

async function handleInvoicePaid(invoice: any, supabaseAdmin: any) {
  console.log("[Invoice] Received invoice.paid", {
    customer: invoice.customer,
    billingReason: invoice.billing_reason,
  });

  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : null;
  if (!subscriptionId) {
    console.log("[Invoice] Skipping non-subscription invoice");
    return;
  }

  const billingReason = typeof invoice.billing_reason === "string" ? invoice.billing_reason : "";
  const eligibleBillingReasons = new Set(["subscription_create", "subscription_cycle", "subscription_update"]);
  if (!eligibleBillingReasons.has(billingReason)) {
    console.log("[Invoice] Skipping unsupported billing reason", { billingReason, subscriptionId });
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : (typeof invoice.customer === "string" ? invoice.customer : null);
  const customerContext = await getStripeCustomerContext(customerId);
  const customerEmail =
    typeof invoice.customer_email === "string"
      ? invoice.customer_email
      : customerContext.email;
  const explicitUserId = typeof subscription.metadata?.user_id === "string"
    ? subscription.metadata.user_id
    : getMetadataString(invoice.metadata as Record<string, unknown> | null | undefined, ["user_id"]);
  const resolvedUserId = await resolveUserId(supabaseAdmin, {
    explicitUserId,
    customerId,
    customerEmail,
    customerMetadataUserId: customerContext.metadataUserId,
  });

  if (!resolvedUserId || !customerEmail) {
    console.error("[Invoice] Missing user context", {
      subscriptionId,
      customerId,
      customerEmail,
      explicitUserId,
    });
    return;
  }

  const tier = resolveSubscriptionTier(subscription);
  const billingCycle = resolveSubscriptionBillingCycle(subscription);
  const subscriptionEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  const stripeCurrentPeriodStart = toIsoOrNull(subscription.current_period_start ?? null);
  const billingAnchorAt = toIsoOrNull(subscription.billing_cycle_anchor ?? subscription.current_period_start ?? null);
  const appliedAt = typeof invoice.status_transitions?.paid_at === "number"
    ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
    : new Date().toISOString();

  await syncSubscriptionState(supabaseAdmin, {
    userId: resolvedUserId,
    email: customerEmail,
    stripeCustomerId: customerId,
    tier,
    billingCycle,
    subscribed: true,
    subscriptionEnd,
    grantQuota: false,
    billingAnchorAt,
    stripeCurrentPeriodStart,
    stripeCurrentPeriodEnd: subscriptionEnd,
  });

  await resetSubscriptionQuotaForInvoice(supabaseAdmin, {
    userId: resolvedUserId,
    tier,
    billingCycle,
    invoiceId: typeof invoice.id === "string" ? invoice.id : `${subscriptionId}:${billingReason}`,
    subscriptionId,
    amountPaid: Number(invoice.amount_paid ?? 0),
    appliedAt,
    billingAnchorAt,
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
        : (typeof object.customer_email === "string"
          ? object.customer_email
          : (typeof object.receipt_email === "string" ? object.receipt_email : null));

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
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(object, supabaseAdmin);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChange(object, supabaseAdmin);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(object, supabaseAdmin);
        break;
      case "invoice.paid":
        await handleInvoicePaid(object, supabaseAdmin);
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
