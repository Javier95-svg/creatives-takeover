# Traction Engine — Competitive Audit (2026-07-12)

## Verdict: MARKET-COMPETITIVE (in a category with no strong incumbent)
There is no funded direct competitor selling "weekly traction discipline for pre-seed founders" — the framing (2-channel focus, 6-week sprints, kill/iterate/double-down, deterministic scoring) is differentiated and behaviorally sound. But the mechanics are commodity: a Notion template plus PostHog's free tier replicates 80% of it, and 100%-manual data entry is at war with the weekly habit the feature depends on.

## What's actually shipped (implementation reference)
- Single-page 4-step workflow at `/traction-engine` (`src/pages/TractionEnginePage.tsx`, 1,052 lines): Distribution Sprint Log → Retention Snapshot → Recent Weeks → Weekly Signal.
- **Deterministic scoring, no AI** (`src/lib/tractionEngine.ts`): four equally weighted dimensions — consistency streak, channel efficiency, experiment quality, retention health (benchmarked by product category) — fully transparent and instant client-side.
- **Discipline constraints as code**: max 2 active channel sprints, 6-week sprint boundaries with close-out prompts, one hypothesis/action/target/result/hours/decision per experiment, decision taxonomy (double_down / iterate / kill).
- **Phase 7 readiness gate**: three consecutive weeks ≥75 unlocks fundraise-stage readiness — traction as an explicit gate in the founder journey.
- Retention snapshot is **manual entry**: new users, 7-day actives, 30-day actives, primary channel, optional revenue.
- Weekly log upserts with full score breakdown (`traction_engine_weekly_logs`, `traction_engine_experiments`, `traction_engine_sprints`); localStorage draft autosave; credits per scorecard save; streak surfaced on the dashboard; weekly scorecard emails already exist (`send-weekly-scorecards`).

## Competitor benchmark
| Competitor | What they actually do | Price |
|---|---|---|
| **PostHog / Amplitude (free tiers)** | Auto-measured retention, funnels, experiment analysis from real event data — no manual entry, but also no discipline layer, no hypothesis log, no founder-level "what do I do this week" | Generous free tiers |
| **GrowthHackers Experiments** (legacy) | The canonical growth-experiment board (hypothesis → test → learn) for teams; largely stagnant, team-oriented | Team pricing |
| **Notion/Airtable growth-sprint templates** (the real competitor) | Free templates implementing Bullseye/weekly-experiment tracking; zero automation, zero scoring | Free |

Position: we're alone in combining the discipline framework with a scored, gated journey — that's a genuine gap in the market. But we're squeezed from both sides: analytics tools make the retention half automatic, and free templates make the logging half free. The unproven question is willingness-to-pay for discipline itself.

## Scores
- **Usability / value: 6/10** — the constraint design (2 channels, forced decisions, streaks) encodes real growth wisdom and the transparent deterministic score builds trust, but asking a founder to hand-copy their own analytics numbers every single week is the exact kind of chore that breaks the streak the score rewards.
- **Market competitiveness: 5/10** — no direct commercial rival gives it room, but everything it does mechanically is replicable in a weekend with a spreadsheet, and retention data entry is strictly worse than what free PostHog does automatically.

## Moat gap
**Weekend-copyable:** the entire scoring library (`tractionEngine.ts` is 337 lines of arithmetic) and the form UI. A competitor — or a founder with a template — copies the mechanics in days.
**Hard to replicate:** the accumulated ledger (per-founder longitudinal logs with hypotheses, decisions, and outcomes), the category benchmark data that grows with every log, and the journey position (Phase 7 gate → fundraising prep) that makes the score *mean* something inside a larger system.

## Upgrades (severity-tagged)
- **[CRITICAL] Auto-ingest retention data.** Connectors for PostHog/GA4/Stripe — and, first and cheapest, auto-fill from the founder's own MVP Builder published app (we host it; instrument it and the snapshot fills itself). Manual entry is the churn point of the whole feature; every week it survives is a week of moat data.
- **[HIGH] Category benchmarks.** `product_category` is already captured on every log — show percentile against the anonymized cohort ("your week-6 retention health is 72nd percentile for SaaS"). This is the first upgrade that makes the score worth paying for.
- **[HIGH] Pre-filled sprints from the GTM brief.** Accept the handoff proposed in the GTM audit: channel, target metric, and hypothesis drafted from the founder's own GTM plan — removes the blank-form cold start and wires the two features into one loop.
- **[MEDIUM] Investor-ready traction report.** Export the weekly ledger + Phase 7 evidence as a chart/PDF ("12 consecutive logged weeks, 3 above threshold") — converts the discipline into a fundraising asset and gives the streak an external audience.
- **[MEDIUM] Experiment library recall.** Surface the founder's own past kills ("you killed cold email in week 4 — this hypothesis looks similar") — the ledger should argue with you.
- **[LOW] Streak-protection nudges** via the existing web-push/retention system the day before a week closes unlogged.

## Proposed moat: the verified traction ledger (proprietary dataset + integration depth)
Traction claims in pre-seed fundraising are unverifiable self-reports. Ours don't have to be: weekly logs are timestamped, append-only in practice, deterministically scored, and — once retention auto-ingest ships — backed by connected data sources rather than typed numbers. Mechanism: a **"verified traction" report** — the founder's 12-week ledger with data-source badges (Stripe-verified revenue, PostHog-verified retention) and the Phase 7 streak — shareable with investors the way a credit report is shared with lenders. Investors get signal they can't get anywhere else; founders get a reason to log every week for months (the ledger is only valuable unbroken); and the platform accumulates the cross-founder channel/retention dataset that powers the GTM flywheel and PMF calibration moats. A Notion template can copy the form; it cannot issue a verifiable ledger, and neither can PostHog, which has the data but not the founder-journey context.
