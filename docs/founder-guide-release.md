# Guided Journey promotion — release gate and rollback

Final design selection: **Guided Journey**. The authenticated production home now selects `guided-journey` through `WORKSPACE_HOME_CONCEPT`, using the live account and Pulse adapters, not preview fixtures. The historical rollout key `founder-guide-workspace-v1` is intentionally retained to preserve existing enablement and rollback controls. Marketing and onboarding rules are unchanged. Deployment and live acceptance prerequisites below remain mandatory; changing the selected design does not enable the flag or deploy backend changes.

## Scope and status

### Merge onto current main (2026-09-16)

- Release baseline: `8e2279aa7e65addd404c85ad7f83a602bec9b02e`. Integration was transplanted onto this commit, not uploaded wholesale from the older local folder.
- Preserved current marketing Index/Hero/SEO, consent bootstrap and banner, mobile sign-in, published project subdomains, and purchase-history route. No local outreach changes included.
- Focused workspace/Pulse/onboarding/social-auth tests pass. Four broader auth/consent/landing test failures also reproduce on the untouched baseline; they are not introduced by this merge.
- Backend migration release and live authenticated acceptance remain outstanding. The historical rollout flag remains required; a Git push alone does not enable Guided Journey for users.

The approved design is integrated behind the PostHog boolean flag `founder-guide-workspace-v1`. No flag or deployment is enabled by this code change. Only resolved, authenticated identities with a freshly evaluated `true` flag receive the shell. Missing configuration, unknown flags, timeouts and flag errors never opt accounts in. Preview storage is not consulted at the application entry point.

Production `/` retains Index and its SEO/landing tracking for anonymous visitors. Eligible members receive Pulse Home instead; Index is not mounted. `/dashboard` remains Overview. `/app-entry` resolves ordinary sign-in defaults to `/` or legacy `/dashboard`; explicit return URLs and checkout remain higher priority. Guided onboarding is checked before Home. Onboarding's explicitly selected activation tool is retained.

Three `/prototypes/*` URLs remain review environments with explicit fixtures, not production eligibility switches. With no application configuration, other local routes show a setup error, not live or simulated account data.

## Recoverable baseline

- Local pre-change source snapshot: `.cache/founder-guide-pre-promotion-20260916.zip` (source, migrations, tests, scripts and build manifests; no credentials).
- This checkout has no root `.git` directory. Before deployment, commit the reviewed changes in the actual deployment repository and record both previous and candidate commit/deployment IDs.
- Release operator must capture a verified database backup/PITR restore point and record its identifier. The local ZIP is **not** a database or deployment backup.
- Keep the previous frontend artifact deployable throughout rollout and for seven stable days after 100%.

## Deploy in order — keep flag OFF

1. Review migrations against a staging database, its current policies and existing legacy chat behavior.
2. Apply `20260916090000_pulse_home_conversations.sql` if not already applied, followed by `20260916120000_pulse_home_immutable_scope.sql`. Do not re-run the earlier non-idempotent policy creation manually when it is already in migration history.
3. Deploy `chatbot-streaming` with its shared Pulse Home handler using the configured Supabase project and existing gateway secret. Do not change credit deduction rules. Home stays on the existing free Pulse policy.
4. Verify ownership, immutable purpose/owner/session, message-write restrictions and endpoint rejection using two staging accounts. Service-role credentials stay server-side.
5. Deploy frontend with the flag disabled. Confirm public pages, login, billing and legacy tools first.
6. Target internal account IDs in PostHog. The application identifies signed-in users through the existing analytics service. Never use an anonymous/all-visitors rollout rule for this flag.

## Automated checks

```powershell
node --experimental-strip-types --test tests/workspace-promotion.test.ts tests/pulse-home.test.ts
npx.cmd eslint src/components/workspace src/components/WorkspaceRouteFrame.tsx src/contexts/WorkspaceRolloutContext.tsx src/pages/AppEntry.tsx src/lib/workspacePolicy.ts
node scripts/verify-pulse-home.mjs
npx.cmd vite build --mode development --outDir .cache/founder-guide-build
```

Browser checks require the local Vite server on port 8080 and Playwright/Edge. They cover the shared shell and non-live preview; they do **not** qualify authenticated release acceptance. The production pipeline must also run its normal environment validation/build, lint, tests and performance budgets. Repository-wide type-check failures must be triaged against the baseline; do not waive errors introduced by this integration.

The opt-in staging isolation script reads `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_PUBLIC_KEY`, `STAGING_ACCOUNT_A_TOKEN`, `STAGING_ACCOUNT_B_TOKEN` and `CONFIRM_STAGING_ISOLATION_TEST=yes` from the operator's environment:

```powershell
node scripts/verify-workspace-isolation.mjs
```

