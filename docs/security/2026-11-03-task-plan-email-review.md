# Daily task-plan email review — 2026-11-03

An example message sent at 07:00 used the `task_plan_digest` template. The source is the scheduled database function `dispatch_daily_task_plan_digests_v1`, which invokes `send-retention-email` through Resend. This is an application-generated message; the example alone does not show a Resend account takeover.

## Production evidence

- In the 24 hours checked, `retention_email_log` recorded 134 `task_plan_digest` sends, each with a Resend ID. The 07:00 UTC group included 122 sends.
- 133 of those 134 recipients had no `notification_preferences` row. The original function treated missing rows as both `task_reminders` and `retention_emails` enabled, so it sent a daily email without a distinct daily-email opt-in.
- All 134 logged CTA URLs used `www.creativestakeover.com`; the product site is `creatives-takeover.com`. A DNS lookup of the mistyped host failed during this review. Existing sent messages cannot be changed, and this check cannot establish whether recipients clicked them.
- The separate `routine_reminder` log showed repeated failed attempts, but those rows had no Resend ID. They do not explain the example message.

## Containment and verification

- Applied `20261103130000_task_plan_email_explicit_opt_in.sql` directly to production after a rollback-only dry run. It adds a dedicated `daily_task_plan_email_enabled` preference defaulting to false. The task-plan job still creates its in-app and push delivery records, but only sends email when an account explicitly enables the new preference and the existing retention-email flag is on.
- A read-only check confirmed the live dispatch function requires the new preference and uses `https://creatives-takeover.com/dashboard/tasks`. At verification time, no account had enabled the new preference.
- Deployed `send-retention-email` with an app-origin link check for all callers, including server jobs. The browser notification settings now show the dedicated daily-email toggle as off by default.

The SQL was applied directly, so its live effect is verified without asserting a migration-ledger entry. Confirm the next scheduled 07:00 runs create in-app notifications without new `task_plan_digest` Resend sends until a user opts in. Decide whether to send a correction to affected recipients; do not send one automatically as part of this change.
