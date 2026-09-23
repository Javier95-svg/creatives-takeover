// Run with @electric-sql/pglite installed, or exposed through NODE_PATH.
const { PGlite } = require('@electric-sql/pglite');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const assert = require('node:assert/strict');

async function main() {
  const db = new PGlite();
  const alice = '10000000-0000-0000-0000-000000000001';
  const bob = '10000000-0000-0000-0000-000000000002';
  const journey = '20000000-0000-0000-0000-000000000001';
  const scheduled = '20000000-0000-0000-0000-000000000002';
  const photo = '20000000-0000-0000-0000-000000000003';
  const community = '20000000-0000-0000-0000-000000000004';
  const comment = '30000000-0000-0000-0000-000000000001';
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    INSERT INTO auth.users VALUES ('${alice}'), ('${bob}');
    CREATE TABLE public.public_profiles(id uuid, full_name text, username text, avatar_url text);
    INSERT INTO public_profiles VALUES ('${alice}', 'Alice', 'alice', null), ('${bob}', 'Bob', 'bob', null);
    CREATE TABLE profile_posts(id uuid PRIMARY KEY, user_id uuid, content text, image_path text, publish_at timestamptz);
    CREATE TABLE user_photos(id uuid PRIMARY KEY, user_id uuid, caption text, image_url text, created_at timestamptz DEFAULT now());
    CREATE TABLE community_posts(id uuid PRIMARY KEY, user_id uuid, content text, title text, created_at timestamptz DEFAULT now(), is_pinned boolean DEFAULT false);
    CREATE TABLE user_votes(user_id uuid, post_id uuid REFERENCES community_posts(id), vote_type text, UNIQUE(user_id, post_id));
    CREATE TABLE post_reposts(user_id uuid, post_id uuid REFERENCES community_posts(id), created_at timestamptz DEFAULT now(), UNIQUE(user_id, post_id));
    CREATE TABLE post_comments(id uuid PRIMARY KEY, user_id uuid, post_id uuid REFERENCES community_posts(id), content text, created_at timestamptz DEFAULT now());
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
    GRANT INSERT, UPDATE, DELETE ON user_votes, post_reposts, post_comments TO authenticated;
    ALTER TABLE profile_posts ENABLE ROW LEVEL SECURITY;
    CREATE POLICY read_posts ON profile_posts FOR SELECT USING (publish_at <= now() OR user_id = auth.uid());
    INSERT INTO profile_posts VALUES ('${journey}', '${alice}', 'Published', null, now() - interval '1 hour'), ('${scheduled}', '${alice}', 'Secret', 'private.jpg', now() + interval '1 day');
    INSERT INTO user_photos(id, user_id, caption, image_url) VALUES ('${photo}', '${alice}', 'Photo', 'photo.jpg');
    INSERT INTO community_posts(id, user_id, content, title, is_pinned) VALUES ('${community}', '${alice}', 'Existing community post', 'Title', true);
    INSERT INTO user_votes VALUES ('${alice}', '${community}', 'up');
  `);
  await db.exec(readFileSync(join(__dirname, '../supabase/migrations/20260924100000_profile_post_interactions.sql'), 'utf8'));
  await db.exec(readFileSync(join(__dirname, '../supabase/migrations/20260924100000_profile_post_interactions.sql'), 'utf8'));
  const pinMigration = readFileSync(join(__dirname, '../supabase/migrations/20260924110000_single_profile_pin.sql'), 'utf8');
  await db.exec(pinMigration);
  await db.exec(pinMigration);
  async function asUser(id) { await db.exec(`RESET ROLE; SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${id}', false);`); }
  async function metrics(source, id) {
    const result = await db.query('SELECT profile_post_metrics($1::jsonb) AS result', [JSON.stringify([{ source, id }])]);
    return result.rows[0].result;
  }
  async function reaction(source, id, kind, active) {
    await db.query('SELECT set_profile_post_reaction($1, $2, $3, $4)', [source, id, kind, active]);
  }
  async function pin(source, id, active = true) {
    await db.query('SELECT set_profile_pinned_post($1,$2,$3)', [source, id, active]);
  }
  async function pinned() {
    return (await db.query('SELECT get_profile_pinned_post($1) AS result', [alice])).rows[0].result;
  }
  await asUser(alice);
  assert.equal((await pinned()).id, community, 'preserves the legacy pinned post');
  await pin('community', community, false);
  await db.exec('RESET ROLE');
  await db.exec(pinMigration);
  await asUser(alice);
  assert.equal(await pinned(), null, 'rerunning migration does not resurrect an unpinned legacy post');
  await pin('journey', journey);
  await pin('photo', photo);
  await pin('photo', photo);
  assert.equal((await pinned()).id, photo, 'new pin atomically replaces the previous one');
  assert.equal((await db.query('SELECT count(*) AS count FROM profile_post_pins WHERE user_id = $1', [alice])).rows[0].count, 1);
  await assert.rejects(pin('journey', scheduled), 'scheduled posts cannot be pinned');
  await asUser(bob);
  await assert.rejects(pin('photo', photo), 'another account cannot pin an original they do not own');
  await assert.rejects(db.query('UPDATE profile_post_pins SET user_id = $1 WHERE user_id = $2 RETURNING *', [bob, alice]).then((result) => { if (!result.rows.length) throw new Error('No access'); }));
  await pin('photo', photo, false);
  assert.equal((await pinned()).id, photo, 'another account cannot remove the owner pin');
  await asUser(alice);
  await pin('journey', journey);
  await pin('photo', photo, false);
  assert.equal((await pinned()).id, journey, 'a stale unpin request cannot clear a replacement pin');
  await db.exec('RESET ROLE; SET ROLE anon;');
  assert.equal((await pinned()).id, journey, 'visitors can see the published pin');
  await assert.rejects(pin('journey', journey), 'visitors cannot pin');
  await asUser(bob);
  for (const [source, id] of [['journey', journey], ['photo', photo], ['community', community]]) {
    await reaction(source, id, 'like', true);
    await reaction(source, id, 'like', true);
    assert.equal((await metrics(source, id))[0].likes, source === 'community' ? 2 : 1, 'likes are idempotent and preserve community votes');
    await reaction(source, id, 'repost', true);
    await reaction(source, id, 'repost', true);
    assert.equal((await metrics(source, id))[0].reposts, 1);
    await reaction(source, id, 'like', false);
    assert.equal((await metrics(source, id))[0].liked, false);
  }
  let reposts = await db.query('SELECT list_profile_reposts($1) AS result', [bob]);
  assert.equal(reposts.rows[0].result.length, 3);
  assert.equal(reposts.rows[0].result[0].author_name, 'Alice');
  await reaction('photo', photo, 'repost', false);
  reposts = await db.query('SELECT list_profile_reposts($1) AS result', [bob]);
  assert.equal(reposts.rows[0].result.length, 2);
  assert.deepEqual(await metrics('journey', scheduled), []);
  await assert.rejects(reaction('journey', scheduled, 'like', true));
  await asUser(alice);
  await assert.rejects(reaction('journey', scheduled, 'like', true), 'even the author cannot interact before publication');
  await asUser(bob);
  await assert.rejects(db.query('INSERT INTO profile_post_reactions(journey_id, user_id, kind) VALUES ($1, $2, $3)', [journey, alice, 'like']), 'cannot impersonate another account');
  await assert.rejects(db.query('INSERT INTO profile_post_reactions(journey_id, user_id, kind) VALUES ($1, $2, $3)', [scheduled, bob, 'like']), 'direct inserts also protect scheduled posts');
  await db.query('SELECT add_profile_post_comment($1,$2,$3,$4)', ['journey', journey, 'Useful update!', comment]);
  await db.query('SELECT add_profile_post_comment($1,$2,$3,$4)', ['journey', journey, 'Useful update!', comment]);
  assert.equal((await metrics('journey', journey))[0].comments, 1, 'comment retries are idempotent');
  await assert.rejects(db.query('SELECT add_profile_post_comment($1,$2,$3,$4)', ['journey', journey, ' ', comment]));
  await assert.rejects(db.query('SELECT add_profile_post_comment($1,$2,$3,$4)', ['journey', journey, 'x'.repeat(2001), comment]));
  const comments = await db.query('SELECT list_profile_post_comments($1,$2) AS result', ['journey', journey]);
  assert.equal(comments.rows[0].result[0].name, 'Bob');
  await asUser(alice);
  await db.query('SELECT delete_profile_post_comment($1,$2)', ['journey', comment]);
  assert.equal((await metrics('journey', journey))[0].comments, 1, 'only the comment author can delete it');
  await asUser(bob);
  await db.query('SELECT delete_profile_post_comment($1,$2)', ['journey', comment]);
  assert.equal((await metrics('journey', journey))[0].comments, 0);
  await db.exec('RESET ROLE; SET ROLE anon;');
  assert.equal((await metrics('community', community))[0].likes, 1);
  await assert.rejects(reaction('journey', journey, 'like', true), 'anonymous mutations are rejected');
  const hidden = await db.query('SELECT get_profile_shared_post($1,$2) AS result', ['journey', scheduled]);
  assert.equal(hidden.rows[0].result, null, 'shared links cannot expose scheduled posts');
  const shared = await db.query('SELECT get_profile_shared_post($1,$2) AS result', ['journey', journey]);
  assert.equal(shared.rows[0].result.content, 'Published');
  await db.exec(`RESET ROLE; DELETE FROM profile_posts WHERE id = '${journey}';`);
  assert.equal(await pinned(), null, 'deleting the original clears its pin');
  assert.equal((await db.query('SELECT count(*) AS count FROM profile_post_reactions WHERE journey_id = $1', [journey])).rows[0].count, 0, 'deleting original posts cleans up reactions');
  await db.close();
  console.log('PASS: likes, undo, repost feed, legacy community counts, comment retries, permissions, scheduled privacy, shared links, cascade cleanup, single pin, pin replacement, unpin, legacy pin migration');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
