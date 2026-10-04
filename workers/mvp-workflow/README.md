# MVP Builder shipping worker

Implementation baseline: e0ac8b4. The current workspace design is preserved. Supported managed workflows are lead capture, request tracking and customer portals. Payments, native apps, marketplaces and arbitrary server stacks remain deferred.

## What the implementation checks

Saved source is compiled with pinned browser dependencies and exercised in Chromium. Tests use disposable accounts and records in a separate Supabase project. They verify a stored customer task, reload persistence, account isolation, rejected-write handling, navigation and mobile width. Requests must prove requester visibility and owner-only status changes. No generated scripts or dependency installation commands execute on the host.

Passing artifacts are bound to the saved revision. A temporary token probes that artifact on its actual public hostname before an atomic release switch and credit finalization. Draft edits and failed publication leave the previous release intact. Repeated publication of the same tested revision uses one reservation. Two repair attempts belong to each eligible paid source; test infrastructure failures do not claim an attempt, and model-provider outages return a claimed slot exactly once. Repairs preserve checkpoints and cannot overwrite newer drafts.

Managed setup provisions separate customer Supabase projects with encrypted privileged credentials. It reconciles interrupted provider operations, installs RLS policies, establishes the verified founder as owner before enabling signup, and configures email recovery. Browser code receives only the public key. Owner access starts through the app's recovery control. GitHub is optional; existing user-owned databases remain supported.

App activity checks read customer record counts directly from the managed database, exclude records attributed to authenticated owner accounts, and store owner-scoped observations in CT. The builder shows reachability and records; Traction displays the last count as context. This is a current record inventory, not unique users, retention, visits or historical conversion tracking. Anonymous lead rows do not identify their submitter. It refreshes while a published project is open; browser error categories are counted separately with a bounded public endpoint, without storing messages, stack traces or personal data. These unverified reports cannot certify checks or completed tasks. Activity is not background analytics.

## Ordered rollout

Local tests do not certify a production deployment. Keep managed admission disabled until these steps and real visitor journeys pass.

1. Compare the target platform migration history with the repository. Apply missing retained migrations in timestamp order, followed by **20261004130000_mvp_shipping_contract.sql**. Use forward migrations; never rerun installed files or reset existing projects. The shipping migration freezes the currently served legacy files after the rollback, restores release serving and the publication guard, and reschedules retained managed setup jobs when cron is installed. It extends retained workflow, managed-control, static-acceptance, saved-review and recovery contracts. Existing public releases remain frozen.
2. Install **schema.sql** only in the separate disposable test project. The controller refuses the CT queue project as its test project. Never put platform credentials into generated apps or containers.
3. Provision a Linux Docker host with Chromium sandbox/user-namespace support. Use **worker.env.example** and **ct-mvp-worker.service**, keep the environment file mode 600 and the state journal durable. The container receives source, a public test key and disposable user credentials; service-role access stays in the controller. Two consumers maximum; each job has memory, CPU, PID and execution limits. Docker access belongs only to this isolated host.
4. Build from this directory: docker build -t ct-mvp-workflow:1 . Then npm ci --omit=dev --ignore-scripts on the controller host and start its service. Playwright package and image are pinned to 1.60.0. Startup checks Docker and the installed test schema; interrupted cleanup is reconciled before new claims. Failed cleanup pauses the worker.
5. Set CT's **MVP_WORKFLOW_WORKER_SECRET** to the host's **CT_TEST_QUEUE_KEY** (at least 32 random characters). Configure **INTEGRATION_TOKEN_SECRET** and preserve it across deployments. Set managed organization token, org ID, region, SMTP host/user/password/from using the service secret store. See required variables in mvp-managed-app/index.ts. Configure Vercel publishing credentials and MVP_PUBLISH_BASE_DOMAIN consistently. No new privileged frontend variable is required.
6. Deploy mvp-managed-app, mvp-workflow-tests, mvp-builder-generate, mvp-builder-publish, mvp-builder-deploy and journey-outcome-service together with the serving API, hostname middleware and frontend. Each authenticates requests internally; the queue separately authenticates its worker secret. Verify the actual function configuration rather than trusting historical deployment reports.
7. Confirm the fresh worker heartbeat advertises lead_capture, request_management and customer_portal. Run one complete prompt ? build ? check ? publish ? separate visitor journey for each. Confirm signup/email confirmation, founder password recovery, private access after reload, status visibility, owner exclusion, failed saves, stale checks, two repair attempts, interrupted retries and charge ledgers. Browser-supplied claims cannot publish.
8. Validate desktop and mobile workspace controls, reopen/edit/restore/retest/republish, and confirm customer data survives these operations. Confirm old public artifacts survive failed updates. Email delivery, public routing and actual provider RLS must be checked live.
9. Only then set MVP_MANAGED_RELEASE_PROFILES to the three certified profiles: lead_capture_v2,request_management,private_records. Enable invited pilot admission in mvp_managed_pilot. Its existing ten-app cap, fresh daily cost forecast, $175 alert event and $200 stop remain enforced. Costs reserve incomplete setups; exceeding admission budget does not shut down existing live apps. Operator alert delivery and cost forecast refresh require operational ownership.

## Local verification

From the repository root:

    node --experimental-strip-types --test tests/mvp-*.test.ts tests/mvp-*.test.mjs tests/core-tool-outcome-enforcement.test.ts
    node node_modules/@playwright/test/cli.js test e2e/mvp-builder-shipping.spec.ts
    node node_modules/vite/bin/vite.js build --mode development

Relational tests use PGlite and browser tests use Chromium. They cover the saved-release contract and the reviewed workflows without external credentials. This Windows environment has no Docker/Supabase CLI; container execution, production provisioning, email and visitor journeys remain rollout checks. Do not interpret mocked platform browser routes as an authenticated live journey.

Pilot observations: successful launches, founder interventions, repairs per paid build, completion time, cost per shipped app and successful return use. Test rows carry revisions, timestamps, failure classifications and assertions; credit reservations carry the cost basis. Record provider billing and founder observations separately. Do not count visits as completed customer outcomes.

## Existing user-owned Supabase

Download the schema from App details and recovery and install it in the selected customer database. Register its owner in ct_mvp_workflow_owners with the CT project UUID and starter (lead_capture, request_management or customer_portal), using a real account UUID from that database's Auth users. Add the publishable key in the same controls and retain the existing integration connection. The app's RLS, auth site URL, redirect allow-list and email delivery must match the published hostname. Switching an existing user-owned app to managed infrastructure needs an explicit data migration; the service refuses silent conversion.

## Verification recorded for this implementation

120 focused tests passed, including Chromium workflows backed by relational RLS tests, server-owned releases, compare-and-swap saves, publication retry holds, two included repairs and infrastructure refunds. Seven related credit-disclosure and workspace-design regressions also passed. Two desktop/mobile platform tests passed using mocked platform endpoints, including failed-save protection. The application bundle and eight server/serving entry points compiled. New shipping components/helpers passed scoped semantic type checks; repository-wide type checking still reports existing generated Supabase and legacy typing errors, also reproduced against the baseline builder hook. No production provisioning, worker container, email delivery or real visitor launch is claimed.
