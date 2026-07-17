# PMF Customer Discovery production release

## One-time controls

1. Create a protected GitHub environment named `production` and require a reviewer.
2. Add environment secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, and `SUPABASE_DB_PASSWORD`.
3. Set `SUPABASE_PROJECT_REF` to `rcjlaybjnozqbsoxzboa`.
4. In Supabase Edge Function secrets, configure `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `OPENAI_API_KEY`, and `POSTHOG_PROJECT_API_KEY`. `PERPLEXITY_API_KEY` is optional enrichment.
5. In PostHog, create alerts for any `DISCOVERY_REFUND_FAILED` event and a 15-minute Reddit authentication-failure rate above 5%.

Runtime secrets stay in Supabase. They must not be copied into GitHub or repository files.

## Release flow

After CI succeeds on `main`, the Supabase production workflow waits for approval, checks out the exact verified commit, previews and applies migrations, and deploys `pmf-customer-discovery`. Vercel deployment remains independent.

Approve only after reviewing the migration and Edge Function changes in the merged pull request. Failed CI must be fixed; do not bypass the workflow gate.

## Acceptance

- Use an authenticated QA founder with at least five credits.
- Run the admin source-health check and confirm Reddit is `available`.
- Confirm invalid authentication and no-match scans use zero credits.
- Confirm a valid scan stores threads and people, creates pipeline leads, charges exactly five credits, and emits one completed event.
- Replay the same idempotency key and confirm it uses zero additional credits.
- Confirm PostHog receives started, completed, failed, degraded, and health events without queries, post content, or usernames.

## Rollback

Redeploy `pmf-customer-discovery` from the previous known-good commit through a manually dispatched temporary rollback workflow or the Supabase Dashboard. Do not reverse the additive lead-pipeline migration; disable `pmf-discovery-search-v2` and `pmf-discovery-pipeline-v1` while the function is rolled back.
