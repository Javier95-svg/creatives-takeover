# Dashboard social recommendations deployment

Deploy in this order:

1. Apply `supabase/migrations/20260815120000_dashboard_social_interactions.sql`.
2. Deploy `rank-dashboard-actions`.
3. Deploy `credit-service` and `credit-quote` because their shared credit catalog now makes in-app service messages free.
4. Create the PostHog boolean flag `dashboard-social-recommendations` and release it to 10%, then 50%, then 100%. Hold each cohort for at least seven days.

The migration creates the server-authoritative interaction ledger, backfills the latest 90 days, installs idempotent capture triggers, and adds `get_dashboard_snapshot_v3`. It preserves historical credit transactions. External service-provider email access remains paid.

Monitor completed social interactions per active user per week, unique people contacted, Dashboard recommendation completion, replies received, message failures, and block/report rate. Stop expansion if block/report rate rises more than 0.2 percentage points against control.
