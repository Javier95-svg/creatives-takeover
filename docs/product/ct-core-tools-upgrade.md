# CT core tools upgrade

Baseline: `d6abedbe929630a080d3a54aac4e0f632fe4618e`.

## Delivered in this change

| Area | Capabilities |
|---|---|
| PMF Lab | Next-assumption summary, product-use screening for Sean Ellis, separate concept feedback, mapped imports with original records and revisions, explicit customer-fit screening, participant deduplication, latest-round comparison, and a re-score entry point. |
| GTM Strategist | This-week view, three next actions, per-play reviews over completed compatible periods, preview before applying revisions, preserved completed tasks and approved assets, PMF objection references, campaign links, mapped CRM opportunities, and conservative CRM/billing joins. |
| Traction Engine | Free weekly tracking, product-scoped saves, version 2 measurements, defined cohorts with unknown/pending states, atomic weekly saves with stable experiment IDs and immutable revisions, prior-experiment reuse, connected results, and source/revision-aware PDF and JSON reports. |
| Connections | One manager, source selection and product assignment, encrypted credentials, Google OAuth, mapping previews, duplicate handling, daily refresh, manual preview/refresh, connection health, disconnection, and bounded imports that fail instead of publishing partial results. |
| Validation sessions | Opt-in reviewer matching with explanations and exclusions, 25-minute bookings, private customer invitations, rescheduling/cancellation, Google Calendar/Meet, calendar downloads, pre/post feedback, identity-level attendance, review queue, and a capped reward ledger. |

CT remains a SaaS platform. Reviewer matching and validation sessions are product capabilities.

## Deploy in this order

For a database already at the baseline, use the numbered files in [ct-core-tools-sql](./ct-core-tools-sql), running **01 through 11 separately** in the Supabase SQL Editor as `postgres`. Copy the entire contents of each file into a fresh query and run it; the result must say `Completed` before moving on. The [combined installer](./ct-core-tools-migrations.sql) is an alternative containing the same steps with separate transactions. Do not wrap it in another transaction.

This replaces the original single-transaction bundle after a live `40P01` deadlock at `CREATE POLICY`. The revised installer releases locks after each migration, limits each lock wait to five seconds, and retries a deadlock or lock conflict up to three times with rollback between attempts. Each completed step is recorded with its source checksum in an administrator-only table. Re-running a numbered file or the revised combined installer skips completed steps and does not reset newly collected survey evidence. If a step still cannot obtain locks, earlier steps remain committed; retry that file after concurrent schema work finishes. The SQL does not disable security policies, disable event triggers, or terminate other sessions.

The initial `ROLLBACK` clears an aborted SQL Editor transaction; a warning that no transaction is active is harmless. The original failed all-in-one transaction does not have committed intermediate steps. If upgrades were separately applied outside this installer, the preflight stops for reconciliation rather than adopting an unknown partial schema. You can alternatively apply the original migrations using your normal migration tooling. Manual execution records progress separately from Supabase CLI migration history; reconcile that history before a later CLI push. Do not run both installation paths.

Step 5 additionally acquires the existing product/Traction table locks before its first schema change, using `NOWAIT` inside the retry subtransaction. A failed acquisition releases that attempt's locks instead of waiting on a second table while holding the first. This guard is outside the source SQL, so existing completion checksums (including steps 1–4) remain valid. It cannot displace a long-running transaction that still owns a conflicting lock. If error `55P03` persists, run [the read-only lock diagnostic](./ct-core-tools-lock-diagnostics.sql) in a fresh SQL Editor tab and inspect the sessions before attempting another migration. The diagnostic includes lock modes, transaction age and blocking PIDs without query parameters or any session-termination commands. An empty result after a failure can mean the transient blocker has already finished. Installer errors now preserve the original failing SQL context in `DETAIL`.

