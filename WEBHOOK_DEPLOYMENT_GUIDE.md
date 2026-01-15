# Stripe Webhook Deployment Guide

## Manual Deployment (Easiest)

### Step 1: Deploy the Edge Function

1. Go to your Supabase Dashboard → https://supabase.com/dashboard
2. Select your project
3. Click "Edge Functions" in the left sidebar
4. Click "Create a new function"
5. Name: `stripe-webhook`
6. Copy the code from `supabase/functions/stripe-webhook/index.ts`
7. Paste it into the editor
8. Click "Deploy function"
9. Copy the function URL (you'll need this for Stripe)
   - Format: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/stripe-webhook`

### Step 2: Add Environment Variables

In Supabase Dashboard → Settings → Edge Functions → Add secrets:

```
STRIPE_SECRET_KEY=sk_live_... (your Stripe secret key)
STRIPE_WEBHOOK_SECRET=whsec_... (get this from Stripe after creating webhook)
```

### Step 3: Configure Stripe Webhook

1. Go to Stripe Dashboard → https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL:
   ```
   https://YOUR_PROJECT_ID.supabase.co/functions/v1/stripe-webhook
   ```
4. Select these events:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.paid`
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_...`)
7. Go back to Supabase → Settings → Edge Functions
8. Update the `STRIPE_WEBHOOK_SECRET` with this signing secret

### Step 4: Test the Webhook

1. In Stripe Dashboard, go to your webhook endpoint
2. Click "Send test webhook"
3. Select `checkout.session.completed`
4. Click "Send test webhook"
5. Check Supabase Edge Functions logs to verify it's working
6. Check your `stripe_webhook_events` table to see the logged event

---

## CLI Deployment (For Developers)

### Install Supabase CLI

**Windows (PowerShell):**
```powershell
scoop install supabase
```

**macOS:**
```bash
brew install supabase/tap/supabase
```

**Linux:**
```bash
brew install supabase/tap/supabase
```

### Login to Supabase

```bash
supabase login
```

### Link Your Project

```bash
cd creatives-takeover
supabase link --project-ref YOUR_PROJECT_ID
```

### Set Environment Variables

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### Deploy Function

```bash
supabase functions deploy stripe-webhook
```

### View Logs

```bash
supabase functions logs stripe-webhook --tail
```

---

## Verification Checklist

After deployment, verify everything is working:

### 1. Function Deployed
- [ ] Go to Supabase Dashboard → Edge Functions
- [ ] See `stripe-webhook` function listed
- [ ] Function status is "Active"
- [ ] Copy the function URL

### 2. Environment Variables Set
- [ ] `STRIPE_SECRET_KEY` is set in Supabase secrets
- [ ] `STRIPE_WEBHOOK_SECRET` is set in Supabase secrets

### 3. Stripe Webhook Configured
- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] URL matches your Supabase function URL
- [ ] Events are selected (checkout.session.completed, etc.)
- [ ] Signing secret copied to Supabase

### 4. Database Ready
- [ ] Ran `DATABASE_SETUP.sql` successfully
- [ ] `stripe_webhook_events` table exists
- [ ] `update_user_subscription()` function exists
- [ ] All 4 payment links have metadata (tier, billing_cycle)

### 5. Test End-to-End
- [ ] Make a test payment using Stripe test mode
- [ ] Check Supabase Edge Function logs for webhook receipt
- [ ] Check `stripe_webhook_events` table for logged event
- [ ] Check `profiles` table for updated subscription
- [ ] User credits updated correctly

---

## Troubleshooting

### Webhook not receiving events
- Verify URL is correct in Stripe Dashboard
- Check Stripe webhook status (should be "Enabled")
- Send test webhook from Stripe Dashboard
- Check Supabase function logs for errors

### Signature verification fails
- Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe signing secret
- Re-copy the signing secret from Stripe Dashboard
- Update Supabase secret and redeploy function

### User not found error
- Ensure user completed signup BEFORE payment
- Check that email in Stripe matches email in `auth.users` table
- Verify `update_user_subscription()` function queries `auth.users`

### Credits not updating
- Check function logs for errors
- Verify metadata is set on payment links (tier, billing_cycle)
- Check database permissions for service_role
- Run verification query:
  ```sql
  SELECT * FROM profiles WHERE email = 'test@example.com';
  ```

---

## Monitoring

### View Recent Webhook Events

```sql
SELECT
  event_type,
  customer_email,
  processed,
  error_message,
  created_at
FROM stripe_webhook_events
ORDER BY created_at DESC
LIMIT 10;
```

### View Active Subscriptions

```sql
SELECT * FROM active_subscriptions;
```

### View Function Logs

In Supabase Dashboard → Edge Functions → stripe-webhook → Logs

Or via CLI:
```bash
supabase functions logs stripe-webhook --tail
```

---

## Next Steps

Once everything is working:

1. **Test with real payment** (use Stripe test mode first)
2. **Monitor webhook events** for first few days
3. **Set up alerts** for failed webhooks
4. **Document any issues** and solutions
5. **Switch to production mode** when ready

---

## Support

- Stripe Webhooks Docs: https://stripe.com/docs/webhooks
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Stripe Test Cards: https://stripe.com/docs/testing
