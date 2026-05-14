# Credit System Deep Audit

Board memo date: 2026-05-14  
Audit window: 2026-02-13 through 2026-05-14  
Repo/source checked: `Javier95-svg/creatives-takeover`, `main`, commit `8e240b52`  
Live connector status: code-confirmed only. Supabase, PostHog, Amplitude, and Stripe were unavailable in this session, so ledger, behavior, and revenue findings are marked blocked.

## 1. Credit Deduction Inventory

This inventory follows the product-facing **Compare Our Plans** table sections: **BizMap AI: Startup Development Cycle**, **Insighta**, **Community**, and **Resources**. The hybrid contract is now explicit: plan gates decide access, while credits meter generative or high-cost actions inside unlocked tools.

| Section | Tool / service | Monetization model | Access rule | Credit pricing | Source confidence |
|---|---|---|---|---:|---|
| BizMap AI | ICP Builder | Free acquisition gift | All plans | 0 | Code-confirmed |
| BizMap AI | Waitlist Maker | Credit-metered generation | All plans | 3 per publish/generation | Code-confirmed |
| BizMap AI | PMF Lab | Credit-metered analysis | Starter+ | 6 per full analysis; 4 per evidence score | Code-confirmed |
| BizMap AI | MVP Builder | Credit-metered generation | Rising+ | 5 initial generation; 3 refinement | Code-confirmed |
| BizMap AI | Tech Stack Builder | Credit-metered generation | Rising+ | 3 per generation | Code-confirmed |
| BizMap AI | GTM Strategist | Credit-metered generation | Rising+ | 5 per strategy | Code-confirmed |
| BizMap AI | Directories | Plan-gated access | Rising+ | 0 | Code-confirmed |
| Insighta | VC Search | Quota-gated access | Browse all; profile views by plan | 0 | Code-confirmed |
| Insighta | Accelerator Hunt | Quota-gated access | Browse all; profile views by plan | 0 | Code-confirmed |
| Insighta | Email Templates | Plan-gated access | Starter+ | 0 | Code-confirmed |
| Insighta | Pitch Deck Analyzer | Credit-metered analysis | Rising+ | 6 per analysis | Code-confirmed |
| Insighta | Insighta Test | Free diagnostic | All plans | 0 | Code-confirmed |
| Community | Discovery Calls / Mentorship | Quota-gated community value | 1/2/3/unlimited by plan | 0; no silent credit overage | Code-confirmed |
| Community | Find a Co-Founder Posting | Quota-gated community value | 1/2/unlimited/unlimited by plan | 0 | Code-confirmed |
| Community | Find Your Angel | Plan-gated premium access | Pro only | 0 | Code-confirmed |
| Resources | Newspaper | Included resource | All plans | 0 | Code-confirmed |
| Resources | Prompt Library | Plan-gated content depth plus light credits | Free models on Rookie/Starter; full library Rising+ | 2 for custom/generated prompt actions | Code-confirmed |

Engineering-only ledger values that are not listed in Compare Our Plans are intentionally excluded from this board-facing inventory. The query appendix includes an unmapped-ledger query so those values can be reviewed separately without presenting them as current product tools.

## 2. Usage & Monetization Heatmap

Live usage and revenue data could not be queried because Supabase, PostHog, Amplitude, and Stripe read-only connectors were unavailable. The heatmap below is therefore a required output schema, not a final behavioral conclusion.

| Tool / service | Frequency | Credit consumption | Exhaustion risk | Upgrade influence | Revenue evidence | Current confidence |
|---|---|---|---|---|---|---|
| ICP Builder | Blocked | 0 by design | Low | Likely high activation | Blocked | Code-confirmed free; behavior blocked |
| Waitlist Maker | Blocked | Credit-metered on all plans | Medium for Rookie | Unknown | Blocked | Code-confirmed |
| PMF Lab | Blocked | Credit-metered on Starter+ | Medium | Unknown | Blocked | Code-confirmed |
| MVP Builder | Blocked | Credit-metered on Rising+ | Medium/high for iterative builders | Unknown | Blocked | Code-confirmed |
| Tech Stack Builder | Blocked | Credit-metered on Rising+ | Medium | Unknown | Blocked | Code-confirmed |
| GTM Strategist | Blocked | Credit-metered on Rising+ | Medium | Unknown | Blocked | Code-confirmed |
| Directories | Blocked | No credit deduction | Low | Unknown | Blocked | Code-confirmed |
| VC Search | Blocked | Quota-based profile views | Low until quota exhausted | Unknown | Blocked | Code-confirmed |
| Accelerator Hunt | Blocked | Quota-based profile views | Low until quota exhausted | Unknown | Blocked | Code-confirmed |
| Email Templates | Blocked | Plan-gated, no deduction found | Low | Unknown | Blocked | Code-confirmed |
| Pitch Deck Analyzer | Blocked | Credit-metered on Rising+ | Medium | Unknown | Blocked | Code-confirmed |
| Insighta Test | Blocked | Included on every plan | Low | Unknown | Blocked | Code-confirmed |
| Discovery Calls | Blocked | Quota-based only | Low before quota exhausted | Unknown | Blocked | Code-confirmed |
| Find a Co-Founder Posting | Blocked | Quota-based | Low before quota exhausted | Unknown | Blocked | Code-confirmed |
| Find Your Angel | Blocked | Pro-only access | Low | Unknown | Blocked | Code-confirmed |
| Newspaper | Blocked | No credit deduction | Low | Unknown | Blocked | Code-confirmed |
| Prompt Library | Blocked | Content-depth gate plus light credit actions | Low/medium | Unknown | Blocked | Code-confirmed |