Regenerate both manual installation formats with `node scripts/prepare-core-tools-sql.mjs`. This preserves the original migration SQL and updates its checksums. Deployment locking guidance follows [PostgreSQL's transaction and deadlock behavior](https://www.postgresql.org/docs/17/explicit-locking.html), [explicit locks and NOWAIT](https://www.postgresql.org/docs/17/sql-lock.html), and [per-lock timeouts](https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-LOCK-TIMEOUT). The conflicting live relation names and the other session's query were not available from the screenshot, so no specific background service is assumed to have caused the deadlock.

1. Apply the new migrations, in timestamp order, from `20260930160000` through `20260930170000`. The production database's existing migrations must already be applied. The worker migration uses the existing `private.service_config`, `pg_cron`, and `pg_net` infrastructure.
2. Deploy `core-connections`, `validation-sessions`, `gtm-plan-review`, `pmf-survey-respond`, and `pmf-evidence-scorer`, including their shared modules. Deploy any existing function importing `_shared/credit-constants.ts` so the zero-credit tracking quote is consistent.
3. Deploy the frontend. Weekly saves now require `save_traction_week_v2`; deploy the database first. Direct client writes to weekly logs and experiment records are revoked. Existing reports remain readable.
4. Enable connected data for the pilot, starting with Sheets/Tally. Keep validation sessions disabled until Google permissions and identity attendance have been checked in a real meeting.

No production migrations, external account connections, calendar invitations, or credits were issued during implementation.

### Configuration

| Location | Setting | Value/purpose |
|---|---|---|
| Frontend | `VITE_CORE_TOOLS_CONNECTED_ENABLED` | `true` enables product linking, connections, and connected-result views. |
| Functions | `CORE_TOOLS_CONNECTED_ENABLED` | `true` enables connection requests and sync workers. |
| Both | `VITE_CORE_TOOLS_PROVIDERS` / `CORE_TOOLS_PROVIDERS` | Comma-separated allowlist; defaults to `sheets,tally`. Add `stripe,posthog`, then `ga4,hubspot`, then `typeform,shopify,mailchimp`. |
| Frontend / functions | `VITE_VALIDATION_SESSIONS_ENABLED` / `VALIDATION_SESSIONS_ENABLED` | Enable the validation pilot independently. |
| Functions | `INTEGRATION_TOKEN_SECRET` | At least 32 characters; encryption key for stored provider credentials. Follow the existing integration secret-management process; rotating this key requires credential migration or reconnection. |
| Functions | `CORE_GOOGLE_CLIENT_ID`, `CORE_GOOGLE_CLIENT_SECRET` | Google OAuth application, with the enabled APIs and approved scopes below. |
| Functions | `PUBLIC_APP_URL` | Canonical frontend origin for OAuth returns and invitation links. |
| Functions | `CORE_TOOLS_CRON_SECRET` | Random worker secret. Put the same value under `core_tools_cron_secret` in `private.service_config`; its existing `supabase_url` entry supplies the API origin. |

The connection worker runs every 15 minutes and refreshes sources whose accepted mapping is at least 24 hours old. Initial imports require preview/acceptance. Interrupted runs older than 15 minutes become retryable errors. The session worker runs every five minutes. Both workers do nothing useful until their server release flag and credentials are configured.

### Provider setup and boundaries

| Provider | Setup and selected data |
|---|---|
| Sheets | Google Sheets API; `spreadsheets.readonly`; spreadsheet ID and range with unique headers. Sheet/CSV evidence remains user supplied. |
| Tally | Read-only API credential and form ID; completed responses with question-title mapping. |
| Stripe | Restricted credential with charge and subscription read access. Confirm the account belongs to the selected CT product. For shared accounts, use the optional product identifier, matched against `ct_product_key` metadata on charges/subscriptions. |
| PostHog | Personal API key with project/query read access; US/EU region, project, starting event, returning event. Seven-/30-day retention measures return on the day before the anniversary. Activation measures any return event within seven days. Completed cohorts only. |
| GA4 | Analytics Data API, property access, `analytics.readonly`; selected property traffic and key events, with recorded campaign identifiers. Dates follow the property's reporting time zone; do not combine different reporting zones as if they were identical. |
| HubSpot | Private application token with contacts/deals read scopes; contacts, current lifecycle/deal stages, amounts, associations and available source fields. Map deal stages and CT plays explicitly. Unknown or non-USD amounts stay in source notes rather than the existing USD pipeline totals. |
| Typeform | Form response read access and form ID; map field refs into feedback and respondent identity. |
| Shopify | Store token with `read_orders`; `store.myshopify.com`; GraphQL API `2026-07`. Older orders may need `read_all_orders` approval. Imports include order amounts, refunds and customer IDs; no historical completeness is assumed. |
| Mailchimp | Read-capable API key, server prefix, optional list ID; campaign unique clicks/unsubscribes and monthly audience growth. |
| Calendar/Meet | Google Calendar API, Meet API, OpenID identity; `openid email`, `calendar.events`, `meetings.space.readonly`. Founder authorizes calendar writes. Reviewer connects the Google identity they will use to join. |

Register both Google redirect URIs:

```text
https://<supabase-project>.supabase.co/functions/v1/core-connections
https://<supabase-project>.supabase.co/functions/v1/validation-sessions
```

Provider setup must be tested with real accounts before enabling that provider. OAuth approval and Meet API availability depend on the Google account/workspace. A failed or unavailable Meet lookup never automatically grants credits or marks someone a no-show.

Imports are limited to 1,000 selected records and CSV uploads to 1 MB. Use ISO dates, stable source IDs, and email mapping where available. Separate CSV filenames form separate source namespaces. Financial records preserve currency and definitions. Stripe net payments are successful charges less their recorded refunds, grouped by charge date; they are not recognized revenue or MRR. Account balances, taxes, fees, disputes, and refunds for charges outside the selected history are not a full accounting ledger.

## Integrity rules

- Each context/plan must be assigned explicitly to a product. An existing assignment cannot silently move to a different product. Historical unassigned weeks remain separate.
- PMF peer feedback improves clarity/usability; only explicitly screened target customers enter demand assessment. Incentive status remains visible and is supplied to the scorer. Sessions alone never establish Sean Ellis eligibility.
- Product usage in the hosted survey is respondent-declared. Legacy responses have unknown usage and remain stored, but are excluded from the new Sean Ellis aggregate.
- Retention uses one starting cohort and a defined return event/window. A missing cohort is unknown; an unfinished observation window is pending. Active-user counts are activity measures.
- Provider source labels are assigned by the server. Editing a populated cohort clears its source observation ID and makes the save manual.
- GTM adaptation considers only the selected play's compatible metric and completed observation periods. Mixed decisions lead to a controlled iteration. The original experiment targets remain in their saved records/revisions.
- Payments join to CRM contacts only when a participant/email identity matches exactly one contact. Missing identities and campaign attribution stay unknown. Acquisition cost requires the founder to confirm complete cost coverage and new-customer attribution; it is labelled an estimate.

## Validation pilot operations

- Format: problem discovery 5 minutes, pitch/demo 5, questions 10, feedback 5.
- Matching filters language and offered dates, then ranks problem experience, buyer/user role and industry. Self, blocked and declared-collaborator matches are excluded.
- Meet identity overlap is clipped to the booked 25 minutes; overlapping devices/reconnections do not inflate time. Require 900 seconds for the two booked Google subjects. Anonymous or unmatched joins go to review.
- Reviewers must answer pre-pitch behavior questions and post-session clarity, objections, trial/payment intent and suggested change. Responses are not rewarded for positivity.
- CT rewards: 20 credits, verified email, account at least seven days old at session time, 24-hour hold after feedback, maximum two/week and four/month in UTC, one rewarded pair in either direction per 30 days, no overlapping rewarded sessions. Pilot ceiling: 100 grants / 2,000 credits.
- Duplicate feedback, reciprocal activity and excluded relationships require review. The administrator queue follows the repository's existing verified `admin@creatives-takeover.com` policy. Overrides record actor, reason and independently verified overlap; quota/age/hold limits still apply.
- Calendar invitations and cancellation/reschedule updates come from the founder's connected account. Event reminders are configured for 24 hours and one hour; recipient delivery depends on their calendar settings. Calendar downloads support other providers. CT does not send separate reminder emails.
- Invited customers use a private expiring booking link and do not need a CT account. They do not receive CT credit rewards. Treat the link as a private credential.

## Acceptance and rollout evidence

Automated coverage includes CSV quoting/deduplication, provenance permissions, multiple products, atomic rollback, experiment identity, revisions, refund pagination, provider host restrictions, completed/unknown/immature cohorts, per-play review windows, completed task preservation, stale proposals, identity attendance/reconnections, negative feedback, private guest booking, duplicate reward requests, reward ceiling, and survey/guest UI rendering.

Local verification: 52 targeted behavior/database tests and two UI tests passed. The Vite development-mode bundle passed. The full application TypeScript check is not clean; it reports widespread diagnostics, including Supabase query typing. A successful bundle does not establish a passing type check or verify deployed provider behavior.

The migration installer additionally has regression coverage for all eleven SQL steps, safe reruns without resetting evidence, rollback/resume after an injected `40P01` at policy creation, ordering, and checksum mismatch. PGlite executes the application SQL; `pg_cron` and `pg_net` calls use inert test doubles. These tests do not reproduce Supabase's live concurrent sessions or prove production contention has ended.

Run:

```text
node --experimental-strip-types --test tests/core-tools-data.test.ts tests/core-tools-database.test.mjs tests/validation-and-review.test.ts tests/pmf-north-star.test.ts tests/pmf-production-readiness.test.ts tests/pmf-customer-discovery-contract.test.ts tests/gtm-strategist-v2.test.ts tests/traction-engine.test.ts
node --test --test-concurrency=1 tests/core-tools-ui.test.mjs
node node_modules/vite/bin/vite.js build --mode development
```

Before expanding a wave, reconcile one product's imported figures against each provider dashboard, verify account expiration/reconnection, and run a real 25-minute meeting with separate booked Google identities. Compare four-week repeat use from saved weekly logs/review proposals, review completion, data-entry effort, and completed decisions. Session events/rewards provide booking, attendance, feedback, dispute, and credit-cost denominators; PMF evidence acceptance indicates feedback actually used. Do not infer commercial impact from these tests.

### Follow-on extensions

Existing GitHub/Supabase MVP connections are not repurposed as evidence of demand. Release-to-outcome correlation remains the explicitly later extension from the roadmap. Stripe, Tally, Typeform and Shopify can send signed events that deduplicate by provider event ID and queue a source refresh; daily polling remains the fallback. Configure webhooks and the signing secret under each connection. Event-driven refresh still respects the selected source, saved mapping and 1,000-record limit. High-volume incremental imports and fully automated multi-touch attribution require additional work beyond this bounded pilot.

### Core tool usability pass (October 1, 2026)

This frontend pass implements the six agreed priorities within the existing data model:

1. **Journey review:** reviewed the existing evidence, experiment, and weekly-save paths locally. This is a heuristic review, not observed research with founders. Live founder sessions remain outstanding; ask participants to add feedback, complete a GTM task, and record a Traction week without coaching. Record completion, hesitation, errors, and time.
2. **Main screens:** shared objective / evidence / next-action summaries; secondary scoring and research sit behind expandable sections. GTM shows three actionable tasks with related materials and completion controls.
3. **Onboarding and language:** PMF has a three-question validation brief saved on the current device and validation context. Traction explains returning customers with business-specific definition examples, guided dates/counts, and explicit unknown/pending states. Examples never add fabricated results.
4. **Weekly continuity:** GTM's review displays saved v2 experiment results for its selected linked sprint, with a correction link to Traction. Traction provides a return link to GTM's weekly workspace. Existing evidence-based proposal approval remains in place.
5. **Evidence and imports:** PMF combines saved conversations, recent survey feedback, and unreviewed imports in a searchable inbox. Connections suggests unambiguous column matches, shows samples, separates optional fields, and requires preview and confirmation. Applying a connected metric requires choosing its destination experiment and confirming compatibility with its target and period.
6. **Presentation and accessibility:** responsive summary/task cards, visible keyboard focus, labelled inputs, and a six-week execution-discipline chart with a semantic table. Missing weeks are labelled and incompatible historical calculations are excluded.

Verification: frontend Vite build; 28 focused data/domain tests; three UI tests including Chromium at 390px and 1280px, keyboard activation, unknown cohort counts, task preservation, and failed saves. Browser coverage exercises representative components with test data, not authenticated production journeys or live integrations. No new SQL migration or Edge Function deployment is required; publish the frontend to expose these changes. Existing connector feature flags still apply.

### Production verification follow-up (October 1, 2026)

**Status: live acceptance is incomplete. Do not interpret the local tests as a production sign-off.**

Read-only Chromium checks against `https://creatives-takeover.com` returned HTTP 200, rendered content, and no captured browser exceptions on `/pmf-lab`, `/gtm-strategist`, `/traction-engine`, `/connections`, and `/validation-sessions`. These checks were signed out. The session page explicitly displays **"This pilot is not enabled yet."** Public response codes do not prove database writes or provider connectivity.

The workspace had no configured authenticated test account or provider test credentials. Its existing browser storage fixture contains no authentication cookies and is for local smoke tests. No production records, meetings, messages, flags, or credits were changed.

| Acceptance item | Observed result | Remaining live evidence |
|---|---|---|
| Authenticated PMF, GTM, and Traction journeys | Blocked on a dedicated authenticated test session | Save/reopen/edit PMF evidence; generate and persist a GTM plan; activate its linked sprint; save/reopen/correct Traction results; review and accept a supported GTM adjustment. Record IDs and before/after values under an identifiable QA product. |
| Advertised connectors | No real provider import performed | Confirm the release allowlist, connect authorized provider accounts, preview/accept known source records, compare counts/values/periods with each provider, and repeat the import to check deduplication. A CSV-only test does not certify a provider connector. |
| Validation session and reward | Production pilot disabled | After permissions and release configuration are verified, book two consenting participants, capture pre/post feedback and at least 15 minutes of matched attendance, check attributed PMF evidence, and verify one 20-credit ledger grant after the 24-hour hold. Retry processing and confirm the balance does not increase again. The CT reviewer must meet the account-age and quota rules. |

Additional local verification passed **25 tests** across `core-tools-data.test.ts`, `core-tools-database.test.mjs`, and `validation-and-review.test.ts`. Coverage includes transactional saves, product ownership, idempotent imports, review proposals, identity overlap, reward holds, single ledger grants, and reward limits. Database tests use isolated PGlite fixtures and provider tests use fixtures; neither establishes live Supabase/provider behavior.

The signed-out browser results are stored locally in ignored `test-results/core-tools-production-public.json`. Live acceptance remains pending the requested account/provider access, participant availability, pilot configuration, and the normal reward hold. No hold, identity, or reward eligibility checks should be bypassed to mark this release complete.

### Provider references

### Deployed setup audit (October 1, 2026)

Read-only requests to the linked production Supabase project confirmed these concrete results:

- `core-connections` responds **503**, `Connected data is not enabled for this release.` The deployed handler requires `CORE_TOOLS_CONNECTED_ENABLED=true`; this gate is currently not satisfied. Imports and sync are unavailable through this service.
- `validation-sessions` responds **503**, `Validation sessions are not enabled for this release.` The deployed handler requires `VALIDATION_SESSIONS_ENABLED=true`; this gate is currently not satisfied. The frontend also says the pilot is not enabled.
- With the public anonymous client configuration, `pmf-survey-respond` reaches its input validation and rejects missing product usage. No survey response was submitted. `gtm-plan-review`, `pmf-evidence-scorer`, and `credit-quote` reach their authentication checks and reject anonymous requests as expected. This verifies routing/authentication responses, not their authenticated execution or exact deployed revision.
- Zero-row REST reads confirm `pmf_survey_responses.product_usage`; interview source, participant, incentive and target-customer columns; `ct_connections.refresh_requested_at`; Traction product identifiers, calculation version and sample size; `ct_gtm_review_proposals`; and `ct_evidence_revisions`.
- Anonymous access to validation sessions and rewards is denied as intended. A diagnostic initially selected `ct_connection_events.id`, but this table intentionally uses the composite key `connection_id,event_id`; that diagnostic error is not a migration defect.
- These observations do not reconcile the full migration ledger, prove all policies or constraints, verify atomic saves in production, inspect private worker schedules/secrets, or establish provider authorization.

**Verdict:** the inspected schema additions and public frontend are deployed; the complete advertised connected-data and validation-session capabilities are not currently available. PMF's manual evidence/scoring, GTM's planning/review, and Traction's manual tracking require authenticated acceptance before receiving a production-ready verdict. After provider/worker configuration is verified, connected-data activation needs matching frontend/server flags; validation activation additionally requires Calendar/Meet identity and reward verification. No production configuration was changed during this audit.

Probe artifacts (local, ignored): `test-results/core-tools-deployed-functions.json`, `test-results/core-tools-schema-probes.json`, and `test-results/core-tools-upgrade-columns.json`.

### External provider references

### Configuration repair

The authenticated Supabase CLI was subsequently available. It confirmed **all 11 installer steps**, both active cron jobs, a valid existing encryption secret, no existing connections, and no Calendar/Meet accounts. Earlier statements that production administration was unavailable were incomplete.

Repair scope: provision the previously missing shared worker secret in Edge secrets and `private.service_config`, preserve the encryption secret, enable connected data with a **Tally + CSV** initial rollout, and set matching Vercel production flags. Correct the provider selector so the first enabled provider is selected rather than always starting on Sheets. Both connection functions now reuse the existing complete Calendar OAuth credential pair when dedicated core credentials are absent; partial dedicated credentials fail rather than mixing applications.

Google currently rejects both new callbacks with **Error 400: redirect_uri_mismatch**. Add these exact authorized redirect URIs to the existing Google OAuth web client before enabling Sheets or validation sessions:

```text
https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/core-connections
https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/validation-sessions
```

Keep the application's existing redirect URIs. After Google accepts these callbacks and the required APIs/scopes are configured, add `sheets` to both provider allowlists. Enable validation sessions only after the Calendar/Meet permissions and identity flow are verified. A successful callback check does not establish actual account consent, provider data access, or verified meeting attendance.

The production setup repair uses a temporary token-authenticated helper restricted to the existing Vercel project and fixed feature-flag keys; it must be deleted and its one-hour token unset after deployment verification. Fourteen targeted tests passed and the frontend build passed before release. The existing shared Vercel token and encryption key were not exposed or rotated.

### Provider documentation

- [Google Meet participant identities and sessions](https://developers.google.com/workspace/meet/api/guides/participants)
- [Google Calendar event creation and conference data](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert)
- [Stripe currency representations](https://docs.stripe.com/currencies)
- [Shopify order fields](https://shopify.dev/docs/api/admin-graphql/latest/objects/Order)
- [Mailchimp audience growth history](https://mailchimp.com/developer/marketing/api/list-growth-history/)

- [Tally webhook signatures](https://tally.so/help/webhooks)
- [Typeform webhook signatures](https://www.typeform.com/developers/webhooks/secure-your-webhooks/)
- [Shopify webhook verification](https://shopify.dev/docs/apps/build/webhooks/verify-deliveries)
- [Stripe webhook signatures](https://docs.stripe.com/webhooks/signature)
