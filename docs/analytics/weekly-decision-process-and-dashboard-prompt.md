# Weekly customer analytics decision process and dashboard prompt

## Purpose

This document turns the customer-journey tracking implementation into a repeatable weekly product-management process. It also contains a copy-paste prompt for Claude Code to create the governed PostHog dashboards, insights, cohorts, and alerts.

The objective is not to collect more charts. The objective is to run the same learning loop every week:

> Measure -> locate the largest important gap -> form a hypothesis -> test one change -> review the result -> keep, revise, or revert.

## Current implementation assessment

The analytics implementation is approximately **8.5/10** from an architecture and coverage perspective.

It currently provides:

- Anonymous acquisition and first-touch campaign tracking.
- Authenticated identity using the Supabase user UUID without sending email or name.
- Explicit acquisition, onboarding, activation, value, monetization, retention, PMF, and failure events.
- Server-side subscription, payment, PMF-response, and generation-failure events.
- PostHog and Amplitude delivery with destination-level success, failure, and skipped outcomes.
- PII sanitization, internal-user filtering, bot filtering, logout reset, and account-switch protection.
- An hourly Supabase delivery-health table and a 24-hour health view.
- A machine-readable contract containing 29 governed events, five funnels, four cohorts, two dashboards, and three alerts.
- Automated analytics-governance and instrumentation tests.

The backend analytics migration and the six relevant Supabase Edge Functions were confirmed deployed on July 22, 2026. At the time of verification, `public.analytics_delivery_health_24h` contained zero rows. This is not a failure: it means no newly monitored server business event had fired since deployment, so end-to-end delivery still needs to be observed with real or safe test traffic.

The remaining maturity gaps are:

1. Confirm the frontend commit containing the upgraded client tracking is deployed.
2. Trigger and verify at least one safe event from each core flow.
3. Confirm the PostHog dashboards, cohorts, and alerts exist in the live project.
4. Configure the server-side Amplitude secret if dual-destination server delivery is required.
5. Accumulate two to four weeks of clean production data before treating weekly changes as stable baselines.

## Weekly scorecard

Use the previous complete Monday-to-Sunday period. Never compare a complete week with the current incomplete week. Show the previous week and rolling four-week average beside every metric.

### Primary metric

Use **new-user activation within seven days of signup** as the primary metric:

`unique users with activation_completed / unique users with signup_completed`

Track both the percentage and the absolute number of activated users. A percentage without its sample size can be misleading.

### Core scorecard

| Metric | Recommended definition | Question answered |
| --- | --- | --- |
| Unique landing visitors | Unique persons with `landing_viewed` | How much qualified traffic arrived? |
| Signup conversion | `signup_completed / landing_viewed` | Does the acquisition and signup experience convert? |
| Onboarding completion | `onboarding_completed / onboarding_started` | Can new users complete setup? |
| Seven-day activation | `activation_completed / signup_completed` within 7 days | Do new users reach meaningful value? |
| Time to first output | Median time from `signup_completed` to `activation_first_output_generated` | How quickly do users experience value? |
| Day 7 return | `activation_returned_day_7 / activation_completed` | Does the value bring users back? |
| Paid conversion | `subscription_payment_received / signup_completed` within 30 days | Do users value the platform enough to pay? |

### Guardrails

Always review these before interpreting customer behaviour:

- Volume and rate of `generation_failed` by `tool` and `error_code`.
- `public.analytics_delivery_health_24h` for `warning`, `critical`, or `disabled` statuses.
- Zero-volume alerts for important events such as `tool_opened`.
- Internal-person filter: `is_internal is not true`.

If tracking is unhealthy, fix or explain the instrumentation problem before making a product decision.

## Weekly 45-minute review

Run the review on the same day and time each week.

### 0-5 minutes: establish trust

1. Check server delivery health.
2. Check that critical event volumes did not unexpectedly fall to zero.
3. Check the generation-failure rate.
4. Confirm internal users are excluded.
5. Record any outage, release, campaign, or unusual traffic that affected the week.

### 5-15 minutes: read the scorecard

For each metric, record:

- Last complete week.
- Previous complete week.
- Rolling four-week average.
- Absolute change and percentage-point change.
- Number of users entering the metric or funnel.

Practical sample-size guidance for a beginner:

- Fewer than 30 users: treat the result as directional and use a longer date range.
- 30-100 users: investigate the pattern, but remain cautious.
- More than 100 users: week-over-week comparisons become more useful.

These are operating heuristics, not formal statistical-significance thresholds.

### 15-25 minutes: locate the largest gap

Choose the largest loss that affects an important outcome. Segment it by no more than one or two dimensions at a time:

- Acquisition source or campaign.
- Mobile versus desktop.
- Tool.
- Subscription tier.
- Onboarding step.
- New versus returning user.

Prioritize a gap using three 1-5 scores:

`priority = impact x confidence x ease`

Repair critical reliability problems before growth experiments, even if their calculated score is lower.

### 25-35 minutes: write one hypothesis

Use this structure:

