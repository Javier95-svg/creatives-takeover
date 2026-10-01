# MVP workflow worker and release

This worker builds a saved revision, runs its customer workflow in Chromium, checks the resulting rows in an isolated Supabase database, reloads the app, checks mobile overflow and private-record access, and removes its test data. Publication uses the built files from that passing test.

## Deployment prerequisites

### Managed-app implementation checkpoint (2026-10-01)

The next release is **in progress, not a completed six-category launch**. Current additions:

- Two worker consumers, capped at two; durable host cleanup journal; restart cleanup; bounded server lease retries; systemd service and environment template.
- CTA-only landing-page browser checks, with database-free server acceptance. The test follows the configured link and rejects no-op links and broken section navigation.
- Publication verifies that Vercel attached and verified the address on the configured project before activating the release and finalizing credits.
- Owner-scoped managed provisioning service, encrypted provider credentials, resumable stages and reconciliation of ambiguous project creation. An ambiguous create is never blindly repeated.
- Disabled-by-default invited pilot admission, ten-app cap, fresh cost forecast requirement, $175 alert event and $200 admission stop. Reserved costs include incomplete jobs. No automatic shutdown of live apps.
- Reviewed application SQL for private records, leads/referrals, habits, booking capacity and dashboard data. Separate commerce SQL covers stock reservations, deduplicated payment reconciliation and server-enforced subscription access.
- Browser runtime source and category capability definitions, plus CSV validation and streak calculations. **The runtime is not yet injected into generated projects.**
- Thirty representative briefs in `tests/fixtures/mvp-release-briefs.json` and a release evidence checker in `scripts/check-mvp-release-gates.mjs`. These fixtures are not thirty successful builds.

New **CT platform migrations**, after the previous migrations, in this order:

1. `supabase/migrations/20261001140000_mvp_managed_control.sql`
2. `supabase/migrations/20261001141000_mvp_static_acceptance.sql`

Deployment update: the user reports that both new CT migrations succeeded and all four required Edge Functions were deployed. That production state has not been independently verified. The Docker worker and managed infrastructure remain outstanding. App schemas in `_shared/mvp-app-schema.ts` and `_shared/mvp-commerce-schema.ts` are for separate customer/test projects; do not paste them into CT's platform database. Existing installed SQL files should not be rerun.

After these migrations, the changed/new Edge Functions are `mvp-workflow-tests`, `mvp-builder-publish`, `mvp-builder-generate` (shared prompt dependency), and `mvp-managed-app`. Deploy together with the rebuilt worker and frontend after the isolated checks pass. Keep managed admission disabled.

#### Access and operating setup still required

No managed organization credential, DigitalOcean host, separate test database or worker secret was available in the inspected environment. The existing CT Stripe and Resend secrets do not establish app-specific merchant onboarding or an approved managed email domain.

For the operator, not the founder:

- Provision the approved 8 GB / 4 vCPU Docker host and the separate test database. Use `worker.env.example` and `ct-mvp-worker.service`; protect the environment file with mode 600. Docker access is privileged; isolate this host from platform services.
- Configure the CT worker secret and host key to the same random value. Install the legacy test schema on the test project, build the image, then start the controller. Confirm a real workflow passes and publishes.
- Configure `MVP_MANAGED_SUPABASE_TOKEN` scoped to the managed organization, `MVP_MANAGED_ORG_ID`, `MVP_MANAGED_REGION`, `MVP_APP_SMTP_HOST`, `MVP_APP_SMTP_USER`, `MVP_APP_SMTP_PASS`, and `MVP_APP_EMAIL_FROM`. Keep `INTEGRATION_TOKEN_SECRET` stable to retain access to sealed credentials.
- Leave `MVP_MANAGED_RELEASE_PROFILES` empty. It is a release gate, **not a switch to enable unfinished workflows**. The setup UI stays hidden until an invited account, configured infrastructure, and a released profile are all present.
- The operator must refresh the complete projected infrastructure cost daily in `mvp_managed_pilot`. This is an admission forecast, not a live provider billing integration. Budget alert events currently need operator inspection; external alert delivery remains outstanding.

#### Remaining implementation before the proposed 8/10 release

