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
    logInfo('create-mentor-booking-checkout:start');

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

    const body = await req.json();
    const { mentor_id, scheduled_time, duration_minutes, mentor_stripe_account_id, hourly_rate } = body;

    if (!mentor_id || !scheduled_time || !mentor_stripe_account_id || !hourly_rate) {
      throw new Error("Missing required fields");
    }

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

    const sessionAmount = Math.round(hourly_rate); // hourly_rate is in cents
    const platformFee = Math.round(sessionAmount * 0.1); // 10% platform fee
    const mentorPayout = sessionAmount - platformFee;

    // Create Checkout Session with Connect
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Mentor Session",
              description: `1-hour mentoring session scheduled for ${new Date(scheduled_time).toLocaleString()}`,
            },
            unit_amount: sessionAmount,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: mentor_stripe_account_id,
        },
      },
      success_url: `${validOrigin}/community/my-bookings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${validOrigin}/community/mentors/${mentor_id}`,
      metadata: {
        mentor_id,
        founder_id: user.id,
        scheduled_time,
        duration_minutes: duration_minutes || 60,
        platform_fee: platformFee.toString(),
        mentor_payout: mentorPayout.toString(),
      },
      customer_email: user.email,
    });

    logInfo('checkout:session_created', { sessionId: session.id });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    logError('create-mentor-booking-checkout:error', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}, { fn: 'create-mentor-booking-checkout' }));