It creates/removes one empty test conversation, attempts forbidden scope/message writes, and rejects cross-account/invalid-token streaming without making an AI request. Test actual expired sessions and existing messages manually too. Never paste tokens into logs or documentation.

## Required authenticated staging acceptance (not replaced by local previews)

- Anonymous `/`, marketing metadata/structured data/public links, logout, stale preview storage, unavailable flag and disabled flag.
- Email/OAuth sign-in and signup, verification, recovery, guided onboarding, explicit `/dashboard` and tool returns, and pending checkout continuation. Disable the flag and repeat default routing.
- Every catalog/sidebar route and eight shortcuts: direct entry, refresh, modifier-click, back/forward, scroll reset, auto-collapse, correct active state; Home has no selected sidebar section.
- Real account name/photo (uploaded and Google), tier and credit values; failed requests show unavailable state; switch A→B without exposing A data. Search profile/message/connection actions still require explicit clicks and existing permissions.
- Supported real updates: newest three, correct section labels, no fake unread dot, dismissal survives route changes/token refresh/reload but resets on new auth session. Empty source hides the card.
- New users without history and returning users: Dashboard priorities/order, tool-context refresh, latest Home-only conversation restoration, new conversation, interrupted-stream retries without duplicate turns, logout abort and account cleanup.
- Persona→ICP recommendation; fundraising mentor evidence, actual profiles, ambiguous request clarification and no-match fallback. No auto-message/booking/connection and no new credit charge.
- Two-account database SELECT/INSERT/UPDATE/DELETE and streaming attempts, purpose/owner/session mutations, legacy endpoint attempts with a Home session, expired sessions, changed conversation/message IDs. Verify legacy chat still works.
- Phone (375/390), tablet/zoomed desktop (767/780/820/1024), 1440×900 and 1920×1080: both themes, reduced motion, keyboard focus/escape, drawer/search/overflow, scroll regions and bounded credit dropdown.
- Dashboard, Messages, each editor, public share/embed/published outputs, billing/checkout and landing-performance regression checks.

Record pass/fail, release ID, time and environment for every gate. Do not record chat text, access tokens, names or profile details in operational evidence.

## Rollout and monitoring

Advance internal → 10% → 50% → 100% of authenticated accounts using stable account-ID bucketing. Keep each external cohort for **at least 24 hours**; advance only after acceptance passes and no new critical regressions appear. Do not schedule blind automatic increases.

Monitor existing route/error/checkout telemetry plus Pulse Home endpoint outcomes: authentication/redirect failures, inaccessible routes, stream/restore/save failures, p95 latency and checkout failures. Use operational status, duration, cohort and deployment version only; no content/tokens/profile payloads. Establish pre-release baselines and alerts before enabling external accounts. Verify dashboards actually receive events.

`pulse_home_operation` records restore/stream outcome, duration, retry and workspace version without message or identity payloads. Server stream logs use the same operational shape. Private workspace/Pulse regions are masked from replay/autocapture and skipped by text-based interaction telemetry. Existing analytics identity policy still applies; these events introduce no profile properties.

## Rollback

Immediately disable `founder-guide-workspace-v1` for isolation failures, broken auth/checkout or inaccessible core routes. On flag refresh/reload, the shared eligibility decision restores the legacy shell and `/app-entry` defaults to `/dashboard`. If the flag service is unavailable, deploy the previous frontend artifact; do not rely solely on a cached open browser receiving a remote flag change.

Retain conversations and additive schema. Do not drop purpose metadata or delete Home messages as rollback. If a database guard causes an unexpected legacy interaction, investigate in staging and deploy a reviewed corrective migration; never remove isolation protections while exposed. Keep rollback available until seven stable days after full rollout.

## External prerequisites still required

Configured authentication/database, deployed migrations and streaming function, staging test accounts, PostHog flag administration, production deployment access, database backup, and the timed cohort/monitoring gates. No local UI result substitutes for those checks.

## Local verification evidence (2026-09-16)

- 35 focused tests passed: workspace/Pulse, guided onboarding, OAuth/signup, auth storage and legacy navbar contracts. Analytics governance also passed (3 tests).
- Browser runner passed 12 desktop concept/theme/size combinations, tablet typography/zoom checks, 3 phone/tablet drawer/search sizes, reduced motion, composer/conversation fixture, shortcuts and stale preview-storage isolation. Screenshots are under `artifacts/pulse-home/`.
- Vite development-mode bundle succeeded. Normal production environment validation and staging acceptance remain required.
- Targeted integration lint: zero errors; existing style/Fast Refresh warnings remain. Whole-application TypeScript checking remains blocked by extensive existing errors (notably Supabase generic types); the separately filtered new integration files produced no diagnostics.
- No remote deployment, flag enablement, database backup/migration application, live billing test or cohort advancement was performed.
