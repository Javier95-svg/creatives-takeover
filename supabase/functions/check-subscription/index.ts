import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Use service role key for database operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const proOverrideEmails = new Set([
      'admin@creatives-takeover.com',
      'uneebkhanzada91@gmail.com',
      'does@elevatedynamics.pt',
      'adam@tiplo.ai',
      'apembertona@gmail.com',
    ]);

    const proOverrideUserIds = new Set([
      'f2fa28f8-7889-4397-b17b-478488435b84',
      '15bba750-6594-4f48-a101-0c02a404835e',
      'c6aba37d-847a-439e-848d-d6874b7d245a',
      'b05d6111-0940-4403-a710-92901fcbf034',
    ]);

    // Check if this is a pro-override account - grant professional tier immediately
    if (proOverrideEmails.has(user.email.toLowerCase()) || proOverrideUserIds.has(user.id)) {
      logStep("Pro override account detected - granting professional tier", { email: user.email, userId: user.id });
      const professionalTier = 'professional';
      const professionalCredits = 150;

      // Update subscribers table
      await supabaseService.from("subscribers").upsert({
        email: user.email,
        user_id: user.id,
        stripe_customer_id: null,
        subscribed: true,
        subscription_tier: professionalTier,
        subscription_end: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

      // Fetch current credits to avoid reducing balances
      const { data: creditRow } = await supabaseService
        .from("user_credits")
        .select("balance, monthly_quota")
        .eq("user_id", user.id)
        .maybeSingle();

      const nextBalance = Math.max(creditRow?.balance ?? 0, professionalCredits);
      const nextQuota = Math.max(creditRow?.monthly_quota ?? 0, professionalCredits);

      // Update user_credits table (tier + credits)
      await supabaseService.from("user_credits").upsert({
        user_id: user.id,
        subscription_tier: professionalTier,
        balance: nextBalance,
        monthly_quota: nextQuota,
        last_credit_grant: new Date().toISOString()
      }, { onConflict: 'user_id' });

      // Update profiles table
      await supabaseService.from("profiles").update({
        subscription_tier: professionalTier
      }).eq('id', user.id);

      return new Response(JSON.stringify({
        subscribed: true,
        subscription_tier: professionalTier,
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Find Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      await supabaseService.from("subscribers").upsert({
        email: user.email,
        user_id: user.id,
        stripe_customer_id: null,
        subscribed: false,
        subscription_tier: 'free',
        subscription_end: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

      return new Response(JSON.stringify({ 
        subscribed: false, 
        subscription_tier: 'free',
        subscription_end: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionTier = 'free';
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      
      // Determine subscription tier from price
      const priceId = subscription.items.data[0].price.id;
      const price = await stripe.prices.retrieve(priceId);
      const amount = price.unit_amount || 0;
      
      if (amount === 0) {
        subscriptionTier = "free";
      } else if (amount <= 2000) { // $20 or less = Creator
        subscriptionTier = "creator";
      } else if (amount <= 4000) { // $40 or less = Professional
        subscriptionTier = "professional";
      } else { // $40+ = Enterprise
        subscriptionTier = "enterprise";
      }
      logStep("Determined subscription tier", { priceId, amount, subscriptionTier });
    } else {
      logStep("No active subscription found");
    }

    // Update subscribers table
    await supabaseService.from("subscribers").upsert({
      email: user.email,
      user_id: user.id,
      stripe_customer_id: customerId,
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    // Update user_credits table with subscription tier
    await supabaseService.from("user_credits").upsert({
      user_id: user.id,
      subscription_tier: subscriptionTier,
    }, { onConflict: 'user_id' });

    logStep("Updated database with subscription info", { subscribed: hasActiveSub, subscriptionTier });

    // If user just upgraded, grant monthly credits
    if (hasActiveSub && subscriptionTier !== 'free') {
      try {
        await supabaseService.rpc('update_user_subscription_tier', {
          user_email: user.email,
          new_tier: subscriptionTier,
          is_subscribed: true
        });
        logStep("Granted subscription credits");
      } catch (creditError) {
        logStep("Error granting credits", { error: creditError });
        // Don't fail the whole operation for credit errors
      }
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd
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