- Integrate the managed runtime and immutable capability manifest into generation, preview, repairs and all six publication profiles. Preserve user-owned database connections and add explicit data migration. Current managed setup does not convert an existing project.
- Implement isolated hosted previews and all category-specific browser checks; the new worker currently adds only the static profile to the original three workflows. Test live auth, owner recovery, email delivery and configuration before releasing any managed profile.
- Complete team invitation delivery/revocation, scheduled reminders, dashboard mapping UI, app-specific Stripe Connect onboarding/direct charges, checkout handlers, verified webhooks, subscription portal and scheduled reconciliation. Commerce SQL alone is not an operational payment integration.
- Connect managed schema/data export to the founder workspace and complete consistent export snapshots. The current owner-only export endpoint is bounded and may observe concurrent edits; it excludes authentication passwords.
- Finish the unified workspace and current-revision hosted preview, included outcome repair loop, queue/operator alerts, end-to-end outage tests and the DigitalOcean production deployment.
- Run all thirty generated briefs and the twelve-founder pilot. No results or 8/10 rating are claimed. The evidence checker rejects missing build, regression, usability, cost and return-use observations.

Provider contracts: [Supabase project creation](https://supabase.com/docs/reference/api/v1-create-a-project), [auth configuration](https://supabase.com/docs/reference/api/v1-update-auth-service-config), [Vercel project-domain verification](https://vercel.com/docs/rest-api/projects/get-a-project-domain).

Release verification (2026-10-01): both CT migrations are installed and the five Edge Functions are active. No worker heartbeat or worker secret was present; only the CT production project was accessible. The app schema was also found in CT, which does not replace installing it in a separate disposable test project. Those tables have been left untouched. Worker hosting, isolated database setup and the production workflow pilot remain outstanding.

The UI checks worker availability every minute. While unavailable, it pauses new connected workflow builds and tests. Founders may explicitly choose a paid preview/export build, with the limitation shown in the price confirmation; that mode does not promise cloud persistence or publication. The generation endpoint rejects new connected builds before reserving credits. The server publication gate remains enforced.

The six-category product planner expands briefing and generation, not the three server-tested outcome profiles. Store checkout, dashboards, and other category-specific outcomes have not received production certification. Do not equate a successful preview with delivery of every promise on `/build`. Native binaries, production payment fulfillment, notifications and worker activation remain separate delivery requirements.

The planner also adds `20261001130000_mvp_build_brief_revision.sql` after the two migrations below. It includes the approved product brief in revision checks while preserving hashes for projects without a brief. Deploy the updated `mvp-builder-generate` function with the planner frontend. These latest planner changes require a separate release from the earlier two-tool upgrade.

- A Linux Docker host with Chromium sandbox/user-namespace support. The controller runs on this host; each job gets a separate container with resource limits and no mounted project directory or Docker socket.
- A **separate, disposable Supabase project** for testing. Never configure the CT platform database or a founder's app database as the worker's test database.
- Node 22 or newer on the controller host.

The repository's Windows environment has no Docker executable. Local browser and PostgreSQL tests cover the outcome checks and database contracts; they do not certify this container or an authenticated production build.

## Ordered release

1. Install `schema.sql` in the disposable test database.
2. Build the worker image from this directory:

   ```sh
   docker build -t ct-mvp-workflow:1 .
   ```

3. Prepare the controller environment using your host's secret manager:

   | Variable | Value |
   |---|---|
   | `CT_TEST_QUEUE_URL` | `https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/mvp-workflow-tests` |
   | `CT_TEST_QUEUE_KEY` | A random secret of at least 32 characters |
   | `TEST_SUPABASE_URL` | The disposable project's URL |
   | `TEST_SUPABASE_SERVICE_KEY` | That disposable project's service-role/secret key; controller only |
   | `TEST_SUPABASE_ANON_KEY` | That disposable project's public anon/publishable key |

4. Apply these **CT platform** migrations in order. Each has its own transaction and a five-second lock timeout; a lock failure rolls back that file. Do not enable the updated frontend until the functions and worker are ready:

   - `supabase/migrations/20261001120000_mvp_workflow_tests.sql`
   - `supabase/migrations/20261001121000_demo_editor_recovery.sql`

   The first migration freezes existing published files. Deploy the publishing functions immediately afterwards in the same maintenance window; the old publishing function does not update the new release table.

5. Set `MVP_WORKFLOW_WORKER_SECRET` in CT's Supabase Edge Function secrets to the exact value of `CT_TEST_QUEUE_KEY`. Do not expose either in frontend environment variables.
6. Deploy these functions using the repository's Supabase configuration:

   ```sh
   npx supabase functions deploy mvp-workflow-tests --project-ref rcjlaybjnozqbsoxzboa --no-verify-jwt
   npx supabase functions deploy mvp-builder-publish --project-ref rcjlaybjnozqbsoxzboa --no-verify-jwt
   npx supabase functions deploy mvp-builder-deploy --project-ref rcjlaybjnozqbsoxzboa --no-verify-jwt
   npx supabase functions deploy mvp-builder-generate --project-ref rcjlaybjnozqbsoxzboa
   npx supabase functions deploy journey-outcome-service --project-ref rcjlaybjnozqbsoxzboa
   ```

7. Run `node controller.mjs` under your host's process supervisor. Startup checks the Docker browser sandbox and test schema before advertising readiness. The Edge Function rejects new tests if the heartbeat is more than two minutes old. Failed or stale tests cannot publish and do not incur a publishing charge.
8. Deploy the frontend. No new public frontend secret is required. Use five pilot accounts before a broader launch.

## Existing user-owned database workflow

Each starter needs a connected app database and its **public** browser key. In **Review scope → Database setup**, founders can copy the SQL for their connected database. They create an owner account in that database's Authentication panel and register its email using the generated SQL. The owner can then view saved leads or manage requests. Customer-portal users have separate accounts and private records.

This one-time schema setup is still manual. The existing connection stores credentials but cannot provision arbitrary SQL through PostgREST alone. The test request checks the installed schema's health endpoint and owner registration before queueing.

## Boundaries and recovery

- Supported: browser HTML/CSS/JS and React with `react`, `react-dom`, and `lucide-react`. The worker does not execute generated install/build scripts or accept arbitrary backend stacks. Its bundler resolves saved files and pinned dependencies.
- Browser requests are limited to the built artifact and the selected app's record/auth APIs, redirected to disposable test users and records. Email, payments, webhooks, arbitrary external requests, WebSockets and service workers are blocked.
- The container receives temporary **test-user** credentials and a public test key. It receives no CT credentials or test service-role key. The controller owns privileged test setup and cleanup.
- Every test has a server-owned revision and expiring lease. Only the worker credential can complete it. Client-provided “passed” flags are ignored. Tests are limited to 12 new runs per account per hour; duplicate requests reuse the current run.
- Release assignment and credit finalization occur in one database transaction. Repeated publication of the same tested revision does not charge again. Edits invalidate publication eligibility. Existing public URLs continue serving their frozen release.
- A test against the isolated schema does **not** prove every production database policy or third-party setting is correct. Check each pilot's published workflow against its connected database before release.
- Normal cleanup removes the attempt's owner mapping and disposable users. The host journal records intended emails before account creation. On restart, recovery reconciles those emails and removes interrupted attempts before claiming more work. Failed cleanup stops admission and retains the journal for an operator; no production cleanup is performed.
- Schema errors, worker failures and failed writes remain visible; they never become a passing result. Review failed records in `mvp_build_tests`. Do not manually change their status to pass.

## Verification

From the repository root:

```sh
node --experimental-strip-types --test tests/demo-builder-upgrade.test.ts tests/demo-studio-production-v2.test.ts tests/mvp-builder-project.test.ts tests/mvp-workflow-database.test.mjs
node --test tests/demo-builder-browser.test.mjs tests/demo-builder-ui.test.mjs
node node_modules/vite/bin/vite.js build --mode development --logLevel error
```

Before launch, verify all three starter workflows with real test accounts, persistence after reload, restore/retest/publish, deployed function versions, worker heartbeat, and credit-ledger entries. For Demo Studio, create, edit, reopen, publish and share without video, retry an interrupted save, and check mobile/keyboard navigation.

Pilot target: four of five founders per tool finish without coaching. Record time to first shared demo, successful published workflows, repairs, credits per successful build and return usage. These are targets; no founder pilot has been claimed.

The bundled seccomp profile is from [Microsoft Playwright v1.63.0](https://github.com/microsoft/playwright/blob/v1.63.0/utils/docker/seccomp_profile.json), under Apache-2.0. The container configuration follows [Playwright's sandbox guidance](https://playwright.dev/docs/docker). Image and package versions are pinned together.
