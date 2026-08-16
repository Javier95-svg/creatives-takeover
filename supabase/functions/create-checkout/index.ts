import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withErrorBoundary, logInfo, logError } from "../_shared/logger.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
import { emitBusinessEvent } from "../_shared/analytics.ts";
import {
  PLAN_PRICING_CENTS,
  PLAN_MONTHLY_CREDITS,
  TOP_UP_PACKS_CENTS,
  type BillingCycle as PricingBillingCycle,
  type PaidPlan,
} from "../_shared/pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
};

type PrefillInput = {
  name?: string;
  email?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
};

type BillingCycle = PricingBillingCycle;
type PurchaseType = "subscription" | "credit_pack";

class CheckoutConfigurationError extends Error {
  readonly code: string;
  readonly status: number;
  readonly expose = true;

  constructor(code: string, message: string, status = 503) {
    super(message);
    this.name = "CheckoutConfigurationError";
    this.code = code;
    this.status = status;
  }
}

// Plan display name + value-prop copy. Prices and credit counts come from the
// shared pricing module (../_shared/pricing.ts) + PLAN_MONTHLY_CREDITS so a
// reprice is a one-file edit and the description's credit count can't drift.
const PLAN_NAMES: Record<PaidPlan, string> = {
  starter: "Starter Plan",
  rising: "Rising Plan",
  pro: "Pro Plan",
};

const PLAN_VALUE_PROPS: Record<PaidPlan, string> = {
  starter: "PMF Lab credit-metered access, Email Templates, and 2 VC/Accelerator profile views",
  rising: "per-action MVP Builder, Tech Stack Builder, GTM Strategist, Pitch Deck Analyzer, and full Prompt Library",
  pro: "Find Your Angel, unlimited research views, and premium fundraising access",
};

const isPaidPlan = (tier: string | undefined): tier is PaidPlan =>
  tier === "starter" || tier === "rising" || tier === "pro";

const getSubscriptionPricing = (tier: PaidPlan, cycle: BillingCycle) => {
  const credits = PLAN_MONTHLY_CREDITS[tier];
  const connector = tier === "rising" ? "monthly credits plus" : "monthly credits,";
  return {
    amount: PLAN_PRICING_CENTS[tier][cycle],
    name: PLAN_NAMES[tier],
    credits,
    description: `${credits} ${connector} ${PLAN_VALUE_PROPS[tier]}`,
  };
};

const CREDIT_PACKS = TOP_UP_PACKS_CENTS;

