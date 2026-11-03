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

## Production evidence after release

- Commit `96270c7e` was fast-forwarded to `main`; Vercel reported a successful status for that commit.
- A read-only production query confirmed `admin@creatives-takeover.com` has an `admin` row in `user_roles`.
- `stripe-webhook`, `resend-webhook`, `demo-studio-lead`, `demo-studio-webhook-retry`, `discovery-call-service`, and `waitlist-public-api` deployed as fresh ACTIVE versions.
- The repository's 410 replacements for `create-payment`, `verify-payment`, `sprint-commitment-manager`, and `signup-direct` deployed as fresh ACTIVE versions. Direct requests to all four URLs returned HTTP 410.
- A read-only aggregate found zero purchase/refund and zero sprint credit transaction rows in the previous 30 days. This does not replace a Stripe payment reconciliation.
- An unsigned Stripe webhook request returned 400. An unsigned Resend request returned **503 `Webhook unavailable`**: this code returns 503 when the runtime signing secret is missing or does not begin `whsec_`. The endpoint is fail closed but legitimate Resend events will also be rejected until the secret is corrected.
- The follow-up dependency update applied compatible fixes and upgraded jsPDF, Fabric, pdfjs-dist and development jsdom. The lockfile now has **0 critical, 9 high, 22 moderate, 1 low** npm advisories. CI now blocks new critical advisories. The Vite build, typecheck, focused security tests, and lint gate passed. The full repository test suite still has failures in unrelated source-contract/page-output checks; it is not a passing release gate today.

## Release and production checks still required

### Production account and upload controls applied after the initial release

- Two ordinary-account SQL probes confirmed no cross-account credit reads or balance changes. Storage RLS probes confirmed owner-only metadata visibility for `cv-uploads` and `collaboration-files`. All probe writes were rolled back. These checks do not test the HTTP API or legacy file paths.
- `20261103110000_admin_role_authority.sql` was applied after a rollback-only dry run. Authenticated members have no direct write grants on `user_roles`; the existing admin is recognized by role; the reviewed admin helpers and policies no longer use the admin email.
- `20261103100000_restrict_private_upload_buckets.sql` was applied after a rollback-only dry run. Production read-only queries confirmed a 5 MiB cap and PDF/DOC/DOCX allowlist for `cv-uploads`, and a 20 MiB cap and 12-type allowlist for `collaboration-files`. Existing file bytes were not changed. Both SQL files were applied directly, so their effects are verified but migration-ledger entries are not asserted.
- A completed physical database backup was confirmed before these SQL changes. It does not contain Storage object bytes. An independent object backup and restore drill remain open.
- After SQL A, B, and C were run again, read-only production checks found all seven `*_mine` RPCs callable, all seven legacy user-ID RPCs closed, five private buckets private, no broad Storage policy, and six cron jobs using the private service-key lookup. The five cron functions rejected unauthenticated HTTP requests and the four retired financial/signup functions returned 410. Rerunning SQL A also revoked `authenticated` EXECUTE on `is_admin_user()`, which 15 RLS policies use. `20261103120000_restore_admin_rls_helper_grant.sql` restored only that grant in production; an ordinary-account rollback probe then returned `member_is_admin = false` and no role-write privileges. This SQL was applied directly, so its live effect is verified without asserting a migration-ledger entry.

1. Correct the production `RESEND_WEBHOOK_SECRET` from the signing secret for the configured `resend-webhook` endpoint. The owner reported both Resend endpoint secrets are configured, but the live 503 contradicts that for this variable. The Resend dashboard also lists `discovery-call-resend-webhook` and the website homepage; remove or correct the homepage webhook. `resend-email-events` is not configured and was not deployed. Send a signed test event and verify a forged event returns 401.
2. Send a signed Stripe test event. Reconcile recent Stripe payments against credit transactions and review legacy function traffic, including any in-flight payments from before the three 410 replacements.
3. Check the production Supabase email-confirmation setting and test a new unconfirmed account. The old `signup-direct` URL now returns 410.
4. Provision an independent Storage-object backup destination and perform a restore drill. Test an allowed and disallowed upload through the HTTP Storage API in both buckets.
5. Complete two ordinary-account HTTP API tests for credits, RPCs, private files, and admin functions. The database RLS probes above do not cover every API route or legacy object path.
6. Restore GitHub Actions billing, run CI and Gitleaks history scan to completion, review alerts privately, and configure required checks and branch rules. Triage dependency advisories before adding a blocking audit gate.

## Object backup destination

Use a **private Cloudflare R2 bucket in the EU jurisdiction** dedicated to Supabase Storage backups. Enable a 30-day retention lock, use a token scoped to this bucket, and keep that token only in a protected deployment secret store. Preserve object paths, keep the matching database backup for Storage metadata, encrypt in transit, and verify a restore of a sample object and a complete bucket inventory. Supabase database backups do not contain Storage file bytes. This destination has been selected but cannot be provisioned or tested until a Cloudflare account and the required limited credentials are available.

The [copy-and-verify script](../../scripts/backup-supabase-storage.ps1) is ready but unrun. Set up [Supabase Storage S3 access](https://supabase.com/docs/guides/storage/s3/authentication) in Storage → Configuration → S3; its key grants access to every bucket and must be kept server-side. Create the private [EU-jurisdiction R2 bucket](https://developers.cloudflare.com/r2/reference/data-location/) and a token limited to that bucket. Install [rclone](https://rclone.org/install/) and configure two session-only environment remotes: `CTSOURCE` with `TYPE=s3`, `PROVIDER=Other`, source access key/secret, project S3 endpoint, region, and path-style access; `CTR2` with `TYPE=s3`, `PROVIDER=Cloudflare`, bucket-scoped key/secret, and `https://<account-id>.eu.r2.cloudflarestorage.com` as endpoint. rclone maps each setting to `RCLONE_CONFIG_<REMOTE>_<SETTING>`; the script checks required names. Run `scripts/backup-supabase-storage.ps1` in a trusted PowerShell session. It copies every bucket into a timestamped R2 prefix, then downloads both sides into the checker stream to compare bytes. It never deletes either side. Keep its logs private because object paths can be personal data. Record the snapshot ID and test a restore into an isolated location. Do not put access keys in the repository or chat.

## Limits

Bucket MIME limits check declared types; they do not prove file content is benign. A quarantine and scanner worker, object restore drill, independent test, administrator MFA/access review, and the restricted incident decision remain open. Do not describe this release as a completed security plan until those checks have evidence.
