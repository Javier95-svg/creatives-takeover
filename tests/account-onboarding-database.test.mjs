import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const sql = name => readFileSync(new URL(`../supabase/migrations/${name}.sql`,import.meta.url),'utf8');
const user='10000000-0000-0000-0000-000000000001';
const admin='10000000-0000-0000-0000-000000000099';
const session='20000000-0000-0000-0000-000000000001';
const mentor={expertise:['Pricing','Go to market'],stages:['Validation'],experience:'Built a profitable service business',engagement:'both'};
const provider={services:['Landing pages'],category:'marketing',idealCustomer:'Early founders',portfolio:'Example portfolio',capacity:'available'};
const investor={sectors:['FinTech'],stages:['Seed'],geography:'Global',activity:'actively_investing'};

async function fixture() {
  const db=new PGlite();
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE ROLE supabase_admin;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION public.is_admin_user() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT auth.uid()='${admin}'::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
    CREATE TABLE profiles(id uuid PRIMARY KEY, user_type text DEFAULT 'founder', founder_segment text,
      approval_status text DEFAULT 'approved',role_profile jsonb DEFAULT '{}',full_name text,username text,avatar_url text,
      startup_name text,startup_description text,startup_industry text[],country text,
      onboarding_completed boolean,quiz_completed boolean,quiz_completed_at timestamptz,
      user_preferences jsonb DEFAULT '{}',business_stage text,quiz_current_stage text,quiz_biggest_challenge text,
      current_focus text,assigned_stage integer,quiz_answers_v2 jsonb,routine_primary_goal text,routine_config jsonb,updated_at timestamptz,
      CHECK(user_type IN ('founder','builder','mentor','marketplace','investor')),
      CHECK(approval_status IN ('pending','approved','rejected')),
      CHECK(user_type NOT IN ('founder','builder') OR approval_status='approved'));
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY own_profile ON profiles TO authenticated USING(id=auth.uid()) WITH CHECK(id=auth.uid());
    GRANT SELECT,INSERT,UPDATE ON profiles TO authenticated;
    CREATE TABLE onboarding_sessions(id uuid PRIMARY KEY,user_id uuid,answers jsonb DEFAULT '{}',derived_context jsonb,
      status text DEFAULT 'in_progress',flow_version text DEFAULT 'adaptive_v1',rollout_variant text DEFAULT 'adaptive_v1',
      current_step int DEFAULT 0,completed_at timestamptz,abandoned_at timestamptz,started_at timestamptz DEFAULT now(),
      plan_snapshot text,device_snapshot text);
    CREATE TABLE projects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,title text,idea_summary text,status text,
      archived_at timestamptz,created_at timestamptz DEFAULT now(),updated_at timestamptz,last_run_at timestamptz);
    CREATE TABLE mentors(user_id uuid,expertise text[]); CREATE TABLE services(delivered_by_user_id uuid,name text,category text,is_active boolean);
    CREATE TABLE daily_tasks(user_id uuid,task_text text,task_source text,is_completed boolean);
    CREATE TABLE user_activity_log(created_at timestamptz DEFAULT now(),user_id uuid,activity_type text,activity_data jsonb,page_path text,
      source_tool text,source_entity_type text,source_entity_id text,event_key text,UNIQUE(user_id,event_key));
    CREATE TABLE account_applications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,user_type text,
      status text DEFAULT 'pending',full_name text,email text,submitted_at timestamptz DEFAULT now(),reviewed_at timestamptz,
      reviewed_by uuid,decision_note text,updated_at timestamptz);
    CREATE UNIQUE INDEX account_applications_one_pending ON account_applications(user_id) WHERE status='pending';
    GRANT INSERT,UPDATE ON account_applications TO authenticated;
    CREATE TABLE email_queue(application_id uuid,kind text,UNIQUE(application_id,kind));
    CREATE FUNCTION queue_account_application_email(uuid,text) RETURNS void LANGUAGE sql AS $$ INSERT INTO email_queue VALUES($1,$2) ON CONFLICT DO NOTHING $$;
    CREATE FUNCTION submit_account_application(text,text,text,jsonb) RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$;
    CREATE FUNCTION is_service_provider(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM profiles WHERE id=$1 AND user_type IN ('mentor','marketplace','investor')) $$;
  `);
  const ensure=sql('20260917180000_outcomes_claim_project_slot');
  await db.exec(ensure.slice(ensure.indexOf('CREATE OR REPLACE FUNCTION public.ensure_active_project'),ensure.indexOf('COMMENT ON FUNCTION')));
  for(const name of ['20260925160000_account_onboarding_integrity','20260925161000_onboarding_classification_and_project','20260925162000_investor_matching_preferences','20260925163000_onboarding_drafts_and_reconciliation']) await db.exec(sql(name));
  await db.exec(`INSERT INTO auth.users VALUES('${user}','test@example.invalid'),('${admin}','admin@example.invalid');
    INSERT INTO profiles(id) VALUES('${user}'),('${admin}'); INSERT INTO onboarding_sessions(id,user_id) VALUES('${session}','${user}');`);
  return db;
}
async function asUser(db,id=user) { await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${id}',false); SET ROLE authenticated;`); }
async function owner(db) {await db.exec('RESET ROLE');}
async function submit(db,type,details) {return db.query('SELECT submit_account_application($1,$2,$3,$4::jsonb,$5::uuid) result',[type,'Test','untrusted@example.invalid',JSON.stringify(details),session]);}

