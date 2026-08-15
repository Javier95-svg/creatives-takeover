# Credit Allocation Strategy

Updated August 14, 2026.

Credits meter generated value, not product engagement. The platform uses free planning, saving, tracking, and social loops; AI generation and analysis consume credits.

## Wallet rules

1. Every paid action requests a server-authoritative quote.
2. Monthly quota is deducted first, followed by purchased balance.
3. Monthly quota refreshes at the billing boundary; purchased balance persists.
4. Gift eligibility is evaluated by the server and displayed before confirmation.
5. Atomic deduction and idempotency prevent duplicate charges.
6. Failed paid actions follow the existing refund path.
7. Historical transactions and existing balances are preserved when pricing changes.

## Purchase recommendation

- Recommend a top-up when the user is short for an immediate paid action and recent usage does not imply recurring demand.
- Recommend a plan when recent usage predicts repeated monthly demand or a plan entitlement is required.
- Never interrupt a free action with a purchase prompt.
- Wallet forecasting comes from `credit-quote`, including the current action and likely next paid actions.

## Free social and workflow actions

Mentor messages, Discovery Calls, co-founder posts, investor/accelerator saves, pipeline changes, notes, follow-up dates, tasks, routines, and return reminders cost zero credits. Plan access, quotas, trust checks, rate limits, and anti-abuse controls remain independent of credits.

The August 2026 migration removes future social deductions without deleting or altering older transaction history.

## Change procedure

Any pricing change must update together:

- `src/config/constants.ts`
- `supabase/functions/_shared/credit-constants.ts`
- plan access in `src/config/planPermissions.ts`
- pricing UI through server quote data
- this catalog and `CREDIT_COSTS_TABLE.md`
- parity, quote, zero-credit, insufficient-credit, and idempotency tests

Deployment is blocked if client/server catalogs disagree.
