# Customer journey analytics operations

The canonical analytics contract is [`analytics/posthog/customer-journey.json`](../../analytics/posthog/customer-journey.json). It owns the critical event names, required properties, journey stages, team ownership, funnels, cohorts, dashboards, filters, and alert conditions. CI validates the contract through `npm run test:analytics`.

## Journey coverage

The managed journey is:

1. Acquisition: `landing_viewed` → `signup_started` → `signup_completed`.
2. Onboarding: `onboarding_started` → step completion → completion or abandonment.
3. Activation: dashboard → first action → first input → first output → first saved artifact → `activation_completed`.
4. Value: `tool_opened` → `tool_output_created`, broken down by the six core tools.
5. Monetization: pricing → upgrade click → subscription → payment, plus plan changes and cancellations.
6. Retention and evidence: Day 2/Day 7 returns, PMF survey responses, and evidence logged.

Every managed PostHog insight must apply the global person filter `is_internal is not true`. Event and property names are snake_case. Existing live events are never renamed; breaking changes require a new event or `schema_version` during a migration window.

## PostHog reporting setup

Create these resources from the manifest in PostHog. The project token (`phc_...`) can ingest events but cannot manage dashboards; dashboard automation or API management requires a scoped personal API key.

- Dashboard: **Customer Journey — Executive**
  - Acquisition to activation, 14-day conversion window.
  - Onboarding completion, 7-day conversion window.
  - Core tool time-to-value, broken down by `tool`.
  - Pricing to paid, 30-day conversion window.
  - PMF evidence loop, 30-day conversion window.
  - Day 2 and Day 7 activation-return trends.
  - Subscription cancellation trend.
- Dashboard: **Analytics Quality & Reliability**
  - Weekly `tool_opened`, `generation_failed`, `subscription_started`, and `pmf_survey_response_received` volume.
  - Alert when weekly `tool_opened` volume reaches zero.
  - Apply the internal-user filter to every insight.
- Cohorts:
  - Activated founders in the last 30 days.
  - Signed up but not activated after 7 days.
  - Paying founders (`subscription_tier` is not `rookie`).
  - Paying founders without `tool_opened` in 14 days.

## Server delivery health

Server delivery attempts are rolled up hourly in `public.analytics_delivery_health_hourly`. The table contains no user identifier or event payload. `public.analytics_delivery_health_24h` classifies each event/destination as:

- `healthy`: successful delivery with less than 5% final failures.
- `warning`: final failure rate is at least 5%.
- `critical`: attempts failed and none succeeded.
- `disabled`: all attempts were skipped, normally because a destination API key is absent.

Run this in the Supabase SQL editor when validating a release or investigating an alert:

```sql
select *
from public.analytics_delivery_health_24h
where health_status <> 'healthy'
order by health_status, destination, event_name;
```

Final delivery failures also emit structured Edge Function logs with the prefix `[analytics] Event delivery failed`; health-persistence failures use `[analytics-health]`. Configure the production log drain to alert on either prefix. The manifest additionally defines a PostHog zero-volume canary for `tool_opened`.

## Release and deployment

From the repository root in PowerShell:

```powershell
supabase login
.\scripts\deploy-analytics-edge-functions.ps1
```

The script applies the database migration first and stops immediately on any failed function deployment. To redeploy functions without re-running database migrations:

```powershell
.\scripts\deploy-analytics-edge-functions.ps1 -SkipDatabase
```

The script deliberately applies this one idempotent migration with `supabase db query --linked --file`. Production contains legacy migration-history entries that are absent from this repository, so a normal `supabase db push --linked` currently refuses to run. Do not mass-repair or revert production migration history as part of this analytics release.

After deployment:

1. Trigger one safe event in each core flow.
2. Confirm `POSTHOG_PROJECT_API_KEY` is not reported as disabled in the 24-hour health view.
3. Confirm the event is visible in PostHog Live Events under the same Supabase user UUID.
4. Confirm internal/admin accounts are absent from managed insights.
5. Run `npm run test:analytics` whenever the manifest or event instrumentation changes.