> We believe `[user segment]` struggles with `[journey step]` because `[evidence-backed reason]`. If we `[specific change]`, `[primary metric]` should move from `[baseline]` to `[target]` without harming `[guardrail]`.

Analytics identifies where a problem occurs, not necessarily why. Support the hypothesis with survey responses, customer conversations, support messages, or usability observations.

### 35-45 minutes: commit to one experiment

Every experiment must have:

- One owner.
- One target segment.
- One product change.
- One primary metric.
- One guardrail metric.
- A baseline and target.
- A release date and review date.

At the review date, classify the result as:

- **Keep:** the primary metric improved and guardrails remained healthy.
- **Revise:** the result was promising but unclear or segment-specific.
- **Revert:** the metric did not improve or a guardrail deteriorated.

## Decision log template

Maintain this in a shared document or spreadsheet:

| Field | Example |
| --- | --- |
| Review date | 2026-08-03 |
| Observation | Mobile onboarding completion is 18 percentage points lower than desktop |
| Evidence and sample | 114 mobile onboarding starts |
| Hypothesis | Onboarding step three is too long on a small screen |
| Decision | Reduce step three from eight fields to four |
| Target segment | New mobile users |
| Primary metric | Mobile onboarding completion |
| Baseline | 31% |
| Target | 40% |
| Guardrail | Seven-day activation must not decrease |
| Owner | Javier |
| Release date | 2026-08-05 |
| Review date | 2026-08-19 |
| Result | Pending |
| Final decision | Keep, revise, or revert |

## First four-week operating cycle

### Week 1: data trust and baseline

- Create or synchronize the PostHog reporting resources.
- Confirm the frontend analytics release is deployed.
- Trigger safe events in the core flows.
- Confirm server health rows and PostHog Live Events.
- Record the first scorecard without drawing strong conclusions.

### Week 2: activation

- Find the largest loss before `activation_completed`.
- Select one user segment.
- Launch one small activation experiment.

### Week 3: retention

- Compare activated users who returned on Day 7 with those who did not.
- Compare tools used, outputs created, and artifacts saved.
- Select one retention hypothesis.

### Week 4: monetization

- Inspect the pricing-to-payment funnel.
- Determine whether the loss happens at pricing, upgrade click, subscription creation, or payment.
- Check whether non-paying users failed to activate earlier in their journey.

## Credentials needed for dashboard automation

The `phc_...` PostHog project token is an event-ingestion credential. It cannot create or update dashboards.

Claude Code will need these values available as environment variables for the current terminal session:

- `POSTHOG_PERSONAL_API_KEY`: a scoped personal API key allowed to read/write dashboards, insights, and cohorts in the target project.
- `POSTHOG_PROJECT_ID`: the numeric PostHog project ID.
- `POSTHOG_API_HOST`: the management API host for the account region, normally `https://us.posthog.com` for US Cloud or `https://eu.posthog.com` for EU Cloud. This is different from the `*.i.posthog.com` event-ingestion host.

Do not paste the personal API key into this document, the Claude prompt, source code, command history, screenshots, logs, or a committed `.env` file. Configure it in the local terminal or approved secret manager before running the automation.

Use the least privilege available. Claude must verify the current PostHog API documentation and permissions before performing live writes.

## Copy-paste prompt for Claude Code

Copy everything inside the following block into Claude Code from the repository root:

