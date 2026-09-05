import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { PGlite } from '../.cache/retention-db/node_modules/@electric-sql/pglite/dist/index.js';

const db = new PGlite();
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$SELECT COALESCE(nullif(current_setting('request.jwt.claim.role',true),''),'authenticated')$$;
    CREATE TABLE public.profiles(id uuid PRIMARY KEY,last_activity_at timestamptz,last_seen_at timestamptz,last_active_at timestamptz,allow_retention boolean DEFAULT true,allow_routine boolean DEFAULT true);
    CREATE TABLE public.mentors(user_id uuid);
    CREATE FUNCTION public.notif_pref_enabled(p_user uuid,p_key text) RETURNS boolean LANGUAGE sql AS $$ SELECT CASE WHEN p_key='routine_reminders' THEN allow_routine ELSE allow_retention END FROM public.profiles WHERE id=p_user $$;
    CREATE TABLE public.retention_email_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users(id),email text,sequence text,sent_at timestamptz DEFAULT now(),unsubscribed boolean DEFAULT false,resend_id text,opened_at timestamptz,clicked_at timestamptz);
  `);
  const old = readFileSync(new URL('../supabase/migrations/20260810140000_retention_email_quality.sql', import.meta.url), 'utf8');
  await db.exec(old.slice(0, old.indexOf('-- Restore preference enforcement')));
  await db.exec(readFileSync(new URL('../supabase/migrations/20260904120000_personalized_retention.sql', import.meta.url), 'utf8'));
  const pasteSql = readFileSync(new URL('../docs/personalized-retention-apply.sql', import.meta.url), 'utf8');
  await db.exec(pasteSql);
  await db.exec(pasteSql);
  assert.equal((await db.query('SELECT enabled FROM retention_roadmap_settings')).rows[0].enabled, false);
  console.log('PASS copyable SQL bundle applies twice and leaves delivery disabled');
  const user = '11111111-1111-4111-8111-111111111111';
  await db.query('INSERT INTO auth.users VALUES ($1,$2)', [user, 'founder@example.com']);
  await db.query('INSERT INTO profiles(id) VALUES ($1)', [user]);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [user]);
  const claim = async (sequence = 'activation_nudge') => (await db.query('SELECT * FROM claim_inactive_retention_email($1,$2,$3)', [user, 'founder@example.com', sequence])).rows[0];
  const state = async () => (await db.query('SELECT * FROM retention_campaign_state WHERE user_id=$1', [user])).rows[0];
  const finish = async id => db.query("SELECT finalize_inactive_retention_email($1,'roadmap_quiz_only_s0_b0',2,'/icp-builder','provider')", [id]);
  const reset = async () => db.exec('DELETE FROM retention_campaign_state; DELETE FROM retention_email_log; UPDATE profiles SET allow_retention=true,allow_routine=true,last_activity_at=NULL,last_seen_at=NULL,last_active_at=NULL;');

  assert.equal((await claim()).claim_status, 'campaign_disabled');
  await db.exec('UPDATE retention_roadmap_settings SET enabled=true');
  const claims = await Promise.all([claim(), claim('routine_reminder')]);
  assert.deepEqual(claims.map(row => row.claim_status), ['claimed', 'claim_in_progress']);
  await db.query("SELECT fail_inactive_retention_email($1,'provider_rejected')", [claims[0].claimed_log_id]);
  const retry = await claim();
  assert.equal(retry.claimed_touch_index, 1);
  await finish(retry.claimed_log_id);
  assert.equal((await state()).touch_index, 1);
  assert.equal((await claim('reengagement_30d')).claim_status, 'campaign_sent_recently');
  await db.query("SELECT record_roadmap_activity('/icp-builder')");
  assert.equal((await state()).touch_index, 0);
  assert.equal((await claim()).claim_status, 'campaign_sent_recently');
  console.log('PASS duplicate claims, failure retry, cross-trigger cap, and organic reset');

  await reset();
  await db.query("INSERT INTO retention_email_log(user_id,email,sequence,sent_at) VALUES($1,'x','value_day3',now()-interval '1 day')", [user]);
  assert.equal((await claim()).claim_status, 'sequence_sent_recently');
  await reset();
  await db.exec('UPDATE profiles SET allow_retention=false');
  assert.equal((await claim('routine_reminder')).claim_status, 'preference_disabled');
  await db.exec('UPDATE profiles SET allow_retention=true,allow_routine=false');
  assert.equal((await claim('routine_reminder')).claim_status, 'preference_disabled');
  await reset();
  await db.query("INSERT INTO retention_email_log(user_id,email,sequence,unsubscribed) VALUES($1,'x','old',true)", [user]);
  assert.equal((await claim()).claim_status, 'unsubscribed');
  await reset();
  await db.query("INSERT INTO retention_email_log(user_id,email,sequence,complained_at) VALUES($1,'x','old',now())", [user]);
  assert.equal((await claim()).claim_status, 'delivery_suppressed');
  console.log('PASS legacy send cap, preferences, unsubscribe, and complaint suppression');

  await reset();
  await db.query("INSERT INTO retention_campaign_state(user_id,campaign_key,touch_index,last_sent_at,paused_until) VALUES($1,'inactive_return',3,now()-interval '10 days',now()+interval '50 days')", [user]);
  assert.equal((await claim()).claim_status, 'campaign_paused');
  await db.exec("UPDATE retention_campaign_state SET paused_until=now()-interval '1 day',last_sent_at=now()-interval '61 days'");
  const finalTouch = await claim();
  assert.equal(finalTouch.claimed_touch_index, 4);
  await finish(finalTouch.claimed_log_id);
  assert.equal((await claim()).claim_status, 'campaign_exhausted');
  console.log('PASS pause, final fourth touch, and campaign exhaustion');

  await reset();
  await db.exec('BEGIN'); // Freeze now() for exact boundary assertions.
  const log = (await db.query("INSERT INTO retention_email_log(user_id,email,sequence,campaign_key,delivery_status,segment,experiment_phase,experiment_version,subject_variant,body_variant,sent_at) VALUES($1,'x','activation_nudge','inactive_return','sent','quiz_only','subject',1,0,0,now()-interval '48 hours') RETURNING id", [user])).rows[0];
  await db.query("UPDATE retention_email_log SET opened_at=sent_at+interval '1 hour',clicked_at=sent_at+interval '2 hours' WHERE id=$1", [log.id]);
  await db.query("UPDATE retention_email_log SET opened_at=sent_at+interval '49 hours',clicked_at=sent_at+interval '50 hours' WHERE id=$1", [log.id]);
  await db.query("SELECT record_roadmap_activity('/icp-builder',NULL,NULL,NULL,NULL,$1)", [log.id]);
  await db.query("SELECT record_roadmap_activity('/icp-builder',NULL,NULL,NULL,NULL,$1)", [log.id]);
  const report = (await db.query('SELECT * FROM retention_roadmap_report')).rows[0];
  for (const field of ['mature_sends','opens_48h','clicks_48h','reactivations_48h','cta_returns_48h']) assert.equal(Number(report[field]), 1, field);
  assert.equal(Number(report.organic_returns_48h), 0);
  await db.query("INSERT INTO retention_email_log(user_id,email,sequence,campaign_key,delivery_status,segment,sent_at) VALUES($1,'x','activation_nudge','inactive_return','sent','dormant',now()-interval '48 hours 1 second'),($1,'x','activation_nudge','inactive_return','sent','unfinished_tool',now()-interval '1 hour')", [user]);
  await db.query("SELECT record_roadmap_activity('/dashboard')");
  const dormant = (await db.query("SELECT * FROM retention_roadmap_report WHERE segment='dormant'")).rows[0];
  const immature = (await db.query("SELECT * FROM retention_roadmap_report WHERE segment='unfinished_tool'")).rows[0];
  assert.equal(Number(dormant.reactivations_48h), 0);
  assert.equal(Number(immature.mature_sends), 0);
  assert.equal(immature.reactivation_rate_pct, null);
  await db.exec('COMMIT');
  console.log('PASS exact 48 hour cutoff, duplicate events, and immature denominator');

  await reset();
  const pending = await claim();
  await db.query("SELECT record_roadmap_activity('/dashboard')");
  assert.equal((await state()).pending_log_id, pending.claimed_log_id);
  console.log('PASS return preserves in-flight claim');
} finally {
  await db.close();
}
