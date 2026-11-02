# Security hardening, November 2026

Audit on 2026-11-01. Phase 0 fixes shipped 2026-11-02. This file tracks:

- what changed;
- the SQL still to run, and in what order;
- the incident facts;
- what is still open.

## What was exploitable, and what closes it

| Hole | Fixed by | Live? |
|---|---|---|
| Any member could set their own credit balance and quota | `20261102100000_security_lockdown.sql` (drops the write policies; trigger keeps billing columns on `profiles`) | After SQL A |
| 194 database functions callable by anyone with the anon key, 26 of them writing credits or rewards for any user id | Same file: deny by default, an allowlist of 177 names built from what the app calls, plus `*_mine` versions of the 7 the browser calls | After SQL A |
| Any signed-in member could list and download every stored file (CVs, pitch decks, evidence) | Same file: bucket-less policies dropped, 5 buckets made private, owner/admin read policies | After SQL A |
| Mentor records and site images writable by any member | Same file: admin-only writes | After SQL A |
| Session theft through `creatives-takeover.com/api/published-site?slug=` | `api/published-site.ts`, `middleware.ts` (commit 197a32ee) | Yes |
| Phishing subdomains (`login.`, `billing.`, ...) | `src/lib/reservedSubdomains.ts`, used when serving and publishing | Yes |
| Edge functions acting for any user id, mailing anyone, or spending our AI keys | `supabase/functions/_shared/guards.ts` in 40 functions, deployed 2026-11-02 | Yes |
| `supabase-integration` sending a customer's service key to any URL containing `<ref>.supabase.co` | Anchored check; only `https://<ref>.supabase.co` is contacted | Yes |
| `fetch-linkedin-metadata` fetching any URL | LinkedIn https URLs only, redirects checked, per-IP limit | Yes |
| `rag-ingest` open because `RAG_INGEST_KEY` is unset | Fails closed: ingest key, our own jobs, or an admin | Yes |
| `create-mentor-booking-checkout` trusting price and payout from the browser | Deleted (live and repo) | Yes |

### How edge functions decide who is calling

`_shared/guards.ts`:

- `requireUser`: the member from the session token.
- `requireAdmin`: that member must also pass `is_admin_user_id`.
- `requireWorker`: our own server. It accepts any of:
  - this runtime's service key;
  - `x-cron-secret`;
  - the service-role JWT the database jobs send from `private.service_config`. That token is a different string from the runtime key, so its role claim is confirmed with the auth server first.
- `requireMemberOrWorker` / `requireAdminOrWorker`: the two combinations.
- `rateLimit`: `assert_rate_limit`. It fails closed: if the limiter is unreachable, the call is refused.

A function that acts for someone must use one of these, and must never take a user id from the request body. `tests/security-hardening.test.ts` lists the functions that must import the guards.

## SQL to run, in this order

1. **Now: `supabase/migrations/20261102100000_security_lockdown.sql` (SQL A).** It covers credits, functions, storage, mentors, and the abused account reset. It creates the `*_mine` functions. The app already calls them, and falls back to the old functions until they exist (`src/lib/callerRpc.ts`).
2. **Now: `supabase/migrations/20261102102000_cron_jobs_send_service_key.sql` (SQL C).** Six cron jobs start sending the service key from `private.service_config`. Then deploy the five functions waiting on it:

   ```
   npx supabase functions deploy rss-article-fetcher trends-analyzer task-reminder-service churn-reactivation-service demo-studio-webhook-retry --project-ref rcjlaybjnozqbsoxzboa --use-api --no-verify-jwt
   ```

   `demo-studio-webhook-retry` has been answering 401 every 5 minutes: `CRON_SECRET` is set, but its job never sent the header. SQL C fixes that too.
3. **About a day after the app release is live: `supabase/migrations/20261102101000_close_legacy_user_id_rpcs.sql` (SQL B).** It closes the 7 old user-id functions to the browser. After it runs, delete the fallback in `src/lib/callerRpc.ts`.

After each step, watch the following:

- PostgREST `42501` (permission denied) errors in the API logs. Each one is a function the allowlist missed; grant just that one.
- Edge 401/403 rates on the cron functions.

## Incident note

