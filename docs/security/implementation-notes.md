# Security implementation status, 2 November 2026

This branch starts at `bc4ff91`. It is a separate worktree from the uncommitted
security changes in the main checkout. Nothing here has been deployed.

## Prepared in this branch

- Retired the `signup-direct` service-role endpoint with an unconditional 410.
  Browser email signup now calls Supabase Auth directly, and both signup screens
  tell people to confirm their email when no session exists. Production Auth
  must have email confirmation enabled before this is considered closed.
- Added read-only SQL and two-account validation steps for the production
  database, Storage and function-grant lockdown. No production query has run.
- Added an incident assessment record with known facts and explicit unknowns.
  Javier still owns the ICO and affected-person notification decisions.
- Added a full-history secret-scanning workflow for future PRs, pushes, weekly
  runs and manual runs. It disables artifact uploads and PR comments so a
  finding is not copied into a public artifact or comment.
- Added weekly Dependabot update proposals for npm packages and GitHub Actions,
  with small PR limits for a small team. This does not replace manual review.
- Prepared fail-closed replacements for three saved live-only endpoints:
  `create-payment`, `verify-payment`, and `sprint-commitment-manager`. The
  committed application has no callers, but production traffic and Stripe
  reconciliation must be checked before deployment. The replacements have not
  been deployed or merged into `main`.

## Evidence still needed before production actions

- Supabase migration ledger, current policies, function grants, buckets,
  project backups, Auth email-confirmation settings, function deployments and
  traffic. Check that a *separate* file-object backup exists; database backups
  do not contain Storage objects.
- Stripe checkout sessions and payment ledger reconciliation for the legacy
  payment functions. Do not remove a live payment URL until its callers and
  recent use are checked.
- Incident first-awareness time, available logs, potentially affected users,
  containment evidence and Javier's recorded risk/notification decisions.
- GitHub secret and dependency alerts, branch protection, environment review
  rules and current workflow run results. The repository ruleset API returned
  no rulesets; branch protection access returned 403.
- Vercel deployment and environment access settings, effective headers and a
  restore test for database and file objects.

An npm registry audit of the baseline lockfile on 2 November reported **2
critical, 26 high, 8 moderate and 2 low** dependency advisories. This is a
package advisory count, not a claim that those paths are exploitable in the
application. Package updates require triage and compatibility testing; the
main checkout already contains uncommitted lockfile work by Claude.
