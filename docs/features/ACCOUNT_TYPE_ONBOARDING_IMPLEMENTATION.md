# Account-type onboarding implementation

Implemented September 25, 2026, following the account-personalization audit.

## Changes, in priority order

1. **Approval integrity:** database guards protect account type, approval and compatibility classification on direct profile writes. Applications can only be submitted/reviewed through authenticated RPCs. Role JSON is validated server-side, and application snapshots are retained for review. A pending request cannot silently change type. Rejected requests can be corrected and resubmitted from account details.
2. **Canonical completion:** server-derived founder/builder classification and project context are saved in the same transaction as completion. An active project is ensured without creating duplicates on retry. Builders can use an editable `Untitled idea`. Existing established projects are reused, not overwritten by the repair.
3. **Quiz behavior:** the first screen asks about the person’s situation; the server derives the account type from that answer. Users cannot submit an account-type label. Mentor and marketplace requests require an invitation tied to their verified sign-in email and a separate admin approval. Reviewed roles see two steps; founder/builder setup shows its actual eight screens. Builder uncertainty, editable country, accessible role fields, preserved typing, role drafts, and post-submission workspace continuation are supported. Durable completion is acknowledged before optional analytics/enrichment. Late autosaves cannot overwrite newer drafts or reopen completed sessions.
4. **Review operation:** reviewers see a versioned snapshot of expertise/services/investment answers. Approval messaging distinguishes category access from publishing a directory listing. The review screen includes a per-role onboarding health table.
5. **Needs and matching:** mentors supply stages, experience and engagement preferences; providers supply ideal customer, proof and capacity; investors select canonical sectors and funding stages and state geography/activity, with optional check range. Only sectors and declared funding stages filter investor matches; geography/check range are review/evaluation preferences. Matches are ranked before limiting. Founder/builder opt-in is required and editable; funding stage is declared rather than inferred from operating maturity. Notifications use the same consent and stage requirements.
6. **Existing accounts:** compatible listing expertise/services are prefilled without inventing experience or availability. Existing accounts can complete remaining details progressively. Recent classification/project repairs are limited to records without later edits or an established active project. Unrelated historical accounts are not guessed or overwritten.

## Deployment

Apply these migrations in order, then release the frontend from the same change set:

1. `20260925155000_onboarding_invitations.sql`
2. `20260925160000_account_onboarding_integrity.sql`
3. `20260925161000_onboarding_classification_and_project.sql`
4. `20260925162000_investor_matching_preferences.sql`
5. `20260925163000_onboarding_drafts_and_reconciliation.sql`

No Edge Function implementation changes are part of this release. The existing notification delivery functions remain in use. Coordinate the frontend release with the migrations: applications now require the new role-specific answers; old open onboarding tabs should reload to obtain those fields.

The migrations contain data changes: listing prefill, conservative recent-account repair, and removal of irrelevant uncompleted startup-profile tasks for reviewed roles. Existing investor visibility defaults to off. Directory listings continue to require their existing publishing workflow.

## Verification

Validation result: **89 focused tests passed** (72 domain/source checks, 12 isolated PostgreSQL tests and 5 React interaction tests). The Vite frontend build passed. The full-repository TypeScript check was stopped during the earlier implementation after prolonged runtime without completing; it is not reported as passing. No production migration or deployment was performed during implementation.

- `npm run test:onboarding:db`: isolated PostgreSQL (PGlite), no production credentials or outbound mail. Tests approval bypasses, validated applications for all reviewed types, retries, snapshots, rejection/reapplication, mismatched decisions, both self-serve types, consent/ranking, late drafts and conservative reconciliation. Invitation checks cover admin authority, verified email, wrong email/category, expiry, revocation before approval, renewal, and situation-derived classification. The final resubmission retry correction was rerun as a targeted test.
- `npm run test:onboarding:ui`: real React form in jsdom, with network/auth/analytics boundaries mocked. Tests all five situation branches, invitation gating, older draft recovery, tag typing, reload recovery, submission/continuation and unnamed builder progression. Canvas is intentionally unused.
- Existing account/onboarding suites remain useful for domain behavior; their expectations now reflect restricted loading defaults and expanded role requirements.
- A Vite build checks frontend bundling. Production delivery, actual email receipt and live browser behavior remain deployment verification steps.

## Observability

The admin-only `account_onboarding_funnel()` RPC reports a rolling 30-day cohort by derived type and flow: starts, completions, abandonment, workspace entry, first actions, classification mismatches, application decisions and average review hours. Completion includes application submission, not automatic approval. First action currently means completed activation, saved role details or opening a matched founder conversation; it does not claim a deal or a meeting occurred.

New client analytics use quiz version 2. Existing historical records will not have newly introduced workspace/action events; do not treat absent historical events as measured drop-off. Classification mismatch is a diagnostic flag that may also reflect a deliberate later role change.

## Scope of access

Database role transitions are protected independently of UI gates. Ordinary profile editing remains available. Reviewed users can use their workspace while pending; category actions still require approval. Account context failures show a retry state instead of assuming approved founder privileges.

## Invitation operation and automatic classification

The admin account-requests page can create, renew (30 days), list and revoke email-bound invitations for mentorship or marketplace services. No invitation email is sent automatically. Share the existing onboarding URL with the invited person. Matching uses the verified authentication email, never a form-supplied email. An invitation is bound to the submitting user and cannot be reused by another account. Investors remain reviewed but do not require invitations.

The database classifies existing_project → founder, starting_project → builder, share_expertise → mentor, deliver_services → marketplace, and explore_investments → investor. A client-supplied founderSegment is overwritten with the derived value. Invalid/missing situational answers fail. Existing drafts without the first answer return to question one while preserving their other answers.

Invitation expiry is checked when submitting a new request. Revocation also blocks approval of a pending request; expiry after a valid submission does not invalidate that request. Rejection permits resubmission of the same derived category, with a valid invitation required again. Renew an expired invitation before resubmitting. Revocation does not suspend previously approved users. Existing pending requests without an invitation must be rejected and resubmitted after an invitation is issued; existing approved mentors/providers keep their access.

The new migration precedes the four previously prepared migrations. These migrations have not been deployed; two existing prepared migrations were updated to accept situation answers. Deploy all five together with the frontend. No Edge Function redeployment is needed for these changes.

All active onboarding sessions now render the situation-first form, including historical `control_v6` sessions. Their historical experiment labels remain available for analytics; they no longer select a different quiz UI. Saved server answers are retained, and incomplete drafts without a situation answer restart at question one.
