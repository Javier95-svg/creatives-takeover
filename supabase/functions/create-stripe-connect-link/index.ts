import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { withErrorBoundary, logInfo, logError } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(withErrorBoundary(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logInfo('create-stripe-connect-link:start');

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseService.auth.getUser(token);
    
    if (userError || !user) throw new Error("User not authenticated");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    // Validate and whitelist origins for security
    const allowedOrigins = [
      'https://creatives-takeover.com',
      'https://www.creatives-takeover.com',
      ...(Deno.env.get('ENVIRONMENT') === 'development' ? [
        'http://localhost:3000',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8080'
      ] : [])
    ];
    
    const origin = req.headers.get("origin");
    const validOrigin = origin && allowedOrigins.includes(origin) 
      ? origin 
      : (Deno.env.get('ENVIRONMENT') === 'development' ? 'http://localhost:3000' : 'https://creatives-takeover.com');

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: user.email,
      capabilities: {
        transfers: { requested: true },
      },
    });

    logInfo('stripe:account_created', { accountId: account.id });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${validOrigin}/account?stripe_refresh=true`,
      return_url: `${validOrigin}/account?stripe_success=true`,
      type: "account_onboarding",
    });

    // Store connection in database
    await supabaseService.from("stripe_connections").upsert({
      user_id: user.id,
      stripe_account_id: account.id,
      is_connected: false,
      updated_at: new Date().toISOString(),
    });

    logInfo('stripe:account_link_created', { url: accountLink.url });

    return new Response(
      JSON.stringify({ url: accountLink.url, accountId: account.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    logError('create-stripe-connect-link:error', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}, { fn: 'create-stripe-connect-link' }));