test('database blocks direct approval/type changes and forged application insertion',async()=>{
  const db=await fixture(); try {
    await asUser(db);
    await assert.rejects(db.exec(`UPDATE profiles SET user_type='mentor',approval_status='approved' WHERE id='${user}'`),/classification/);
    await assert.rejects(db.exec(`UPDATE profiles SET approval_status='rejected' WHERE id='${user}'`),/classification/);
    await assert.rejects(db.exec(`INSERT INTO account_applications(user_id,user_type,status) VALUES('${user}','mentor','approved')`),/permission denied/);
    await db.exec(`UPDATE profiles SET full_name='Still editable' WHERE id='${user}'`);
    await assert.rejects(submit(db,'mentor',{}),/Missing/);
    await assert.rejects(submit(db,'mentor',{...mentor,unexpected:'data'}),/Unknown/);
    await assert.rejects(submit(db,'investor',{...investor,sectors:['made up']}),/Invalid option/);
    await assert.rejects(db.query('SELECT review_account_application($1,$2)',[session,'approved']),/administrator/);
  } finally {await db.close();}
});

for(const [type,details] of Object.entries({mentor,marketplace:provider,investor})) test(`${type}: complete, retry, review snapshot and approval`,async()=>{
  const db=await fixture();try{
    await asUser(db); const first=(await submit(db,type,details)).rows[0].result;
    const retry=(await submit(db,type,details)).rows[0].result;
    assert.equal(first.applicationId,retry.applicationId);
    await assert.rejects(submit(db,type,{...details,[Object.keys(details)[0]]:['Changed']}),/already pending|Invalid option/);
    await owner(db);
    assert.equal((await db.query('SELECT count(*)::int n FROM account_applications')).rows[0].n,1);
    assert.equal((await db.query('SELECT status FROM onboarding_sessions')).rows[0].status,'completed');
    assert.equal((await db.query('SELECT email FROM account_applications')).rows[0].email,'test@example.invalid');
    await asUser(db,admin);
    const listed=(await db.query('SELECT list_account_applications() result')).rows[0].result;
    assert.deepEqual(listed[0].roleProfile,details);
    await db.query('SELECT review_account_application($1,$2)',[first.applicationId,'approved']);
    await db.query('SELECT review_account_application($1,$2)',[first.applicationId,'approved']);
    await owner(db);
    assert.equal((await db.query('SELECT approval_status FROM profiles WHERE id=$1',[user])).rows[0].approval_status,'approved');
    assert.equal((await db.query('SELECT count(*)::int n FROM email_queue')).rows[0].n,1);
  }finally{await db.close();}
});

test('rejection can be corrected and resubmitted; stale role decisions fail',async()=>{
  const db=await fixture();try{
    await asUser(db);const id=(await submit(db,'mentor',mentor)).rows[0].result.applicationId;
    await asUser(db,admin);await db.query('SELECT review_account_application($1,$2)',[id,'rejected']);
    await asUser(db);const next=(await submit(db,'mentor',{...mentor,experience:'Updated relevant experience'})).rows[0].result.applicationId;
    assert.notEqual(next,id);
    await owner(db);await db.exec(`UPDATE profiles SET user_type='investor' WHERE id='${user}'`);
    await asUser(db,admin);await assert.rejects(db.query('SELECT review_account_application($1,$2)',[next,'approved']),/no longer matches/);
  }finally{await db.close();}
});