```text
You are working in the Creatives Takeover repository. Create the live PostHog customer-behaviour reporting system from the analytics contract already present in this repository.

GOAL

Create or safely update the governed PostHog insights, dashboards, cohorts, and supported alerts needed for a weekly customer-journey decision process. Leave behind repeatable, documented, idempotent automation so the resources can be synchronized again without producing duplicates.

SOURCE OF TRUTH

Read these files completely before changing anything:

1. analytics/posthog/customer-journey.json
2. docs/analytics/customer-journey-operations.md
3. docs/analytics/weekly-decision-process-and-dashboard-prompt.md
4. tests/analytics-governance.test.ts
5. src/lib/analytics.ts
6. supabase/functions/_shared/analytics.ts
7. supabase/migrations/20260722150000_analytics_delivery_health.sql

Treat analytics/posthog/customer-journey.json as canonical for event names, required properties, funnel steps, conversion windows, breakdown properties, cohort definitions, dashboard contents, global filters, and alerts. Do not silently replace its values with assumptions from this prompt. If the manifest and prose conflict, report the conflict and follow the manifest unless doing so is unsafe.

CURRENT CONTEXT

- The analytics architecture has 29 governed journey events, five funnels, four cohorts, two dashboards, and three alert definitions.
- The desired managed dashboards are "Customer Journey — Executive" and "Analytics Quality & Reliability".
- Every managed insight must exclude internal people using the canonical person filter `is_internal is not true`.
- Server delivery health is external to PostHog and is available in Supabase through `public.analytics_delivery_health_24h`.
- The database migration and six analytics-emitting Edge Functions were deployed on July 22, 2026.
- The 24-hour health view had zero rows immediately after deployment because no newly monitored server event had fired yet. Do not interpret an empty view as successful delivery or as a failure; report it as "not yet observed".
- The PostHog project token beginning with `phc_` is only for event ingestion. It must not be used to manage dashboards.
- Dashboard automation requires a scoped personal API key and the numeric project ID.

EXPECTED ENVIRONMENT VARIABLES

- POSTHOG_PERSONAL_API_KEY
- POSTHOG_PROJECT_ID
- POSTHOG_API_HOST, using the management host for the correct region, not the event-ingestion host

Never print, echo, serialize, commit, or include the personal API key in an error message. Never add it to a tracked .env file. If a required value is absent, stop before live API writes and tell me exactly how to provide it securely.

WORKFLOW

1. Inspect the repository, current git status, package scripts, and existing analytics automation. Preserve unrelated user changes.
2. Validate the JSON contract and run the existing analytics tests before making live PostHog changes.
3. Check the current official PostHog API documentation/schema for authentication, dashboard, insight, cohort, and alert endpoints. Do not guess obsolete request payloads.
4. Read the target PostHog project and inventory existing resources. Use read-only requests first.
5. Produce a concise dry-run plan showing what will be created, updated, reused, skipped, or cannot be automated. Do not delete anything.
6. Implement idempotent synchronization using the repository's existing runtime and conventions. Prefer a small script under scripts/ with an explicit dry-run mode and a live-apply flag. Avoid adding a large dependency solely for a few HTTP requests.
7. Match managed resources by stable manifest key stored in a description, tag, or other supported metadata plus the canonical name. Do not rely on name alone when a stable managed marker is available.
8. Reuse and update resources previously created by this automation. Never overwrite or delete an unrecognized human-created resource with a similar name. If ownership is ambiguous, stop and report it.
9. Create the five manifest funnels with their exact steps, windows, breakdowns, and internal-user filter.
10. Create trend or retention insights required by the dashboard manifests, including Day 2 return, Day 7 return, subscription cancellations, and quality-event volumes.
11. Create the two dashboards and attach the correct managed insights.
12. Create the four cohorts exactly as defined in the manifest. Resolve dependent cohorts safely, creating base cohorts before cohorts that reference them.
13. Implement the PostHog zero-volume alert if the current API supports it safely. For Supabase health alerts, do not pretend they are PostHog-native: document the external SQL/log-monitoring step when it cannot be automated with the available credentials.
14. Add clear dashboard descriptions explaining the weekly decision process, primary activation metric, complete-week comparison, four-week baseline, and the need to inspect sample sizes.
15. Apply the live changes only after the dry-run is internally consistent and credentials/permissions are confirmed. The requested scope authorizes creating/updating recognized analytics resources, but not deleting resources, changing tracking code, rotating credentials, or altering unrelated PostHog settings.
16. Read the resources back from PostHog and verify names, filters, funnel steps, windows, breakdowns, dashboard membership, and cohort definitions.
17. Run npm run test:analytics after local changes.

DASHBOARD USABILITY REQUIREMENTS

- The Executive dashboard must make the full journey readable from acquisition through retention and monetization.
- Show percentages together with entrant/user counts wherever PostHog supports it.
- Default to complete reporting periods where supported; document that the weekly review uses the previous complete Monday-Sunday period.
- Include useful descriptions for a beginner explaining what each insight answers and what a large drop-off may mean.
- Do not add dozens of speculative charts. Implement the governed dashboard first.
- Preserve the exact event and property names from the contract.

SAFETY AND QUALITY REQUIREMENTS

- No secrets in source code, logs, screenshots, fixtures, or committed files.
- No deletion of PostHog resources.
- No changes to production event instrumentation unless you find a concrete contract violation; report such a violation instead of expanding scope automatically.
- No duplicate dashboards, insights, or cohorts on repeated runs.
- Network/API failures must produce actionable errors without leaking credentials.
- Add tests for manifest-to-request mapping and idempotent matching where practical.
- If PostHog's current API cannot express a manifest definition exactly, do not approximate silently. Explain the limitation and provide exact manual UI steps for that resource.

FINAL REPORT

When finished, report:

1. Files created or modified.
2. Tests and validation performed.
3. PostHog resources created, updated, reused, or skipped, including IDs/URLs but never credentials.
4. Any manual PostHog or Supabase steps still required.
5. Any difference between the repository contract and what the current PostHog API supports.
6. A beginner-friendly checklist for running the first weekly review.
7. The exact PowerShell commands for a future dry run and live synchronization.

Do not stop after writing a proposal. Inspect, implement, validate, and—when credentials and permissions are available—synchronize and verify the live resources within the authorized non-destructive scope.
```

## Definition of done

The dashboard setup is complete when:

1. Both governed dashboards exist once, with no duplicates.
2. All five funnels use the manifest steps and windows.
3. Every managed insight excludes internal users.
4. The four cohorts match the manifest.
5. The PostHog zero-volume monitor is active or its exact manual setup is documented.
6. Supabase delivery-health monitoring has an owner and notification path.
7. Re-running the synchronization produces no unintended changes.
8. A read-back verification confirms the live resource configuration.
9. The first weekly decision review has an owner, date, and decision log.
