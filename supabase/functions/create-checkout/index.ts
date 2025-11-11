import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withErrorBoundary, logInfo, logError } from "../_shared/logger.ts";
import { withIdempotency } from "../_shared/idempotency.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
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

serve(withErrorBoundary(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return withIdempotency(req, 'create-checkout', async () => {
    logInfo('create-checkout:start');

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logInfo('stripe:key_verified');

    // Create Supabase client with anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logInfo('auth:header_found');

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logInfo('auth:user_authenticated', { userId: user.id, email: user.email });

    // Get request body
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch (error) {
      logError('request:parse_failed', error);
    }

    const requestedTier = (sanitizeString(body.tier) ?? "").toLowerCase();

    const pricingMap: Record<string, { amount: number; name: string }> = {
      basic: { amount: 999, name: "Basic Plan - 50 Credits/month" },
      starter: { amount: 999, name: "Starter Plan - 50 Credits/month" },
      creator: { amount: 1999, name: "Creator Plan - 50 Credits/month" },
      premium: { amount: 1999, name: "Premium Plan - 150 Credits/month" },
      professional: { amount: 3999, name: "Professional Plan - 150 Credits/month" },
      elite: { amount: 3999, name: "Elite Plan - 150 Credits/month" },
      teams: { amount: 5999, name: "Teams Plan - 500 Credits/month" },
      enterprise: { amount: 5999, name: "Enterprise Plan - 500 Credits/month" }
    };

    const pricing = pricingMap[requestedTier];
    if (!pricing) {
      throw new Error("Valid subscription tier is required");
    }
    logInfo('tier:validated', { tier: requestedTier, price_cents: pricing.amount });

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

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logInfo('stripe:customer_found', { customerId });

      const updatePayload: Stripe.CustomerUpdateParams = {};
      if (prefillData.name) {
        updatePayload.name = prefillData.name;
      }
      const updatedAddress = buildStripeAddress(prefillData.address);
      if (updatedAddress) {
        updatePayload.address = updatedAddress;
      }

      if (Object.keys(updatePayload).length > 0) {
        await stripe.customers.update(customerId, updatePayload);
        logInfo('stripe:customer_updated', { fields: Object.keys(updatePayload) });
      }
    } else {
      logInfo('stripe:new_customer');
      const newCustomer = await stripe.customers.create({
        email: prefillData.email ?? user.email,
        name: prefillData.name,
        address: buildStripeAddress(prefillData.address),
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = newCustomer.id;
      logInfo('stripe:customer_created', { customerId });
    }


    // Create checkout session
    const origin =
      req.headers.get("origin") ??
      Deno.env.get("SITE_URL") ??
      "https://creatives-takeover.com";

    logInfo('prefill:applied', {
      hasName: Boolean(prefillData.name),
      hasAddress: Boolean(prefillData.address),
    });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : (prefillData.email ?? user.email),
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
              description: `BizMap AI ${requestedTier.charAt(0).toUpperCase() + requestedTier.slice(1)} subscription with monthly credit allocation`,
            },
            unit_amount: pricing.amount,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/subscription-success?tier=${requestedTier}`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        user_id: user.id,
        user_email: user.email,
        subscription_tier: requestedTier,
        ...(prefillData.name ? { billing_name: prefillData.name } : {}),
        ...(prefillData.address?.country
          ? { billing_country: prefillData.address.country }
          : {}),
      },
    });

    logInfo('checkout:created', { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  });
}, { fn: 'create-checkout' }));