# GTM Strategist Upgrade — Product Audit & Implementation Plan

*Prepared 2026-11-15 · status: proposal, nothing implemented · decisions confirmed by Javier: companies-first MVP (no contact-data vendor until Phase B), third-party API spend ceiling under $100/month.*

---

## 0. Executive summary

**The opportunity.** Explee and Krabat turn "here is my website" into "here are prospects and emails" in one guided run. Founders feel an agent working for them. GTM Strategist today produces a rigorous six-week acquisition *plan* but leaves the founder to find every prospect by hand. The upgrade closes that gap: **a research agent inside GTM Strategist that reads the founder's site, confirms who to target, finds and qualifies real companies with evidence, and drafts outreach the founder approves and sends themselves.**

**What we learned from competitors.** Both products are *sending* businesses: they charge per email sent ($0.04 Explee, $0.09 Krabat), require a card, and send from their own pre-warmed mailbox pools. Their research is free and is the hook. Explee's public API shows its contact data comes partly from third-party email-finder providers. Its Trustpilot record (4.1, 83 reviews) carries repeated complaints about **emails sent without approval** and **unexpected charges**. Krabat is a separate company (Sales.co) whose flow and legal text closely copy Explee's.

**Our position.** We should borrow the *experience* (URL in → visible agent steps → structured results → ready drafts) and deliberately not the *business* (autonomous sending, mailbox pools, card-on-file). Our differentiators are things they cannot do: the agent starts from the founder's **existing ICP, PMF and Demo Studio evidence**; every prospect carries **cited evidence for why it fits**; results flow into **First Customer Proof (10 prospects / 10 messages)**, the pipeline, Traction Engine, Pulse and **program dashboards**; and the founder stays in control of every message.

**MVP (Phase A).** Website Intelligence → ICP confirmation → autonomous company discovery and qualification (existing Tavily / Gemini search + our own SSRF-guarded crawler) → prospect database with evidence and fit tiers → per-company outreach drafts → hand-off into pipeline and First Customer Proof. Named contacts and verified emails come in **Phase B** with one pay-per-use vendor. Before any of this, **Phase 0 fixes seven live defects** in the current GTM Strategist, including lost plans after reload and refund gaps.

**Economics.** Website analysis and ICP confirmation are free. A research run costs **10 credits** (up to 20 qualified companies, outreach drafts included), with a pro-rata refund when fewer qualify and the **first run free** per account. Estimated third-party cost per run ≈ $0.10–0.20, against $1.20 revenue at the subscription credit anchor ($0.12/credit) and $4.00 at top-up prices ($0.40/credit) — gross margin above 85%.

---

## 1. Competitive analysis

Sources: public pages fetched 2026-11-15 (explee.com required raw HTML download — 403 to automated fetch), Explee public OpenAPI, Trustpilot, Krabat site and GitHub README, Salesforge review, TestingCatalog article. "Claimed" = vendor marketing, not verified.

### 1.1 Explee (explee.com) — Explee LTD, London #15759064

| Area | Finding | Confidence |
|---|---|---|
| Core | Self-serve "AutoGTM" outbound agent: website → research → segments → companies → people → emails → **sends** from Explee mailboxes → handles replies → books meetings. Also sells bulk B2B data. | Verified (site, API) |
| Journey | Research ("Analyzing your website… Finding competitors… Identifying campaigns", each campaign with Pain / Criteria / Examples) → Prepare ("Picking sending domains… Nothing purchased without your confirmation", calendar) → Outreach ("Finding companies… Finding people… Writing emails… Outreach ready"). "Looks right / Looks off" feedback per tab. Card screen with $1 hold. | Verified (embedded demo strings) |
| Agent | Fixed stage pipeline with an "Agent Activity" panel and "Ask AI" input. "Seven autonomous agents" is a sponsored-article claim. | Pipeline verified; agent count claimed |
| Lead discovery | Filters by industry, role, size, location; "score target companies" endpoint; natural-language → filters. Database "105M companies, 80M+ decision makers, 400M+ people" (figures disagree across sources). Sources: company websites, LinkedIn pages, Google Maps, registries, "data partners". | Endpoints verified; sizes claimed |
| Enrichment | Company: traffic + growth by month/country, revenue, founded, funding, technologies, employees by department, phones, LinkedIn. Email status `valid / catch_all / catch_all_valid`. Finder "basic" 1.5 credits (~50%, one provider), "premium" 5 credits ("6 providers with cross-validation", ~78%). | Fields verified (API); rates claimed |
| Outreach | Writes in the lead's language ("30 languages" claimed); sends from pre-warmed mailboxes, SPF/DKIM/DMARC, auto-pausing; suppression lists; reply inbox; LinkedIn touches. | Mechanics verified; deliverability claimed |
| Pricing | $0.04 per email sent; $30 free ≈ 750 emails; finding leads free; card required; daily budget $10–200; credits expire after 2 months; welcome credits non-refundable. Separate data plans ($5/1k research, $10/1k emails). | Verified |
| Weaknesses | Trustpilot 1-star themes: charges without consent, emails sent without approval, charges after stopping, double charges, no card removal. Salesforge reports sending ~2 hours after setup without approval and replies mislabelled as hot. SOC 2 only "preparing". Customer bears all GDPR/PECR/CAN-SPAM liability. | Verified that complaints exist |

### 1.2 Krabat (krabat.ai) — Magic Sales Bot / Sales.co, Delaware

| Area | Finding | Confidence |
|---|---|---|
| Core | Same promise: research → buyers → emails → send → replies → meetings. "60s to first campaign" (claimed). | Verified (site) |
| Journey | Six visible steps (Research, Competitors, Campaigns with audience sizes, Decision makers "412 found · 388 verified email", Write emails, Send & book). Chat to steer targeting/tone. Matches the screenshot. | Verified |
| Agent | Single "agent" running six steps; LLM vendor undisclosed. | Verified / undisclosed |
| Data | "478M contacts" (claimed); unnamed third-party providers + own DB + websites; unnamed verification providers; CSV upload up to 30k. Visible fields: name, title, company, email, "verified" badge. | Sources unnamed |
| Outreach | Pool of pre-warmed inboxes, never the customer's domain; reply handling to Calendly/Cal.com/HubSpot. Language support not stated (screenshot shows French). | Verified mechanics |
| Pricing | A/B variants: $0.09/email with $30 credits (333 emails), or $199/mo for 2,000 emails; README says $0.05. Card required. | Verified (inconsistent) |
| Relationship | Separate company; publishes an Explee comparison page; homepage copy and terms sentences nearly identical to Explee's. Fast-follower copy, not a licence. | Inference with evidence |
| Weaknesses | No reviews anywhere, founders undisclosed, "421+ teams" reuses the parent agency's client count, no SOC 2, no API. | Verified absence |

