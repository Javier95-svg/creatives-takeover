# PMF-Readiness Audit — 2026-07-02

Scope: the full journey from signup through every core stage and tool, assessed for usability, output quality, and product-market-fit readiness.
Evidence: production database (Supabase), PostHog (90 days), codebase at `2e23b19c..140f4a16`, and live probes of deployed edge functions. Every number below is real, not estimated.

## The numbers that frame everything

| Metric | Value |
|---|---|
| Accounts all-time / last 90 days | 332 / 88 |
| Completed onboarding | 117 (35%) |
| Ever created a first artifact | 61 (18%) |
| First artifacts that are **mentorship actions** (messages, calls, saves) | 29 of 46 typed (63%) |
| ICP analyses all-time | 30 |
| MVP Builder projects all-time | 44 |
| Demo Studio projects all-time | 3 |
| Tech Stack reports / GTM plans / signed-in pitch-deck analyses | 2 / 1 / 0 |
| PMF Lab usage (surveys, responses, discovery, evidence) | 0 / 0 / 0 / 0 |
| Waitlist pages / signups captured by them | 11 / 0 |
| Active paying subscriptions | 6 (~1.8% of accounts) |
| Pricing page views vs upgrade clicks (monthly) | ~110 vs 1–7 |

The single most important finding: **the platform is positioned as an AI-tool suite, but its observed activation engine is the human layer.** 63% of typed first artifacts are mentor messages, discovery calls, and mentor saves. The tools with top billing (Demo Studio, PMF Lab, GTM, Pitch Deck) have 0–3 lifetime uses each. The two exceptions: ICP Builder (30 uses — free, guided, produces a real document) and MVP Builder (44 projects — the highest-usage tool on the platform, yet nearly invisible in positioning).

---

## 1. User Journey Map

**Stage 0 — Visitor (recently rebuilt, now sound).** Dual-path hero ("Launch a live demo" → /demo-studio/try; "Draft your ICP" → /icp-builder), three free tools in the nav, demo recovery loop via email. This is the newest and now best-instrumented part of the funnel; it needs weeks of data, not more surgery.

**Stage 1 — Signup.** Email auto-signs-in and returns to the tool the visitor was in; OAuth round-trips correctly. Intuitive. One seam: a demo-try signup gets `onboarding_completed=true` set implicitly by saving the artifact, which silently exempts them from every onboarding surface — they never state their founder stage, so the dashboard personalizes on nothing.

**Stage 2 — First session (the splinter point).** Depending on internal flags (`requires_guided_onboarding`, artifact state, quiz state), a new user lands in one of **three different first-run experiences**: the guided 6–7-step onboarding quiz, the `OnboardingPathGate`, or the `Day1Welcome` 3-step checklist (run ICP → set stage → set daily mission) — or none of them (demo-path users). Which one you get is not a product decision; it's an accident of flag history.

**Stage 3 — Dashboard.** A returning user faces up to seven competing modules in one feed: push-notification card, today-cockpit, first-run card, continue-artifact card (new), command center, journey next-step card, plan nudge. There is no single unambiguous "do this next." Meanwhile `dashboard_viewed` has fired **zero times in 90 days** (broken instrumentation), so nobody can see how users actually move through this screen, and `activation_completed` fires ~10× more often than signups (102 vs 12 in April — a page-visit trigger inflates it), so the activation metric the codebase reports is fiction.

**Stage 4 — Tools.** The same tools live under three different taxonomies: the visitor "Free Tools" menu, the signed-in nav umbrellas ("BizMap AI", "Insighta"), and the dashboard's stage system. A user who met "Pitch Deck Analyzer" as a free tool must later find it under Insighta. Tool-level flow (ICP builder, demo studio editor) is individually coherent; the connective tissue between them is not.

**Stage 5 — Payment.** ~110 pricing views/month convert to 1–7 upgrade clicks and 6 active subscriptions. Credit costs (2–15 per action) are discoverable only at the moment of use, and the entitlement rules disagree with each other in code (Tech Stack is simultaneously "0 generations on Rookie" in `TIER_USAGE_LIMITS`, "full, credit-metered" in `planPermissions`, and "first build free forever" in the component).

---

## 2. Usability Gaps

| # | Where in the journey | Gap (observable evidence) | Severity |
|---|---|---|---|
| U1 | First session after signup | Three flag-dependent first-run experiences; demo-path signups bypass all of them and never set founder stage (`markFirstArtifactCreated` flips `onboarding_completed`) | **Critical** |
| U2 | Dashboard, every visit | Up to 7 competing nudge modules, no single next action (`Dashboard.tsx` renders EnablePushCard, cockpit, FirstRunCard, ContinueArtifactCard, command center, JourneyNextStepCard, StarterDashboardNudge) | **High** |
| U3 | Team's ability to see any of this | `dashboard_viewed` = 0 events in 90d; `activation_completed` over-fires ~10×; post-signup analytics effectively blind | **High** (meta, blocks all UX iteration) |
| U4 | Cross-tool navigation | Same tools under three taxonomies (Free Tools / BizMap AI + Insighta / dashboard stages); Dashboard link now absent from member navbar (reachable only via hero button + mobile tab) | **High** |
| U5 | Any credit-gated action | Costs visible only at point of use; three conflicting sources of truth for entitlements (constants vs planPermissions vs component gifts) | **Medium** |
| U6 | Demo save handoff | After signup, the user lands on the Brief **form**, not their shareable demo — the reward for converting is more work | **Medium** |
| U7 | Page performance | Several 300–500KB JS chunks in the build; real-world LCP unmeasured — assessable via the `$web_vitals` events PostHog already collects (not yet analyzed) | **Medium (unverified)** |

## 3. Product Quality Gaps

