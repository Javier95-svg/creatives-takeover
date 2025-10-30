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
    const { tier } = await req.json();
    if (!tier || !['basic', 'premium', 'enterprise'].includes(tier)) {
      throw new Error("Valid subscription tier is required (basic, premium, or enterprise)");
    }
    logInfo('tier:validated', { tier });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logInfo('stripe:customer_found', { customerId });
    } else {
      logInfo('stripe:new_customer');
    }

    // Define pricing based on tier
    const pricingMap = {
      basic: { amount: 999, name: "Basic Plan - 50 Credits/month" },
      premium: { amount: 1999, name: "Premium Plan - 150 Credits/month" },
      enterprise: { amount: 4999, name: "Enterprise Plan - 500 Credits/month" }
    };

    const pricing = pricingMap[tier as keyof typeof pricingMap];
    logInfo('pricing:determined', pricing as any);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: pricing.name,
              description: `BizMap AI ${tier.charAt(0).toUpperCase() + tier.slice(1)} subscription with monthly credit allocation`
            },
            unit_amount: pricing.amount,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/subscription-success?tier=${tier}`,
      cancel_url: `${req.headers.get("origin")}/pricing`,
      metadata: {
        user_id: user.id,
        user_email: user.email,
        subscription_tier: tier
      }
    });

    logInfo('checkout:created', { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  });
}, { fn: 'create-checkout' }));