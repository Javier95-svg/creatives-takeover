# Production security verification

Run this after a reviewed release and keep the evidence in a restricted location.
The queries in `verify-production-lockdown.sql` only read state. They cannot
prove that a user is blocked by every policy, so finish with two ordinary test
accounts that own different files and credits.

1. Confirm the project reference, release SHA, and applied migration versions.
   Record a restorable database backup reference **and** a separate Storage
   object backup reference before applying any missing migration. A database
   backup covers Storage metadata, not the uploaded objects themselves.
2. Run `verify-production-lockdown.sql` in the Supabase SQL Editor. Review each
   policy and function overload; an empty result is not proof that a table or
   function is safe. Check the deployment log for errors after any migration.
3. With account A's session, try to update its credit balance, quota, and plan
   through the public API. Each write must be refused or leave the server-owned
   value unchanged. Try a legacy RPC with account B's user ID; it must be denied.
4. Upload a harmless private test file as account B. With account A, attempt
   to list B's bucket path, download its object, and create a signed URL for it.
   All three must fail. Confirm B can still access its own file. Remove the
   test object through the normal owner flow after recording the result.
5. Check the deployed Edge Function list and recent traffic for
   `create-payment`, `verify-payment`, `sprint-commitment-manager`,
   `request-payout`, `stripe-connect`, and `generate-article-image`. Compare
   Stripe payments to the credit ledger before retiring any payment endpoint.
6. In Supabase Auth, enable email confirmation and check delivery with a new
   ordinary account: before clicking its confirmation link, sign-in and a
   protected API call must fail; afterward they must succeed. Deploy the
   retired `signup-direct` response before relying on this result.
7. Record pass/fail, UTC timestamp, project, release SHA, test account IDs,
   reviewer, and private evidence links. Do not copy real user files or keys
   into the evidence record.
