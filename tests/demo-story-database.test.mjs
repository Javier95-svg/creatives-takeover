import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const migration = readFileSync(new URL('../supabase/migrations/20261013120000_claim_guest_demo_story.sql', import.meta.url), 'utf8');
const owner = '10000000-0000-0000-0000-000000000001';
const other = '10000000-0000-0000-0000-000000000002';
const draft = { kind: 'demo_story', v: 1, productName: 'Scheduling', description: 'Schedule hairdresser appointments', pitch: 'Keep your appointments organized.',
  brief: { audience: 'Hairdressers', problem: 'Missed appointments', product_promise: 'Easier scheduling', aha_moment: 'See the next appointment' },
  steps: ['Problem', 'Product action', 'Outcome'].map(title => ({ title, caption: title, speaker_notes: title, hotspot_label: 'Next', suggested_action: 'next' })) };

async function fixture() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TABLE profiles(id uuid PRIMARY KEY REFERENCES auth.users(id), user_type text DEFAULT 'founder', user_preferences jsonb DEFAULT '{}', updated_at timestamptz);
    CREATE TABLE guest_activation_artifacts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), artifact_type text, deep_payload jsonb,
      expires_at timestamptz DEFAULT now()+interval '7 days', claimed_by uuid, claim_state text DEFAULT 'unclaimed',
      native_artifact_id text, claimed_at timestamptz, updated_at timestamptz);
    CREATE TABLE demo_studio_projects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid REFERENCES auth.users(id), name text, tagline text);
    CREATE TABLE demo_studio_briefs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid UNIQUE REFERENCES demo_studio_projects(id), owner_id uuid,
      audience text, problem text, product_promise text, aha_moment text, primary_cta_label text, ai_storyboard jsonb, ai_launch_copy jsonb);
    INSERT INTO auth.users VALUES ('${owner}'),('${other}'); INSERT INTO profiles(id) VALUES ('${owner}'),('${other}');`);
  await db.exec(migration);
  await db.exec(migration);
  const id = (await db.query('INSERT INTO guest_activation_artifacts(artifact_type,deep_payload) VALUES($1,$2) RETURNING id', ['demo', JSON.stringify(draft)])).rows[0].id;
  return { db, id };
}
const claim = (db, id, user = owner) => db.query('SELECT claim_guest_demo_story($1,$2) AS id', [id, user]);

test('repeated and simultaneous claim requests create one owned project and preserve exact story', async () => {
  const { db, id } = await fixture();
  try {
    const results = await Promise.all([claim(db, id), claim(db, id)]);
    assert.equal(results[0].rows[0].id, results[1].rows[0].id);
    const rows = (await db.query('SELECT * FROM demo_studio_briefs')).rows;
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0].ai_storyboard, draft.steps);
    assert.equal(rows[0].ai_launch_copy.subheadline, draft.pitch);
    const profile = (await db.query('SELECT user_preferences FROM profiles WHERE id=$1', [owner])).rows[0];
    assert.equal(profile.user_preferences.firstArtifactType, 'demo_studio_draft');
    await assert.rejects(claim(db, id, other), /ALREADY_CLAIMED/);
    assert.equal((await db.query('SELECT count(*)::int n FROM demo_studio_projects')).rows[0].n, 1);
  } finally { await db.close(); }
});

test('expired, image-backed, and incomplete-profile claims roll back without creating projects', async () => {
  const { db, id } = await fixture();
  try {
    await db.query("UPDATE guest_activation_artifacts SET expires_at=now()-interval '1 second' WHERE id=$1", [id]);
    await assert.rejects(claim(db, id), /NOT_FOUND/);
    await db.query("UPDATE guest_activation_artifacts SET expires_at=now()+interval '7 days', deep_payload='{" + '"v":2,"assetMode":"uploaded_screenshots"' + "}' WHERE id=$1", [id]);
    await assert.rejects(claim(db, id), /INVALID_DEMO_STORY/);
    await db.query('UPDATE guest_activation_artifacts SET deep_payload=$1 WHERE id=$2', [JSON.stringify(draft), id]);
    await db.query('DELETE FROM profiles WHERE id=$1', [owner]);
    await assert.rejects(claim(db, id), /PROFILE_NOT_READY/);
    assert.equal((await db.query('SELECT count(*)::int n FROM demo_studio_projects')).rows[0].n, 0);
    assert.equal((await db.query('SELECT claim_state FROM guest_activation_artifacts')).rows[0].claim_state, 'unclaimed');
  } finally { await db.close(); }
});

test('service-only conversion preserves existing account role and first-value preferences', async () => {
  const { db, id } = await fixture();
  try {
    await db.query("UPDATE profiles SET user_type='mentor',user_preferences=$1 WHERE id=$2", [JSON.stringify({ firstArtifactType: 'mentor_message', firstArtifactId: 'conversation', custom: true }), owner]);
    await db.exec('SET ROLE authenticated');
    await assert.rejects(claim(db, id), /permission denied/);
    await db.exec('RESET ROLE');
    await claim(db, id);
    const row = (await db.query('SELECT * FROM profiles WHERE id=$1', [owner])).rows[0];
    assert.equal(row.user_type, 'mentor');
    assert.deepEqual(row.user_preferences, { firstArtifactType: 'mentor_message', firstArtifactId: 'conversation', custom: true });
  } finally { await db.close(); }
});
