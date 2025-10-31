import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  amount_cents: number;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    if (!user?.id) throw new Error("User not authenticated");

    const { amount_cents } = await req.json() as RequestBody;
    if (!amount_cents || amount_cents <= 0) {
      throw new Error("Invalid payout amount");
    }

    // Check Stripe Connect account status
    const { data: account } = await supabaseService
      .from('stripe_connect_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!account || !account.payouts_enabled) {
      throw new Error("Stripe Connect account not set up or payouts not enabled");
    }

    // Calculate available balance
    const { data: tips } = await supabaseService
      .from('tips')
      .select('amount_cents')
      .eq('to_user_id', user.id)
      .eq('status', 'completed');

    const { data: events } = await supabaseService
      .from('paid_events')
      .select('revenue_cents')
      .eq('host_user_id', user.id)
      .eq('status', 'completed');

    const { data: content } = await supabaseService
      .from('premium_content_sales')
      .select('amount_cents')
      .eq('creator_user_id', user.id)
      .eq('status', 'completed');

    const { data: payouts } = await supabaseService
      .from('payouts')
      .select('amount_cents')
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing', 'completed']);

    const totalEarnings = 
      (tips?.reduce((sum, t) => sum + (t.amount_cents || 0), 0) || 0) +
      (events?.reduce((sum, e) => sum + (e.revenue_cents || 0), 0) || 0) +
      (content?.reduce((sum, c) => sum + (c.amount_cents || 0), 0) || 0);

    const totalPayouts = payouts?.reduce((sum, p) => sum + (p.amount_cents || 0), 0) || 0;
    const availableBalance = totalEarnings - totalPayouts;

    if (amount_cents > availableBalance) {
      throw new Error("Insufficient balance for payout");
    }

    // Create payout record
    const { data: payout, error: payoutError } = await supabaseService
      .from('payouts')
      .insert({
        user_id: user.id,
        amount_cents,
        status: 'pending',
      })
      .select()
      .single();

    if (payoutError) throw payoutError;

    // Transfer to Stripe Connect account
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const transfer = await stripe.transfers.create({
      amount: amount_cents,
      currency: 'usd',
      destination: account.account_id,
      metadata: {
        user_id: user.id,
        payout_id: payout.id,
      },
    });

    // Update payout with Stripe transfer ID
    await supabaseService
      .from('payouts')
      .update({
        stripe_transfer_id: transfer.id,
        status: 'processing',
      })
      .eq('id', payout.id);

    return new Response(
      JSON.stringify({
        payout_id: payout.id,
        transfer_id: transfer.id,
        amount_cents,
        status: 'processing',
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