for(const type of ['founder','builder']) test(`${type}: canonical type, project, consent and retry persistence`,async()=>{
  const db=await fixture();try{
    await asUser(db);
    const answers={founderSegment:type,projectName:type==='builder'?'':'Test venture',startupBrief:'We help small businesses understand their customers.',businessModel:'service',evidenceState:'none',primaryGoal:'validate_problem',blocker:'customer_clarity',weeklyCapacityHours:5,selectedIntent:'find_mentor',investorVisible:true,investmentStage:'Seed'};
    const call=()=>db.query('SELECT complete_onboarding_v1($1,$2::jsonb,$3::jsonb)',[session,JSON.stringify(answers),JSON.stringify({assignedStage:1})]);
    await call();await call();await owner(db);
    const profile=(await db.query('SELECT user_type,founder_segment,startup_name,investor_match_visible FROM profiles WHERE id=$1',[user])).rows[0];
    assert.equal(profile.user_type,type);assert.equal(profile.founder_segment,type);assert.equal(profile.investor_match_visible,true);
    assert.equal(profile.startup_name,type==='builder'?'Untitled idea':'Test venture');
    assert.equal((await db.query('SELECT count(*)::int n FROM projects')).rows[0].n,1);
  }finally{await db.close();}
});

test('investor matching applies consent, funding stage, canonical sectors and rank before limit',async()=>{
  const db=await fixture();try{
    await owner(db);
    await db.query("UPDATE profiles SET user_type='investor',role_profile=$1::jsonb WHERE id=$2",[JSON.stringify({...investor,sectors:['FinTech','SaaS']}),user]);
    for(let n=2;n<=5;n++){
      const id=`10000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
      await db.query("INSERT INTO profiles(id,full_name,startup_industry,investor_match_visible,investment_stage) VALUES($1,$2,$3,$4,$5)",[id,'Founder '+n,n===3?['FinTech','SaaS']:['FinTech'],n!==4,n===5?'Series A':'Seed']);
      await db.query("INSERT INTO projects(user_id,title,status) VALUES($1,'Project','active')",[id]);
    }
    await asUser(db);
    const all=(await db.query('SELECT investor_matches() result')).rows[0].result;
    assert.equal(all.length,2);
    const best=(await db.query('SELECT investor_matches(1) result')).rows[0].result;
    assert.equal(best[0].name,'Founder 3');assert.equal(best[0].score,2);
  }finally{await db.close();}
});

test('late drafts cannot overwrite newer answers or reopen a completed application',async()=>{
  const db=await fixture();try{
    await asUser(db);
    const save=(rev,label)=>db.query('SELECT save_onboarding_progress_v1($1,0,$2::jsonb)',[session,JSON.stringify({_draftVersion:rev,roleProfile:{expertise:[label]},entryStage:'details'})]);
    await save(200,'New');await save(100,'Old');
    await owner(db);assert.equal((await db.query('SELECT answers FROM onboarding_sessions')).rows[0].answers.roleProfile.expertise[0],'New');
    await asUser(db);await submit(db,'mentor',mentor);await save(300,'Late');
    await owner(db);const row=(await db.query('SELECT status,answers FROM onboarding_sessions')).rows[0];
    assert.equal(row.status,'completed');assert.deepEqual(row.answers.roleProfile,mentor);
  }finally{await db.close();}
});

test('legacy listing prefill and recent repair preserve later edits and projects',async()=>{
  const db=await fixture();try{
    await owner(db);
    await db.exec(`UPDATE profiles SET user_type='mentor' WHERE id='${admin}';
      INSERT INTO mentors VALUES('${admin}',ARRAY['Pricing']);
      UPDATE profiles SET updated_at='2026-09-20' WHERE id='${user}';
      UPDATE onboarding_sessions SET started_at='2026-09-20',completed_at='2026-09-20',status='completed',
        answers='{"founderSegment":"builder","projectName":"Recovered idea"}' WHERE id='${session}';`);
    await db.exec(sql('20260925163000_onboarding_drafts_and_reconciliation'));
    assert.deepEqual((await db.query('SELECT role_profile FROM profiles WHERE id=$1',[admin])).rows[0].role_profile,{expertise:['Pricing']});
    assert.equal((await db.query('SELECT user_type FROM profiles WHERE id=$1',[user])).rows[0].user_type,'builder');
    assert.equal((await db.query('SELECT title FROM projects')).rows[0].title,'Recovered idea');
    await db.exec(sql('20260925163000_onboarding_drafts_and_reconciliation'));
    assert.equal((await db.query('SELECT count(*)::int n FROM projects')).rows[0].n,1);
  }finally{await db.close();}
});
