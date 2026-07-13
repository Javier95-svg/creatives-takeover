# GTM Strategist — Competitive Audit (2026-07-12)

## Verdict: MARKET-COMPETITIVE (at the founder low-end), but commodity-exposed
The generated brief is better-engineered than what most founders would coax out of ChatGPT — the weighted channel-scoring matrix, hard constraint rules, and anti-tactics are real prompt craftsmanship. But it is one prompt producing one static artifact, which is exactly the surface LLM commoditization erodes fastest. Its survivable position runs through the Traction Engine loop, which today is a copy link, not a data flow.

## What's actually shipped (implementation reference)
- Intake (`src/components/gtm/GTMIntakeForm.tsx`): business type, target audience, audience online habits, problem/solution, traction stage, weekly time, budget, founder strengths — plus automatic ICP handoff (`icpPositioningStatement`, `icpNicheProfile`).
- Single-shot GPT-4o generation (`supabase/functions/gtm-analyzer/index.ts`) with a **channel scoring matrix** (5 weighted dimensions: business-type fit 0.30, audience presence 0.25, time constraint 0.20, founder-strength fit 0.15, traction level 0.10) and **hard constraint rules** (≤5 hrs/wk → max 2 channels; $0 budget → no paid channels; no traction → no Product Hunt; 6.5 score floor; stretch flags).
- Output: 2–3 channels with fit scores, fit reasons, tactics (frequency + time estimates), week-one actions, **do-not-do anti-tactics**; Geoffrey Moore positioning; messaging (5–8-word headline, ≤20-word hook, proof point, CTA, tone); 4-week action plan; must/should/nice launch checklist; metrics with how-to-measure; stored to `gtm_plans`.
- Brief UI with sidebar navigation, share dialog (BizMap share payloads), contextual mentor recommendations; credits with idempotency + refund.
- **No execution layer**: the plan does not track whether anything was done, and results never flow back.

## Competitor benchmark
| Competitor | What they actually do | Price |
|---|---|---|
| **Ignition GTM** | Full launch-lifecycle platform for PMM teams: AI launch plans from playbooks, Salesforce/HubSpot/Gong/Intercom/Zendesk integrations for customer-language mining, competitive tracking, launch measurement | Team pricing (mid-market) |
| **M1-Project (Elsa AI)** | AI marketing strategy generated from its own ICP artifact — the same ICP→strategy chain we have | $99/mo (1 ICP + 1 strategy) |
| **Maja Voje's GTM Strategist** (mindshare competitor) | The playbook brand founders actually trust: bestselling book, checklists, courses, 2026 AI-for-GTM reports; content, not software | Book/course pricing |
| **Clay** (adjacent, cited in brief) | GTM **execution** — data enrichment + AI outbound at scale; not a strategy generator but where "GTM AI" budgets actually go | $149+/mo |

Position: Ignition serves teams with products and CRMs, not pre-launch founders — different segment. M1 is the direct comparable and our brief is more opinionated and more executable than theirs. The real threats are (a) free ChatGPT + Maja Voje's checklist, and (b) budgets flowing to execution tools like Clay, skipping "strategy documents" entirely.

## Scores
- **Usability / value: 7/10** — decisive channel elimination, executable week-one actions, and anti-tactics make this genuinely useful the day it's generated; after that day it's a PDF-equivalent that never learns.
- **Market competitiveness: 5/10** — a well-prompted ChatGPT session recovers ~80% of the artifact for free, and nothing here tracks execution or outcomes, which is where every funded GTM product (Ignition, Clay) has moved.

## Moat gap
**Weekend-copyable:** the entire feature — it is one system prompt (`gtm-analyzer/index.ts:92-174`) plus a rendering UI. This is the most exposed of the six features.
**Hard to replicate:** the loop that doesn't exist yet — GTM channels flowing into Traction Engine sprints and weekly results re-scoring the channel recommendations. The Traction Engine's UI copy already says "start with the acquisition channels your GTM Strategist surfaced," but no data actually flows; today the founder retypes their channels.

## Upgrades (severity-tagged)
- **[CRITICAL] Close the GTM → Traction loop.** "Start sprint from this channel" button on each `GTMChannelCard` that creates a `traction_engine_sprints` row pre-filled with the channel, target metric, and a hypothesis drafted from the brief's tactics — then show actual weekly efficiency next to the predicted fit score on the brief ("predicted 8.2 — measured 31/100 after 3 weeks: iterate messaging or kill"). This single upgrade converts a copyable document into a system that gets smarter with use, and it's mostly plumbing between two features that both already exist.
- **[HIGH] Plan regeneration with performance context.** Re-run the brief with the traction logs injected ("LinkedIn underperformed for 3 weeks; Reddit overperformed") so the second brief is something ChatGPT can't produce — it requires our data.
- **[HIGH] Versioned plans with deltas** (`gtm_plans.status` already exists; add version lineage) so the brief reads as a living strategy, matching how Ignition frames launch plans.
- **[MEDIUM] Per-channel playbook depth**: swipe copy generated from the brief's own messaging block (LinkedIn post templates, cold-email skeletons) — increases artifact stickiness at near-zero engineering cost.
- **[MEDIUM] PDF/Notion export** for accelerator and co-founder sharing (`generate-pdf-report` exists).
- **[LOW] Budget planner tied to channel choices.**

## Proposed moat: the channel-outcome flywheel (cross-founder data network effect)
The channel fit scores today are LLM priors dressed in decimals. The moat is making them **empirical**: every Traction Engine weekly log records channel, product category, hours invested, target vs. result, and a kill/iterate/double-down decision — exactly the labeled dataset needed to answer "which channels actually produce first traction for B2C marketplaces run by solo founders with 5 hrs/wk?" Mechanism: aggregate anonymized sprint outcomes across founders into a channel-performance prior, and inject it into `gtm-analyzer` ("across 214 founders in your category, LinkedIn founder-content reached target in 41% of sprints; Product Hunt in 9%"). Each new founder's sprints improve the recommendations for the next — a compounding advantage that no prompt, and no content brand like Maja Voje's, can replicate without our execution data.
