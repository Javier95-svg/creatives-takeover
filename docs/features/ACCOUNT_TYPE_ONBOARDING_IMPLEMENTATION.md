# Account-type onboarding implementation

Implemented September 25, 2026, following the account-personalization audit.

## Changes, in priority order

1. **Approval integrity:** database guards protect account type, approval and compatibility classification on direct profile writes. Applications can only be submitted/reviewed through authenticated RPCs. Role JSON is validated server-side, and application snapshots are retained for review. A pending request cannot silently change type. Rejected requests can be corrected and resubmitted from account details.
2. **Canonical completion:** founder/builder choice and project context are saved in the same transaction as completion. An active project is ensured without creating duplicates on retry. Builders can use an editable `Untitled idea`. Existing established projects are reused, not overwritten by the repair.
3. **Quiz behavior:** account choice is the first screen. Reviewed roles see two steps; founder/builder setup shows its actual eight screens. Builder uncertainty, editable country, accessible role fields, preserved typing, role drafts, and post-submission workspace continuation are supported. Durable completion is acknowledged before optional analytics/enrichment. Late autosaves cannot overwrite newer drafts or reopen completed sessions.
4. **Review operation:** reviewers see a versioned snapshot of expertise/services/investment answers. Approval messaging distinguishes category access from publishing a directory listing. The review screen includes a per-role onboarding health table.
5. **Needs and matching:** mentors supply stages, experience and engagement preferences; providers supply ideal customer, proof and capacity; investors select canonical sectors and funding stages and state geography/activity, with optional check range. Only sectors and declared funding stages filter investor matches; geography/check range are review/evaluation preferences. Matches are ranked before limiting. Founder/builder opt-in is required and editable; funding stage is declared rather than inferred from operating maturity. Notifications use the same consent and stage requirements.
6. **Existing accounts:** compatible listing expertise/services are prefilled without inventing experience or availability. Existing accounts can complete remaining details progressively. Recent classification/project repairs are limited to records without later edits or an established active project. Unrelated historical accounts are not guessed or overwritten.

## Deployment

Apply these migrations in order, then release the frontend from the same change set:

1. `20260925160000_account_onboarding_integrity.sql`
2. `20260925161000_onboarding_classification_and_project.sql`
3. `20260925162000_investor_matching_preferences.sql`
4. `20260925163000_onboarding_drafts_and_reconciliation.sql`

No Edge Function implementation changes are part of this release. The existing notification delivery functions remain in use. Coordinate the frontend release with the migrations: applications now require the new role-specific answers; old open onboarding tabs should reload to obtain those fields.

The migrations contain data changes: listing prefill, conservative recent-account repair, and removal of irrelevant uncompleted startup-profile tasks for reviewed roles. Existing investor visibility defaults to off. Directory listings continue to require their existing publishing workflow.

## Verification

Validation result: **85 focused tests passed** (72 existing domain/source checks, 10 isolated PostgreSQL tests and 3 React interaction tests). The Vite frontend build passed. The full-repository TypeScript check was stopped after prolonged runtime without completing; it is not reported as passing. No production migration or deployment was performed during implementation.

- `npm run test:onboarding:db`: isolated PostgreSQL (PGlite), no production credentials or outbound mail. Tests approval bypasses, validated applications for all reviewed types, retries, snapshots, rejection/reapplication, mismatched decisions, both self-serve types, consent/ranking, late drafts and conservative reconciliation.
- `npm run test:onboarding:ui`: real React form in jsdom, with network/auth/analytics boundaries mocked. Tests all five role branches, tag typing, reload recovery, submission/continuation and unnamed builder progression. Canvas is intentionally unused.
- Existing account/onboarding suites remain useful for domain behavior; their expectations now reflect restricted loading defaults and expanded role requirements.
- A Vite build checks frontend bundling. Production delivery, actual email receipt and live browser behavior remain deployment verification steps.

## Observability

The admin-only `account_onboarding_funnel()` RPC reports a rolling 30-day cohort by selected type and flow: starts, completions, abandonment, workspace entry, first actions, classification mismatches, application decisions and average review hours. Completion includes application submission, not automatic approval. First action currently means completed activation, saved role details or opening a matched founder conversation; it does not claim a deal or a meeting occurred.

New client analytics use quiz version 2. Existing historical records will not have newly introduced workspace/action events; do not treat absent historical events as measured drop-off. Classification mismatch is a diagnostic flag that may also reflect a deliberate later role change.

## Scope of access

Database role transitions are protected independently of UI gates. Ordinary profile editing remains available. Reviewed users can use their workspace while pending; category actions still require approval. Account context failures show a retry state instead of assuming approved founder privileges.
