# Account boundary checks — 2026-11-03

Project: `rcjlaybjnozqbsoxzboa`. These probes ran against production inside transactions that ended in `ROLLBACK`. They used two existing ordinary account IDs internally but returned no identities, balances, or filenames.

| Boundary | Result | Evidence |
|---|---|---|
| Credit reads | A signed-in role saw its own balance row and zero balance or transaction rows for another member. | `scripts/probe-account-credit-rls.sql` |
| Credit writes | Direct +1 updates to its own and another member's balance affected zero rows. The transaction rolled back. | `scripts/probe-account-credit-write-rls.sql` |
| Private file metadata | For both `cv-uploads` and `collaboration-files`, a signed-in role saw its own synthetic object metadata and zero rows for another member. Four synthetic rows were rolled back; no file bytes were created. | `scripts/probe-private-storage-rls.sql` |

The Storage probe checks database RLS, not the HTTP Storage API or existing legacy object paths. Existing CV objects have null `owner_id`, and no existing CV object path matched a current ordinary account ID in the path check. The collaboration bucket had no objects at the time of the check. A live API test with two disposable accounts is still needed before claiming every upload/download path is safe.

Before the role migration, production granted `anon` and `authenticated` direct write privileges on `public.user_roles`, but RLS had no write policy. Two admin helper functions and four policies still used the admin email. `20261103110000_admin_role_authority.sql` revokes the unnecessary grants and uses `user_roles` for those admin decisions. A rollback-only execution of the migration confirmed that the existing admin remains recognized, member insert/update grants become false, and zero email-based admin policies remain. The project listed a completed physical database backup from 2026-11-03 02:15 UTC. Storage file bytes are not changed by this migration.
