# PMF Lab — Competitive Audit (2026-07-12)

## Verdict: AHEAD (in its niche)
For pre-launch founders, nothing mainstream combines structured interview evidence, a hosted Sean Ellis survey, and live web corroboration into one scored readiness assessment. The scoring rigor is the best-engineered AI surface on the platform. The risks are input friction (the tool demands a lot of typing before it pays off) and the fact that the niche itself has historically weak willingness-to-pay.

## What's actually shipped (implementation reference)
- Two modes at `/pmf-lab` (`src/pages/PMFLabPage.tsx`): evidence scoring and customer discovery (`pmf-customer-discovery`).
- **Structured interview log**: per-interviewee profile, segment, feedback, objections, missing features, interest 1–5, buying intent, and four demand behaviors (asked pricing / joined waitlist / referred / offered to pay) — demand counts are derived from the log, not self-reported, when logs exist (`pmf-evidence-scorer/index.ts:194-205`).
- **Hosted Sean Ellis survey** (`PMFSeanEllisTest`, `pmf-survey-respond`): real users answer the 40%-benchmark question; verified responses + verbatims flow into the scorer as first-class evidence.
- **Scorer** (`pmf-evidence-scorer`, GPT-4o at temp 0.3): five dimensions × 20 pts (pain clarity, urgency, consistency, demand proof, founder self-awareness); hard cap at 74 + forced "iterate" below 25 interviews; specificity rules that ban "several participants" phrasing and require naming interviewees; contradictions array; diagnosis paragraph; priority-tagged recommendations; a concrete `nextExperiment`.
- **Live market corroboration**: Perplexity web search on the founder's pain quote, returned as cited sources; the prompt explicitly instructs the model not to inflate scores from external interest.
- **Longitudinal design**: every run inserts a new `pmf_analysis_results` row (score trend), free re-scores of a prior analysis, outcome tracking (`pmf-outcome-request`, `OutcomeTracker` — what the founder did next), and a race-safe free first score (`feature_gifts`).
- Context banner auto-pulls the ICP persona and waitlist product name — the cross-tool story is real, not marketing.

## Competitor benchmark
| Competitor | What they actually do | Price |
|---|---|---|
| **pmfsurvey.com** (Sean Ellis / GoPractice) | The canonical free Sean Ellis test: hosted survey, benchmark, no analysis beyond the % | Free |
| **Sprig** (also Refiner, Zonka in this class) | In-app PMF surveys triggered on real usage, AI-summarized open ends, segmentation — but **requires a live product with users** | Free tier; usage-based paid |
| **Buildpad** | AI "co-founder" guiding a 7-phase validation process; scans Reddit/X for real problem discussions; project memory | Free limited; $20–40/mo |
| **Wynter** (adjacent) | Paid B2B panel of verified ICP respondents for message testing — real humans, 48h turnaround | ~$hundreds per test |

Position: survey tools assume you already have users; Buildpad is the closest founder-stage rival and is materially shallower on scoring (no interview log structure, no capped rubric, no outcome tracking). Our combination of self-reported evidence + hosted survey + web corroboration is unique. Wynter shows what founders will pay real money for: **access to respondents**, which we don't provide.

## Scores
- **Usability / value: 8/10** — the rubric's honesty (capped scores, contradictions, named-interviewee specificity) delivers real diagnostic value no free tool matches; the cost is a long form that asks founders to type up 25 interviews by hand.
- **Market competitiveness: 7/10** — ahead of every direct pre-launch rival on scoring depth, but the moat-relevant asset (evidence → outcome data) is still too young, and free alternatives (pmfsurvey.com + ChatGPT) satisfice for unmotivated founders.

## Moat gap
**Weekend-copyable:** the scoring prompt — it's one (excellent) system prompt any competitor can approximate. The Sean Ellis survey mechanic is also trivially copyable (pmfsurvey.com does it free).
**Hard to replicate:** the structured longitudinal dataset — interview logs + survey verbatims + scores + **outcomes** (what founders actually did and what happened), accumulated per-account and across accounts; and the cross-tool evidence supply (waitlist signups, demo analytics) that no standalone PMF tool can access.

## Upgrades (severity-tagged)
- **[CRITICAL] Slash input friction with interview import.** Accept a pasted transcript, uploaded recording, or call notes and auto-extract the structured log fields with AI (the `speech-to-text` and `document-parser` functions already exist in the platform). Hand-typing 25 structured interviews is the tool's abandonment point; auto-extraction converts its biggest weakness into its onboarding hook.
- **[HIGH] Auto-feed cross-tool evidence.** Demo Studio drop-off/CTA/leads and waitlist conversions should enter the scorer alongside `surveyEvidence` without manual entry — evidence the founder didn't have to type is evidence a competitor can't see.
- **[HIGH] Survey distribution helpers.** Embed the Sean Ellis survey on the founder's Demo Studio launch page and MVP Builder published app automatically — the survey only creates data if it gets responses, and we control the surfaces where their users are.
- **[MEDIUM] Segment-level score trends.** The data model already stores segments per interview; chart PMF score by segment over time so founders see which niche is converging.
- **[MEDIUM] Investor-ready validation report export** (PDF via existing `generate-pdf-report`) — the readiness report is exactly what accelerator applications ask for.
- **[LOW] Benchmark banner** ("median score for B2B SaaS at your interview count: 58") once cohort volume justifies it.

## Proposed moat: the outcome-calibrated PMF score (data network effect)
Every PMF tool — including Sean Ellis's own — reports an uncalibrated number. We already capture the missing half: `OutcomeTracker` records what founders did after scoring, and score history is longitudinal by design. Mechanism: systematically label analyses with downstream outcomes (built / pivoted / abandoned; later, revenue milestones from Stripe-connected founders) and publish calibration — "founders who scored 75+ with a demand-proof dimension above 14 shipped a revenue-generating MVP at 3× the rate of those below." After a few hundred labeled outcomes, the score means something no competitor can copy with a prompt, because the calibration lives in proprietary evidence→outcome pairs. This also compounds: the calibrated score becomes the credible gate for the rest of the journey (MVP Builder, fundraising prep), which drives more usage, which improves calibration.