### 1.3 Side-by-side: what is genuinely strong

| Strength | Explee | Krabat | Worth borrowing? |
|---|---|---|---|
| URL-only start, research before any commitment | Yes | Yes | **Yes** — core of our MVP |
| Visible step timeline with live log lines | Yes | Yes (best log copy: "Writing emails for 3 of 10 leads…") | **Yes** |
| Competitors step | Yes (13 domains) | Yes | **Yes**, used to sharpen positioning and exclude competitors from prospects |
| Segments ("campaigns") with pain / criteria / examples | Yes (best) | Yes | **Yes**, as editable ICP segments |
| "Looks right / Looks off" correction per result | Yes | No | **Yes** |
| Per-field email status (valid / catch-all) | Yes | Badge only | **Phase B** |
| Prospect-language emails | Claimed | Evidenced | **Yes** (cheap with LLMs) |
| Autonomous sending, mailbox pools, reply bots | Yes | Yes | **No** (see §8.3) |
| Card on file to start | Yes | Yes | **No** |

---

## 2. Current-state audit of GTM Strategist

### 2.1 What exists (keep — it is good)

- **Journey** `/go-to-market` (`src/pages/GTMStrategistPage.tsx`): adaptive intake (`src/components/gtm/GTMWorkspaceIntake.tsx`, steps collapse when the ICP already covers the market) → "Build my plan" (6 credits) → workspace with **This week / Plan / Review** tabs, play cards, six-week plan, drafts panel, evidence manager, weekly review with diffed proposals (`gtm-plan-review`), pipeline board with CSV import, quick log into Traction Engine.
- **First Customer Proof** (`src/pages/FirstCustomerSprintPage.tsx`, Rising/Pro): 10 prospects + 10 sent messages + a decision, stored in `first_customer_sprints`, `founder_customer_contacts`, `customer_evidence_events`.
- **Rigor that competitors lack**: channels picked by deterministic rules (`supabase/functions/_shared/gtm-channel-engine.ts` `rankChannels`), source-ID-checked claims (`claimAttributions`), structured kill rules, assumptions separated from facts.
- **Data model**: `gtm_plans` (+ versions, plays, tasks, assets, competitor briefs, evidence items, claim attributions, pipeline entries), atomic save `persist_gtm_competitive_plan`, project scoping via `claim_project_outcome_slot` trigger.
- **Pipeline → founder cycle → cohorts**: trigger `sync_gtm_entry_to_founder_cycle_v1` mirrors `gtm_pipeline_entries` into `founder_customer_contacts` + `customer_evidence_events` (event types already include `prospect_added`, `prospect_qualified`, `outreach_prepared`, `outreach_sent`, `reply_received`).

### 2.2 Live defects (fix in Phase 0 before building on top)

1. **New plans vanish after reload**: `persist_gtm_plan_v2` writes `status='draft'`, restore only loads `saved|exported` (`src/hooks/useGTMStrategist.ts:314`), and the insert trigger supersedes the previous plan.
2. **Charge without refund** when no AI key is configured (`gtm-analyzer/index.ts:641-643` throws outside the refunding try).
3. **Idempotency × refund**: a refunded failure leaves a `completed` idempotency record; an identical retry runs free and can be refunded twice (`credit-deduction.ts:147-150,203-206`).
4. **No refund on wall-clock timeout**: budgets sum to ~127 s before save; a platform kill skips the catch.
5. **Experiment can't start for low-target channels**: `tenProspectSample` requires `minSampleSize ≥ 10` but analyzer sets `max(3, ceil(target*3))` = 9 for partnerships (`src/lib/gtmOutcome.ts:58`, `gtm-analyzer/index.ts:363`).
6. **FCP prospect form hidden** unless PostHog flag `founder-execution-cycle-v1` is on (`CustomerEvidenceWorkspace.tsx:348`).
7. **Research brief requires Gemini** (`gtm-analyzer/index.ts:109` calls `callGemini` directly, no fallback).

Also: `tests/credit-charging-enforcement.test.ts` fails because `gemini-3.6-flash` exists in the edge `MVP_MODEL_COST_WEIGHTS` but not the client copy.

### 2.3 Gaps relative to the new vision

| Capability | Today | Gap |
|---|---|---|
| Website intelligence | One-page fetch of `productUrl`, regex-stripped, weak SSRF guard (no DNS check) | Multi-page crawl, structured extraction, strong guard (exists in `project-import-extract`) |
| ICP | Prefilled client-side from ICP Builder draft; analyzer reads nothing server-side | Server-side context resolution; segment proposal from site + ICP |
| Prospect discovery | None. Pipeline is manual / CSV | Entire capability |
| Qualification | None | Entire capability |
| Contacts | Manual name/company/role in FCP | Phase B vendor |
| Outreach | Generic play assets; 3 FCP variants with `{{first_name}}` | Per-company personalization from evidence |
| Execution model | One synchronous request, spinner only | Durable multi-step runs, progress timeline, retries |
| Credits | Charge up front, refund in catch | Reservation → capture actual → release (exists only for MVP Builder) |
| Research | One 6-result query | Query planning, many searches, caching |

### 2.4 Infrastructure to reuse (with paths)

