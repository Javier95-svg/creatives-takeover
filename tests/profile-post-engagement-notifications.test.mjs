import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const owner = '11111111-1111-4111-8111-111111111111';
const actor = '22222222-2222-4222-8222-222222222222';
const post = '33333333-3333-4333-8333-333333333333';
const roomPost = '44444444-4444-4444-8444-444444444444';
const photo = '55555555-5555-4555-8555-555555555555';

test('profile engagement rings the author bell once per toggle and links to the post', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE SCHEMA auth;
      CREATE TABLE public.profiles (id uuid PRIMARY KEY, username text, full_name text);
      CREATE TABLE public.profile_posts (id uuid PRIMARY KEY, user_id uuid, content text, publish_at timestamptz);
      CREATE TABLE public.user_photos (id uuid PRIMARY KEY, user_id uuid, caption text);
      CREATE TABLE public.profile_post_reactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), journey_id uuid, photo_id uuid, user_id uuid, kind text);
      CREATE TABLE public.profile_post_comments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), journey_id uuid, photo_id uuid, user_id uuid, content text);
      CREATE TABLE public.community_notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, actor_id uuid, notification_type text, post_id uuid, comment_id uuid, read boolean, metadata jsonb);
      CREATE TABLE public.community_posts (id uuid PRIMARY KEY, user_id uuid, title text, content text);
      CREATE TABLE public.post_comments (id uuid PRIMARY KEY, post_id uuid, user_id uuid, content text);
      CREATE TABLE public.user_votes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid, user_id uuid, vote_type text);
      CREATE TABLE public.post_reposts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid, user_id uuid);
      CREATE FUNCTION public.create_community_notification(p_user_id uuid, p_actor_id uuid, p_notification_type text, p_post_id uuid, p_comment_id uuid, p_metadata jsonb)
      RETURNS void LANGUAGE plpgsql AS $$ BEGIN
        IF p_user_id <> p_actor_id THEN
          INSERT INTO public.community_notifications (user_id, actor_id, notification_type, post_id, comment_id, read, metadata)
          VALUES (p_user_id, p_actor_id, p_notification_type, p_post_id, p_comment_id, false, p_metadata);
        END IF;
      END $$;
    `);
    const migration = await readFile(new URL('../supabase/migrations/20261022210000_profile_post_engagement_notifications.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    await db.query('INSERT INTO public.profiles VALUES ($1, $2, $3), ($4, $5, $6)', [owner, 'founder', 'Founder', actor, 'liker', 'Liker']);
    await db.query('INSERT INTO public.profile_posts VALUES ($1, $2, $3, now())', [post, owner, 'A project milestone worth sharing']);
    await db.query("INSERT INTO public.profile_post_reactions (journey_id, user_id, kind) VALUES ($1, $2, 'like'), ($1, $2, 'repost')", [post, actor]);
    await db.query("INSERT INTO public.profile_post_comments (journey_id, user_id, content) VALUES ($1, $2, 'Great work')", [post, actor]);
    const alerts = await db.query("SELECT notification_type, metadata FROM public.community_notifications WHERE user_id = $1 ORDER BY notification_type", [owner]);
    assert.deepEqual(alerts.rows.map((row) => row.notification_type), ['comment', 'like', 'repost']);
    assert.equal(alerts.rows[1].metadata.route, `/profile/founder?post=journey:${post}`);
    assert.equal(alerts.rows[1].metadata.post_preview, 'A project milestone worth sharing');
    assert.match(alerts.rows[1].metadata.message, /Liker liked your post/);

    await db.query("INSERT INTO public.profile_post_reactions (journey_id, user_id, kind) VALUES ($1, $2, 'like')", [post, actor]);
    await db.query("INSERT INTO public.profile_post_comments (journey_id, user_id, content) VALUES ($1, $2, 'Another thought')", [post, actor]);
    await db.query("INSERT INTO public.profile_post_reactions (journey_id, user_id, kind) VALUES ($1, $2, 'like')", [post, owner]);
    const afterRepeat = await db.query('SELECT notification_type FROM public.community_notifications WHERE user_id = $1', [owner]);
    assert.equal(afterRepeat.rows.length, 4, 'a second comment alerts, but a repeated like or self-like does not');

    await db.query('DELETE FROM public.profile_posts WHERE id = $1', [post]);
    const afterDelete = await db.query('SELECT id FROM public.community_notifications WHERE user_id = $1', [owner]);
    assert.equal(afterDelete.rows.length, 0, 'removed posts leave no dead bell links');

    await db.query('INSERT INTO public.user_photos VALUES ($1, $2, $3)', [photo, owner, 'Our launch photo']);
    await db.query("INSERT INTO public.profile_post_reactions (photo_id, user_id, kind) VALUES ($1, $2, 'like')", [photo, actor]);
    const photoAlert = await db.query("SELECT metadata FROM public.community_notifications WHERE metadata->>'profile_post_id' = $1", [photo]);
    assert.equal(photoAlert.rows[0].metadata.route, `/profile/founder?post=photo:${photo}`);
    assert.equal(photoAlert.rows[0].metadata.post_preview, 'Our launch photo');

    await db.query('INSERT INTO public.community_posts VALUES ($1, $2, $3, $4)', [roomPost, owner, 'A Rooms idea', 'Body']);
    await db.query("CREATE TRIGGER on_post_comment_created AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.notify_post_comment()");
    await db.query('CREATE TRIGGER on_post_reposted AFTER INSERT ON public.post_reposts FOR EACH ROW EXECUTE FUNCTION public.notify_post_repost()');
    await db.query('INSERT INTO public.post_comments VALUES (gen_random_uuid(), $1, $2, $3)', [roomPost, actor, 'Interesting']);
    await db.query("INSERT INTO public.user_votes (post_id, user_id, vote_type) VALUES ($1, $2, 'up')", [roomPost, actor]);
    await db.query('INSERT INTO public.post_reposts (post_id, user_id) VALUES ($1, $2)', [roomPost, actor]);
    const roomsAlert = await db.query("SELECT metadata FROM public.community_notifications WHERE post_id = $1", [roomPost]);
    assert.equal(roomsAlert.rows.length, 3);
    assert.equal(roomsAlert.rows[0].metadata.route, `/rooms/posts/${roomPost}`);
    assert.equal(roomsAlert.rows[0].metadata.post_preview, 'A Rooms idea');
  } finally {
    await db.close();
  }
});
