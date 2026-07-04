# Product Roadmap — 2026-07-04

Sequenced by urgency after the activation phases 1–2 and the Q1–Q7 quality-gap fixes all shipped.
Ordering logic: **measure before building → retention before acquisition → supply before demand promises.**
(Tiers Q0–Q4 here are urgency levels, not the audit's Q1–Q7 gap IDs.)

## Q0 — This week: verify and measure what just shipped
Everything downstream is guesswork until these are done. All are hours, not days.

1. **Watch the Activation Funnel dashboard daily** (PostHog #1789104): first `activation_first_output_generated` with `fallback_reason` (target: fallback rate <20%), recovery-email requests/opens, output→signup rate.
2. **Run the three gift flows with one real test account** — PMF score, pitch deck analysis, MVP generation. Confirm `feature_gifts` rows + zero `credit_transactions` on first use, normal charge on second. (The only part of the Q-series not yet verified end-to-end.)
3. **Fix the two lying events**: `dashboard_viewed` (fires 0 times) and `activation_completed` (over-fires ~10× via the `icp_seed_prefilled` trigger). Small code fixes; they currently poison every retention analysis.
4. **Pull mentor-side liquidity numbers**: discovery-call booking fill rate and mentor reply latency (bookings + conversations data). This decides whether the mentor-first bet is safe or needs supply work first.
5. **Run the Sean Ellis test on your own users** — you built it into PMF Lab; point it at the ~30 recently active accounts. Fastest PMF read available.

## Q1 — Next 2 weeks: close the remaining structural holes
The two usability criticals left standing from the audit.

1. **One deterministic first session (U1).** Kill the flag roulette: every new account (including demo-path signups, who currently bypass everything) gets the same 60-second stage capture, then exactly one recommended action routed by stage. This is what makes the day-2 email, resume card, and recommender fully stage-aware.
2. **Dashboard next-action consolidation (U2).** One priority-ordered "do this next" slot instead of up to 8 competing cards (push, first-run, continue-artifact, live-waitlist, cockpit, command center, journey, plan nudge). Cards become a queue, not a pile.
3. **Mentor supply work — if Q0-4 shows gaps**: reply-time expectations on mentor cards, mentor-side notifications, availability status. The wedge collapses if founders message into silence.
4. **Confirm the day-2 artifact email fires correctly** from the daily `check-inactive-users` run (sends, correct resume links, no double-sends via `retention_email_log`).

## Q2 — Weeks 3–6: retention deepening + monetization truth
1. **Lifecycle email ladder decision.** The day-1→30 sequence exists but its cron is off (deferred twice, correctly). Rewrite copy to be stage/artifact-aware, then enable via a committed migration.
2. **Extend guest recovery loops**: Insighta "email me my full report" (reuses the demo-try lead infra), and schedule the orphaned ICP guest drip *after* adding unsubscribe links to it.
3. **Credit legibility (U5 remainder)**: one canonical costs surface + cost shown before every metered click.
4. **Pricing follow-through**: watch gift→paid conversion; Starter lost "unlocks PMF Lab" as its headline benefit — decide what its new anchor is (credits alone may not carry $9/mo).

## Q3 — Month 2+: distribution (the multiplier — only after a retention loop holds)
1. **Shared-demo viral loop**: public demos and waitlist pages carry a "Built with Creatives Takeover" path back to signup; every share becomes acquisition.
2. **SEO free-tool expansion + podcast cross-promotion** — the funnel now converts; traffic is the cap (~1,300 landings/mo).
3. **Taxonomy consolidation (U4)**: one tool naming/IA across visitor menu, member nav ("BizMap AI"/"Insighta" umbrellas), and dashboard stages.
4. **Performance pass (U7)**: analyze the `$web_vitals` data already collected; split the 300–500KB chunks if LCP on `/` or `/demo-studio/try` is poor on mobile.

## Q4 — Backlog / opportunistic
1. **GTM Strategist**: fold into ICP/PMF next-actions or sunset (1 lifetime use).
2. **Web push lifecycle wiring** (infra exists, unused).
3. **Pitch-video promise**: either a light VSL step in the try flow or keep hero copy demo-only permanently.
4. **A/B experiments** (PostHog flags) once traffic makes them readable.

## Standing weekly review (15 min)
- Signups + attribution mix (hero vs navbar vs free tools vs shared links)
- Demo fallback rate · gift claims per tool · recovery-loop conversions
- Day-2 return rate · mentor reply latency · paying-subscriber delta
