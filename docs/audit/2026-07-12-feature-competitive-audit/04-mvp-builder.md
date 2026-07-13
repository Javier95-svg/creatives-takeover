# MVP Builder — Competitive Audit (2026-07-12)

## Verdict: LAGGING (head-to-head), viable only as a journey-embedded builder
Competing feature-for-feature against Lovable, Bolt.new, and v0 — companies whose entire business is this one product, at $40M–$100M+ ARR — is unwinnable on iteration depth, model spend, and ecosystem. The engineering shipped here is legitimately substantial (WebContainer preview, GitHub round-trip, multi-model routing), but the strategic frame must be "ship the MVP your validated evidence describes without leaving the platform," not "a Lovable alternative."

## What's actually shipped (implementation reference)
- Chat-driven multi-file generation (`src/hooks/useMVPBuilder.ts`, 3,841 lines; `supabase/functions/mvp-builder-generate/index.ts`, 2,195 lines).
- **Action classification** routes each message to typed actions (generation / targeted_edit / debug / add_page / add_feature / design_overhaul / chat) with per-action credit costs, temperatures, and 16k max output tokens.
- **Multi-model**: Claude Sonnet 4.6 (default), Opus 4.8, Haiku 4.5, Gemini 3.5 Flash / 3.1 Flash Lite, DeepSeek fallback; selection plan-gated; per-model provider pricing tracked for live margin.
- **WebContainer runtime** (`src/lib/mvp-builder/webcontainerRuntime.ts`): real in-browser dev server for preview — same tech as Bolt.new.
- Code panel with per-file editing/reset, manual + automatic snapshots, version restore, zip export.
- **GitHub integration** (`github-integration`): OAuth connect, repo import, branches, commit with suggested messages, rollback, history.
- **BYO Supabase** credentials (`supabase-integration`).
- **Publishing**: `{slug}.creatives-takeover.com` subdomains via Edge Middleware + custom domain verification (`app-builder-domain-verify`, `mvp-builder-publish/deploy`).
- Credit holds during generation, refunds on failure, low-credit banner, top-ups, first-build gift (`claim-mvp-gift`).

## Competitor benchmark
| Competitor | What they actually do | Price |
|---|---|---|
| **Lovable** | Full-stack from prompt: UI, backend, DB schema, auth, deploy — infrastructure decisions handled for you; fastest-growing AI builder ($20M ARR in 2 months at launch era) | $25/mo Pro (message credits) |
| **Bolt.new** | WebContainer in-browser IDE, direct file/dependency control, agentic error fixing, Expo mobile support; $40M ARR in 6 months | $25/mo Pro (token-based, rollover) |
| **v0 (Vercel)** | Production-grade React/Next UI generation, sandbox runtime, GitHub branches/PRs, repo import, Supabase/Neon/Upstash via Vercel Marketplace | Credit-based, free tier |

Position: our architecture mirrors Bolt (WebContainer) but generation is effectively single-shot per action with a 16k output ceiling — the market has moved to agentic loops that plan, execute, run, read errors, and self-fix. On integrations we're respectable (GitHub round-trip beats early-stage competitors' offerings; BYO Supabase matches Lovable's pattern).

## Scores
- **Usability / value: 6/10** — the pipeline works end to end (prompt → preview → edit → publish → custom domain) with honest credit mechanics, but complex builds hit the single-shot ceiling where Lovable/Bolt users iterate agentically past failures.
- **Market competitiveness: 3/10** — head-to-head against the strongest product category of the decade; we cannot match their model spend, iteration velocity, template ecosystems, or mobile targets, and every founder already knows Lovable's name.

## Moat gap
**Weekend-copyable:** for Lovable, everything we have. For us, nothing they have — the asymmetry is the point.
**Hard for them to replicate:** the context. Lovable starts from a blank prompt box; our user arrives with a cited ICP, 25 scored interviews, a missing-features list from real prospects, GTM messaging, and a demo storyboard — all already in our database. Also structurally ours: credit economics unified with the rest of the journey, and publishing inside the founder's existing subdomain/analytics estate.

## Upgrades (severity-tagged)
- **[CRITICAL] Compile the journey into the build.** One-click "Build from my evidence": ICP pains → feature list, PMF `missingFeatures`/`commonObjections` → backlog and copy angles, GTM messaging block → landing page headline/CTA, Demo Studio brief → onboarding flow. This is the only durable reason to build here instead of Lovable, and today it doesn't exist — the chat starts blank.
- **[HIGH] Agentic build loop.** WebContainer already surfaces runtime/build errors; feed them back automatically (plan → generate → run → read errors → fix, N bounded iterations) instead of making the user paste failures into chat. This is the single biggest quality gap vs. Bolt.
- **[HIGH] Instrument generated apps for the journey.** Every published MVP should ship with a tiny analytics snippet whose events flow into Traction Engine's retention snapshot and PMF Lab's evidence automatically (see Traction Engine audit — this one upgrade powers two moats).
- **[MEDIUM] Validated-pattern templates.** Waitlist, booking, marketplace, paid-community starters mapped to the product categories founders actually select in onboarding — cuts generation cost and failure rate.
- **[MEDIUM] Post-publish iteration prompts** driven by real usage ("40 visitors, 0 signups — want to rework the hero?").
- **[LOW] Expo/mobile target** — only if demanded; don't chase Bolt here.

## Proposed moat: the journey-context compiler (proprietary workflow + integration depth)
The defensible mechanism is that the MVP is **derived from validated evidence rather than a prompt**. Concretely: a build manifest generator that assembles `icp_analysis_results` + `pmf_analysis_results` (missing features, objections, buying signals) + `gtm_plans` (positioning, messaging) into the system prompt and scaffold for generation — then closes the loop by shipping traction instrumentation in the generated app. A Lovable user gets a beautiful app about an unvalidated guess; our user gets an app whose feature list, copy, and analytics were dictated by 25 interviews and a scored GTM brief. Lovable cannot copy this without building an ICP tool, a PMF lab, and a GTM strategist first — and their $25/mo horizontal positioning means they never will.
