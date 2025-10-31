import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'create_account_link' | 'get_account_status' | 'refresh_account_link';
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
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const { action } = await req.json() as RequestBody;

    // Check or create Stripe Connect account
    let { data: account } = await supabaseService
      .from('stripe_connect_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    let accountId: string;

    if (!account) {
      // Create new Connect account
      const connectAccount = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { user_id: user.id },
      });

      accountId = connectAccount.id;

      await supabaseService.from('stripe_connect_accounts').insert({
        user_id: user.id,
        account_id: accountId,
        onboarding_completed: false,
        charges_enabled: connectAccount.charges_enabled,
        payouts_enabled: connectAccount.payouts_enabled,
        details_submitted: connectAccount.details_submitted,
      });

      account = {
        user_id: user.id,
        account_id: accountId,
        onboarding_completed: false,
        charges_enabled: connectAccount.charges_enabled,
        payouts_enabled: connectAccount.payouts_enabled,
        details_submitted: connectAccount.details_submitted,
      };
    } else {
      accountId = account.account_id;
    }

    if (action === 'create_account_link' || action === 'refresh_account_link') {
      const origin = req.headers.get("origin") || "https://creatives-takeover.com";
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${origin}/dashboard?stripe_refresh=true`,
        return_url: `${origin}/dashboard?stripe_success=true`,
        type: account.details_submitted ? 'account_onboarding' : 'account_onboarding',
      });

      await supabaseService.from('stripe_connect_accounts').update({
        onboarding_url: accountLink.url,
      }).eq('user_id', user.id);

      return new Response(
        JSON.stringify({ url: accountLink.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (action === 'get_account_status') {
      const stripeAccount = await stripe.accounts.retrieve(accountId);
      await supabaseService.from('stripe_connect_accounts').update({
        onboarding_completed: stripeAccount.details_submitted && stripeAccount.charges_enabled && stripeAccount.payouts_enabled,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        details_submitted: stripeAccount.details_submitted,
      }).eq('user_id', user.id);

      return new Response(
        JSON.stringify({
          account_id: accountId,
          onboarding_completed: stripeAccount.details_submitted && stripeAccount.charges_enabled && stripeAccount.payouts_enabled,
          charges_enabled: stripeAccount.charges_enabled,
          payouts_enabled: stripeAccount.payouts_enabled,
          details_submitted: stripeAccount.details_submitted,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    throw new Error("Invalid action");
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

