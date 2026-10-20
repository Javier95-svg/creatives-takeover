import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('gallery migration preserves legacy images, limits four, and protects private attachments', async () => {
  const db = new PGlite();
  const owner = '11111111-1111-4111-8111-111111111111';
  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
      CREATE SCHEMA storage;
      CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array($1, '/') $$;
      CREATE TABLE storage.objects (name text, bucket_id text);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      CREATE TABLE public.profile_posts (
        id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        user_id uuid NOT NULL, content text NOT NULL DEFAULT '', image_path text,
        publish_at timestamptz NOT NULL DEFAULT now(),
        CHECK (length(btrim(content)) > 0 OR image_path IS NOT NULL)
      );
      ALTER TABLE public.profile_posts ENABLE ROW LEVEL SECURITY;
      CREATE POLICY visible_posts ON public.profile_posts FOR SELECT USING (publish_at <= now());
      GRANT USAGE ON SCHEMA public, storage, auth TO anon;
      GRANT SELECT ON public.profile_posts, storage.objects TO anon;
      INSERT INTO public.profile_posts(user_id, image_path) VALUES ('${owner}', '${owner}/legacy.jpg');
    `);
    const migration = await readFile(new URL('../supabase/migrations/20261022180000_profile_post_image_gallery.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    assert.deepEqual((await db.query('SELECT image_paths FROM public.profile_posts WHERE id = 1')).rows[0].image_paths, [`${owner}/legacy.jpg`]);

    const paths = [1, 2, 3, 4].map((i) => `${owner}/${i}.jpg`);
    await db.query('INSERT INTO public.profile_posts(user_id, image_paths) VALUES ($1, $2)', [owner, paths]);
    const saved = (await db.query('SELECT image_path,image_paths FROM public.profile_posts WHERE id = 2')).rows[0];
    assert.equal(saved.image_path, paths[0]);
    assert.deepEqual(saved.image_paths, paths);
    await assert.rejects(db.query('INSERT INTO public.profile_posts(user_id,content,image_paths) VALUES ($1,$2,$3)', [owner, 'too many', [...paths, `${owner}/5.jpg`]]), /up to four/);
    await assert.rejects(db.query('INSERT INTO public.profile_posts(user_id,content,image_paths) VALUES ($1,$2,$3)', [owner, 'wrong owner', ['another-user/image.jpg']]), /belong to their author/);

    await db.query('UPDATE public.profile_posts SET image_paths = $1 WHERE id = 2', [paths.slice(1)]);
    assert.equal((await db.query('SELECT image_path FROM public.profile_posts WHERE id = 2')).rows[0].image_path, paths[1]);
    await db.query('INSERT INTO public.profile_posts(user_id, image_paths, publish_at) VALUES ($1,$2,now()+interval \'1 day\')', [owner, [`${owner}/scheduled.jpg`]]);
    for (const path of [...paths, `${owner}/scheduled.jpg`]) await db.query('INSERT INTO storage.objects VALUES ($1,$2)', [path, 'profile-posts']);
    await db.exec('SET ROLE anon');
    const publicImages = (await db.query("SELECT name FROM storage.objects WHERE bucket_id = 'profile-posts' ORDER BY name")).rows.map((row) => row.name);
    assert.deepEqual(publicImages, paths.slice(1));
  } finally { await db.close(); }
});
