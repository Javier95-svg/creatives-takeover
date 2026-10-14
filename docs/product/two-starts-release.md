# Two starting experiences

The original homepage chatbot-style input, animated examples, Idea/Product toggle, and button labels are retained. Its funnel now turns an Idea sentence into a customer brief and first test, or a Product sentence into a pitch and three-step demo story. Both results appear before signup. Product screenshots are requested later in Demo Studio.

## Backend deployment before the frontend

Apply `supabase/migrations/20261013120000_claim_guest_demo_story.sql` to the intended Supabase project. The file can be run in the SQL Editor as `postgres`; it is safe to rerun. If deploying through the CLI, check migration history and the pending migration list before pushing. The migration adds a service-only function and does not change existing table layouts or preview payloads.

Deploy these two functions from this checkout, substituting the project's reference:

```sh
supabase functions deploy demo-studio-generator --project-ref <project-ref> --no-verify-jwt
supabase functions deploy guest-activation-artifacts --project-ref <project-ref> --no-verify-jwt
```

The generator's anonymous `story` mode uses the existing `OPENAI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. There is no provider migration. Generation and artifact creation remain rate-limited. Non-draft generation still verifies the signed-in user and credits inside the handler. The Idea path reuses the already deployed `icp-analyzer` operations and guest artifact tables.

Confirm that the auth redirect allowlist permits the site's `/auth/callback` URL, including email confirmation returns. Then deploy the frontend. Do not release the frontend before the new function operations and migration are available.

## Staging acceptance

- Submit one Idea sentence. Read and copy the likely customer, problem, and first test without leaving the homepage or signing up. A deeper-generation failure must keep the brief visible.
- Submit one Product sentence. Read and copy its pitch and three-step story with no URL, customer questionnaire, or screenshot upload. Edit the inferred customer, refresh, and confirm the correction remains.
- Save each result with email and with Google; confirm the same artifact is restored and saved without regeneration or onboarding questions. Test an existing account through the login link as well. Verify email confirmation in a new tab.
- Product save must create one project and brief. Repeat the auth return and retry the save; the project count must remain one. The native brief should offer **Add product screens** and retain the pitch and storyboard.
- Test invalid/expired resume links, unavailable generation, and failed saves. Copy remains available when there is a result; retry must retain the description. Retrying an edited Product story must save the edited version.
- Check desktop and 390px mobile widths, keyboard entry, both navbar Join Today links, and the unchanged single-input layout. Existing `/start` quiz, `/signup`, other account roles, and `/demo-studio/try` remain available.

## Measurement

Use `experience_version = two_starts_v1`, `mode`, and `output_kind` to distinguish the new paths. `first_output_generated` counts committed visible results; Product uses `demo_story`, not `interactive_demo_preview`. The same properties accompany `signup_started` and `signup_completed`. The server emits `artifact_claim_succeeded` for Product stories after the atomic claim.

Record eligible starting-section visitors, submissions, rendered results, completed accounts, and claimed artifacts separately for each mode. Compare completed accounts per eligible visitor against an equivalent pre-release period, with stable consent rules and acquisition-source filters. Supporting metrics are result/submission rate, signup/result rate, claim/signup rate, output latency, and generation/claim errors. A brief or story is first value, not verified demand or a published demo.

For rollback, restore the prior frontend first. The additive backend operations and migration can stay deployed; existing demo previews and claims use separate payloads.

## Local verification

```sh
node --experimental-strip-types --test tests/demo-story.test.ts tests/demo-story-database.test.mjs
npx playwright test e2e/starting-experiences.spec.ts
```

The database tests execute the migration in PGlite and cover duplicate claims, ownership, expired/invalid artifacts, rollback, and role preservation. Browser tests use mocked backend responses and do not establish live provider, email, or OAuth health. Complete staging acceptance above with the deployed backend before release.
