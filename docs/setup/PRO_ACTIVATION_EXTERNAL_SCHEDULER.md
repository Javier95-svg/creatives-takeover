# Pro Activation External Scheduler

This repo uses a GitHub Actions scheduled workflow to process the Pro activation outbox without relying on Postgres `app.settings.*` values.

## What It Does

The workflow calls the Supabase Edge Function endpoint every 5 minutes:

- `https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/process-pro-activation-outbox`

That worker claims queued rows from `public.pro_activation_outbox` and delivers the onboarding webhook with retry/backoff handling.

## Required GitHub Secrets

Add these repository secrets in GitHub:

- `SUPABASE_SERVICE_ROLE_KEY`
- `PRO_ACTIVATION_WORKER_SECRET`

Use the same `PRO_ACTIVATION_WORKER_SECRET` value that is already configured in the deployed Supabase Edge Function.

## Where To Configure It

GitHub repository settings:

- Settings -> Secrets and variables -> Actions -> New repository secret

## Manual Run

You can run the workflow immediately from GitHub:

- Actions -> `Process Pro Activation Outbox` -> `Run workflow`

## Schedule Notes

GitHub Actions cron runs at a minimum interval of 5 minutes. That is the main tradeoff versus a dedicated cron service.

If you need sub-5-minute delivery, use a dedicated external scheduler and send the same request shape with the same two secrets.