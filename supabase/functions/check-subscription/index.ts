import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRO_OVERRIDE_EMAILS = new Set([
  "uneebkhanzada91@gmail.com",
  "does@elevatedynamics.pt",
  "adam@tiplo.ai",
  "apembertona@gmail.com",
]);

const PRO_OVERRIDE_USER_IDS = new Set([
  "f2fa28f8-7889-4397-b17b-478488435b84",
  "15bba750-6594-4f48-a101-0c02a404835e",
  "c6aba37d-847a-439e-848d-d6874b7d245a",
  "b05d6111-0940-4403-a710-92901fcbf034",
]);

const FALLBACK_TIER_CREDITS: Record<string, number> = {
  free: 25,
  creator: 100,
  professional: 300,
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

const normalizeSubscriptionTier = (value: unknown): string => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (normalized === "pro") return "professional";
  if (normalized === "creator" || normalized === "professional" || normalized === "free") {
    return normalized;
  }

  return "free";
};

const normalizeBillingCycle = (value: unknown): "monthly" | "yearly" => {
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

const getTierCredits = async (supabaseService: any, tier: string): Promise<number> => {
  const normalizedTier = normalizeSubscriptionTier(tier);
  const { data } = await supabaseService
    .from("subscription_tiers")
    .select("monthly_credits")
    .eq("tier_name", normalizedTier)
    .maybeSingle();

  return Number(data?.monthly_credits ?? FALLBACK_TIER_CREDITS[normalizedTier] ?? FALLBACK_TIER_CREDITS.free);
};

const syncSubscriptionState = async (
  supabaseService: any,
  {
    userId,
    email,
    stripeCustomerId,
    subscribed,
    subscriptionTier,
    subscriptionEnd,
    billingCycle,
    forceQuotaFloor,
  }: {
    userId: string;
    email: string;
    stripeCustomerId: string | null;
    subscribed: boolean;
    subscriptionTier: string;
    subscriptionEnd: string | null;
    billingCycle: "monthly" | "yearly" | null;
    forceQuotaFloor: boolean;
  }
) => {
  const normalizedTier = subscribed ? normalizeSubscriptionTier(subscriptionTier) : "free";
  const nowIso = new Date().toISOString();
  const tierCredits = await getTierCredits(supabaseService, normalizedTier);

  await supabaseService.from("subscribers").upsert({
    email,
    user_id: userId,
    stripe_customer_id: stripeCustomerId,
    subscribed,
    subscription_tier: normalizedTier,
    subscription_end: subscriptionEnd,
    updated_at: nowIso,
  }, { onConflict: "user_id" });

  await supabaseService
    .from("profiles")
    .update({
      stripe_customer_id: stripeCustomerId,
      subscribed,
      subscription_tier: normalizedTier,
      subscription_end: subscriptionEnd,
      billing_cycle: subscribed ? billingCycle : null,
      monthly_credits: tierCredits,
      updated_at: nowIso,
    })
    .eq("id", userId);

  const { data: currentCredits } = await supabaseService
    .from("user_credits")
    .select("balance, monthly_quota, subscription_tier, last_reset_at")
    .eq("user_id", userId)
    .maybeSingle();

  const currentBalance = Number(currentCredits?.balance ?? 0);
  const currentQuota = Number(currentCredits?.monthly_quota ?? 0);
  const currentTier = normalizeSubscriptionTier(currentCredits?.subscription_tier ?? "free");
  const shouldLiftQuota = subscribed && (forceQuotaFloor || currentTier !== normalizedTier || currentQuota <= 0);
  const nextQuota = subscribed
    ? (shouldLiftQuota ? Math.max(currentQuota, tierCredits) : currentQuota)
    : (currentCredits ? Math.min(currentQuota, FALLBACK_TIER_CREDITS.free) : FALLBACK_TIER_CREDITS.free);
  const shouldAdjustFreeQuota = !subscribed && (!currentCredits || nextQuota !== currentQuota || currentTier !== "free");
  const nextLastResetAt = subscribed
    ? (shouldLiftQuota ? nowIso : (currentCredits?.last_reset_at ?? nowIso))
    : (shouldAdjustFreeQuota ? nowIso : (currentCredits?.last_reset_at ?? nowIso));

  if (currentCredits) {
    await supabaseService
      .from("user_credits")
      .update({
        balance: currentBalance,
        monthly_quota: nextQuota,
        subscription_tier: normalizedTier,
        last_reset_at: nextLastResetAt,
      })
      .eq("user_id", userId);
  } else {
    await supabaseService
      .from("user_credits")
      .insert({
        user_id: userId,
        balance: currentBalance,
        monthly_quota: nextQuota,
        subscription_tier: normalizedTier,
        last_reset_at: nextLastResetAt,
      });
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const normalizedEmail = user.email.toLowerCase();
    const isAdminEmail = normalizedEmail === "admin@creatives-takeover.com";

    if (isAdminEmail) {
      logStep("Admin override detected");
      await syncSubscriptionState(supabaseService, {
        userId: user.id,
        email: user.email,
        stripeCustomerId: null,
        subscribed: true,
        subscriptionTier: "professional",
        subscriptionEnd: null,
        billingCycle: "monthly",
        forceQuotaFloor: false,
      });

      return new Response(JSON.stringify({
        subscribed: true,
        subscription_tier: "professional",
        subscription_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (PRO_OVERRIDE_EMAILS.has(normalizedEmail) || PRO_OVERRIDE_USER_IDS.has(user.id)) {
      logStep("Professional override detected");
      await syncSubscriptionState(supabaseService, {
        userId: user.id,
        email: user.email,
        stripeCustomerId: null,
        subscribed: true,
        subscriptionTier: "professional",
        subscriptionEnd: null,
        billingCycle: "monthly",
        forceQuotaFloor: true,
      });

      return new Response(JSON.stringify({
        subscribed: true,
        subscription_tier: "professional",
        subscription_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      await syncSubscriptionState(supabaseService, {
        userId: user.id,
        email: user.email,
        stripeCustomerId: null,
        subscribed: false,
        subscriptionTier: "free",
        subscriptionEnd: null,
        billingCycle: null,
        forceQuotaFloor: false,
      });

      return new Response(JSON.stringify({
        subscribed: false,
        subscription_tier: "free",
        subscription_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;

    if (!hasActiveSub) {
      logStep("No active Stripe subscription found", { customerId });
      await syncSubscriptionState(supabaseService, {
        userId: user.id,
        email: user.email,
        stripeCustomerId: customerId,
        subscribed: false,
        subscriptionTier: "free",
        subscriptionEnd: null,
        billingCycle: null,
        forceQuotaFloor: false,
      });

      return new Response(JSON.stringify({
        subscribed: false,
        subscription_tier: "free",
        subscription_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const metadataTier = subscription.metadata?.tier ?? subscription.metadata?.subscription_tier;
    const priceAmount = Number(subscription.items.data[0]?.price?.unit_amount ?? 0);
    const recurringInterval = subscription.items.data[0]?.price?.recurring?.interval ?? null;
    const subscriptionTier =
      typeof metadataTier === "string" && metadataTier.trim().length > 0
        ? normalizeSubscriptionTier(metadataTier)
        : inferTierFromAmount(priceAmount, recurringInterval);
    const billingCycle = subscription.metadata?.billing_cycle
      ? normalizeBillingCycle(subscription.metadata.billing_cycle)
      : normalizeBillingCycle(recurringInterval);
    const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

    logStep("Active subscription found", {
      customerId,
      subscriptionId: subscription.id,
      subscriptionTier,
      billingCycle,
      subscriptionEnd,
    });

    await syncSubscriptionState(supabaseService, {
      userId: user.id,
      email: user.email,
      stripeCustomerId: customerId,
      subscribed: true,
      subscriptionTier,
      subscriptionEnd,
      billingCycle,
      forceQuotaFloor: false,
    });

    return new Response(JSON.stringify({
      subscribed: true,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
