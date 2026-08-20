# PMF Pathway Rollout

## Release controls

1. Apply `20260820120000_pmf_journey_context_lineage.sql` before enabling the UX.
2. Create the PostHog Boolean flag `pmf-pathway-v1`.
3. Keep `VITE_PMF_PATHWAY_ENABLED=true`; changing it to `false` is the environment-wide kill switch.
4. Ship the canonical catalog and governed measurement to everyone first.
5. Enable the flag for internal accounts, then 25% of eligible rookie founders for seven days, then 50% for one complete 14-day window.

Disabling the flag restores legacy decision CTAs and dashboard presentation. Additive outcomes, validation contexts, versions, handoffs, and analytics remain intact.

## North Star

Use the governed PostHog funnel `pmf_decision_within_14_days`:

`prebuild_context_started → prebuild_decision_reached`

The denominator is the first scoped validation context for eligible pre-revenue rookie founders. Exclude internal/test accounts and explicitly unscoped contexts. The numerator requires a Build, Narrow, Pivot, or Stop decision with `ready` or `verified` evidence within 14 days. Five independent weighted signals are `ready`; 25 are decision-grade `verified`.

Cut the dashboard by source tool, plan, decision, outcome status, D2/D7 return, and generation failure. Snapshot the prior 28 days before the first flagged cohort.

## Expansion gates

- Handoff failures remain below 2%.
- No critical owner/context isolation issue occurs.
- First-artifact completion does not fall more than 10% from baseline.
- The 14-day decision rate and core handoff completion improve materially before adding another tool.