- **Credits**: `checkAndDeductCredits` / `refundCredits` (`supabase/functions/_shared/credit-deduction.ts`), `deduct_credits_atomic`, `refund_platform_credits_atomic` (exact refund via `metadata.deductionTransactionId`), `feature_gifts` + `claim_first_use_gift` (first-run-free), `credit-quote` function + `src/hooks/useCreditQuote.ts` + `CreditCostNotice`, `useCreditActions` (`ensureCredits`, `handleCreditError`), `UpgradePromptDialog`. **Reservation pattern** in `supabase/migrations/20260531130000_mvp_builder_credit_reservations.sql` + `_shared/mvp-builder-credit-reservations.ts` (blocked for other features by `CHECK (action_feature LIKE 'APP_BUILDER_%')`).
- **Crawling**: `project-import-extract/index.ts` `fetchWebsite()` + `_shared/public-url-guard.ts` (`checkPublicUrl`, DNS public-address check per redirect, 1 MB cap, `htmlToText`).
- **Search**: `_shared/web-research.ts` `searchWeb` (Tavily → Gemini Google-Search grounding → OpenAI web_search).
- **LLM**: `_shared/json-generation.ts` (Gemini models → OpenAI fallback, JSON mode).
- **Async patterns**: `EdgeRuntime.waitUntil` + status column + polling (`icp-analyzer`, `src/components/hero/HeroResultIsland.tsx`); outbox with claim/lease/backoff (`discovery_call_notification_outbox`); pg_cron → `net.http_post` worker pattern (`20261111200000_ai_provider_health.sql`); `FOR UPDATE SKIP LOCKED` queue (`20261111180000_newspaper_publish_queue.sql`); Realtime `postgres_changes` hooks (`src/hooks/useDailyTaskPlan.ts`).
- **Context**: `useActiveProjectContext`, `src/lib/icpToGtmIntake.ts`, `projects.context.import.website`, `profiles.startup_links.website`, `resolvePulseContext` (`_shared/pulse-context.ts`).
- **Downstream**: `gtm_pipeline_entries` (→ contacts/evidence trigger), `first_customer_sprint_contacts`, `daily_tasks`, `journey_outcomes`, `cohort_dashboard_v1`.
- **Deletion/GDPR**: `cleanup_account_data_v1` deletes every `public` table with `user_id` automatically.

---

## 3. Product vision and feature evaluation

**One sentence:** *GTM Strategist finds your first customers with you: it reads your product, agrees who to target, researches real companies with evidence, and prepares messages you approve and send.*

| Candidate | Decision | Why |
|---|---|---|
| 1 Website Intelligence | **MVP (P0)** | Removes intake friction; we already fetch sites safely |
| 2 Automated ICP discovery | **MVP (P0)**, as *proposal + confirmation*, merged with ICP Builder output | Founders' own ICP is our edge; auto-only ICPs are generic |
| 3 Autonomous prospect research | **MVP (P0)**, company-level via search + crawl | Core value; no vendor needed for companies |
| 4 Lead qualification | **MVP (P0)**, evidence-cited fit tiers | Our quality differentiator vs list volume |
| 5 Contact enrichment | **Phase B (P1)**, one pay-per-use finder + verifier, charged on success | Needs paid data; GDPR work first |
| 6 Personalized outreach | **MVP (P0)**, company-level drafts; person-level in B | Cheap, high perceived value |
| 7 Agent execution timeline | **MVP (P0)** | This is the "it's working for me" feeling |
| 8 Prospect database | **MVP (P0)**: search, filter, CSV export, add to pipeline | Results must be actionable |
| 9 Credit-based execution | **MVP (P0)** with reservations | Monetization on existing rails |
| Automatic sending, inbox pools, reply bots | **Rejected for now** | Human approval rule; deliverability and legal liability; competitors' top complaint |
| Traffic / revenue / funding enrichment | **Phase C, only if a cheap source exists** | Expensive, not decision-critical for first customers |

---

## 4. UX / UI design

### 4.1 Where it lives

Inside `/go-to-market` as a new top-level mode, **"Find customers"**, next to the existing plan (tabs become **Find customers · This week · Plan · Review**). A founder without a plan can start here; a founder with a plan gets the run pre-targeted to the active play's audience. Entry points: GTM empty state, Pulse ("Find me 20 companies to contact"), First Customer Proof Step 2 ("Fill my list"), BizMap LAUNCH stage card.

### 4.2 Journey (five screens, no extra onboarding)

1. **Start** — one field: *Your website* (prefilled from `projects.context.import.website` → `profiles.startup_links.website` → GTM `intake.productUrl`). Secondary link: "No website yet? Describe your product" (textarea, same pipeline minus crawl). Button **Read my site** (free). Below: "We read up to 5 public pages. Nothing is sent to anyone."
2. **What we understood** (free) — cards with "Looks right / Fix this" on each: *What you sell*, *Who it's for*, *Value*, *Price signals*, *Proof on your site*, *Competitors we found* (domains, removable). Each claim shows the page it came from. If an ICP Builder draft exists: banner "Merged with your ICP from ICP Builder" and conflicts listed ("Your site says SMB dentists; your ICP says clinic groups — which one?").
3. **Who to target** — 2–3 proposed **segments**, each with *Pain*, *Must-have criteria* (editable chips: industry, size band, geography, signals), *Example companies* (3 found during analysis), *Roles to contact*. Founder picks one segment, edits criteria. **Credit panel**: "Research run · 10 credits · up to 20 qualified companies · drafts included · you have 186 credits" (or "Your first run is free"). Button **Start research**.
4. **Research in progress** — vertical timeline with the seven agent steps (§5.2), each: icon state (queued / running / done / partial / failed), one-line human log ("Checked 34 candidate websites · 18 match your criteria"), elapsed time. Results stream into a preview list below as companies qualify. Founder can leave; the run continues; a toast + Pulse message + email (optional) on completion. **Stop** keeps what's found and refunds the rest.
5. **Prospects** — database table: Company (name, domain, favicon), Why it fits (top reason + evidence count), Fit (A/B/C badge + score), Location, Size band, Status. Filters: fit tier, status, location, size; search; **Export CSV**. Row drawer: evidence list (criterion → quote → source URL → date checked), contact routes (public contact page / generic email on site / careers page), suggested roles, the draft email, actions **Shortlist · Dismiss · Add to pipeline · Add to First Customer Proof**, and "Looks off" feedback (reason chips: wrong industry / too big / competitor / not a business / other).

**Outreach drafts** live in the drawer and a bulk "Drafts" tab: subject + body in the prospect's language (with a toggle back to English), editable, **Copy**, **Open in email** (mailto), **Mark as sent** (writes `outreach_sent` evidence). Copy everywhere: "You send it. Nothing is sent from Creatives Takeover."

### 4.3 Trust, confidence and errors

