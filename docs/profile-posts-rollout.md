# Profile journey posts

Run `supabase/migrations/20260923120000_profile_journey_posts.sql` in the
Supabase SQL Editor. The migration can be run again safely. It creates the posts
table, a private photo bucket, and access policies; it does not change existing
photos or community posts.

The profile composer supports text (up to 5,000 characters), one photo (JPG, PNG,
WebP or GIF, up to 5 MB), emojis and scheduled publication. The date/time picker
uses the browser's time zone and stores the timestamp in UTC. The owner can view
and cancel scheduled posts.

Publication is enforced by `publish_at <= now()` in PostgreSQL access policies.
Future posts and their photos are readable only by their owner. At the scheduled
time they become publicly readable without an open browser or a publishing job.
An already-open profile refreshes every 30 seconds. New profile posts appear on
the author's profile; existing community posts retain their conversation links.

Before the migration is applied, existing content remains readable and the
composer shows a temporary-unavailability message. It becomes available on the
next refresh after the migration succeeds.

Validation:

- `node --experimental-strip-types --test tests/profile-posts.test.ts`
- `npx playwright test e2e/profile-journey-posts.spec.ts`
- `node scripts/verify-profile-posts.mjs` with `@electric-sql/pglite` installed
  separately, or `PGLITE_MODULE_PATH` set to its module URL. This executes the
  migration twice in an isolated PostgreSQL engine and checks owner/visitor
  permissions, scheduled-photo privacy, publication and deletion.
