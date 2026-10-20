import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('account numbers are unique, permanent and public without exposing a private stage', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE TABLE public.profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), username text,
        assigned_stage integer, user_preferences jsonb DEFAULT '{}'
      );
      CREATE VIEW public.public_profiles AS SELECT id, username,
        CASE WHEN user_preferences->>'public_stage_visible' = 'true' THEN assigned_stage END AS assigned_stage
      FROM public.profiles;
      INSERT INTO public.profiles (username, assigned_stage, user_preferences)
      VALUES ('private', 6, '{}'), ('public', 3, '{"public_stage_visible":true}');
    `);
    const sql = await readFile(new URL('../supabase/migrations/20261022220000_permanent_founder_numbers.sql', import.meta.url), 'utf8');
    await db.exec(sql);
    const initial = (await db.query('SELECT * FROM public.public_profiles ORDER BY username')).rows;
    assert.equal(new Set(initial.map((row) => row.founder_number)).size, 2);
    assert.equal(initial[0].assigned_stage, null);
    assert.equal(initial[1].assigned_stage, 3);
    const supplied = initial[0].founder_number;
    const inserted = (await db.query("INSERT INTO public.profiles (username, founder_number) VALUES ('new', $1) RETURNING id, founder_number", [supplied])).rows[0];
    assert.notEqual(inserted.founder_number, supplied, 'client cannot choose its number');
    await assert.rejects(db.query('UPDATE public.profiles SET founder_number = 999999 WHERE id = $1', [inserted.id]), /cannot be changed/);
    await db.query("UPDATE public.profiles SET username = 'renamed' WHERE id = $1", [inserted.id]);
    assert.equal((await db.query('SELECT founder_number FROM public.profiles WHERE id = $1', [inserted.id])).rows[0].founder_number, inserted.founder_number);
    await db.query('DELETE FROM public.profiles WHERE id = $1', [inserted.id]);
    const next = (await db.query("INSERT INTO public.profiles (username) VALUES ('another') RETURNING founder_number")).rows[0].founder_number;
    assert.ok(next > inserted.founder_number, 'deleted numbers are not recycled');
    await db.exec(sql);
    assert.equal((await db.query("SELECT founder_number FROM public.profiles WHERE username = 'another'")).rows[0].founder_number, next, 'reapplying migration preserves assigned numbers');
  } finally {
    await db.close();
  }
});
