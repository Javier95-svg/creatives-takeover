// Runs the actual migration in an isolated PostgreSQL engine. Install
// @electric-sql/pglite separately and optionally set PGLITE_MODULE_PATH to its URL.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite');
const db = new PGlite();
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS
      $$ SELECT string_to_array($1, '/') $$;
    CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    CREATE TABLE storage.objects (id uuid DEFAULT gen_random_uuid(), bucket_id text, name text);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated;
    -- Deliberately permissive legacy policy: new guards must still protect photos.
    CREATE POLICY legacy_storage_access ON storage.objects FOR ALL USING (true) WITH CHECK (true);
    INSERT INTO auth.users VALUES ('${owner}'), ('${other}');
  `);
  const migration = await readFile(new URL('../supabase/migrations/20260923120000_profile_journey_posts.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  await db.exec(migration); // Safe to paste again.
  await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub = '${owner}';`);
  await db.exec(`
    INSERT INTO public.profile_posts(user_id, content, image_path, publish_at) VALUES
    ('${owner}', 'Already live', '${owner}/live.png', now() - interval '1 minute'),
    ('${owner}', 'Private launch', '${owner}/scheduled.png', now() + interval '1 day');
    INSERT INTO storage.objects(bucket_id, name) VALUES
    ('profile-posts', '${owner}/live.png'), ('profile-posts', '${owner}/scheduled.png');
  `);
  assert.equal((await db.query('SELECT * FROM public.profile_posts')).rows.length, 2);
  assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length, 2);
  await assert.rejects(db.exec(`INSERT INTO public.profile_posts(user_id, content) VALUES ('${other}', 'Spoofed')`));
  await assert.rejects(db.exec(`INSERT INTO public.profile_posts(user_id, content) VALUES ('${owner}', '  ')`));
  await assert.rejects(db.exec(`INSERT INTO public.profile_posts(user_id, content) VALUES ('${owner}', repeat('x',5001))`));
  await assert.rejects(db.exec(`INSERT INTO public.profile_posts(user_id, image_path) VALUES ('${owner}', '${other}/private.png')`));
  await db.exec(`SET request.jwt.claim.sub = '${other}';`);
  assert.deepEqual((await db.query('SELECT content FROM public.profile_posts')).rows, [{ content: 'Already live' }]);
  assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length, 1);
  assert.equal((await db.query('DELETE FROM public.profile_posts RETURNING id')).rows.length, 0);
  assert.equal((await db.query('DELETE FROM storage.objects RETURNING id')).rows.length, 0);
  assert.equal((await db.query("UPDATE storage.objects SET name = 'changed' RETURNING id")).rows.length, 0);
  await assert.rejects(db.exec(`INSERT INTO storage.objects(bucket_id, name) VALUES ('profile-posts', '${owner}/spoofed.png')`));
  await db.exec("RESET ROLE; SET ROLE anon; SET request.jwt.claim.sub = '';");
  assert.equal((await db.query('SELECT * FROM public.profile_posts')).rows.length, 1);
  assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length, 1);
  await assert.rejects(db.exec(`INSERT INTO public.profile_posts(user_id, content) VALUES ('${owner}', 'Anonymous')`));
  // Simulate reaching the release instant. No publishing job or author session.
  await db.exec("RESET ROLE; UPDATE public.profile_posts SET publish_at = now() - interval '1 second' WHERE content = 'Private launch'; SET ROLE anon;");
  assert.equal((await db.query('SELECT * FROM public.profile_posts')).rows.length, 2);
  assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length, 2);
  await db.exec(`RESET ROLE; SET ROLE authenticated; SET request.jwt.claim.sub = '${owner}';`);
  assert.equal((await db.query('DELETE FROM public.profile_posts RETURNING id')).rows.length, 2);
  assert.equal((await db.query('DELETE FROM storage.objects RETURNING id')).rows.length, 2);
  console.log('PASS: migration rerun, owner access, spoof prevention, content validation, visitor/anonymous privacy, image privacy, automatic release, cancellation/deletion.');
} finally { await db.close(); }
