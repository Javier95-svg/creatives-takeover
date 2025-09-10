import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: Record<string, unknown>) => {
  console.log(`[VERIFY-PAYMENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { session_id } = await req.json();
    if (!session_id) throw new Error("Missing session_id");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    log("Retrieved session", { session_id, status: session.payment_status, metadata: session.metadata });

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ success: false, error: "Payment not completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Validate metadata and ownership
    const credits = Number(session.metadata?.credits ?? 0);
    const sessionUserId = session.metadata?.user_id;
    if (!credits || !sessionUserId) throw new Error("Invalid session metadata");
    if (sessionUserId !== user.id) throw new Error("Session user mismatch");

    // Idempotency: ensure we don't double-grant for the same session
    const { data: existingTx } = await supabaseService
      .from("credit_transactions")
      .select("id")
      .eq("metadata->>stripe_session_id", session_id)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (existingTx) {
      return new Response(JSON.stringify({ success: true, credits_added: 0, already_processed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Update balance atomically and log transaction
    const { data: current } = await supabaseService
      .from("user_credits")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    const newBalance = (current?.balance ?? 0) + credits;

    // Upsert user_credits (in case row doesn't exist yet)
    await supabaseService
      .from("user_credits")
      .upsert({ user_id: user.id, balance: newBalance }, { onConflict: "user_id" });

    await supabaseService.from("credit_transactions").insert({
      user_id: user.id,
      amount: credits,
      tx_type: "purchase",
      reason: `One-time credit purchase (${credits})`,
      feature: "Credit Pack Purchase",
      metadata: { stripe_session_id: session.id, amount_total: session.amount_total },
    });

    return new Response(JSON.stringify({ success: true, credits_added: credits, new_balance: newBalance }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log("ERROR", { message });
    return new Response(JSON.stringify({ success: false, error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});