- **Fit tiers**: A = all must-have criteria evidenced; B = most evidenced, one unknown; C = plausible, weak evidence (collapsed by default). No tier without at least one cited source.
- **Unknown ≠ no**: missing data shows "not found on their site", never a guess.
- **Partial runs**: status `partial` with a plain explanation ("Search found fewer matching companies than expected for 'Independent dental clinics in Peru'. We charged 6 of 10 credits."), plus suggestions (widen geography, relax size).
- **Failures**: per-step retry (automatic ×3 with backoff), then the run ends `failed` with full refund; the founder sees which step failed and a **Retry** that does not double-charge.
- **Blocked sites** (403 / Cloudflare): company kept as B/C with "Their site blocks automated reading", never dropped silently.
- **Credit clarity**: estimate before start, live "credits held" during run, receipt after (charged / refunded).

### 4.4 B2B (programs)

Program staff see **counts only** on the cohort dashboard (companies researched, qualified, outreach prepared, outreach sent), consistent with "staff see progress, not content". Pilot plans raise credit access through the existing `withPilotPlan` path. A program-level "credits pool" is Phase C.

---

## 5. Architecture

### 5.1 Overview

```
Client (React)                        Edge functions (Deno)                     Postgres
──────────────                        ─────────────────────                     ────────
FindCustomers UI ──POST /gtm-research  (create/confirm/cancel/retry) ─────────► gtm_research_runs
      ▲                                     │ reserve credits                   gtm_research_steps
      │ Realtime + 4s polling fallback      │ enqueue first step                credit_reservations
      │                                     ▼                                   gtm_prospect_companies
      └─────────────── gtm-research-worker (one step per invocation) ─────────► gtm_outreach_drafts
                         ▲   claims step FOR UPDATE SKIP LOCKED                 gtm_domain_cache (shared)
                         │   self-kicks next step via net.http_post             gtm_suppressions
                         └── pg_cron sweeper every minute (stuck/lease-expired)  provider_spend_ledger
```

**Why one step per invocation:** Supabase edge functions have wall-clock limits; the current GTM analyzer already risks timeouts at ~127 s. Steps are short (≤60 s), durable, retryable and resumable.

### 5.2 Agent steps (deterministic orchestration, LLM inside steps)

| # | Step key | What it does | Tools | Output |
|---|---|---|---|---|
| 1 | `read_site` | Fetch homepage + up to 4 internal pages (about, pricing, product, customers) chosen from nav links | shared guarded crawler | page texts + URLs |
| 2 | `understand_business` | Extract offering, positioning, industry, segments, value prop, pricing, proof, languages; merge server-side with ICP Builder / PMF / project context | `json-generation` | `business_profile` |
| 3 | `find_competitors` | 2–3 searches + LLM pick of competitor domains | `searchWeb` | competitors[] |
| 4 | `propose_segments` | 2–3 segments with criteria and roles; **pauses run at `needs_review`** for founder confirmation | `json-generation` | segments[] |
| 5 | `discover_companies` | LLM plans 6–10 queries from the confirmed segment (direct, directory/list pages, "alternatives to", regional); run searches; extract company names + domains from results and list pages; dedupe vs founder domain, competitors, suppressions, existing prospects in project | `searchWeb`, crawler, LLM extraction | ≤60 candidates |
| 6 | `qualify_companies` | Batched (5 per invocation): crawl candidate home + about (cache 30 days in `gtm_domain_cache`), LLM scores each must-have criterion as met / not met / unknown **with a verbatim quote + URL**; compute score and tier; stop when 20 qualified or candidates exhausted | crawler, LLM | prospects with evidence |
| 7 | `draft_outreach` | For A/B prospects (max 20): personalized email in prospect's language from business profile + that company's evidence; no claims beyond evidence | LLM | drafts |
| 8 | `finalize` | Capture credits (actual), write counts, `journey_outcomes` update, Pulse notification | credits RPC | run `completed`/`partial` |

The **orchestrator is code**, not an LLM deciding what to do next: predictable cost, testable, no runaway loops. LLMs are used for extraction, planning queries, scoring and writing.

### 5.3 Data model (new migrations)

```sql
gtm_research_runs (
  id uuid pk, user_id uuid not null references auth.users on delete cascade,
  project_id uuid references projects, gtm_plan_id uuid null, play_id text null,
  status text check in ('draft','analyzing','needs_review','queued','running','partial','completed','failed','cancelled'),
  input jsonb,              -- {websiteUrl | description, source}
  business_profile jsonb,   -- step 2 output, with per-claim source URLs
  competitors jsonb, segments jsonb, selected_segment jsonb,   -- confirmed criteria
  target_count int default 20, counts jsonb,   -- {candidates, checked, qualified, drafts}
  reservation_id uuid null, credits_reserved int, credits_charged int,
  error_code text, error_detail text, idempotency_key text unique,
  created_at, started_at, completed_at, updated_at
)
gtm_research_steps (
  id uuid pk, run_id uuid references gtm_research_runs on delete cascade, user_id uuid,
  key text, batch int default 0, status text check in ('queued','running','done','partial','failed','skipped'),
  attempt int default 0, max_attempts int default 3, lease_until timestamptz, next_attempt_at timestamptz,
  log text,                 -- one human line for the timeline
  detail jsonb, error text, started_at, finished_at, unique (run_id, key, batch)
)
gtm_prospect_companies (
  id uuid pk, run_id uuid, user_id uuid not null, project_id uuid,
  domain text not null, name text, description text, location text, size_band text, industry text,
  fit_score int, fit_tier text check in ('A','B','C'),
  criteria jsonb,           -- [{criterion, verdict:'met'|'not_met'|'unknown', quote, sourceUrl, checkedAt}]
  contact_routes jsonb,     -- [{kind:'contact_page'|'generic_email'|'careers', value, sourceUrl}] company-level only in MVP
  suggested_roles text[], status text default 'new' check in ('new','shortlisted','dismissed','in_pipeline','contacted'),
  feedback jsonb, pipeline_entry_id text null, last_checked_at timestamptz, created_at,
  unique (project_id, domain)          -- duplicates across runs merge
)
gtm_outreach_drafts (
  id uuid pk, prospect_id uuid references gtm_prospect_companies on delete cascade, user_id uuid,
  language text, subject text, body text, status text check in ('draft','approved','sent_manually'),
  generated_from jsonb, edited boolean default false, created_at, updated_at
)
gtm_domain_cache (       -- service role only; company data, no personal data
  domain text pk, pages jsonb, extracted jsonb, http_status int, blocked boolean, fetched_at timestamptz
)
gtm_suppressions (domain text, email text null, reason text, created_at)   -- global opt-outs
provider_spend_ledger (id, provider text, run_id uuid, units numeric, est_cost_usd numeric, created_at)
```

