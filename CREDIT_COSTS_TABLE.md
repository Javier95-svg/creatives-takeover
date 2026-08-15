# Canonical Credit Catalog

Updated August 14, 2026.

Runtime sources of truth:

- Client: `src/config/constants.ts`
- Server: `supabase/functions/_shared/credit-constants.ts`
- Plan allocations and access: `src/config/planPermissions.ts`
- Money and top-up pricing: `src/config/pricing.ts` and `supabase/functions/_shared/pricing.ts`

The parity tests must pass whenever either catalog changes. UI copy must never hard-code a paid-action cost; it must use the server `credit-quote` response.

## Monthly allocation

| Plan | Monthly credits |
| --- | ---: |
| Rookie | 50 |
| Starter | 100 |
| Rising | 250 |
| Pro | 600 |

Purchased credits remain in the persistent balance. Monthly quota is spent before persistent balance and refreshes with the billing period. Existing balances and historical transactions are never rewritten by repricing.

## Product policy

- Free: planning, tasks, routines, saving, research tracking, notes, pipeline updates, mentor messages, Discovery Calls, and co-founder publishing/renewal.
- Paid: AI generation, researched analysis, exports, and service-marketplace outreach where explicitly listed.
- Plan and fair-use limits may still apply to free actions.
- A paid action must show cost, available balance, post-action balance, gift state, affordability, and the recommended purchase route before confirmation.

## Current feature costs

| Feature key | Credits |
| --- | ---: |
| `AI_CHAT_MESSAGE` | 1 |
| `SPRINT_TASK_GENERATION` | 2 |
| `TRACTION_ENGINE_SCORECARD` | 2 |
| `PROMPT_GENERATION` | 2 |
| `WAITLIST_GENERATION` | 3 paid plans / 4 Rookie |
| `COLD_EMAIL_GENERATION` | 3 |
| `ONEPAGER_GENERATION` | 3 |
| `PDF_EXPORT` | 3 |
| `TECH_STACK_GENERATION` | 4, with first-use gift where eligible |
| `MARKET_RESEARCH` | 5 |
| `BUSINESS_INSIGHTS` | 5 |
| `ROADMAP_GENERATION` | 5 |
| `PMF_SCORING` | 5 |
| `PMF_DISCOVERY` | 5 |
| `ICP_EXTRA_DRAFT` | 5 |
| `INVESTOR_MATCHING` | 5 |
| `SERVICE_MARKETPLACE_MESSAGE` | 5 |
| `GTM_ANALYSIS` | 6 |
| `PMF_ANALYSIS` | 6 |
| `FINANCIAL_ANALYSIS` | 8 |
| `FUNDRAISING_READINESS_ANALYSIS` | 8 |
| `PITCH_DECK_GENERATION` | 8 |
| `MARKET_VALIDATION` | 10 |
| `PITCH_DECK_ANALYZER` | 10, with first-use gift where eligible |
| `SERVICE_MARKETPLACE_EMAIL` | 10 |

MVP Builder uses action-specific costs from `MVP_CREDIT_COSTS`, ranging from free export through 15 credits for a new generation.

## Explicitly free credit keys

`ICP_ANALYSIS`, `APP_BUILDER_EXPORT`, `DISCOVERY_CALL`, `MENTOR_DM`, and `COFOUNDER_POST` are zero-credit actions. Browsing, saving, manual edits, task creation, pipeline changes, and return reminders do not call credit deduction APIs.
