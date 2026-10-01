# MVP workflow worker and release

This worker builds a saved revision, runs its customer workflow in Chromium, checks the resulting rows in an isolated Supabase database, reloads the app, checks mobile overflow and private-record access, and removes its test data. Publication uses the built files from that passing test.

## Deployment prerequisites

Release verification (2026-10-01): both CT migrations are installed and the five Edge Functions are active. No worker heartbeat or worker secret was present; only the CT production project was accessible. The app schema was also found in CT, which does not replace installing it in a separate disposable test project. Those tables have been left untouched. Worker hosting, isolated database setup and the production workflow pilot remain outstanding.

The UI checks worker availability every minute. While unavailable, it pauses new workflow builds and tests and explains that existing apps remain editable/exportable. The generation endpoint also rejects new guided builds before reserving credits. The server publication gate remains enforced.

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

## Founder setup

Each starter needs a connected app database and its **public** browser key. In **Review scope → Database setup**, founders can copy the SQL for their connected database. They create an owner account in that database's Authentication panel and register its email using the generated SQL. The owner can then view saved leads or manage requests. Customer-portal users have separate accounts and private records.

This one-time schema setup is still manual. The existing connection stores credentials but cannot provision arbitrary SQL through PostgREST alone. The test request checks the installed schema's health endpoint and owner registration before queueing.

## Boundaries and recovery

- Supported: browser HTML/CSS/JS and React with `react`, `react-dom`, and `lucide-react`. The worker does not execute generated install/build scripts or accept arbitrary backend stacks. Its bundler resolves saved files and pinned dependencies.
- Browser requests are limited to the built artifact and the selected app's record/auth APIs, redirected to disposable test users and records. Email, payments, webhooks, arbitrary external requests, WebSockets and service workers are blocked.
- The container receives temporary **test-user** credentials and a public test key. It receives no CT credentials or test service-role key. The controller owns privileged test setup and cleanup.
- Every test has a server-owned revision and expiring lease. Only the worker credential can complete it. Client-provided “passed” flags are ignored. Tests are limited to 12 new runs per account per hour; duplicate requests reuse the current run.
- Release assignment and credit finalization occur in one database transaction. Repeated publication of the same tested revision does not charge again. Edits invalidate publication eligibility. Existing public URLs continue serving their frozen release.
- A test against the isolated schema does **not** prove every production database policy or third-party setting is correct. Check each pilot's published workflow against its connected database before release.
- Normal cleanup removes the job's owner mapping (cascading its records) and three disposable auth users. If the controller host crashes, inspect the disposable database for `ct-<job UUID>-<role>@example.invalid` users and mappings before restarting. No production cleanup is performed.
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