RLS: owner read/write on runs, steps (read), prospects, drafts; service role writes runs/steps; cache, suppressions and ledger service-only. All user tables carry `user_id` so `cleanup_account_data_v1` deletes them automatically. Retention: pg_cron prunes prospects/drafts untouched for 12 months and cache older than 90 days.

### 5.4 Execution, retries, idempotency

- `gtm-research` (user-facing): `analyze` (steps 1–4 synchronously-chained, free, rate-limited 5/day/user), `start` (confirm segment → reserve credits → enqueue step 5), `cancel`, `retry_step`, `feedback`. Requires `Idempotency-Key`; run row has unique `idempotency_key`.
- `gtm-research-worker`: claims the next due step `FOR UPDATE SKIP LOCKED` with a 90 s lease; on success enqueues the next step and calls itself via `net.http_post` (fire-and-forget); on error increments `attempt`, sets `next_attempt_at` with exponential backoff (15 s, 60 s, 4 min); after `max_attempts` marks the step `failed` and the run `partial` (if any prospects) or `failed`.
- pg_cron `gtm-research-sweeper` every minute: re-kicks due steps and expired leases (mirrors the discovery-call outbox pattern).
- **Prompt-injection safety**: crawled text is wrapped as untrusted data; extraction prompts state that page text is never instructions; outputs validated by code (domains must parse, quotes must appear in the fetched text — substring check — or the criterion becomes `unknown`).

### 5.5 Credits: reservations, capture, refunds

Generalize the MVP Builder reservation:

1. New migration: `credit_reservations` (copy of `mvp_builder_credit_reservations` without the `APP_BUILDER_%` check, plus `run_id`, `ttl` default 30 min, renewed by worker heartbeats) and RPCs `reserve_credits_v1`, `finalize_credit_reservation_v1(p_id, p_actual_amount)`, `release_credit_reservation_v1`; extend the expiry cron. Keep the MVP table untouched (migrate MVP later, optional).
2. `start`: `claim_first_use_gift('GTM_RESEARCH_RUN')` → if gifted, reserve 0; else reserve 10 (`PLAN_UPGRADE_REQUIRED` / `INSUFFICIENT_CREDITS` mapped by `handleCreditError`).
3. `finalize`: charge = `qualified ≥ 10 ? 10 : max(2, ceil(qualified / 2))`; `qualified = 0` → release (full refund). Capture writes a normal `deduct` transaction with `metadata.runId`.
4. Cancel → finalize with what was found by the same formula.
5. New keys in **both** `src/config/constants.ts` and `supabase/functions/_shared/credit-constants.ts` (+ `plan-enforcement.ts` rule `charge` on all plans, `useCreditActions` labels, `credit-quote` `GIFT_FEATURES`): `GTM_RESEARCH_RUN: 10`, `GTM_RESEARCH_MORE: 5` (+10 companies on an existing run), Phase B `GTM_CONTACT_FIND: 1` (charged only on a valid/catch-all result).

### 5.6 Cost controls (under $100/month ceiling)

- `provider_spend_ledger` records every search/crawl/LLM call with estimated USD; a server-side **monthly budget kill switch** (`GTM_RESEARCH_MONTHLY_BUDGET_USD`, default 80) pauses new runs with an honest message before spend exceeds it; admin email via the existing provider-health alert path.
- Per-run caps: ≤12 searches, ≤60 candidate crawls (5 pages max each, 1 MB each), ≤25 LLM qualification calls, ≤20 drafts.
- `gtm_domain_cache` reuses company crawls across all users for 30 days (biggest saving as runs cluster by segment).
- Prefer Tavily when its free/paid quota holds; Gemini grounding fallback; OpenAI search last (already the `searchWeb` order).

### 5.7 Phase B contacts (vendor)

One pay-per-use **email finder with built-in verification**, selected by a short bake-off on 50 known companies (candidates to evaluate on price, EU coverage, DPA availability, pay-as-you-go without subscription: Hunter, Prospeo, Findymail, Snov; standalone verifiers MillionVerifier / ZeroBounce). **Prices and terms must be verified at selection time — not assumed here.** Flow: founder clicks "Find the right person" on a prospect → `GTM_CONTACT_FIND` reserved → vendor domain-search filtered by suggested roles → verify → store `gtm_prospect_contacts` (name, role, email, `email_status`, provider, source, found_at) → capture only if valid/catch-all, else release. LinkedIn scraping is out of scope (ToS).

### 5.8 Privacy and data protection

