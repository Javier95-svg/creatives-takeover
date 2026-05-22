import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withErrorBoundary, logInfo, logError } from "../_shared/logger.ts";
import { withIdempotency } from "../_shared/idempotency.ts";

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

type BillingCycle = "monthly" | "yearly";
type PurchaseType = "subscription" | "credit_pack";

const SUBSCRIPTION_PRICING: Record<string, Record<BillingCycle, { amount: number; name: string; credits: number; description: string }>> = {
  starter: {
    monthly: { amount: 900, name: "Starter Plan", credits: 100, description: "100 monthly credits, PMF Lab credit-metered access, Email Templates, and 2 VC/Accelerator profile views" },
    yearly: { amount: 7900, name: "Starter Plan", credits: 100, description: "100 monthly credits, PMF Lab credit-metered access, Email Templates, and 2 VC/Accelerator profile views" },
  },
  rising: {
    monthly: { amount: 2900, name: "Rising Plan", credits: 250, description: "250 monthly credits plus per-action MVP Builder, Tech Stack Builder, GTM Strategist, Pitch Deck Analyzer, and full Prompt Library" },
    yearly: { amount: 23900, name: "Rising Plan", credits: 250, description: "250 monthly credits plus per-action MVP Builder, Tech Stack Builder, GTM Strategist, Pitch Deck Analyzer, and full Prompt Library" },
  },
  pro: {
    monthly: { amount: 6500, name: "Pro Plan", credits: 600, description: "600 monthly credits, Find Your Angel, unlimited research views, unlimited discovery calls, and premium fundraising access" },
    yearly: { amount: 58900, name: "Pro Plan", credits: 600, description: "600 monthly credits, Find Your Angel, unlimited research views, unlimited discovery calls, and premium fundraising access" },
  },
};

const CREDIT_PACKS: Record<string, { amount: number; credits: number; name: string }> = {
  pack_20: { amount: 800, credits: 20, name: "Starter Pack" },
  pack_40: { amount: 1600, credits: 40, name: "Boost Pack" },
  pack_60: { amount: 2400, credits: 60, name: "Power Pack" },
};

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
    const requestedTier = sanitizeString(body.tier)?.toLowerCase();
    const requestedPackId = sanitizeString(body.packId)?.toLowerCase();

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
        throw new Error("Valid credit pack is required");
      }

      const pack = CREDIT_PACKS[requestedPackId];
      const metadata = buildMetadata({
        purchase_type: "credit_pack",
        pack_id: requestedPackId,
        user_id: user.id,
        user_email: user.email,
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
                description: `${pack.credits} top-up credits for Creatives Takeover`,
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
        success_url: `${origin}/subscription-success?purchase_type=credit_pack&pack_id=${requestedPackId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/pricing#credit-packs`,
      });

      logInfo("checkout:credit_pack_created", {
        sessionId: session.id,
        packId: requestedPackId,
        userId: user.id,
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!requestedTier || !SUBSCRIPTION_PRICING[requestedTier]?.[billingCycle]) {
      throw new Error("Valid subscription tier is required");
    }

    const pricing = SUBSCRIPTION_PRICING[requestedTier][billingCycle];
    const metadata = buildMetadata({
      purchase_type: "subscription",
      tier: requestedTier,
      subscription_tier: requestedTier,
      billing_cycle: billingCycle,
      user_id: user.id,
      user_email: user.email,
      billing_name: prefillData.name,
      billing_country: prefillData.address?.country,
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
          price_data: {
            currency: "usd",
            product_data: {
              name: pricing.name,
              description: `${pricing.description} with ${billingCycle} billing`,
            },
            unit_amount: pricing.amount,
            recurring: { interval: billingCycle === "yearly" ? "year" : "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      metadata,
      subscription_data: {
        metadata,
      },
      success_url: `${origin}/subscription-success?purchase_type=subscription&tier=${requestedTier}&billing_cycle=${billingCycle}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
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
