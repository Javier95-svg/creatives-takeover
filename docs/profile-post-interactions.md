# Profile post interactions

Adds like, comment, repost, and share controls to published journey, photo, and
community posts on profiles. Scheduled posts have no interaction controls.
Community likes, comments, and reposts continue using their existing tables.

## Deployment

1. Apply `supabase/migrations/20260924100000_profile_post_interactions.sql` in the
   Supabase SQL editor against the existing platform database. The earlier profile
   journey-post migrations must already be installed. This migration is safe to
   rerun and does not rewrite existing posts or community interactions.
2. Apply `supabase/migrations/20260924110000_single_profile_pin.sql`. It preserves
   the newest legacy pinned community post and clears the retired legacy flags.
   Each owner can pin one of their own published journey, photo, or community
   posts. Replacing the pin is atomic; deleting the original removes its pin.
3. Deploy the frontend containing `ProfilePostActions.tsx` and the updated
   `ProfilePosts.tsx` and Supabase RPC types.
4. Verify with two accounts: like/unlike, add/delete your own comment, repost/undo,
   and open a shared link in another browser. Check an old photo and community
   post as well as a journey post. Scheduled posts must remain private.

No Edge Function, cron job, new route, or secret is required. This migration has
not been applied to production by the local implementation.

## Behavior and performance

- Like/repost feedback is optimistic; errors restore the previous state.
- Counts are fetched in batches of up to 200 visible cards and refreshed every
  30 seconds while the profile is active, plus after local interactions.
- Comments are fetched only when opened, 30 at a time. A comment author can
  remove their own comment. Retried submissions reuse an ID to avoid duplicates.
- Reposts appear on the reposter's profile with original author attribution.
- A single pinned post appears first in the profile feed, without duplication.
  All other cards follow their original posting date, newest first. The owner
  can pin/unpin using the pin icon; pinning another post replaces the current pin.
- Shared URLs use the existing profile route with a `post=source:id` query.
  They fetch a specific older post without loading all preceding feed pages.
- Share uses the device share sheet when available, otherwise copies the link.
  If clipboard permission is unavailable, a selectable link is displayed.
- Database access uses the caller's RLS permissions. Scheduled posts are
  explicitly excluded, and foreign keys clean up interactions on deletion.

## Local verification

- `node scripts/validate-profile-post-actions.cjs` exercises the React controls
  using the installed esbuild/jsdom dependencies and a mocked backend.
- `node scripts/validate-profile-post-interactions.cjs` exercises actual SQL in
  PGlite, including RLS, repeated migrations, idempotency, and privacy. Requires
  `@electric-sql/pglite` on the module path (`NODE_PATH` can point to a local install).
- `node --experimental-strip-types --test tests/profile-posts.test.ts` covers
  the existing publishing behavior.