- **MVP**: stores company data and company-level contact routes (generic emails published on the company's own site). Still update `src/pages/PrivacyPolicy.tsx` §1.3/§3: we process public business information on the founder's behalf for prospect research; sources; opt-out address; retention 12 months.
- **Global suppression** (`gtm_suppressions`): companies/people who opt out are excluded from all future runs; public opt-out form/email.
- **Phase B** (personal data): legitimate-interest assessment, vendor DPA, provenance on every contact field, per-contact "how we got this" shown to the founder, founder acceptance of outreach rules (PECR/GDPR/CAN-SPAM) once before first contact export, no contact data visible to program staff, deletion cascade + 12-month retention.
- Founder remains the sender and controller of their outreach; Creatives Takeover never emails prospects.

### 5.9 Integrations

- **GTM plan**: run can be launched from a play (pre-fills segment from `play.audience`, `buyingTrigger`, `offer`); "Add to pipeline" writes `gtm_pipeline_entries` (stage `lead`, `playId`), which the existing trigger mirrors into `founder_customer_contacts` + `customer_evidence_events` (`prospect_added`, then `outreach_prepared` / `outreach_sent` on draft actions).
- **First Customer Proof**: "Add to First Customer Proof" attaches to `first_customer_sprint_contacts`; FCP Step 2 gets **Fill my list from research** (opens the prospect picker); FCP messages can start from a prospect draft.
- **BizMap / journey**: write `journey_outcomes` (tool `gtm_strategist`, stage `launch`) evidence manifest with counts; `journey_assumptions` updated from "Looks off" feedback (e.g. segment rejected).
- **Pulse**: add a GTM research summary to `_shared/pulse-evidence.ts` (counts, top 3 qualified, segment) and a new guide `gtm-research` in `src/lib/pulseGuides.ts`; event-driven nudge "Your research finished — 14 companies qualified" (uses the Pulse noticed plumbing).
- **Cohorts**: extend `cohort_dashboard_v1` with `prospects_qualified`, `outreach_prepared`, `outreach_sent` counts.

---

## 6. Credit economics

| Action | Credits | Notes |
|---|---|---|
| Read site + understand + competitors + segments | **0** | Hook; rate-limited 5/day, cached per domain |
| Research run (≤20 qualified companies, drafts included) | **10** | First run free per account (`feature_gifts`) |
| Partial run | `max(2, ceil(q/2))` | `q` = qualified; 0 qualified = full refund |
| More companies (+10 on same segment) | **5** | |
| Regenerate one draft | 0 (≤3 per prospect) | Low cost; rate-limited |
| Phase B: find + verify a decision-maker | **1 per success** | No charge when not found or invalid |
| Existing "Build my plan" | 6 (unchanged) | |

**Estimated third-party cost per run** (to validate in Phase A telemetry): ≤12 searches (Tavily basic, order of $0.01 each or within free tier) ≈ $0.05–0.12; LLM (flash-lite class for extraction/scoring, flash for drafts) ≈ $0.03–0.08; crawling = our compute (cache hits cut repeat cost) → **≈ $0.10–0.20 per run**.

**Revenue per run**: $1.20 at the subscription anchor (`CREDIT_VALUE_USD = 0.12`), $4.00 at top-up pricing ($0.40/credit) → **gross margin ≈ 85–97%**. Rookie (50 credits/month) affords ~4 runs after the free one; Rising (250) ~25.

**Monthly ceiling check**: $80 budget ÷ $0.15 ≈ 530 runs/month before the kill switch — far above current usage; free runs (gifts) are the main cost risk and are capped at one per account.

**Phase B contact economics**: pay-per-use finders typically cost a few cents per found email (verify at selection); 1 credit = $0.12–0.40 → positive margin only if cost per *successful* find stays under ~$0.10. Validate in the bake-off before launch.

**Refund policy (shown in UI and terms)**: credits are held during a run; charged only for what was delivered by the formula above; failed runs are fully refunded automatically; no refunds after delivery for "not relevant" results, but "Looks off" feedback on ≥50% of a run's A/B prospects triggers a free re-run once.

---

## 7. Implementation roadmap

### Phase 0 — Stabilize GTM Strategist (prerequisite, ~2–3 days)

| Task | Approach | Acceptance |
|---|---|---|
| Plan restore after reload | Restore query includes `draft` for the current (non-superseded) project plan; auto-save after successful generation | Generate → reload → same plan shown; test |
| Refund gaps (no-key throw, timeout) | Move provider check before charging; switch analyzer to charge-after-save (PMF Discovery pattern) | Unit test: no provider → no deduction; forced failure → no net charge |
| Idempotency × refund | `idempotency_clear` on refund in `refundCredits`, or include deduction status in replay check | Retry after refunded failure charges once, refunds at most once |
| `minSampleSize` | Use `max(10, ceil(target*3))` or relax `tenProspectSample` to channel-aware | Partnerships play can start |
| FCP form flag | Remove rollout gate for FCP surface | Prospect form visible on Rising/Pro |
| Research Gemini fallback | Route brief through `json-generation` (OpenAI fallback) | OpenAI-only env produces a brief |
| Credit sync test | Add `gemini-3.6-flash` to client weights | Test passes |

### Phase A — MVP (≈3–4 weeks)

| Feature | User value | Pri | Technical approach | Reuse | Dependencies | Cx | Credits | Acceptance criteria |
|---|---|---|---|---|---|---|---|---|
| A1 Shared crawler | Safe, consistent site reading | P0 | Move `fetchWebsite` + guard into `_shared/site-crawler.ts`; nav-link page picker (≤5 pages), robots.txt respect, UA string, 8 s/page | `project-import-extract`, `public-url-guard.ts` | none | Low | 0 | Private/IP/redirect-to-private URLs rejected (tests); 5 pages max; blocked sites flagged |
| A2 Run engine | Durable progress, no timeouts | P0 | Tables §5.3, `gtm-research` + `gtm-research-worker`, sweeper cron, leases, backoff | outbox + cron patterns | A1 | High | — | Killing worker mid-step resumes; 3 failures → partial/failed; no duplicate prospects |
| A3 Credit reservations | Fair, transparent charging | P0 | `credit_reservations` + RPCs §5.5; keys in both constant files; `credit-quote` gift | MVP reservation SQL, `feature_gifts` | A2 | Med | 10/run | Reserve→finalize→release covered by SQL tests; first run free once; failed run nets 0 |
| A4 Website intelligence | Zero-typing start | P0 | Steps 1–3; server-side merge with ICP draft, PMF verdict, project context | `json-generation`, `useActiveProjectContext` data (server read) | A1, A2 | Med | 0 | On 5 golden URLs, offering/segment/value judged correct by reviewer ≥4/5; every claim has a source URL |
| A5 Segment proposal & confirmation | Founder corrects the agent before spending | P0 | Step 4 pauses `needs_review`; editable criteria chips; "Looks right / Fix" | ICP intake mapping | A4 | Med | 0 | Run cannot start without a confirmed segment; edits persist into `selected_segment` |
| A6 Company discovery | Real companies, not ideas | P0 | Step 5 query planner + `searchWeb` + list-page extraction + dedupe/suppression | `web-research.ts` | A5 | High | in run | ≥30 unique candidate domains on 4/5 golden segments; no competitor/founder domains |
| A7 Qualification | Trustworthy shortlist | P0 | Step 6 batched crawl + criterion verdicts with verbatim quotes (substring-verified) + tiering; domain cache | crawler, cache | A6 | High | in run | Manual review: ≥70% of tier-A judged relevant; 100% of "met" verdicts have a quote found in fetched text |
| A8 Timeline UI | "It is working for me" | P0 | `FindCustomers` view; Realtime on `gtm_research_steps` + 4 s polling fallback; streaming preview list | Realtime hooks pattern | A2 | Med | — | Steps update within 5 s; leaving and returning restores state; Stop works |
| A9 Prospect database | Actionable results | P0 | Table + filters + search + drawer + CSV export + status actions + "Looks off" | shadcn table patterns | A7 | Med | 0 | Filter/search/export work on 60 rows; actions persist |
| A10 Outreach drafts | Ready-to-send messages | P0 | Step 7; language from location; edit/copy/mailto/mark sent | FCP message rules | A7 | Med | included | Drafts cite only evidence present; "Mark sent" writes `outreach_sent` event |
| A11 Hand-offs | Fits the existing workflow | P0 | Add to pipeline (`gtm_pipeline_entries`), add to FCP, journey outcome | existing trigger, FCP tables | A9 | Low | 0 | Prospect appears in pipeline, contacts and FCP list; cohort counts update |
| A12 Spend controls & privacy basics | Stay under $100/mo; compliance | P0 | Ledger, budget kill switch, suppressions, privacy policy update, retention cron | provider-health alert | A2 | Low | — | Budget breach blocks new runs with message + admin email; suppressed domain never returned |
| A13 Pulse + tests | Discoverability and quality | P1 | Pulse guide + evidence summary; 10 golden URLs eval script (offline) | `pulseGuides`, `pulse-eval` | A9 | Low | — | Pulse answers "how do I find customers"; eval report produced |

### Phase B — Enhancement (≈3–4 weeks after A is measured)

| Feature | Value | Pri | Approach | Deps | Cx | Credits | Acceptance |
|---|---|---|---|---|---|---|---|
| B1 Decision-maker finder | Named person + verified email | P1 | Vendor bake-off → one finder+verifier; `gtm_prospect_contacts`; charge on success | vendor, DPA, privacy update | Med | 1/success | ≥60% find rate on tier-A; 0 charges on misses; provenance shown |
| B2 Person-level drafts | Higher reply rates | P1 | Draft uses role + company evidence | B1 | Low | included | Draft names person and role correctly |
| B3 Buying signals | Better ranking | P1 | Searches for hiring, funding news, launches per qualified company (cached); signal chips | A7 | Med | in run | Signals carry source + date ≤12 months |
| B4 "More like this" | Expand winners | P1 | Seed discovery from tier-A shortlisted companies | A6 | Med | 5 | New batch excludes existing domains |
| B5 Feedback learning | Fewer bad leads per run | P1 | "Looks off" reasons adjust criteria for next run in same segment | A9 | Low | 0 | Second run's rejection rate lower on test set |
| B6 Program view counts | B2B value | P1 | Extend `cohort_dashboard_v1` | A11 | Low | 0 | Staff see counts, never prospect names |
| B7 Run notifications | Return to results | P2 | Email + Pulse insight on completion | A2 | Low | 0 | Notification within 1 min of completion |

### Phase C — Advanced

C1 scheduled weekly refresh of a segment (new companies only); C2 multi-segment runs and A/B messaging tied to Traction Engine experiments; C3 program credit pools and staff-run research for cohorts; C4 optional connected-mailbox **send with per-message approval** (only after legal review); C5 richer firmographics if an affordable source appears; C6 public "prospect research" API for programs.

### Dependency order

`Phase 0 → A1 → A2 → A3 → A4 → A5 → A6 → A7 → (A8, A9 in parallel) → A10 → A11 → A12 → A13 → B1 → B2 …`
A8 can start with mocked step data as soon as A2's schema exists.

---

## 8. Final recommendations

### 8.1 Borrow from Explee
URL-only start with free research; segments ("campaigns") showing pain, criteria and examples; "Looks right / Looks off" on every result; explicit email status values (Phase B); prospect-language drafts.

### 8.2 Borrow from Krabat
The step log voice ("Writing emails for 3 of 10 leads…"); a single, simple six-to-seven-step rail; lead list with a focused one-at-a-time email panel ("Lead 1 of 10 · Previous / Next").

### 8.3 Deliberately do not copy
Autonomous sending and mailbox pools; card-on-file to start; per-email-sent pricing (misaligned with founders, who need fewer, better conversations); vanity database-size claims; reply bots that label "hot leads"; anything that runs without explicit approval.

### 8.4 Differentiation
1. **Starts from the founder's own evidence** (ICP Builder, PMF verdict, Demo Studio), not a cold scrape.
2. **Every prospect is explained** — criterion-level verdicts with quotes and links.
3. **Closes the loop** into pipeline, First Customer Proof, Traction Engine, Pulse and program dashboards: research → message → evidence of demand.
4. **Founder in control** — nothing sent, charges only for what was delivered.
5. **Built for programs** — cohort-level progress without exposing founders' prospect lists.

### 8.5 Recommended MVP scope
Phase 0 + A1–A12 (A13 shortly after). Company-level prospects with evidence, drafts, hand-offs; no personal contact data.

### 8.6 Complexity and operating cost
Phase 0 ≈ 2–3 days; Phase A ≈ 3–4 weeks for one engineer (high: run engine, discovery, qualification); Phase B ≈ 3–4 weeks. Operating cost ≈ $0.10–0.20 per run, budget-capped at $80/month in Phase A; Phase B adds pay-per-use contact cost charged through credits.

### 8.7 Five highest-priority tasks
1. Phase 0 defect fixes (plans must persist and charges must be fair before adding a paid agent).
2. Run engine + generalized credit reservations (A2, A3).
3. Shared crawler + website intelligence with ICP merge (A1, A4, A5).
4. Discovery + evidence-cited qualification with domain cache (A6, A7).
5. Timeline + prospect database + drafts + pipeline/FCP hand-off (A8–A11).

### 8.8 Risks
- **Discovery quality** (search returns listicles, agencies, dead companies) → evidence requirement, list-page extraction, "Looks off" feedback, golden-set eval before launch.
- **Sites blocking crawlers** (Explee itself returns 403) → keep as lower tier with honest note; cache; never drop silently.
- **Expectation gap vs competitors' "verified emails"** → clear positioning ("research + drafts, you send"), Phase B timing.
- **Cost overrun from free runs** → one gift per account, rate limits, budget kill switch.
- **Edge runtime limits** → one step per invocation, leases, sweeper.
- **Prompt injection from crawled pages** → untrusted-data framing, code-validated outputs, quote substring checks.
- **Data protection** (personal data in Phase B; UK/EU users) → privacy update, LIA, DPA, suppressions, retention, no staff access.
- **Vendor pricing/terms unknown** → bake-off with verified pricing before B1; nothing in this plan assumes a vendor price.
- **Duplicate work with existing GTM rigor** → reuse plays, pipeline, FCP; do not create a parallel CRM.

---

## 9. Unknowns and assumptions (to confirm)

- Exact Supabase edge function wall-clock limit on our plan (design assumes ≤150 s per invocation, steps sized ≤60 s).
- Tavily plan/quota on our key and current per-search price.
- Whether pg_cron + `net.http_post` self-kick latency is acceptable (expected 1–3 s per step).
- Golden URL set: Javier to provide 5–10 real founder URLs across B2B SaaS, service, marketplace, local business, non-English site.
- Copy review against product-positioning rules (no investment promises, global framing).

---

## 10. Verification (for each phase)

- **Unit/SQL tests** (node test runner, existing pattern): reservation lifecycle, refund formula, idempotent `start`, worker lease/retry, URL guard, dedupe/suppression, quote substring verification, CSV export shape, hand-off triggers.
- **Offline eval** (`scripts/gtm-research-eval.ts`, mirrors `scripts/pulse-eval.ts`): run the pipeline on golden URLs; report candidates found, qualified, % tier-A judged relevant by an LLM judge + manual spot check, cost per run from the ledger, duration.
- **Staging run**: end-to-end on a test account — free analysis → confirm → paid run → stop mid-way → partial charge → add to pipeline → FCP list → cohort count.
- **Telemetry** (PostHog, registered in `analytics/posthog/customer-journey.json`): `gtm_research_analyzed`, `gtm_research_started`, `gtm_research_completed` (qualified, charged, duration), `gtm_prospect_action` (shortlist/dismiss/pipeline/fcp), `gtm_draft_copied`, `gtm_draft_marked_sent`, `gtm_prospect_feedback`.
- **Launch gates for Phase A**: ≥70% tier-A relevance on golden set, median run < 6 minutes, cost per run < $0.25, zero double charges in 50 staging runs.

---

## 11. Delivery (approved by Javier 2026-11-15)

**Scope of this build:** Phase 0 + Phase A (A1–A13). Phase B waits for the contact-vendor bake-off with Javier.

**Nothing is committed to main until Javier reviews a preview.**

1. Work on a local feature branch (`gtm-research-agent`), never pushed to GitHub (pushing a branch creates Vercel preview builds and doubles the build queue).
2. Save this document as `docs/gtm-research-agent-plan.md` in the branch.
3. Build Phase 0 first, then Phase A, each step verified by typecheck, lint and the node test suite (baseline: 15 pre-existing failures).
4. Database: write migrations in the branch but **do not apply them to production** before approval. For the preview, apply them to a Supabase development branch if available on the project's plan; otherwise run the UI against seeded mock data and say so plainly.
5. Edge functions: run locally (`supabase functions serve`) against the dev branch for the preview; **no production deploy** before approval.
6. **Preview link:** per Javier's standing rule, previews are screenshots published as a claude.ai artifact (not Vercel links): the five screens of the journey (Start, What we understood, Who to target, Research in progress, Prospects + drafts), desktop and mobile, plus a short note of what is real vs mocked and the golden-URL eval results.
7. After Javier approves: merge to main (push `branch:main` only), apply migrations to production, deploy `gtm-research`, `gtm-research-worker` and the updated `gtm-analyzer`, set `GTM_RESEARCH_MONTHLY_BUDGET_USD`, verify with one live run.

## 12. Status (2026-11-16)

Phase 0 and Phase A shipped on 2026-11-15 (migration `20261115120000_gtm_research_agent.sql`). The rest of the plan is in `20261116120000_gtm_research_complete.sql` and the code around it:

| Item | Status |
|---|---|
| A gaps | "Mark as sent" / "They replied" create the founder contact and record `outreach_sent` / `reply_received` evidence; "Add to First Customer Proof" attaches to an open sprint; budget emails at 80% and 100% (`provider_spend_alerts`); public opt-out at `/research-opt-out` (`gtm-research-optout`); Pulse reads a research summary (counts and next companies, never draft text); `scripts/gtm-research-eval.ts`; "+10 more" (`GTM_RESEARCH_MORE`); free re-run after half the matches are rejected with a reason. Journey outcome row: not written on purpose; the evidence events already feed BizMap, the founder cycle and program counts, and a new `journey_outcomes` artifact type could change stage completion. |
| B1 | Built against Hunter (domain search + verifier), charged 1 credit only on a valid or catch-all address. Off until `HUNTER_API_KEY` is set on the functions and `VITE_GTM_CONTACT_FINDER=on` in the app build. Needs the vendor bake-off, DPA and legal review of privacy policy §1.5 before switching on. |
| B2 | Drafts use the named contact's first name. |
| B3 | `find_signals` step: one search per top-5 match, dated sourced news within 12 months; used in drafts. |
| B4 | "More like my shortlist" (`seed_domains`). |
| B5 | Rejection reasons go into the query, extraction and qualification prompts of later searches in the project. |
| B6 | `cohort_dashboard_v1` adds prospects added, outreach prepared/sent and research counts; dashboard and CSV show them. |
| B7 | Bell notification `customer_research_ready` when a run finishes. |
| C1 | Weekly check (`auto_refresh`, cron Mondays 08:00 UTC, up to 5 credits, only charged for matches; paused with a notice when credits run out). |
| C2 | "Target another group" reuses the analysis; two draft versions per company with sent/reply counts per version. |
| C3 | `launch_cohorts.research_runs_included`, set by admins on /admin/cohorts; covered runs are free and tagged with the cohort. |
| C4 | Not built: sending from a connected mailbox needs legal review and contradicts the "no automatic sending" rule of the brief. |
| C5 | Not built: no affordable firmographics source identified. |
| C6 | Deferred: a public API needs API keys, rate limits and program contracts first; no program has asked for it. |

Still to verify live: run the eval on 5-10 real founder sites and check the launch gates in §10.
