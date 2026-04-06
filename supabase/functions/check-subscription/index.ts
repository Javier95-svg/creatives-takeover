import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { resolveMonthlyBillingWindow } from "../_shared/billing-period.ts";
import { normalizePlan as normalizeTier, PLAN_MONTHLY_CREDITS } from "../_shared/plan-enforcement.ts";

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
      'apembertona@gmail.com',
      'adam@tiplo.ai'
    ]);

    // Check if this is a pro-override account - grant pro tier immediately
    if (proOverrideEmails.has(user.email.toLowerCase())) {
      logStep("Pro override account detected - granting pro tier", { email: user.email });
      const proTier = 'pro';
      const proCredits = PLAN_MONTHLY_CREDITS.pro;
      const proBillingWindow = resolveMonthlyBillingWindow(new Date().toISOString());

      // Update subscribers table
      await supabaseService.from("subscribers").upsert({
        email: user.email,
        user_id: user.id,
        stripe_customer_id: null,
        subscribed: true,
        subscription_tier: proTier,
        subscription_end: null,
        billing_anchor_at: proBillingWindow.anchorAt.toISOString(),
        current_period_start: proBillingWindow.periodStart.toISOString(),
        current_period_end: proBillingWindow.periodEnd.toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

      // Fetch current credits to avoid reducing balances
      const { data: creditRow } = await supabaseService
        .from("user_credits")
        .select("balance, monthly_quota")
        .eq("user_id", user.id)
        .maybeSingle();

      const nextBalance = Math.max(creditRow?.balance ?? 0, proCredits);
      const nextQuota = Math.max(creditRow?.monthly_quota ?? 0, proCredits);

      // Update user_credits table (tier + credits)
      await supabaseService.from("user_credits").upsert({
        user_id: user.id,
        subscription_tier: proTier,
        balance: nextBalance,
        monthly_quota: nextQuota,
        last_credit_grant: new Date().toISOString(),
        billing_anchor_at: proBillingWindow.anchorAt.toISOString(),
        current_period_start: proBillingWindow.periodStart.toISOString(),
        current_period_end: proBillingWindow.periodEnd.toISOString(),
      }, { onConflict: 'user_id' });

      // Update profiles table
      await supabaseService.from("profiles").update({
        subscription_tier: proTier
      }).eq('id', user.id);

      return new Response(JSON.stringify({
        subscribed: true,
        subscription_tier: proTier,
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
        subscription_tier: 'rookie',
        subscription_end: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

      return new Response(JSON.stringify({
        subscribed: false,
        subscription_tier: 'rookie',
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Keep paid access through current_period_end for active, trialing, and past_due subscriptions.
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    const eligibleStatuses = new Set(["active", "trialing", "past_due"]);
    const nowUnix = Math.floor(Date.now() / 1000);
    const activeSubscription = subscriptions.data
      .filter((subscription) =>
        eligibleStatuses.has(subscription.status) &&
        (subscription.current_period_end ?? 0) >= nowUnix
      )
      .sort((a, b) => (b.current_period_end ?? 0) - (a.current_period_end ?? 0))[0];

    const hasActiveSub = Boolean(activeSubscription);
    let subscriptionTier = 'rookie';
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = activeSubscription!;
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Eligible subscription found", {
        subscriptionId: subscription.id,
        status: subscription.status,
        endDate: subscriptionEnd,
      });

      const metadataTier = subscription.metadata?.tier ?? subscription.metadata?.subscription_tier;
      if (typeof metadataTier === "string" && metadataTier.trim().length > 0) {
        subscriptionTier = normalizeTier(metadataTier);
      } else {
        const amount = subscription.items.data[0]?.price?.unit_amount || 0;
        const interval = subscription.items.data[0]?.price?.recurring?.interval;
        if (interval === "year") {
          if (amount === 7900) subscriptionTier = "starter";
          else if (amount === 23900) subscriptionTier = "rising";
          else if (amount === 58900) subscriptionTier = "pro";
        } else {
          if (amount === 900) subscriptionTier = "starter";
          else if (amount === 2900) subscriptionTier = "rising";
          else if (amount === 6500) subscriptionTier = "pro";
        }
        subscriptionTier = normalizeTier(subscriptionTier);
        logStep("Determined subscription tier from price", { amount, interval, subscriptionTier });
      }
    } else {
      logStep("No active subscription found");
    }

    const billingAnchorAt = hasActiveSub
      ? new Date(((activeSubscription?.billing_cycle_anchor ?? activeSubscription?.current_period_start) || Math.floor(Date.now() / 1000)) * 1000).toISOString()
      : null;
    const monthlyBillingWindow = resolveMonthlyBillingWindow(billingAnchorAt ?? new Date().toISOString());
    const stripeCurrentPeriodStart = hasActiveSub && activeSubscription?.current_period_start
      ? new Date(activeSubscription.current_period_start * 1000).toISOString()
      : null;

    // Update subscribers table
    await supabaseService.from("subscribers").upsert({
      email: user.email,
      user_id: user.id,
      stripe_customer_id: customerId,
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      billing_anchor_at: monthlyBillingWindow.anchorAt.toISOString(),
      current_period_start: hasActiveSub ? stripeCurrentPeriodStart : monthlyBillingWindow.periodStart.toISOString(),
      current_period_end: hasActiveSub ? subscriptionEnd : monthlyBillingWindow.periodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    // Update user_credits table with subscription tier
    await supabaseService.from("user_credits").upsert({
      user_id: user.id,
      subscription_tier: subscriptionTier,
      billing_anchor_at: monthlyBillingWindow.anchorAt.toISOString(),
      current_period_start: monthlyBillingWindow.periodStart.toISOString(),
      current_period_end: monthlyBillingWindow.periodEnd.toISOString(),
    }, { onConflict: 'user_id' });

    logStep("Updated database with subscription info", { subscribed: hasActiveSub, subscriptionTier });

    // If user just upgraded, grant monthly credits
    if (hasActiveSub && subscriptionTier !== 'rookie') {
      try {
        await supabaseService.rpc('update_user_subscription_tier', {
          target_user_id: user.id,
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