| # | Tool | Output assessment (evidence) | Severity |
|---|---|---|---|
| Q1 | **Demo Studio** | The artifact (interactive walkthrough → publishable page) is genuinely differentiated, but **AI captions are currently degraded in production** — my live probe returned `fallbackReason: "generator_fallback"` (OpenAI call failing server-side), so users get template captions. 3 lifetime projects. | **Critical** (quality regression, fixable) |
| Q2 | **PMF Lab** | Well-crafted evidence-first design (Sean Ellis test, discovery, calibration) with **zero usage across all four tables** — it is pay-walled (`pmf_analyses: 0` on Rookie) away from the exact idea-stage audience the hero's "Still an idea?" path attracts. Craft isn't the gap; distribution is. | **High** |
| Q3 | **ICP Builder** | The strongest artifact on the platform: evidence-confidence levels, competitor gaps, next actions that feed the dashboard ("strong enough to replace a paid strategy session" is a fair prompt claim). 30 uses, 17 first-artifacts prove pull. | Low (strength — protect it) |
| Q4 | **MVP Builder** | 44 projects — the most-used tool — yet absent from visitor positioning and the free-tools story. Quality unassessed from output data; usage says users want it. | **Medium** (positioning gap, not craft) |
| Q5 | **Pitch Deck Analyzer / GTM / Tech Stack** | 0 / 1 / 2 signed-in uses. Pitch deck costs 10 credits after the free one (a Rookie's month is 50); GTM and Tech Stack outputs have no return loop. Shelf tools as priced/positioned today. | **Medium** |
| Q6 | **Waitlist Maker** | 11 pages created, 0 signups captured — the artifact publishes but generates nothing for its owners; no distribution mechanics attached. | **Medium** |
| Q7 | **Mentorship marketplace** | Not a "tool," but it produces 63% of first artifacts. The platform's actual retained value lives here — and it's positioned as one nav item among seven. | **High** (inverted positioning) |

## 4. Prioritized Gap List (by activation + retention impact)

1. **Reposition around what already activates (Q7 + Q4).** Mentorship actions are 63% of first artifacts and MVP Builder is the most-used tool; neither is a headline. This is the highest-leverage change on both activation and retention.
2. **Fix post-signup instrumentation (U3).** Zero-cost, but every other decision is guesswork until `dashboard_viewed` fires and `activation_completed` means something.
3. **One deterministic first session (U1).** Every new account should hit the same short sequence: state your stage → get your one recommended action → do it. Today that's flag roulette.
4. **Restore Demo Studio's AI captions and land converts on their shareable demo (Q1 + U6).** The newest funnel's wow moment is running on template text, and the reward for signup is a form.
5. **Give idea-stage users a free PMF Lab slice (Q2).** The hero sends "Still an idea?" traffic toward validation, then charges $9 before the first validation step.
6. Dashboard nudge consolidation (U2).
7. Credit legibility: one entitlement source of truth, costs shown before click (U5).
8. Reprice/merge shelf tools; attach a distribution loop to Waitlist (Q5, Q6).

## 5. Top 5 Gaps and Their Path to PMF

**1. Reposition the human layer + MVP Builder as the core.** PMF is found where usage already clusters, not where the roadmap points. Mechanism: putting "talk to a mentor this week" and "build your MVP" into the hero/dashboard as primary paths aligns acquisition promise with the two behaviors the data says produce committed users — raising activation quality (first artifacts that retain) rather than just volume. The tool suite becomes the supporting cast that gives mentor conversations substance.

**2. Fix the measurement layer.** Mechanism: PMF search is iteration speed. Right now the team cannot answer "what do day-2 returners do first?" because the events lie. Restoring truthful `dashboard_viewed` / `activation_completed` converts every later change from opinion into experiment — it's the multiplier on all other fixes.

**3. Single deterministic onboarding.** Mechanism: time-to-first-value and personalization both depend on knowing the founder's stage. One mandatory 60-second stage capture, then routing to exactly one recommended action (mentor message for idea-stage, MVP/demo for builders) shortens the intent→value path and makes the day-2 email and dashboard genuinely stage-aware — the retention mechanics shipped this week can only be as good as the stage data feeding them.

**4. Demo Studio at full quality, rewarded with a share link.** Mechanism: perceived value at the aha moment. Template captions cap the "it wrote my demo for me" wow that justifies signup; landing converts on a publishable link (not the brief form) turns the first session into a shareable win — and shared demos are the platform's only built-in viral surface.

**5. Free PMF Lab starter for idea-stage users.** Mechanism: stage-product alignment. The largest inbound segment (pre-product founders) currently gets its exact next need (validation) pay-walled at the moment of highest motivation. A free first scoring run creates the saved asset that retention loops anchor to, and makes the $9 upgrade a continuation of value already experienced rather than a gate before any value.

## What this audit could not assess (and what access would close it)

- **Real page performance by device**: PostHog is already collecting `$web_vitals`; a follow-up analysis of LCP/INP on `/` and `/demo-studio/try` would confirm or clear U7.
- **Session-level friction**: PostHog session replay is available in the project; watching 10–15 replays of first sessions would validate U1/U2 qualitatively. Not done in this audit.
- **AI output quality as experienced**: my assessment is from generation prompts, schemas, and one anonymous production probe. A real-account pass through ICP → PMF → GTM outputs (or better, 5 user interviews) is needed to judge "worth paying for" beyond structure.
- **Mentor-side liquidity**: booking fill rates and reply latency require the bookings/Calendly data; if mentors are slow to reply, gap #1's strategy needs supply work first.
- **Willingness to pay**: 6 subscribers is too few for pricing conclusions; Stripe tenure/churn data would say whether the $9 tier converts and holds.