const sanitizeString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const sanitizePrefillInput = (input: unknown): PrefillInput | undefined => {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as Record<string, unknown>;
  const sanitized: PrefillInput = {};

  const name = sanitizeString(raw.name);
  const email = sanitizeString(raw.email);
  if (name) sanitized.name = name;
  if (email) sanitized.email = email;

  if (raw.address && typeof raw.address === "object") {
    const addrRaw = raw.address as Record<string, unknown>;
    const address: PrefillInput["address"] = {};
    const line1 = sanitizeString(addrRaw.line1);
    const line2 = sanitizeString(addrRaw.line2);
    const city = sanitizeString(addrRaw.city);
    const state = sanitizeString(addrRaw.state);
    const postal = sanitizeString(addrRaw.postal_code);
    const country = sanitizeString(addrRaw.country);

    if (line1) address.line1 = line1;
    if (line2) address.line2 = line2;
    if (city) address.city = city;
    if (state) address.state = state;
    if (postal) address.postal_code = postal;
    if (country) address.country = country.toUpperCase();

    if (Object.keys(address).length > 0) {
      sanitized.address = address;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
};

const buildStripeAddress = (
  address?: PrefillInput["address"]
): Stripe.CustomerCreateParams.Address | undefined => {
  if (!address) return undefined;
  const stripeAddress: Stripe.CustomerCreateParams.Address = {};
  if (address.line1) stripeAddress.line1 = address.line1;
  if (address.line2) stripeAddress.line2 = address.line2;
  if (address.city) stripeAddress.city = address.city;
  if (address.state) stripeAddress.state = address.state;
  if (address.postal_code) stripeAddress.postal_code = address.postal_code;
  if (address.country) stripeAddress.country = address.country;
  return Object.keys(stripeAddress).length > 0 ? stripeAddress : undefined;
};

const normalizePurchaseType = (value: unknown): PurchaseType => {
  const normalized = sanitizeString(value)?.toLowerCase();
  return normalized === "credit_pack" ? "credit_pack" : "subscription";
};

const normalizeBillingCycle = (value: unknown): BillingCycle => {
  const normalized = sanitizeString(value)?.toLowerCase();
  return normalized === "yearly" ? "yearly" : "monthly";
};

// Attribution label for where the checkout was triggered from (e.g.
// "mvp_builder_top_up"). Round-trips through Stripe metadata so stripe-webhook
// can attribute the completed purchase to the tool that drove it.
const normalizePurchaseSource = (value: unknown): string | undefined => {
  const normalized = sanitizeString(value)?.toLowerCase();
  if (!normalized) return undefined;
  const slug = normalized.replace(/[^a-z0-9_-]/g, "_").slice(0, 64);
  return slug.length > 0 ? slug : undefined;
};

const normalizePurchaseContextId = (value: unknown): string | undefined => {
  const normalized = sanitizeString(value);
  if (!normalized) return undefined;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)
    ? normalized
    : undefined;
};

const normalizeReturnPath = (value: unknown): string | undefined => {
  const normalized = sanitizeString(value);
  if (!normalized || !normalized.startsWith("/") || normalized.startsWith("//") || normalized.includes("\\")) {
    return undefined;
  }
  try {
    const parsed = new URL(normalized, "https://creatives-takeover.local");
    if (parsed.origin !== "https://creatives-takeover.local") return undefined;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`.slice(0, 500);
  } catch {
    return undefined;
  }
};

const buildMetadata = (base: Record<string, string | undefined>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(base).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0)
  );

const findOrCreateCustomer = async (
  stripe: Stripe,
  user: { id: string; email: string; user_metadata?: Record<string, unknown> | null },
  prefillData: PrefillInput
) => {
  const customers = await stripe.customers.list({ email: user.email, limit: 1 });
  const updatedAddress = buildStripeAddress(prefillData.address);

  if (customers.data.length > 0) {
    const customer = customers.data[0];
    const updatePayload: Stripe.CustomerUpdateParams = {
      metadata: {
        ...(customer.metadata ?? {}),
        supabase_user_id: user.id,
      },
    };

    if (prefillData.name) {
      updatePayload.name = prefillData.name;
    }
    if (updatedAddress) {
      updatePayload.address = updatedAddress;
    }

    await stripe.customers.update(customer.id, updatePayload);
    logInfo("stripe:customer_found", { customerId: customer.id });
    return customer.id;
  }

  const newCustomer = await stripe.customers.create({
    email: prefillData.email ?? user.email,
    name: prefillData.name,
    address: updatedAddress,
    metadata: {
      supabase_user_id: user.id,
    },
  });
  logInfo("stripe:customer_created", { customerId: newCustomer.id });
  return newCustomer.id;
};

const getCanonicalSubscriptionPrice = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  stripe: Stripe,
  tier: PaidPlan,
  billingCycle: BillingCycle,
) => {
  const { data, error } = await supabaseAdmin
    .from("subscription_tiers")
    .select("tier_name, price_cents, stripe_price_id_monthly, stripe_price_id_yearly")
    .eq("tier_name", tier)
    .maybeSingle();

  if (error) throw error;

  const priceId = billingCycle === "yearly"
    ? sanitizeString(data?.stripe_price_id_yearly)
    : sanitizeString(data?.stripe_price_id_monthly);
  if (!data || !priceId) {
    throw new CheckoutConfigurationError(
      "CHECKOUT_PRICE_NOT_CONFIGURED",
      `Checkout is not configured for ${tier} ${billingCycle}. Please try again later.`,
    );
  }

  // subscription_tiers has held literal placeholders ("[STARTER_PRICE_ID]") from
  // the commented template in 20260514090000_add_stripe_price_ids.sql being run
  // verbatim. Those pass the null check above and then fail deep inside
  // stripe.prices.retrieve() as an opaque 500, which reads like an outage rather
  // than the configuration gap it is. Fail closed here with the real reason.
  if (!priceId.startsWith("price_")) {
    logError("checkout:price_id_not_configured", { tier, billingCycle, priceId });
    throw new CheckoutConfigurationError(
      "CHECKOUT_PRICE_NOT_CONFIGURED",
      `Checkout is not configured for ${tier} ${billingCycle}. Please try again later.`,
    );
  }

  const expected = getSubscriptionPricing(tier, billingCycle);
  const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
  const expectedInterval = billingCycle === "yearly" ? "year" : "month";
  if (
    !price.active
    || price.currency.toLowerCase() !== "usd"
    || price.unit_amount !== expected.amount
    || price.type !== "recurring"
    || price.recurring?.interval !== expectedInterval
  ) {
    throw new CheckoutConfigurationError(
      "CHECKOUT_PRICE_MISMATCH",
      `Checkout configuration does not match ${tier} ${billingCycle}. Please try again later.`,
    );
  }

  return { priceId, amountCents: expected.amount };
};

const recordCheckoutSession = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  row: Record<string, unknown>,
) => {
  const { error } = await supabaseAdmin.from("stripe_checkout_sessions").insert({
    stripe_session_id: session.id,
    ...row,
  });

  if (!error) return;

  logError("checkout:session_record_failed", { sessionId: session.id, error: error.message });
  try {
    if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
  } catch (expireError) {
    logError("checkout:orphan_expire_failed", { sessionId: session.id, expireError });
  }
  throw new CheckoutConfigurationError(
    "CHECKOUT_SESSION_RECORD_FAILED",
    "Checkout could not be started safely. Please retry.",
  );
};

serve(withErrorBoundary(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return withIdempotency(req, "create-checkout", async () => {
    logInfo("create-checkout:start");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logInfo("auth:user_authenticated", { userId: user.id, email: user.email });

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch (error) {
      logError("request:parse_failed", error);
    }

    const purchaseType = normalizePurchaseType(body.purchaseType);
    const billingCycle = normalizeBillingCycle(body.billingCycle);
    const requestedTier = sanitizeString(body.plan ?? body.tier)?.toLowerCase();
    const requestedPackId = sanitizeString(body.packId)?.toLowerCase();
    const purchaseSource = normalizePurchaseSource(body.purchaseSource);
    const purchaseContextId = normalizePurchaseContextId(body.purchaseContextId);
    const returnPath = normalizeReturnPath(body.returnPath);

    let prefillData: PrefillInput = sanitizePrefillInput(body.prefill) ?? {};
    const metadataName = sanitizeString(
      (user.user_metadata as Record<string, unknown> | null)?.full_name
    );
    if (!prefillData.email) {
      prefillData.email = user.email;
    }
    if (!prefillData.name && metadataName) {
      prefillData.name = metadataName;
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customerId = await findOrCreateCustomer(stripe, {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata as Record<string, unknown> | null,
    }, prefillData);

    const origin =
      req.headers.get("origin") ??
      Deno.env.get("SITE_URL") ??
      "https://creatives-takeover.com";

    if (purchaseType === "credit_pack") {
      if (!requestedPackId || !CREDIT_PACKS[requestedPackId]) {
        throw new Error("Valid project pack is required");
      }

      const pack = CREDIT_PACKS[requestedPackId];
      if (purchaseSource === "first_customer_sprint") {
        if (!purchaseContextId) throw new Error("Valid sprint context is required");
        const authenticatedClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          { global: { headers: { Authorization: authHeader } } },
        );
        const { data: sprint, error: sprintError } = await authenticatedClient
          .from("first_customer_sprints")
          .select("id,status,review_submitted_at,continuation_from_sprint_id")
          .eq("id", purchaseContextId)
          .eq("founder_id", user.id)
          .maybeSingle();
        if (sprintError || !sprint || sprint.status !== "completed" || !sprint.review_submitted_at) {
          throw new Error("Complete and review the sprint before purchasing the continuation");
        }
        if (sprint.continuation_from_sprint_id) {
          throw new Error("The demand-validation pilot includes one paid continuation only");
        }
      }
      const metadata = buildMetadata({
        purchase_type: "credit_pack",
        wallet: "platform",
        pack_id: requestedPackId,
        user_id: user.id,
        user_email: user.email,
        purchase_source: purchaseSource,
        purchase_context_id: purchaseContextId,
      });

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        client_reference_id: user.id,
        mode: "payment",
        billing_address_collection: "auto",
        customer_update: {
          address: "auto",
          name: "auto",
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${pack.name} (${pack.credits} Credits)`,
                description: `${pack.credits} persistent project-pack credits for Creatives Takeover`,
              },
              unit_amount: pack.amount,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          metadata,
        },
        metadata,
        success_url: `${origin}/subscription-success?purchase_type=credit_pack&wallet=platform&pack_id=${requestedPackId}&session_id={CHECKOUT_SESSION_ID}${returnPath ? `&return_to=${encodeURIComponent(returnPath)}` : ""}`,
        cancel_url: returnPath ? `${origin}${returnPath}` : `${origin}/pricing#credit-packs`,
      });

      await recordCheckoutSession(supabaseAdmin, stripe, session, {
        user_id: user.id,
        purchase_type: "credit_pack",
        pack_id: requestedPackId,
        purchase_source: purchaseSource ?? "unknown",
        amount_cents: pack.amount,
      });

      await emitBusinessEvent({
        eventName: "checkout_session_created",
        userId: user.id,
        properties: {
          purchase_type: "credit_pack",
          pack_id: requestedPackId,
          purchase_source: purchaseSource ?? "unknown",
          amount_usd: Number((pack.amount / 100).toFixed(2)),
          stripe_session_id: session.id,
        },
      });

      logInfo("checkout:credit_pack_created", {
        sessionId: session.id,
        packId: requestedPackId,
        wallet: "platform",
        userId: user.id,
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!isPaidPlan(requestedTier)) {
      throw new Error("Valid subscription tier is required");
    }

    const canonicalPrice = await getCanonicalSubscriptionPrice(
      supabaseAdmin,
      stripe,
      requestedTier,
      billingCycle,
    );
    const metadata = buildMetadata({
      purchase_type: "subscription",
      tier: requestedTier,
      subscription_tier: requestedTier,
      billing_cycle: billingCycle,
      user_id: user.id,
      user_email: user.email,
      billing_name: prefillData.name,
      billing_country: prefillData.address?.country,
      purchase_source: purchaseSource,
    });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user.id,
      billing_address_collection: "auto",
      customer_update: {
        address: "auto",
        name: "auto",
      },
      line_items: [
        {
          price: canonicalPrice.priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      metadata,
      subscription_data: {
        metadata,
      },
      success_url: `${origin}/subscription-success?purchase_type=subscription&tier=${requestedTier}&billing_cycle=${billingCycle}&session_id={CHECKOUT_SESSION_ID}${returnPath ? `&return_to=${encodeURIComponent(returnPath)}` : ""}`,
      cancel_url: returnPath ? `${origin}${returnPath}` : `${origin}/pricing`,
    });

    await recordCheckoutSession(supabaseAdmin, stripe, session, {
      user_id: user.id,
      purchase_type: "subscription",
      plan: requestedTier,
      billing_cycle: billingCycle,
      purchase_source: purchaseSource ?? "unknown",
      amount_cents: canonicalPrice.amountCents,
    });

    await emitBusinessEvent({
      eventName: "checkout_session_created",
      userId: user.id,
      properties: {
        purchase_type: "subscription",
        plan: requestedTier,
        billing_interval: billingCycle,
        purchase_source: purchaseSource ?? "unknown",
        amount_usd: Number((canonicalPrice.amountCents / 100).toFixed(2)),
        stripe_session_id: session.id,
      },
    });

    logInfo("checkout:subscription_created", {
      sessionId: session.id,
      tier: requestedTier,
      billingCycle,
      userId: user.id,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  });
}, { fn: "create-checkout" }));