Required live-data queries are documented in `docs/audit/credit-system-deep-audit-queries.md`.

## 3. Model Verdict

Verdict: use a hybrid model, not a pure credit model and not pure feature gating.

The codebase and product table now separate four monetization mechanics:

- Free/loss-leader: ICP Builder and Insighta Test.
- Credit-metered generation: Waitlist Maker, PMF Lab, MVP Builder, Tech Stack Builder, GTM Strategist, Pitch Deck Analyzer, and premium Prompt Library actions.
- Quota-based services: discovery calls, co-founder posts, VC profiles, and accelerator profiles.
- Plan-gated access: Directories, Email Templates, Find Your Angel, and content depth in Prompt Library.

This is the clearest fit for the platform because generative workflows can be repeated many times and carry real usage cost, while access/resource/community surfaces are easier for users to understand as unlocked, locked, or quota-limited.

## 4. Revised Credit Pricing

| Tool / service | Recommended model | Rationale |
|---|---|---|
| ICP Builder | Free on every plan | Acquisition gift and first-value moment. |
| Waitlist Maker | 3 credits on every plan | Lightweight generation; fair Rookie usage and still meaningful for paid plans. |
| PMF Lab | 6 credits full analysis; 4 credits evidence score on Starter+ | Validation is valuable but should not eat Starter’s whole month. |
| MVP Builder | 5 credits initial; 3 credits refinement on Rising+ | Iterative, high-cost builder workflow similar to usage-metered AI app builders. |
| Tech Stack Builder | 3 credits on Rising+ | Useful generated recommendation with lower cost than MVP/GTM. |
| GTM Strategist | 5 credits on Rising+ | Strategy output is substantial and repeatable. |
| Directories | Rising+ plan gate | Access surface, not generation. |
| VC Search | Profile-view quota | Easier user mental model than credits. |
| Accelerator Hunt | Profile-view quota | Same as VC Search. |
| Email Templates | Starter+ plan gate | Good Starter value add without metering. |
| Pitch Deck Analyzer | 6 credits on Rising+ | High-value analysis, but lower than old 8-credit cost. |
| Insighta Test | Included on every plan | Supports activation and diagnostic value. |
| Discovery Calls | Monthly quota, no silent credit overage | Human/community value is clearer as quota. |
| Find a Co-Founder Posting | Monthly quota | Community supply should be rate-limited, not credit-metered. |
| Find Your Angel | Pro-only | Keeps investor access as a premium plan identity. |
| Newspaper | Included on every plan | Retention/resource surface. |
| Prompt Library | Free models on Rookie/Starter; 2-credit custom actions on Rising+ | Clear content-depth gate plus light usage meter. |

## 5. Implementation Roadmap

Immediate fixes now applied in code:

- Backend enforcement separates access gates from credit deduction.
- Shared credit constants now price PMF at `6/4` and Pitch Deck Analyzer at `6`.
- Product copy uses “Unlocked; uses credits” for generative tools.
- Subscription tier metadata migration updates plan features.
- Discovery-call overage credit charging is disabled in favor of quota upgrade prompts.
- Backend and entitlement tests assert the hybrid contract.

Next data pass:

- Connect read-only Supabase, PostHog, Amplitude, and Stripe.
- Run the query appendix.
- Replace every `Blocked` heatmap cell with live counts, conversion rates, credit exhaustion rates, and revenue attribution.
- Reconcile all `credit_transactions.feature` values to the product-facing tool list, with off-table values flagged as engineering/internal.

## Appendix: Source Confidence

- Code-confirmed: complete for constants, plan rules, known edge-function deduction paths, and client deduction helpers.
- Ledger-confirmed: blocked until Supabase read-only access is connected.
- Behavior-confirmed: blocked until PostHog and/or Amplitude read-only access is connected.
- Revenue-confirmed: blocked until Stripe read-only access is connected.
