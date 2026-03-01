import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`[Webhook] Received event: ${event.type}`);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Log webhook event to database
    await supabaseAdmin.from("stripe_webhook_events").insert({
      event_id: event.id,
      event_type: event.type,
      customer_id: event.data.object.customer || null,
      customer_email: event.data.object.customer_details?.email || event.data.object.customer_email || null,
      subscription_id: event.data.object.subscription || null,
      payload: event,
      processed: false,
    });

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object, supabaseAdmin);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChange(event.data.object, supabaseAdmin);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object, supabaseAdmin);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object, supabaseAdmin);
        break;
      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    // Mark webhook event as processed
    await supabaseAdmin
      .from("stripe_webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("event_id", event.id);

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[Webhook] Error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});

// Credit pack definitions (must match credit_packs table and CREDIT_PACK_OPTIONS in constants.ts)
const CREDIT_PACK_CREDITS: Record<string, number> = {
  pack_10: 10,
  pack_20: 20,
  pack_40: 40,
};

async function handleCheckoutCompleted(session: any, supabaseAdmin: any) {
  console.log("[Checkout] Processing checkout.session.completed");

  const { customer, customer_details, metadata, mode } = session;
  const customerEmail = customer_details?.email;

  if (!customerEmail) {
    console.error("[Checkout] No customer email found");
    return;
  }

  // Route to credit pack handler for one-time purchases
  if (mode === 'payment') {
    await handleCreditPackPurchase(session, supabaseAdmin);
    return;
  }

  // Subscription checkout
  const tier = metadata?.tier; // 'creator' or 'professional'
  const billingCycle = metadata?.billing_cycle; // 'monthly' or 'yearly'

  if (!tier || !billingCycle) {
    console.error("[Checkout] Missing metadata - tier or billing_cycle not found");
    console.log("[Checkout] Metadata:", metadata);
    return;
  }

  console.log(`[Checkout] Updating subscription for ${customerEmail} to ${tier} (${billingCycle})`);

  const { data, error } = await supabaseAdmin.rpc("update_user_subscription", {
    customer_email_param: customerEmail,
    tier_param: tier,
    billing_cycle_param: billingCycle,
    stripe_customer_id_param: customer,
  });

  if (error) {
    console.error("[Checkout] Error updating subscription:", error);
    throw error;
  }

  if (data === false) {
    console.error("[Checkout] User not found for email:", customerEmail);
    return;
  }

  console.log(`[Checkout] Successfully updated subscription for ${customerEmail}`);
}

async function handleCreditPackPurchase(session: any, supabaseAdmin: any) {
  console.log("[CreditPack] Processing one-time credit pack purchase");

  const { metadata, customer_details, id: stripeSessionId } = session;
  const customerEmail = customer_details?.email;
  const packId = metadata?.pack_id;
  const userId = metadata?.user_id;

  if (!packId || !CREDIT_PACK_CREDITS[packId]) {
    console.error("[CreditPack] Invalid or missing pack_id in metadata:", metadata);
    return;
  }

  const creditsToAdd = CREDIT_PACK_CREDITS[packId];

  // Resolve user_id from metadata or fall back to email lookup
  let resolvedUserId = userId;
  if (!resolvedUserId && customerEmail) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .single();
    resolvedUserId = profile?.id;
  }

  if (!resolvedUserId) {
    console.error("[CreditPack] Could not resolve user for email:", customerEmail);
    return;
  }

  // Atomic increment via RPC
  const { error: rpcError } = await supabaseAdmin.rpc("increment_credit_balance", {
    p_user_id: resolvedUserId,
    p_amount: creditsToAdd,
  });

  if (rpcError) {
    // Fallback: direct update with read-modify-write
    console.warn("[CreditPack] RPC increment failed, using fallback:", rpcError.message);
    const { data: currentCredits } = await supabaseAdmin
      .from("user_credits")
      .select("balance")
      .eq("user_id", resolvedUserId)
      .single();

    const newBalance = (currentCredits?.balance ?? 0) + creditsToAdd;
    const { error: fallbackError } = await supabaseAdmin
      .from("user_credits")
      .update({ balance: newBalance })
      .eq("user_id", resolvedUserId);

    if (fallbackError) {
      console.error("[CreditPack] Fallback credit update failed:", fallbackError);
      throw fallbackError;
    }
  }

  // Log the purchase transaction
  await supabaseAdmin.from("credit_transactions").insert({
    user_id: resolvedUserId,
    amount: creditsToAdd,
    tx_type: "purchase",
    reason: `Credit pack purchase: ${packId} (${creditsToAdd} credits)`,
    feature: "Credit Pack",
    metadata: {
      packId,
      stripeSessionId,
      customerEmail,
    },
  });

  console.log(`[CreditPack] Added ${creditsToAdd} credits to user ${resolvedUserId} (pack: ${packId})`);
}

