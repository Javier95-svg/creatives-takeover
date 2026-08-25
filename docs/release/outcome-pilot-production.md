# Outcome pilot production release

This pilot must not be released through an automatic `supabase db push`. The production workflow is manual and requires a backup reference, a schema/ledger reconciliation record, and the exact reviewed migration set.

## Reconcile before applying

1. Create or verify a production point-in-time backup and record its reference.
2. Capture `supabase migration list --linked` and a `supabase db dump --linked --schema public` from the same release window.
3. Compare the live relations, columns, constraints, policies, functions, and triggers with each repository migration in chronological order.
4. Classify every ledger difference as applied and structurally proven, pending, or divergent. Repair a migration-ledger entry only when the complete migration state is proven in the live schema.
5. Never mass-mark migrations, overwrite the remote migration table, or infer that a migration ran because one similarly named table exists.
6. Put the backup reference and reconciliation record into the manual GitHub release inputs. List only migrations reviewed against that record.

## Release gates

Run the workflow once with `apply_reviewed_migrations=false`. Review the captured live ledger, schema dump, dry-run, and lint output. A second manual run may set the apply input to true.

After apply, the workflow calls `get_outcome_journey_release_health_v1` to verify the journey tables/RPCs, private-bucket state, RLS policies, First Customer/Traction triggers, and public Demo Studio/waitlist proof-loop triggers. It then calls the service-role-only `market-provider-health` function with a controlled query. Provider failure keeps market conclusions disabled; it does not disable the evidence sprint.

The workflow records `pilotFlagsEnabled: false`. Enable the cohort flag only after the schema health and provider-health artifacts have been reviewed and an authenticated founder smoke test passes:

- application → admin invitation → sprint start;
- 10 attached prospects and 10 manually recorded sends;
- buyer event → redacted proof → admin approval;
- distinct repeat experiment opens in Traction;
- a second comparable cycle updates the canonical Repeat outcome;
- Demo Studio event and waitlist signup still reach their proof-loop triggers.

If any smoke test fails, leave the flag off. Restore application code normally; use the recorded backup and verified reconciliation notes for any database recovery decision rather than editing migration history speculatively.
