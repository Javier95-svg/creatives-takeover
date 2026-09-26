import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const migration = name => readFileSync(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), 'utf8');
const owner = '11111111-1111-4111-8111-111111111111';
const project = '22222222-2222-4222-8222-222222222222';

test('real catalog SQL filters publication state, searches metadata, and reflects unpublishing immediately', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE TABLE stories_articles(id uuid DEFAULT gen_random_uuid(),title text,slug text,excerpt text,hashtags text[],status text,published_at timestamptz,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
      CREATE TABLE podcast_episodes(id uuid DEFAULT gen_random_uuid(),title text,description text,hashtags text[],is_published boolean,guest_name text,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
      CREATE TABLE services(id uuid DEFAULT gen_random_uuid(),name text,slug text,description text,category text,delivered_by_name text,is_active boolean,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
      INSERT INTO stories_articles(title,slug,excerpt,status) VALUES ('Pricing evidence','pricing','Customer interviews','published'),('Private pricing','draft','Pricing','draft');
      INSERT INTO podcast_episodes(title,description,is_published) VALUES ('Pricing talk','Willingness to pay',true),('Unreleased pricing','Secret',false);
      INSERT INTO services(name,slug,description,is_active) VALUES ('Pricing research','research','Pricing interviews',true),('Closed pricing','closed','Private',false);`);
    await db.exec(migration('20260926121000_pulse_content_search'));
    const result = await db.query("SELECT * FROM search_pulse_catalog('pricing',ARRAY['article','podcast','service'],9)");
    assert.equal(result.rows.length, 3);
    assert.deepEqual(new Set(result.rows.map(row => row.kind)), new Set(['article','podcast','service']));
    assert.doesNotMatch(JSON.stringify(result.rows), /Private|Unreleased|Closed/);
    assert.equal((await db.query("SELECT * FROM search_pulse_catalog('interviews',ARRAY['article'],3)")).rows.length, 1);
    assert.equal((await db.query("SELECT * FROM search_pulse_catalog('unicorn',ARRAY['article'],3)")).rows.length, 0);
    await db.exec("UPDATE stories_articles SET status='draft'");
    assert.equal((await db.query("SELECT * FROM search_pulse_catalog('',ARRAY['article'],3)")).rows.length, 0);
    await db.exec('SET ROLE anon');
    await assert.rejects(db.query("SELECT * FROM search_pulse_catalog('')"), /permission denied/);
  } finally { await db.close(); }
});

test('real scope migration rejects foreign projects and prevents reassigning history', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE projects(id uuid PRIMARY KEY,user_id uuid,archived_at timestamptz);
      CREATE TABLE chatbot_conversations(id uuid DEFAULT gen_random_uuid(),user_id uuid,session_id uuid DEFAULT gen_random_uuid(),purpose text,business_context jsonb,created_at timestamptz DEFAULT now());
      INSERT INTO projects VALUES('${project}','${owner}',null);`);
    await db.exec(migration('20260926120000_pulse_project_scope'));
    await db.exec('CREATE TRIGGER guard_pulse_home_scope BEFORE UPDATE ON chatbot_conversations FOR EACH ROW EXECUTE FUNCTION guard_pulse_home_scope()');
    const insert = (userId, scope) => db.query("INSERT INTO chatbot_conversations(user_id,purpose,business_context) VALUES($1,'pulse_home',$2)", [userId, { pulseScope: scope }]);
    const scope = { version: 1, userType: 'founder', projectId: project };
    await insert(owner, scope);
    await assert.rejects(insert('33333333-3333-4333-8333-333333333333', scope), /unavailable/);
    await assert.rejects(insert(owner, { ...scope, userType: 'investor' }), /account scope/);
    await assert.rejects(db.exec("UPDATE chatbot_conversations SET business_context='{}'"), /immutable/);
    await db.exec(`UPDATE projects SET archived_at=now() WHERE id='${project}'`);
    await assert.rejects(insert(owner, scope), /unavailable/);
    await insert(owner, { version: 1, userType: 'mentor', projectId: null });
  } finally { await db.close(); }
});