async function handleSubscriptionChange(subscription: any, supabaseAdmin: any) {
  console.log("[Subscription] Processing subscription change");

  const { customer, status, current_period_end, items } = subscription;

  // Get customer email
  const { data: customerData } = await stripe.customers.retrieve(customer);
  const customerEmail = (customerData as any).email;

  if (!customerEmail) {
    console.error("[Subscription] No email found for customer:", customer);
    return;
  }

  // Determine tier from price ID
  const priceId = items.data[0]?.price?.id;
  const tier = getTierFromPriceId(priceId);

  // Determine billing cycle
  const interval = items.data[0]?.price?.recurring?.interval; // 'month' or 'year'
  const billingCycle = interval === "year" ? "yearly" : "monthly";

  if (status === "active") {
    console.log(`[Subscription] Updating subscription for ${customerEmail} to ${tier} (${billingCycle})`);

    await supabaseAdmin.rpc("update_user_subscription", {
      customer_email_param: customerEmail,
      tier_param: tier,
      billing_cycle_param: billingCycle,
      stripe_customer_id_param: customer,
    });
  } else if (status === "canceled" || status === "incomplete_expired") {
    console.log(`[Subscription] Downgrading ${customerEmail} to free tier`);

    // Downgrade to free
    await supabaseAdmin.rpc("update_user_subscription", {
      customer_email_param: customerEmail,
      tier_param: "free",
      billing_cycle_param: "monthly",
      stripe_customer_id_param: customer,
    });
  }
}

async function handleSubscriptionDeleted(subscription: any, supabaseAdmin: any) {
  console.log("[Subscription] Processing subscription deletion");

  const { customer } = subscription;

  // Downgrade profiles table to free tier
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      subscription_tier: "free",
      subscribed: false,
      subscription_end: null,
      billing_cycle: null,
    })
    .eq("stripe_customer_id", customer);

  if (profileError) {
    console.error("[Subscription] Error downgrading profile:", profileError);
    throw profileError;
  }

  // Update user_credits table — the actual source of truth for credit balances
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customer)
    .single();

  if (profile?.id) {
    const { error: creditsError } = await supabaseAdmin
      .from("user_credits")
      .update({
        subscription_tier: "free",
        monthly_quota: 25,
        last_reset_at: new Date().toISOString(),
      })
      .eq("user_id", profile.id);

    if (creditsError) {
      console.error("[Subscription] Error downgrading user_credits:", creditsError);
    }

    // Log the downgrade transaction
    await supabaseAdmin.from("credit_transactions").insert({
      user_id: profile.id,
      amount: 0,
      tx_type: "adjustment",
      reason: "Subscription cancelled - downgraded to free tier (25 monthly credits)",
      feature: "Subscription Downgrade",
      metadata: { previousTier: "paid", newTier: "free", newQuota: 25 },
    });

    console.log(`[Subscription] Updated user_credits for ${profile.id} to free tier (25 quota)`);
  } else {
    console.error("[Subscription] No profile found for stripe customer:", customer);
  }

  console.log(`[Subscription] Successfully downgraded customer ${customer} to free tier`);
}

async function handleInvoicePaid(invoice: any, supabaseAdmin: any) {
  console.log("[Invoice] Processing invoice.paid");

  const { customer, subscription } = invoice;

  if (!subscription) {
    console.log("[Invoice] No subscription associated with invoice");
    return;
  }

  // Reset monthly credits when invoice is paid (recurring payment)
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("monthly_credits")
    .eq("stripe_customer_id", customer)
    .single();

  if (profile) {
    await supabaseAdmin
      .from("profiles")
      .update({
        credits: profile.monthly_credits, // Reset to plan allowance
      })
      .eq("stripe_customer_id", customer);

    console.log(`[Invoice] Reset credits for customer ${customer} to ${profile.monthly_credits}`);
  }
}

function getTierFromPriceId(priceId: string): string {
  // Map Stripe price IDs to tier names
  // You'll need to add your actual Stripe price IDs here
  const priceMap: Record<string, string> = {
    // Add your Stripe price IDs here once you create them
    // Example:
    // 'price_xxxCreatorMonthly': 'creator',
    // 'price_xxxCreatorYearly': 'creator',
    // 'price_xxxProMonthly': 'professional',
    // 'price_xxxProYearly': 'professional',
  };

  return priceMap[priceId] || "free";
}
