# Personalized retention rollout

Delivery is disabled by default. No production migration or email send is part of the local implementation.

For the Supabase SQL editor, copy the complete contents of `personalized-retention-apply.sql` and run it once. The bundle includes the existing campaign primitives and the new migration in one transaction, supports repeat execution, and explicitly leaves delivery disabled. Regenerate it with `node scripts/prepare-retention-sql.mjs` after changing the migration. It requires the existing CT base schema and notification preference function.

## Source of truth

The Resend sender loads profile quiz fields and the latest completed onboarding session, authenticated activity, durable tool activity, and journey outcomes. It uses the same `deriveFounderProgress` evaluator as the dashboard and the canonical founder tool catalog. Neither an unlocked stage nor a generated output alone completes a stage.

Historical Score Viability and ICP Draft labels resolve to ICP Builder. Verified saved ICP drafts open `/icp/draft/:id`. Other projects use a recorded destination only after an ownership and existence check; otherwise their actual tool route is used. An opened tool is never described as a saved draft. Unavailable or plan locked tools are excluded.

The current product's expert support destination is the mentor area at `/mentorship`. Its visits and Marketplace visits are optional context. Missing historical visits remain unknown. These signals do not override unfinished roadmap work or introduce a second CTA.

Quiz only eligibility requires accounts created after `tracking_started_at`, authenticated tracking evidence, and no tool or outcome records. Existing accounts without a complete history are excluded from this segment. No claim is made that older users never opened a tool. No quiz answer or state signal means no generic fallback email.

## Delivery

1. Apply `20260904120000_personalized_retention.sql` after existing migrations. Leave `enabled=false`.
2. Deploy the frontend tracking and the `send-retention-email`, `check-inactive-users`, and `email-sequences` functions together. The Edge bundle must include the shared source imports from `src/config` and `src/lib`.
3. Once frontend tracking is live, set `tracking_started_at` to that rollout time. This excludes signups during the migration to frontend deployment gap.
4. Check a sample of real profiles, onboarding answers, tool events, artifact ownership, next steps, and plan access. Check Resend webhook event delivery and confirm the scheduled worker runs with service authorization. Review `personalized-retention-copy.md` and all cases in `personalized-retention-preview.html`.
5. Enable delivery only after those checks. Use `update public.retention_roadmap_settings set enabled=true where singleton=true;`. Roll back delivery by setting it to false; preserve all campaign and tracking records.

The worker visits candidates in pages of 200. All legacy inactive reminders use the shared resolver and claim function. Each candidate is checked again after a claim, and ineligible claims are released without consuming a touch. Delivery failures do not advance the sequence. There is one retention email per seven days across triggers, with three unanswered touches, a 60 day pause, and one final touch. A return resets unanswered touches but does not waive the delivery interval.

Transactional welcome, account, credit, and active user scorecard messages retain their separate behavior. The former routine inactivity email now uses roadmap copy and respects both retention and routine notification preferences.

## Experiment operation

Each segment begins in subject testing with four equally weighted deterministic assignment buckets and body zero fixed. Variants are alternatives, not additional scheduled touches. Assignment uses the user, segment, phase, and experiment version. Touch number does not select copy.

Read `select * from public.retention_roadmap_report;` using the service role, or call `get_roadmap_retention_report()` as the existing admin account. The report groups by segment, experiment phase and version, subject, and body. It includes total sends, mature sends, unique opens, clicks, returns, organic returns, and CTA returns. A mature send has at least 48 hours of observation. Rates use mature sends as the denominator; no observations produces null, not zero.

Open and click events are provider observations. Returns require authenticated dashboard or founder tool activity. A return through an email link is identified separately from an organic return; counts describe observed association, not proof that the email caused a return. Duplicate and out of order webhook events retain the earliest event time.

Choose the winning subject manually before starting body testing. For example, after reviewing the quiz only results:

```sql
update public.retention_roadmap_experiments
set phase='body', selected_subject=2, version=version+1
where segment='quiz_only';
```

Indices are zero based. This example holds subject three fixed and assigns the three body variants equally. It is an operation example, not a declared winner. Review open rate during subject testing, then clicks and 48 hour reactivation during body testing. Do not promote a winner automatically from small samples.

## Local validation

```text
node --experimental-strip-types --test tests/roadmap-retention.test.ts tests/inactive-retention-email.test.ts tests/lifecycle-email-sequences.test.ts
node scripts/preview-roadmap-retention.mjs
npm ci --ignore-scripts --legacy-peer-deps
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json
```

The database regression harness uses an isolated PostgreSQL engine without connecting to production:

```text
npm install --prefix .cache/retention-db --no-save --package-lock=false --ignore-scripts @electric-sql/pglite
node scripts/test-roadmap-retention-db.mjs
```

It exercises SQL claims, failure release, cross trigger suppression, preferences, pause state, exact reporting boundaries, duplicate events, and return attribution. A deployment smoke test must still verify the live scheduler, service permissions, authentication redirects, and actual Resend callbacks. Production coverage and deployment remain unverified until those checks are performed.

Validation in this workspace: 33 focused tests and the PostgreSQL regression harness passed. Application type checking does not pass on the supplied repository. In particular, the existing `first_customer_proof` entries are missing from `FeatureKey` in `src/config/planPermissions.ts`; the full application also reports existing Supabase type, unused declaration, and ES2020 library errors. Scoped checking of the new email modules reports only those imported entitlement catalog errors. The development build reaches Rollup but cannot resolve the existing `@emotion/styled` dependency. These repository blockers must be resolved before a production deployment.
