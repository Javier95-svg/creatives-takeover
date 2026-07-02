# Activation Funnel Audit — 2026-07-01

Scope: homepage → first value → account creation, for a logged-out first-time visitor.
Sources: codebase (commit `e6da5ce4`), PostHog (last 30 days), Supabase (`demo_studio_events`, `conversion_events`).

---

## 0. The funnel in numbers (June 2026, 30 days)

| Stage | Count | Source |
|---|---|---|
| Homepage landing views (`landing_viewed`) | ~1,341 | PostHog |
| Hero primary CTA viewed | 1,312 | Supabase `conversion_events` |
| Hero primary CTA clicked | 78 (5.9% CTR) | Supabase `conversion_events` |
| `/demo-studio/try` pageviews | 13 (11 unique) — undercounted, see F3 | PostHog |
| Demos generated in try flow | **0 — ever** | Supabase `demo_studio_events` (empty), PostHog activation events (0) |
| Signups from hero CTA / try flow | **0** | PostHog `signup_completed_attributed` (90 days) |
| Free Tools menu opened | 407 (~30% of landings) | PostHog |
| Free tool pages opened | 162 (pitch deck 69, insighta 50, tech stack 43) | PostHog |
| Free tool input submitted | 11 (93% drop from open) | PostHog |
| Free tool partial result shown | 10 | PostHog |
| Free tool signup-gate CTA clicked | 1 | PostHog |
| Signups from free tools | **0** | PostHog |
| ICP Builder opened / gate shown | 140 / 56 | PostHog |
| Signups from ICP Builder | **0** | PostHog |
| **Total signups** | **~10** (9 `navbar_join_today`, 1 `pricing_rookie`) | PostHog |

Every signup in the last 90 days came from the generic navbar "Join Today" button or pricing. None came from the hero CTA, the demo try flow, or any free tool.

---

## 1. Route map — every first-visitor entry point from the homepage

| Entry point | File | Target | What happens next |
|---|---|---|---|
| Hero CTA "Build Your Demo & Pitch Video" | `src/components/Hero.tsx:154,237` | `/demo-studio/try` (logged-out rewrite of `/demo-studio`) | Upload 2–3 screenshots → AI demo preview → signup gate on save |
| Hero secondary "The Startup Development Cycle" | `src/components/Hero.tsx:174` | scroll to homepage section | stays on page |
| Hero dashboard-preview mock (whole panel is a link) | `src/components/Hero.tsx:255` | hardcoded `https://creatives-takeover.com/signup` | full page reload, signup form, **no CTA attribution** |
| Navbar Free Tools → Pitch Deck Analyzer | `src/config/freeTools.ts`, `src/components/VisitorNavbar.tsx` | `/pitch-deck-analyzer` | 1 free full analysis (IP-gated), then signup gate |
| Navbar Free Tools → Insighta Test | same | `/insighta-test` | free client-side top-line score, full AI diagnostic gated |
| Navbar Free Tools → Tech Stack Builder | same | `/tech-stack` | full builder free; annual cost + build plan gated |
| Navbar: Build / Learn / Podcast / Newspaper / About / Pricing | `VisitorNavbar.tsx:41-48` | content pages | informational |
| Navbar "Join Today" | `VisitorNavbar.tsx:305` | `/signup` (attribution `navbar_join_today`) | signup form → dashboard |
| Mobile bottom nav (logged out) | `src/components/mobile/MobileBottomNav.tsx` | Home, `/mentorship`, Free Tools dropdown (same 3 tools) | as above |
| Sticky mobile CTA "Run ICP Analysis" | `src/components/StickyMobileCTA.tsx:39` | `/icp-builder` | guided ICP flow → partial draft → signup gate |
| Footer | `src/components/Footer.tsx` | legal/mailto/socials only | no product links |

Notes:
- **ICP Builder is not in the Free Tools menu** (`freeTools.ts` lists only 3 tools). It is reachable only via the mobile sticky CTA and SEO. Yet it is the deepest-engagement free tool (140 opens, 56 gates shown).
- Desktop primary action = Demo Studio try; mobile primary action = ICP Builder. The two surfaces bet on different products.

## 2. `/demo-studio/try` end-to-end trace

Code path: `src/pages/demo-studio/TryPage.tsx` → `generateDemoStudioDraftStoryboard` (`src/lib/demoStudio/api.ts:266`) → `supabase/functions/demo-studio-generator` (anonymous draft path, per-IP rate limit, fail-closed) → `buildTryPreviewSteps` → `<DemoPlayer mode="preview" showWatermark>`.

An unauthenticated visitor:
1. Uploads 2–3 screenshots (`MIN=2, MAX=3`, `tryPreview.ts:3-4`) + optional product URL.
2. Clicks "Generate the demo" → edge function writes nothing to DB, returns an AI storyboard (15s timeout); client falls back to a locally built storyboard on failure, so **output is effectively guaranteed**.
3. Sees a real interactive watermarked demo player — **before any signup wall**. Value is genuinely delivered pre-signup.
4. "Save and publish this demo" → draft serialized to sessionStorage → `/signup?from=demo-try&return=/demo-studio/try?hydrate=1`.

