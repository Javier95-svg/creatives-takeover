# Founder Execution Cycle Beta Runbook

## Release controls

1. Apply `20260727170000_founder_execution_cycle_v1.sql`.
2. Create the PostHog Boolean flag `founder-execution-cycle-v1`.
3. Keep `VITE_FOUNDER_CYCLE_V1=false` and `VITE_FOUNDER_CYCLE_V1_ROLLOUT_PERCENT=0` in production. PostHog is the production allowlist and kill switch.
4. Target the flag at:
   - New founders entering the onboarding experiment.
   - The 20 recruited concierge accounts.
5. Turning the flag off restores the legacy seven-stage interface. New evidence remains stored.

The command-center dashboard is automatically used for flagged accounts. No legacy routes, saved outputs, `bizmap_stage` values, or completion timestamps are removed.

## Concierge enrollment

An admin enrolls each recruited account with:

```sql
select public.set_founder_cycle_beta_cohort_v1('<user-uuid>'::uuid, true);
```

Do not put account identifiers in source control or product analytics. Enrollment bypasses subscription packaging for the beta, but it does not change the account's paid plan or credit balance.

Four-week operator cadence:

1. Week 0: evidence audit, primary outcome, and approximately 25 prospects.
2. Week 1: review the first prospect list and approve five personalized messages.
3. Weeks 2–3: review replies, conversations, objections, and offer changes.
4. Week 4: record outcomes, value score, willingness to continue paying, and service minutes.

Record one admin-managed `founder_cycle_concierge_checkins` row per founder per week. Keep sensitive operator notes in that table; never forward them to PostHog.

## Measurement

Use the governed PostHog funnel:

`cycle_loop_assigned → cycle_primary_action_started → customer_evidence_recorded → costly_commitment_recorded → cycle_loop_exited → subscription_started`

Use the admin-only database rollup:

```sql
select public.get_founder_cycle_beta_metrics_v1();
```

Expansion gates:

- 12 of 20 founders complete at least three qualified conversations.
- Six founders record a commitment/customer or explicitly pay to continue.
- At least 40% start the recommended market action.
- At least 25% record external evidence in seven days.
- Beta D7 retention reaches 15%.
- Concierge delivery reaches 30 minutes or less per founder per week after kickoff.

PostHog owns action-start and retention measurements. The database rollup owns evidence, cohort outcomes, willingness-to-pay check-ins, and service time.

## Rollback and interpretation

- Disable the PostHog flag to restore the legacy UI immediately.
- Do not reverse the additive migration during the experiment.
- If founders create internal outputs but do not act in the market, simplify planning further.
- If outreach gets no replies, investigate ICP, list quality, offer, and message.
- If founders get replies but do not pay for the workflow, test accountability/service packaging before adding automation.

