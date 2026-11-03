# Attack hardening release record — 2026-11-03

Baseline: `bc4ff91`. Prepared in the isolated `codex/security-hardening-bc4ff91` worktree. The main checkout's uncommitted work is untouched.

## Prepared changes

- Stripe and Resend webhooks fail closed when signing secrets are absent. Resend events require a valid Svix signature over the original request body.
- Outbound lead and waitlist webhooks require HTTPS and a public DNS answer; redirects are disabled. Share-card images can be fetched only from the project's public Storage path or Google avatar hosts, with a byte and time limit.
- The admin route and discovery-call administration use `user_roles`. Preview messages are accepted only from the expected iframe and origin. External links are normalized before opening.
- CI action versions are pinned to immutable commits. CV and collaboration uploads have a reviewed bucket-limit migration and matching client validation.

## Verified locally

- `npm run typecheck` passed.
- Focused tests for outbound webhook URLs and share-card image fetching passed (4 tests).
- Full `npm run lint -- --quiet` passed after correcting one pre-existing constant-condition error in `ProfileSupportSection.tsx` without enabling the hidden panel. The full lint report still contains many warnings.
- `git diff --check` passed.

## Release and production checks still required

1. Confirm the production admin account has a row with `role = 'admin'` in `public.user_roles` before deploying the new admin route or discovery-call service.
2. The Resend dashboard lists `resend-webhook`, `discovery-call-resend-webhook`, and the website homepage. Confirm the two function endpoints have separate signing secrets in `RESEND_WEBHOOK_SECRET` and `DISCOVERY_CALL_RESEND_WEBHOOK_SECRET`. `resend-email-events` is not configured and need not be deployed. Remove or correct the homepage webhook in the Resend dashboard. Send a signed test event and verify a forged event returns 401.
3. Confirm the Stripe signing secret is present and send a signed test event. Reconcile recent Stripe payments against credit transactions and check live traffic before deploying the three repository 410 replacements for `create-payment`, `verify-payment`, and `sprint-commitment-manager`.
4. Take a restorable backup of database **and Storage objects** before applying `20261103100000_restrict_private_upload_buckets.sql`. Confirm the migration in production and test an allowed and disallowed upload in both buckets.
5. Run two ordinary account tests for credits, RPCs, private files, and admin functions. Confirm an unverified signup cannot sign in and `signup-direct` returns 410.
6. Restore GitHub Actions billing, run CI and Gitleaks history scan to completion, review alerts privately, and configure required checks and branch rules. Triage dependency advisories before adding a blocking audit gate.

## Object backup destination

Use a **private Cloudflare R2 bucket in the EU jurisdiction** dedicated to Supabase Storage backups. Enable a 30-day retention lock, use a token scoped to this bucket, and keep that token only in a protected deployment secret store. Preserve object paths and metadata, encrypt in transit, and verify a restore of a sample object and a complete bucket inventory. Supabase database backups do not contain Storage file bytes. This destination has been selected but cannot be provisioned or tested until a Cloudflare account and the required limited credentials are available.

## Limits

Bucket MIME limits check declared types; they do not prove file content is benign. A quarantine and scanner worker, object restore drill, independent test, administrator MFA/access review, and the restricted incident decision remain open. Do not describe this release as a completed security plan until those checks have evidence.
