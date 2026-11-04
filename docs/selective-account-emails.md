# Selective account email release

## Current behavior

- **Essential / requested:** password and account security (`change-password`, `send-password-reset`, `delete-account`), account invitation/application, payment emails handled by the payment flow, booking confirmations (`notify-discovery-call-event`, `process-discovery-call-notifications`), and a requested artifact (`demo-try-resume-email`, `request-icp-draft-email`, `pmf-outcome-request`). Contact and application notifications to staff (`contact-form-submission`, `notify-admin`, `notify-job-application`, `demo-studio-lead`) remain operational.
- **Activity alerts:** direct messages, connection requests, Rooms replies, listing enquiries, investor matches, task emails, and routine emails require the respective preference to be explicitly true at delivery. The in-app notification channels remain available. Booking confirmation is independent of optional activity email choices.
- **Daily plan:** `send-retention-email` accepts `task_plan_digest` only for founders/builders with the dedicated daily switch on and a real ready plan. The database dispatcher uses that same switch. This is separate from the 14-day engagement cap.
- **Engagement:** `send-stage-guidance` requires an explicit, timestamped choice, a founder/builder account with quiz-assigned stage 1–7, and an unfinished task whose recommendation key matches the stage. `claim_account_engagement_email` serializes the 14-day cap across stage guidance and any future product update. Only the worker can claim; ordinary members cannot.
- **Paused:** old `email-sequences`, `send-welcome-email`, `churn-reactivation-service`, `reactivation-campaign`, `process-demo-try-drip`, `process-icp-guest-drip`, and `send-article-notification-email` do not send. The four active generic campaign schedules were unscheduled. `send-retention-email` also skips all old generic lifecycle, progress, routine, and win-back sequences. Product updates remain paused until a useful, scoped campaign uses the shared claim.

## Stage actions and sample subjects

| Assigned stage | Task match | Subject |
|---|---|---|
| 1 Identity | `stage:IDENTITY:%` | A clear next step for your idea |
| 2 Prototyping | `stage:PROTOTYPE:%` | One prototype step worth finishing |
| 3 Validation | `stage:VALIDATING:%` | Your next customer validation step |
| 4 Building | `stage:BUILDING:%` | Your next build step |
| 5 Launch | `stage:LAUNCH:%` | One launch task to finish |
| 6 Traction | `stage:TRACTION:%` | Your next traction experiment |
| 7 Fundraise | `stage:FUNDRAISING:%` | One fundraising preparation step |

Each message displays the actual unfinished task and opens its same-site route. There is no substitute action when the stage or task is missing. The link to account notification settings lets the recipient switch guidance off.

## Production verification on 2026-11-03

- Existing preference rows: 3. Stage guidance opt-ins: 0. Daily plan opt-ins: 0. Other optional email opt-ins: 0. Missing preference rows return false for email; booking's default remains true.
- No-send stage preview: 0 considered, 0 eligible, 0 sent. No Resend request occurred.
- `scripts/verify-selective-email-rollback.sql` passed on the linked database. It checks no consent, a valid consent claim, a second claim blocked, opt-out blocked, member RPC denied, and booking default. Test writes rolled back.
- `email-sequence-daily`, `churn-reactivation-weekly`, `process-demo-try-drip-daily`, and `process-icp-sprint-emails-daily` no longer exist in `cron.job`. The daily-plan and stage-guidance schedules remain.
- Migrations `20261103140000`, `20261103141000`, `20261103142000`, `20261103143000`, and `20261103144000` were applied to the linked project and recorded as applied in the migration ledger. Earlier migrations were applied outside this release; check their ledger before using `supabase db push`.
- **Open production gap:** `resend-webhook` returned HTTP 503 to an unsigned probe on 2026-11-03. The function uses that response when `RESEND_WEBHOOK_SECRET` is absent or invalid. Until the secret is corrected, provider complaints and bounces will not flow into the database; check them in Resend directly.

## Monitoring

The stage worker returns aggregate counts by skip reason and stores Resend acceptance IDs in `account_engagement_email_claims`. A successful finish also inserts the ID into `retention_email_log` so the verified `resend-webhook` records complaints and bounces. Check daily for pending claims, provider failures, sends per account, complaints, and unsubscribes. Pending claims need a manual Resend reconciliation before retry because provider acceptance may have succeeded while the worker lost the response. A sample no-send preview can be invoked with a service-role request body `{ "preview": true }`.

No live email was sent as part of verification. A two-account booking/message delivery exercise and a real first opt-in send still require suitable test accounts and should be checked after the website deployment.
