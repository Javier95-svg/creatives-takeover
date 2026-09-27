import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
function rpc(name, migration) {
  const sql = readFileSync(new URL(`../supabase/migrations/${migration}.sql`, import.meta.url), 'utf8');
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  assert.ok(start >= 0);
  return sql.slice(start, sql.indexOf('$function$;', sql.indexOf('AS $function$', start)) + '$function$;'.length);
}

test('actual booking/contact RPCs enforce caller ownership without direct table access', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE authenticated; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
      CREATE TABLE profiles(id uuid,full_name text,username text,avatar_url text);
      CREATE TABLE mentors(id text,user_id uuid);
      CREATE TABLE discovery_calls(id uuid DEFAULT gen_random_uuid(),mentor_id text,founder_id uuid,status text,scheduled_for timestamptz,created_at timestamptz DEFAULT now(),service_id text);
      CREATE TABLE discovery_call_scheduling_rounds(id uuid,discovery_call_id uuid,status text,responder_role text,response_due_at timestamptz,created_at timestamptz);
      CREATE TABLE discovery_call_scheduling_slots(id uuid,round_id uuid,starts_at timestamptz,duration_minutes integer,proposed_timezone text,ordinal integer);
      CREATE TABLE mentor_saves(mentor_id text,user_id uuid,created_at timestamptz);
      CREATE TABLE social_interaction_events(actor_user_id uuid,counterparty_user_id uuid,occurred_at timestamptz,interaction_type text);
      INSERT INTO profiles VALUES('${owner}','Owner','owner',null),('${other}','Other','other',null);
      INSERT INTO mentors VALUES('mine','${owner}'),('theirs','${other}');
      INSERT INTO discovery_calls(mentor_id,founder_id,status) VALUES('mine','${other}','pending'),('theirs','${owner}','PRIVATE_OTHER_BOOKING');
      INSERT INTO social_interaction_events VALUES('${other}','${owner}',now(),'contact'),('${owner}','${other}',now(),'PRIVATE_OTHER_CONTACT');`);
    await db.exec(rpc('mentor_bookings', '20260920180000_close_per_type_gaps'));
    await db.exec(rpc('mentor_interest', '20260920140000_per_type_features'));
    await db.exec(`GRANT EXECUTE ON FUNCTION mentor_bookings(integer),mentor_interest(integer) TO authenticated;
      SELECT set_config('request.jwt.claim.sub','${owner}',false); SET ROLE authenticated;`);
    await assert.rejects(db.query('SELECT * FROM discovery_calls'), /permission denied/);
    const bookings = (await db.query('SELECT mentor_bookings(10) result')).rows[0].result;
    const interest = (await db.query('SELECT mentor_interest(10) result')).rows[0].result;
    assert.equal(bookings.length, 1); assert.equal(bookings[0].status, 'pending');
    assert.equal(interest.contacts.length, 1); assert.equal(interest.contacts[0].interaction, 'contact');
    assert.doesNotMatch(JSON.stringify({ bookings, interest }), /PRIVATE_OTHER/);
    await db.exec("SELECT set_config('request.jwt.claim.sub','',false)");
    assert.deepEqual((await db.query('SELECT mentor_bookings(10) result')).rows[0].result, []);
    assert.deepEqual((await db.query('SELECT mentor_interest(10) result')).rows[0].result.contacts, []);
  } finally { await db.close(); }
});