Steps to first value: 3 user actions. Estimated time to first value: **45–90 seconds — if and only if the visitor has product screenshots on hand.** With no screenshots the flow is a dead end: there is no alternative input path.

Reality check from data: 13 page loads, 0 generations, 0 signups since the flow shipped (2026-06-19).

## 3. sessionStorage carryover (try → authenticated)

Verified sound end-to-end:
- Draft persisted eagerly post-generation for anonymous users (`TryPage.tsx:222-225`), downscaled to fit quota with a retry-smaller pass (`persistDraft`, `TryPage.tsx:152-168`; `src/lib/demoStudio/tryDraft.ts`).
- Email signup auto-signs-in and navigates in the same tab to the `return` path (`src/pages/Signup.tsx:355-423`); OAuth round-trips via `localStorage.oauth_return_url` (`src/pages/AuthCallback.tsx:171,242`). sessionStorage survives both (same-tab redirects).
- Return hydration (`?hydrate=1`) rebuilds project → demo → steps → hotspots with a re-entrancy guard and rollback on failure (`TryPage.tsx:282-347,382-414`).
- Quota-overflow degrades with an explicit toast ("you may need to re-upload").

No user input or generated output is lost on conversion. This is the best-engineered part of the funnel.

## 4. Free tools gating

None of the four tools fully gate value behind signup — the "signup wall before value" hypothesis is false. The actual problem is depth (93% drop from open → input) and zero conversion at the gates.

| Tool | Pre-signup value | Gate | File |
|---|---|---|---|
| Pitch Deck Analyzer | 1 full analysis (IP-gated) | signup for more + hydrate-on-return exists | `PitchDeckAnalyzerPage.tsx:92,323-353` |
| Insighta Test | real client-side top-line score | full AI diagnostic gated | `InsightaTestPage.tsx:95-98`, `FundraisingReadinessToolkitAll.tsx` |
| Tech Stack Builder | full builder, monthly budget | annual cost + build plan gated; **signed-in free users get a plan lock (worse than guests)** | `TechStackPage.tsx:96-134` |
| ICP Builder | partial draft (Customer + Pain sections) | full draft gated | `IcpGuestResultView.tsx`, `ICPBuilder.tsx:2048` |

## 5. Analytics instrumentation on `/demo-studio/try`

Instrumented, but with three defects:
1. **SPA pageviews are not captured.** `posthog.init` (`src/lib/analytics.ts:279`) has no `defaults`/`capture_pageview: 'history_change'` — posthog-js 1.285 legacy default fires `$pageview` on full loads only. Every `<Link>` navigation is invisible; this is why 78 hero clicks show as 13 try pageviews. All path-level funnels are untrustworthy until fixed.
2. **The dedicated try-flow events (`activation_first_input_submitted` / `activation_first_output_generated`) shipped 2026-06-30** — one day of window. But the Supabase-side events (`demo_view`/`demo_start` with `source: demo_try`, live since 06-19) also show zero, so the "0 generations" conclusion holds.
3. **Tracking is fragmented across three stores** — PostHog (product events), `conversion_events` (hero funnel), `demo_studio_events` (demo events). No single place shows visit → generate → signup. RLS/insert verified working (anon insert OK), so the empty table means genuinely zero usage, not broken plumbing.

---

## Findings (severity first)

