# Competitive hardening baseline — 2026-08-15

Status: **production refresh unavailable in this workspace**. This document intentionally contains no estimates and does not reuse the stale July 26 baseline (257 users, five paying, 7% active in 30 days).

## Metric contract

Primary success metric: monthly distinct founders who record external customer evidence and then change a product, positioning, or GTM decision within seven days.

Executive funnel:

`guest_artifact_completed → signup_completed → primary_action_started → customer_evidence_recorded → decision_changed → qualified_conversation → costly_commitment_recorded → subscription_or_sprint_purchased`

Every production extraction must:

- use America/Bogota report dates and UTC event timestamps;
- reconcile Supabase `auth.users.id`, PostHog authenticated `distinct_id`, and Stripe `client_reference_id` / subscription metadata user ID;
- exclude accounts flagged `is_internal`, admin-only accounts, configured test domains, Stripe test-mode objects, and synthetic browser-test IDs;
- publish numerator, denominator, cohort boundaries, date range, and source systems;
- preserve an immutable dated result outside the application database.

## Required production refresh

| System | Required extraction | Verification owner | Current value |
| --- | --- | --- | --- |
| Supabase | Distinct non-internal users; artifact versions by type; journey handoffs; customer evidence events by verification mode; decision changes within seven days; qualified conversations; commitments; payments; sprint applications/enrollments/outcomes | Product analytics | Unavailable — run with production read access |
| PostHog | Unique visitor → guest artifact → signup → first action → external evidence funnels; D7 and D30 return; homepage experiment exposure; pricing view → checkout | Growth | Unavailable — export governed insights or query HogQL |
| Stripe | Active paid subscriptions, MRR, checkout conversion, cancellations, refunds, and project-pack purchases | Finance | Unavailable — production Stripe export required |

## Exact verification work

1. Run the governed PostHog contract in `analytics/posthog/customer-journey.json`, using its global internal-user filter. Export counts and conversion by experiment variant.
2. In Supabase, build founder-level cohorts from `journey_outcomes`, `customer_evidence_events`, `journey_handoffs`, `first_customer_sprint_applications`, `first_customer_sprints`, `external_evidence_events`, and artifact-version tables. Count a success only when `decision_changed_at` is from zero to seven days after the evidence timestamp.
3. Join Stripe objects through `user_id` metadata and checkout-session records. Reconcile every paid subscription and project-pack purchase to exactly one founder; report orphan and duplicate counts separately.
4. Store the signed query/export references, extraction timestamp, metric definition version, and exclusion count with the snapshot.

## Release gates awaiting data

- Do not call a homepage A/B result directional below 200 unique visitors per variant.
- Do not publish aggregate proof below an eligible denominator of ten.
- Do not enable lower-priced packs until the previous 30-day action mix projects at least 70% gross margin at p95 model cost.
- Do not expand the sprint pilot until mentor delivery remains below 30 minutes per founder per week and the outcome gates are met.