- **Abused account `8bcc515e-c6f1-4b4a-917a-ee9b7f71299b`.**
  - Not an admin; created 2026-03-04.
  - Balance 69,697,969 credits, while its ledger shows only the 25-credit signup grant.
  - The balance was written straight into `user_credits`, almost certainly through the open update policy, some time before 2026-06-04.
  - SQL A resets it to 25 and records the reset in `credit_transactions`.
  - Whether to suspend the account is Javier's call. Nothing is deleted.
- **Three other accounts carry a paid tier with no subscription** (2 pro, 1 rising). Confirm whether these are comps.
- **Private files.** Until SQL A, any signed-in member could list and download every stored object, including 44 CVs, private pitch decks and journey evidence.
  - Storage logs only go back about a day, so past access cannot be ruled out or confirmed.
  - Under GDPR the 72-hour assessment clock started when this was found (2026-11-01). Javier decides whether to notify users.
- **Not abused.** No credit purchases or sprint payouts went through the unaudited live-only payment functions (ledger checked 2026-11-02).

## Live functions that are not in the repo

Fifteen deployed functions have no source in this repo. Their live source is saved under `docs/security/live-only-edge-functions/`. None is called by the app, and none received a request in the 24 hours before 2026-11-02.

**Recommended for deletion** (pending Javier's confirmation):

| Function | Risk |
|---|---|
| `create-payment` + `verify-payment` | The browser chooses both the credit count and the price, so anyone can pay 50 cents for any number of credits |
| `sprint-commitment-manager` | Returns the stake plus a 10% bonus on a self-reported result; credits can be farmed |
| `request-payout`, `stripe-connect` | Payout code for a table that no longer exists |
| `generate-article-image` | No sign-in; spends the OpenAI key |
| `clever-processor`, `smooth-action`, `smooth-endpoint` | Dashboard hello-world stubs |

**Check with Javier before touching:** `bizmap-cofounder-chat`, `fundraising-readiness-analyzer-v2`, `core-connections`, `validation-sessions`, `mvp-workflow-tests` and `mvp-managed-app` (called by `trigger_mvp_setup_jobs`). Each checks the caller, but the source should be brought into the repo.

## Known issues found along the way (not security)

- `send-retention-email` answers 503 to many calls in the hourly burst. This happens before any function code runs, and was already happening before these changes. Spreading the hourly sends out would fix it.
- `rss-article-fetcher`: most feeds fail (`DOMParser is not defined` in Deno, plus 404s).

## Still open (Phase 1 and 2 of the plan)

- **Signup:** require email confirmation; retire the pre-confirmed `signup-direct` path.
- **Admin identity:** check `user_roles` instead of the admin email in the client, about 50 policies, and several functions.
- **Webhooks:**
  - `stripe-webhook` should throw when its secret is missing;
  - verify Svix signatures on `resend-webhook` and `resend-email-events`, or delete them (memory: never called).
- **SSRF:** run `public-url-guard` on Demo Studio and waitlist webhook URLs and on the OG image fetch.
- **Client:**
  - `normalizePostUrl` on mentor, angel, waitlist and demo CTA links;
  - `postMessage` origin checks;
  - clear per-user caches on sign-out;
  - redact `token`/`code` in analytics URLs.
- **Dependencies:** react-router, dompurify, pdfjs-dist (`isEvalSupported: false`), jspdf and fabric; add `npm audit` to CI.
- **Headers:**
  - pin `connect-src` to the project host;
  - tighten the `/mvp-builder` CSP;
  - add COOP.
- **Javier, in dashboards:**
  - Supabase: leaked-password protection, OTP expiry ≤ 1 h, MFA for admins, Postgres upgrade.
  - GitHub: branch protection and required reviewers on `production`.
- **CI and repo:**
  - pin actions to SHAs;
  - untrack `.claude/settings.local.json`;
  - gate `/rag-test`, `/test-phase1` and `/prototypes/*`.
- **Phase 2:**
  - nightly advisor and SQL checks in CI;
  - alerts on balance vs ledger, AI call spikes, email volume and new admins;
  - an admin audit log;
  - no PII in edge logs;
  - a key-rotation runbook;
  - an external pentest.