1. **CRITICAL — The AHA moment has never been reached.** 0 demos generated in the try flow since launch (06-19). The entry ask — "upload 2–3 product screenshots" — requires an asset the target visitor (a pre-product first-time founder, per the site's own copy) does not have at the moment of click. `TryPage.tsx` has no zero-asset path.
2. **CRITICAL — The primary activation bet produces zero signups.** 90 days of `signup_completed_attributed`: 0 from `hero_start_free`, 0 from free tools, 0 from `demo_try`. All ~10 signups came from the navbar/pricing. The homepage's entire CTA architecture is decorative right now.
3. **HIGH — SPA pageview capture missing** (`analytics.ts:279`). Every route change invisible in PostHog; funnels by path cannot be trusted.
4. **HIGH — Free tools out-compete the hero 12:1 for attention (162 vs 13 opens) but convert nobody** (11 inputs → 1 gate click → 0 signups). They confirm the "competing unguided entry points" hypothesis — not by gating value, but by absorbing intent and leaking it.
5. **HIGH — Mobile and desktop disagree on the primary action.** Sticky mobile CTA → `/icp-builder` (`StickyMobileCTA.tsx:39`); hero → `/demo-studio/try`. ICP Builder is simultaneously the deepest-engagement tool (56 gates shown) and absent from the Free Tools menu.
6. **MEDIUM — ICP lead capture is a false promise that loses 100% of leads.** "Send resume link" (`IcpBuilderPage.tsx:146-159`) sends nothing; the email goes to localStorage and is stripped from PostHog by the PII sanitizer (`analytics.ts:110-142`). No server-side record exists.
7. **MEDIUM — Signing up can downgrade access.** Tech Stack Builder: guests get the full tool; a new free account hits a Rising-plan/progressive lock (`TechStackPage.tsx:110-134`). A visitor who converts mid-flow loses the tool they were using.
8. **MEDIUM — Hero CTA overpromises.** "Build Your Demo & Pitch Video" — the try flow produces a demo only; VSL requires an account and credits.
9. **MEDIUM — Funnel telemetry fragmented across three stores** (PostHog / `conversion_events` / `demo_studio_events`); no end-to-end funnel view exists.
10. **LOW — Hero spotlight + eyebrow links hardcode `https://creatives-takeover.com/...`** (`Hero.tsx:200,255`) — full reloads, attribution lost, breaks on preview/staging domains.
11. **LOW — `getOnboardingReturn` fallback typo** `"\dashboard"` → relative `dashboard` (`src/lib/authRedirect.ts:41`).

**What already works (keep):** try-flow draft carryover and rollback; same-tab signup return; anonymous edge-function draft path with fail-closed rate limiting; pitch-deck "one free full analysis" gate design; `free_tool_*` event taxonomy.

---

## Verdict

**No — `/demo-studio/try` does not currently deliver an AHA moment strong enough to convert visitors, and the single most important reason is that its entry requirement (2–3 product screenshots) is an asset the site's own target visitor doesn't have in hand — so in 12 days of production traffic, not one visitor has ever generated a demo.** The flow's engineering (output before signup, draft carryover) is right; the input ask is wrong for the audience, and the funnel starves it of traffic besides.

---

## Implementation plan (prioritized)

### P0 — measure truthfully, unblock the AHA (this week)
1. **Fix SPA pageview capture.** `src/lib/analytics.ts:279` — add `defaults: '2025-05-24'` (or `capture_pageview: 'history_change'`) to `posthog.init`. Without this, nothing else can be evaluated. **Effort: low.**
2. **Add a zero-asset path to `/demo-studio/try`.** `TryPage.tsx` + `tryPreview.ts` + `demo-studio-generator`: accept product URL or a one-line description alone (the edge function already generates storyboards from a brief without images); render the preview with styled placeholder frames the user can replace later. Kills the critical blocker for pre-product founders. **Effort: medium.**
3. **Point the sticky mobile CTA at the same action as the hero** (`StickyMobileCTA.tsx:39` → `/demo-studio/try`), or consciously A/B it — but stop splitting the primary bet by device. **Effort: low.**
4. **Create the end-to-end funnel in PostHog** (landing → hero click → try view → `activation_first_input_submitted` → `activation_first_output_generated` → `signup_completed`), and mirror hero clicks (`conversion_events`) as a PostHog event so the funnel lives in one store. Files: `useConversionTracking.ts` (add `captureEvent` alongside the Supabase insert). **Effort: low.**

### P1 — stop the leaks (next week)
5. **Make the ICP resume-link real or honest.** Either ship a small edge function that emails the resume link and stores the lead in a `leads` table, or change the copy to "saved in this browser" and swap the email field for the signup CTA. `IcpBuilderPage.tsx:146-159`. **Effort: low (copy) / medium (email).**
6. **Fix the Tech Stack signup regression:** signed-in free users must retain at least the guest experience. `TechStackPage.tsx:110-134`. **Effort: low.**
7. **Put ICP Builder back into the Free Tools menu** (`src/config/freeTools.ts`) — it's the tool visitors engage with most deeply. **Effort: low.**
8. **Strengthen the free-tool gates at the result moment.** 10 partial results → 1 gate click means the gate copy/placement fails at the exact moment of highest intent. Reuse the Pitch Deck hydrate-on-return pattern for Insighta ("Save your score + get the full diagnostic"). Files: `FundraisingReadinessToolkitAll.tsx`, gate components. **Effort: medium.**
9. **Align hero copy with the deliverable** ("Build a live product demo in 60 seconds — no signup") or add a VSL-outline step to the try output so "Pitch Video" stops being an overpromise. `Hero.tsx:84`, `Index.tsx:69,101`. **Effort: low.**

### P2 — structural
10. **Converge homepage entry points.** 30% of landings open Free Tools; the hero gets 5.9% CTR. Either fold the strongest tool moment into the hero flow, or make the hero CTA adaptive ("Have a product? Build a demo / Still an idea? Score your readiness"). Files: `Hero.tsx`, `VisitorNavbar.tsx`. **Effort: medium.**
11. **Fix hardcoded absolute links** in `Hero.tsx:200,255` → router `Link` + `useCTAAttribution`. **Effort: low.**
12. **Fix `getOnboardingReturn` fallback** (`authRedirect.ts:41`). **Effort: trivial.**

Success metric for the whole plan: `activation_first_output_generated` > 0 within a week of P0 shipping, then output→signup ≥ 25% (the flow already earns it once someone sees their own product as a live demo), and hero-attributed signups appearing in `signup_completed_attributed`.
