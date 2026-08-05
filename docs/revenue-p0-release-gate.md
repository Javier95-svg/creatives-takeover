# Revenue P0 release gate

Do not route production traffic to the new checkout until every item in the
production audit and configuration sections is complete. Missing or mismatched
Stripe configuration is expected to fail closed; Payment Links are not a
fallback.

## 1. Production audit

Confirm all items in the same Stripe account and in live mode:

- Successful Payments and Checkout Sessions, including any purchases made
  through legacy Payment Links.
- Products, recurring Prices, currencies, amounts, and active/archive state.
- Existing Payment Links and the metadata they supplied or omitted.
- The deployed `stripe-webhook` endpoint URL, enabled status, and subscribed
  event types.
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Supabase Edge Function
  secrets. The signing secret must belong to the audited endpoint, not a CLI
  listener or test endpoint.
- `SUPABASE_SERVICE_ROLE_KEY` belongs to the same Supabase project used by the
  web app.

The webhook endpoint must subscribe to at least:

- `checkout.session.completed`
- `checkout.session.expired`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

Record evidence (dashboard link or internal ticket, timestamp, operator, live
mode/account ID) for each check. Never paste secrets into the evidence record.

## 2. Canonical live Price IDs

Record the six audited live recurring Price IDs outside source control, then
apply them to `subscription_tiers`:

| Plan | Monthly Price ID | Yearly Price ID |
| --- | --- | --- |
| Starter | required | required |
| Rising | required | required |
| Pro | required | required |

```sql
update public.subscription_tiers
set stripe_price_id_monthly = case tier_name
      when 'starter' then '<starter-monthly-price-id>'
      when 'rising' then '<rising-monthly-price-id>'
      when 'pro' then '<pro-monthly-price-id>'
    end,
    stripe_price_id_yearly = case tier_name
      when 'starter' then '<starter-yearly-price-id>'
      when 'rising' then '<rising-yearly-price-id>'
      when 'pro' then '<pro-yearly-price-id>'
    end
where tier_name in ('starter', 'rising', 'pro');
```

Release-gate query (must return exactly six distinct non-null IDs):

```sql
select tier_name, stripe_price_id_monthly, stripe_price_id_yearly
from public.subscription_tiers
where tier_name in ('starter', 'rising', 'pro')
order by tier_name;

select count(distinct price_id) as configured_price_count
from (
  select stripe_price_id_monthly as price_id
  from public.subscription_tiers where tier_name in ('starter', 'rising', 'pro')
  union all
  select stripe_price_id_yearly
  from public.subscription_tiers where tier_name in ('starter', 'rising', 'pro')
) configured
where price_id is not null;
```

Compare each database ID with Stripe: active, USD, expected amount, recurring,
and monthly/yearly interval. `create-checkout` validates the same contract at
runtime.

## 3. Reconcile historical successful payments

For every successful live Checkout Session/Payment Link purchase, match by
Stripe customer, user metadata, and email. Review:

```sql
select event_id, event_type, customer_id, customer_email, subscription_id,
       processed, error_message, created_at, processed_at
from public.stripe_webhook_events
order by created_at desc;

select stripe_session_id, user_id, purchase_type, plan, billing_cycle, pack_id,
       amount_cents, status, terminal_event_type, created_at, terminal_at
from public.stripe_checkout_sessions
order by created_at desc;

select * from public.revenue_checkout_alerts_v1 order by detected_at;
```

For each payment, verify the matching subscriber row, profile tier/billing
cycle, credit balance or credit transaction, and webhook delivery. Resolve
unknown users or prices manually; do not mark those webhook rows processed
until the underlying mapping is correct. Credit corrections must be auditable
and idempotent.

## 4. Pre-release verification

- Run `npm run typecheck` and `npm test`; retain the known unrelated landing
  freeze-hash failure in the report if it remains.
- In Stripe test mode, buy Starter/Rising/Pro monthly and yearly plus one credit
  pack. For every case, verify the created-session record, terminal webhook,
  subscriber/profile state, credit allocation, analytics event, and success
  page.
- Exercise duplicate delivery, renewal, expiration, failed invoice/payment,
  unknown Price ID, unresolved user, cancellation, and downgrade fixtures.
- Confirm all public mentor cards/profiles show Message and Save Mentor without
  booking CTAs, and stale `/mentorship/book/:id` URLs redirect safely.
- Confirm sprint checkpoint requests create no discovery-call intent or credit
  transaction and only become complete after admin verification plus founder
  recommendation.

## 5. Live proof and monitoring

After deployment, use a new account for one real Starter purchase. Verify the
Stripe Session and Event, durable webhook row, checkout-session terminal state,
subscriber/profile tier, billing cycle, credit allocation, governed analytics
event, success page, cancellation, and downgrade behavior. Refund the test
purchase through the normal audited process if required.

For at least 48 hours, assign an owner to monitor:

- `public.revenue_checkout_alerts_v1`
- `checkout_session_created → subscription_started` conversion, with
  expiration and payment failure breakdowns
- message starts, mentor saves, replies, and paid follow-up messages

The consent-filtered discovery-call review input is
`public.discovery_call_outreach_review_v1` (service role only). It is a review
list, not authorization to send. Any outreach requires a separately approved
campaign.
