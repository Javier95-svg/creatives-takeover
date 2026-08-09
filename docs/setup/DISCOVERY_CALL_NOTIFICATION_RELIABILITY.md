# Discovery Call notification reliability deployment

Apply these steps in order. The database migration must be applied before the
updated worker or the delivery webhook is deployed.

## 1. Apply the database migration

From the repository root:

```powershell
supabase db push --linked
```

The migration is:

```text
supabase/migrations/20260809120000_discovery_call_notification_reliability_v3.sql
```

It adds founder request receipts, provider delivery outcomes, independent admin
alerts, outcome-review reminders, resend generations, and delivery-aware health
checks.

## 2. Configure the Resend signing secret

Create the Discovery Call webhook in Resend first, then copy its `whsec_...`
signing secret. Set that secret in Supabase:

```powershell
supabase secrets set --project-ref rcjlaybjnozqbsoxzboa "DISCOVERY_CALL_RESEND_WEBHOOK_SECRET=whsec_REPLACE_ME"
```

The existing secrets must also remain configured:

```text
RESEND_API_KEY
FROM_EMAIL
APP_URL
CRON_SECRET
DISCOVERY_CALL_REQUESTS_V2_ENABLED
DISCOVERY_CALL_RESEND_WEBHOOK_SECRET
```

`FROM_EMAIL` must use the verified production sending domain.

## 3. Deploy the changed Edge Functions

```powershell
supabase functions deploy process-discovery-call-notifications --project-ref rcjlaybjnozqbsoxzboa
supabase functions deploy process-discovery-call-deadlines --project-ref rcjlaybjnozqbsoxzboa
supabase functions deploy discovery-call-service --project-ref rcjlaybjnozqbsoxzboa
supabase functions deploy discovery-call-resend-webhook --project-ref rcjlaybjnozqbsoxzboa --no-verify-jwt
```

## 4. Register the signed Resend webhook

Use this production endpoint in the Resend dashboard:

```text
https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/discovery-call-resend-webhook
```

Subscribe it to:

- `email.sent`
- `email.delivered`
- `email.delivery_delayed`
- `email.bounced`
- `email.complained`
- `email.failed`
- `email.suppressed`

Do not put the signing secret in the URL. The Edge Function validates Resend's
`svix-id`, `svix-timestamp`, and `svix-signature` headers against the raw body.

## 5. Verify cron and delivery health

Run in the Supabase SQL Editor:

```sql
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname IN (
  'discovery-call-v2-deadlines',
  'discovery-call-v2-notifications'
)
ORDER BY jobname;

SELECT issue, discovery_call_id, detail_id, detected_at
FROM public.admin_discovery_call_workflow_health
ORDER BY detected_at DESC;
```

Both cron jobs must be active. After a production smoke test, each required
notification should progress from queue `sent` to provider delivery
`delivered`. A signed bounce, complaint, failure, suppression, stalled queue,
or missing delivery event creates an independent in-app alert for
`admin@creatives-takeover.com` and remains visible in the admin dashboard.

## 6. Production smoke test

Create one Discovery Call request and verify:

1. Founder, mentor, and admin each receive the request email.
2. All three outbox rows have unique IDs and provider message IDs.
3. Each row becomes `provider_delivery_status = 'delivered'`.
4. Mentor acceptance creates three `booking_confirmed` rows.
5. Each confirmation is delivered and includes the correct calendar file.
6. After the scheduled end, admin receives `outcome_required`.
7. The admin health view returns no issue for the smoke-test call.
