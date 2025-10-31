import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ 
          error: "Stripe not configured",
          isConfigured: false 
        }), 
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user?.email) throw new Error("User not authenticated");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Find Stripe customer
    const customers = await stripe.customers.list({ 
      email: user.email, 
      limit: 1 
    });

    if (customers.data.length === 0) {
      return new Response(
        JSON.stringify({ 
          isConfigured: true,
          hasStripeAccount: false,
          message: "No Stripe customer found for this email"
        }), 
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200
        }
      );
    }

    const customerId = customers.data[0].id;

    // Get subscriptions for MRR calculation
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    });

    // Calculate MRR from active subscriptions
    let mrr = 0;
    let activeCustomers = 0;
    subscriptions.data.forEach(sub => {
      if (sub.status === 'active') {
        activeCustomers++;
        sub.items.data.forEach(item => {
          const amount = item.price.unit_amount || 0;
          const interval = item.price.recurring?.interval;
          
          // Convert to monthly recurring revenue
          if (interval === 'month') {
            mrr += amount / 100;
          } else if (interval === 'year') {
            mrr += (amount / 100) / 12;
          }
        });
      }
    });

    // Get last 30 days of charges for revenue
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    const charges = await stripe.charges.list({
      customer: customerId,
      created: { gte: thirtyDaysAgo },
      limit: 100,
    });

    // Calculate total revenue from charges
    const totalRevenue = charges.data
      .filter(charge => charge.status === 'succeeded')
      .reduce((sum, charge) => sum + (charge.amount / 100), 0);

    // Calculate churn rate (canceled vs active subscriptions)
    const canceledSubs = subscriptions.data.filter(s => s.status === 'canceled').length;
    const totalSubs = subscriptions.data.length || 1;
    const churnRate = (canceledSubs / totalSubs) * 100;

    // Calculate conversion rate (estimate from payment intents)
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      created: { gte: thirtyDaysAgo },
      limit: 100,
    });

    const successfulIntents = paymentIntents.data.filter(pi => pi.status === 'succeeded').length;
    const totalIntents = paymentIntents.data.length || 1;
    const conversionRate = (successfulIntents / totalIntents) * 100;

    // Get historical data for trend
    const sixtyDaysAgo = Math.floor(Date.now() / 1000) - (60 * 24 * 60 * 60);
    const historicalCharges = await stripe.charges.list({
      customer: customerId,
      created: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      limit: 100,
    });

    const previousRevenue = historicalCharges.data
      .filter(charge => charge.status === 'succeeded')
      .reduce((sum, charge) => sum + (charge.amount / 100), 0);

    return new Response(
      JSON.stringify({
        isConfigured: true,
        hasStripeAccount: true,
        metrics: {
          mrr: Math.round(mrr),
          totalRevenue: Math.round(totalRevenue),
          churnRate: Math.round(churnRate * 10) / 10,
          conversionRate: Math.round(conversionRate * 10) / 10,
          activeCustomers,
          previousRevenue: Math.round(previousRevenue),
        }
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error fetching Stripe metrics:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        isConfigured: false
      }), 
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});