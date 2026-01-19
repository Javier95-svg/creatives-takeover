# Stripe Webhook Setup for Subscription Management

## Overview
This document explains how to set up Stripe webhooks to automatically update user subscriptions when payments are completed through Stripe payment links.

## How It Works

### User Flow
1. User clicks "Upgrade" on the pricing page
2. Stripe checkout opens in a **new tab** (user stays on platform)
3. User completes payment in Stripe
4. Stripe sends webhook to your backend with payment details
5. Backend updates user's subscription tier and credits in database
6. User closes Stripe tab and returns to platform
7. Platform automatically detects return and refreshes subscription data
8. User sees success message and can immediately use new features

### Technical Flow
```
User Payment → Stripe → Webhook → Supabase Edge Function → Database Update → Frontend Refresh
```

## Required Stripe Webhook Events

Configure these webhook events in your Stripe Dashboard:

### Essential Events
- `checkout.session.completed` - Triggered when payment link checkout completes
- `customer.subscription.created` - New subscription created
- `customer.subscription.updated` - Subscription modified
- `customer.subscription.deleted` - Subscription cancelled

### Recommended Events (for comprehensive handling)
- `invoice.paid` - Recurring payment succeeded
- `invoice.payment_failed` - Payment failed (for retry logic)
- `customer.created` - New customer created

## Webhook Endpoint Setup

### 1. Stripe Dashboard Configuration

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Set endpoint URL to your Supabase function:
   ```
   https://[YOUR-PROJECT-ID].supabase.co/functions/v1/stripe-webhook
   ```
4. Select the events listed above
5. Copy the **Webhook Signing Secret** (starts with `whsec_`)

### 2. Environment Variables

Add to your Supabase project secrets:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# For testing with Stripe CLI
STRIPE_WEBHOOK_SECRET_TEST=whsec_...
```

## Webhook Handler Implementation

### Required Supabase Edge Function

Create: `supabase/functions/stripe-webhook/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

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

    console.log(`Received event: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionChange(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("Webhook error:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});

async function handleCheckoutCompleted(session: any) {
  const { customer, customer_email, metadata } = session;

  // Extract tier and billing cycle from payment link metadata
  // You'll need to set these when creating payment links
  const tier = metadata?.tier; // 'creator' or 'professional'
  const billingCycle = metadata?.billing_cycle; // 'monthly' or 'yearly'

  // Get user from Supabase by email
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

  const { data: user } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", customer_email)
    .single();

  if (!user) {
    console.error("User not found for email:", customer_email);
    return;
  }

  // Determine credits based on tier
  const credits = tier === "creator" ? 50 : tier === "professional" ? 150 : 0;

  // Update user subscription
  await supabaseAdmin
    .from("profiles")
    .update({
      subscription_tier: tier,
      subscribed: true,
      subscription_end: getSubscriptionEndDate(billingCycle),
      stripe_customer_id: customer,
      monthly_credits: credits,
      credits: credits, // Reset current credits to plan amount
    })
    .eq("id", user.id);

  console.log(`Updated subscription for user ${user.id} to ${tier} (${billingCycle})`);
}

async function handleSubscriptionChange(subscription: any) {
  // Handle subscription updates (renewals, plan changes)
  const { customer, items, current_period_end } = subscription;

  // Similar logic to handleCheckoutCompleted
  // Update user's subscription details
}

async function handleSubscriptionDeleted(subscription: any) {
  // Handle cancellation - downgrade to free tier
  const { customer } = subscription;

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

  await supabaseAdmin
    .from("profiles")
    .update({
      subscription_tier: "free",
      subscribed: false,
      subscription_end: null,
      monthly_credits: 10,
      credits: 10,
    })
    .eq("stripe_customer_id", customer);
}

async function handleInvoicePaid(invoice: any) {
  // Handle recurring payments - reset credits
  const { customer, subscription } = invoice;

  // Reset monthly credits when invoice is paid
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );

  const { data: user } = await supabaseAdmin
    .from("profiles")
    .select("subscription_tier, monthly_credits")
    .eq("stripe_customer_id", customer)
    .single();

  if (user) {
    await supabaseAdmin
      .from("profiles")
      .update({
        credits: user.monthly_credits, // Reset to plan allowance
      })
      .eq("stripe_customer_id", customer);
  }
}

function getSubscriptionEndDate(billingCycle: string): string {
  const now = new Date();
  const endDate = new Date(now);

  if (billingCycle === "yearly") {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  return endDate.toISOString();
}
```

## Payment Link Metadata Configuration

### Important: Add Metadata to Stripe Payment Links

For the webhook to work correctly, add this metadata to each payment link:

#### Rising Monthly
- `tier`: `creator`
- `billing_cycle`: `monthly`

#### Rising Yearly
- `tier`: `creator`
- `billing_cycle`: `yearly`

#### Pro Monthly
- `tier`: `professional`
- `billing_cycle`: `monthly`

#### Pro Yearly
- `tier`: `professional`
- `billing_cycle`: `yearly`

### How to Add Metadata
1. Go to: https://dashboard.stripe.com/payment-links
2. Click on each payment link
3. Click "Edit link"
4. Scroll to "Additional options"
5. Add metadata key-value pairs as shown above
6. Save changes

## Testing Webhooks Locally

### 1. Install Stripe CLI
```bash
stripe login
```

### 2. Forward Webhooks to Local Supabase
```bash
stripe listen --forward-to https://[YOUR-PROJECT-ID].supabase.co/functions/v1/stripe-webhook
```

### 3. Trigger Test Events
```bash
# Test checkout completion
stripe trigger checkout.session.completed

# Test subscription creation
stripe trigger customer.subscription.created
```

## Database Schema Requirements

Ensure your `profiles` table has these columns:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscribed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_credits INTEGER DEFAULT 10;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 10;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
```

## Monitoring and Debugging

### 1. Stripe Dashboard
- View webhook attempts: https://dashboard.stripe.com/webhooks
- Check delivery status and response codes
- Resend failed webhooks

### 2. Supabase Logs
```bash
supabase functions logs stripe-webhook
```

### 3. Common Issues

**Webhook signature verification fails**
- Ensure `STRIPE_WEBHOOK_SECRET` is correct
- Check that raw request body is passed to verification

**User not found**
- Ensure user email in Stripe matches email in your database
- Check that user completed signup before payment

**Credits not updating**
- Verify webhook handler is updating correct fields
- Check database permissions for service role key

## Security Best Practices

1. **Always verify webhook signatures** - Prevents unauthorized requests
2. **Use idempotency** - Handle duplicate webhook events gracefully
3. **Store webhook events** - Keep audit trail for debugging
4. **Rate limit webhook endpoint** - Protect against abuse
5. **Monitor webhook failures** - Set up alerts for failed webhooks

## Support Resources

- Stripe Webhooks Documentation: https://stripe.dev/stripe-cli/webhooks-testing
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Stripe API Reference: https://stripe.com/docs/api

---

**Status**: ✅ Frontend implementation complete
**Next Step**: Deploy Supabase edge function and configure Stripe webhooks
