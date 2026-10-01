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

async function fixture({ bundle = false } = {}) {
  const db=new PGlite();
  await db.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE ROLE supabase_admin;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz DEFAULT now());
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
  if (bundle) await db.exec(readFileSync(new URL('../docs/sql/account-type-onboarding-2026-09-25.sql',import.meta.url),'utf8'));
  else for(const name of ['20260925155000_onboarding_invitations','20260925160000_account_onboarding_integrity','20260925161000_onboarding_classification_and_project','20260925162000_investor_matching_preferences','20260925163000_onboarding_drafts_and_reconciliation','20260928120000_onboarding_context_sync','20260929120000_onboarding_context_v2','20261001170000_investor_self_serve']) await db.exec(sql(name));
  await db.exec(`INSERT INTO auth.users(id,email) VALUES('${user}','test@example.invalid'),('${admin}','admin@example.invalid');
    INSERT INTO profiles(id) VALUES('${user}'),('${admin}'); INSERT INTO onboarding_sessions(id,user_id) VALUES('${session}','${user}');`);
  return db;
}
async function asUser(db,id=user) { await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub','${id}',false); SET ROLE authenticated;`); }
async function owner(db) {await db.exec('RESET ROLE');}

test('copy-paste bundle installs and reruns without losing invitations or applications',async()=>{
  const db=await fixture({bundle:true});try{
    await invite(db);
    const application=(await submit(db,'mentor',mentor)).rows[0].result;
    await owner(db);
    await db.exec(readFileSync(new URL('../docs/sql/account-type-onboarding-2026-09-25.sql',import.meta.url),'utf8'));
    assert.equal((await db.query('SELECT count(*)::int n FROM account_invitations')).rows[0].n,1);
    assert.equal((await db.query('SELECT count(*)::int n FROM account_applications')).rows[0].n,1);
    await asUser(db,admin);
    await db.query('SELECT review_account_application($1,$2)',[application.applicationId,'approved']);
    await owner(db);
    assert.equal((await db.query('SELECT approval_status FROM profiles WHERE id=$1',[user])).rows[0].approval_status,'approved');
  }finally{await db.close();}
});

test('invitation is admin-issued, verified-email bound, expiring and revocable before approval',async()=>{
  const db=await fixture();try{
    await asUser(db);
    await assert.rejects(submit(db,'mentor',mentor),/invitation/);
    await assert.rejects(db.query('SELECT manage_account_invitation($1,$2)',['test@example.invalid','mentor']),/administrator/);
    await assert.rejects(db.query('SELECT list_account_invitations()'),/administrator/);
    await assert.rejects(db.query("SELECT submit_account_application('mentor',null,null,$1::jsonb,$2::uuid)",[JSON.stringify(mentor),session]),/reviewed account/);
    await asUser(db,admin);
    await db.query('SELECT manage_account_invitation($1,$2)',['someoneelse@example.invalid','mentor']);
    await asUser(db);await assert.rejects(submit(db,'mentor',mentor),/invitation/);
    await invite(db);
    await assert.rejects(submit(db,'marketplace',provider),/invitation/);
    await owner(db);await db.query('UPDATE auth.users SET email_confirmed_at=NULL WHERE id=$1',[user]);
    await asUser(db);await assert.rejects(submit(db,'mentor',mentor),/invitation/);
    assert.deepEqual((await db.query('SELECT my_account_invitation_types() result')).rows[0].result,[]);
    await owner(db);await db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1',[user]);
    await db.exec("UPDATE account_invitations SET expires_at=now()-interval '1 day'");
    await asUser(db);await assert.rejects(submit(db,'mentor',mentor),/invitation/);
    await invite(db);
    const id=(await submit(db,'mentor',mentor)).rows[0].result.applicationId;
    await owner(db);assert.equal((await db.query('SELECT approval_status FROM profiles WHERE id=$1',[user])).rows[0].approval_status,'pending');
    await asUser(db,admin);await db.query('SELECT manage_account_invitation($1,$2,true)',['test@example.invalid','mentor']);
    await assert.rejects(db.query('SELECT review_account_application($1,$2)',[id,'approved']),/active invitation/);
    await db.query('SELECT manage_account_invitation($1,$2)',['test@example.invalid','mentor']);
    await db.query('SELECT review_account_application($1,$2)',[id,'approved']);
  }finally{await db.close();}
});

test('classification is derived from valid situations and ignores submitted role labels',async()=>{
  const db=await fixture();try{
    await asUser(db);
    for(const [situation,type] of Object.entries({existing_project:'founder',starting_project:'builder',share_expertise:'mentor',deliver_services:'marketplace',explore_investments:'investor'})){
      assert.equal((await db.query('SELECT classify_onboarding_situation($1) result',[situation])).rows[0].result,type);
    }
    await assert.rejects(db.query('SELECT complete_onboarding_v1($1,$2::jsonb,$3::jsonb)',[session,JSON.stringify({founderSegment:'founder'}),'{}']),/first onboarding question/);
    await assert.rejects(db.query('SELECT submit_account_application(null,null,null,$1::jsonb,null)',[JSON.stringify(mentor)]),/reviewed account/);
    await invite(db);
    const first=(await submit(db,'mentor',mentor)).rows[0].result;
    await asUser(db,admin);await db.query('SELECT review_account_application($1,$2)',[first.applicationId,'rejected']);
    await asUser(db);
    const resubmitted=(await db.query('SELECT submit_account_application(null,null,null,$1::jsonb,null) result',[JSON.stringify(mentor)])).rows[0].result;
    assert.equal(resubmitted.userType,'mentor');
    assert.notEqual(resubmitted.applicationId,first.applicationId);
    const retry=(await db.query('SELECT submit_account_application(null,null,null,$1::jsonb,null) result',[JSON.stringify(mentor)])).rows[0].result;
    assert.equal(retry.applicationId,resubmitted.applicationId);
  }finally{await db.close();}
});
const situations={mentor:'share_expertise',marketplace:'deliver_services',investor:'explore_investments'};
async function invite(db,type='mentor'){await asUser(db,admin);await db.query('SELECT manage_account_invitation($1,$2)', ['test@example.invalid',type]);await asUser(db);}
async function submit(db,type,details) {return db.query('SELECT submit_account_application($1,$2,$3,$4::jsonb,$5::uuid) result',[situations[type],'Test','untrusted@example.invalid',JSON.stringify(details),session]);}

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

for(const [type,details] of Object.entries({mentor,marketplace:provider})) test(`${type}: complete, retry, review snapshot and approval`,async()=>{
  const db=await fixture();try{
    await invite(db,type);
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

test('investor: approved on submission with no request in the review queue',async()=>{
  const db=await fixture();try{
    await asUser(db); const first=(await submit(db,'investor',investor)).rows[0].result;
    assert.equal(first.approvalStatus,'approved'); assert.equal(first.applicationId,null);
    const retry=(await submit(db,'investor',{...investor,sectors:['FinTech','SaaS']})).rows[0].result;
    assert.equal(retry.approvalStatus,'approved');
    await owner(db);
    const profile=(await db.query('SELECT user_type,approval_status,role_profile FROM profiles WHERE id=$1',[user])).rows[0];
    assert.equal(profile.user_type,'investor'); assert.equal(profile.approval_status,'approved');
    assert.deepEqual(profile.role_profile.sectors,['FinTech','SaaS']);
    assert.equal((await db.query('SELECT count(*)::int n FROM account_applications')).rows[0].n,0);
    assert.equal((await db.query('SELECT count(*)::int n FROM email_queue')).rows[0].n,0);
    assert.equal((await db.query('SELECT status FROM onboarding_sessions')).rows[0].status,'completed');
  }finally{await db.close();}
});

test('investor requests pending before self-serve are approved and notified',async()=>{
  const db=await fixture();try{
    await db.exec(`UPDATE profiles SET user_type='investor',approval_status='pending',role_profile='${JSON.stringify(investor)}'::jsonb WHERE id='${user}';
      INSERT INTO account_applications(user_id,user_type,role_profile) VALUES('${user}','investor','${JSON.stringify(investor)}'::jsonb);`);
    await db.exec(sql('20261001170000_investor_self_serve'));
    assert.equal((await db.query('SELECT status FROM account_applications')).rows[0].status,'approved');
    assert.equal((await db.query('SELECT approval_status FROM profiles WHERE id=$1',[user])).rows[0].approval_status,'approved');
    assert.deepEqual((await db.query('SELECT kind FROM email_queue')).rows,[{kind:'approved'}]);
    await asUser(db,admin);
    assert.deepEqual((await db.query('SELECT list_account_applications() result')).rows[0].result,[]);
  }finally{await db.close();}
});

test('rejection can be corrected and resubmitted; stale role decisions fail',async()=>{
  const db=await fixture();try{
    await invite(db);await asUser(db);const id=(await submit(db,'mentor',mentor)).rows[0].result.applicationId;
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
    const answers={situation:type==='founder'?'existing_project':'starting_project',founderSegment:type==='founder'?'builder':'founder',projectName:type==='builder'?'':'Test venture',startupBrief:'We help small businesses understand their customers.',businessModel:'service',evidenceState:'none',primaryGoal:'validate_problem',blocker:'customer_clarity',weeklyCapacityHours:5,runwayMonths:'not_applicable',builderStartingPoint:'exploring',selectedIntent:'find_mentor',investorVisible:true,investmentStage:'Seed'};
    const call=()=>db.query('SELECT complete_onboarding_v1($1,$2::jsonb,$3::jsonb)',[session,JSON.stringify(answers),JSON.stringify({assignedStage:1,founderLoop:'PROVE'})]);
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
    await invite(db);await asUser(db);await submit(db,'mentor',mentor);await save(300,'Late');
    await owner(db);const row=(await db.query('SELECT status,answers FROM onboarding_sessions')).rows[0];
    assert.equal(row.status,'completed');assert.deepEqual(row.answers.roleProfile,mentor);
  }finally{await db.close();}
});

const founderAnswers={situation:'existing_project',projectName:'Throughline',startupBrief:'We help agencies turn client calls into project briefs.',businessModel:'service',evidenceState:'none',primaryGoal:'validate_problem',blocker:'customer_clarity',weeklyCapacityHours:5,runwayMonths:'not_applicable',selectedIntent:'run_icp'};
const complete=(db,answers=founderAnswers,context={assignedStage:1,businessStage:'idea',founderLoop:'PROVE'})=>db.query('SELECT complete_onboarding_v1($1,$2::jsonb,$3::jsonb)',[session,JSON.stringify(answers),JSON.stringify(context)]);
const cycleTable=`CREATE TABLE founder_cycle_state(user_id uuid UNIQUE,business_model text,customer_count int,recommended_loop text,selected_loop text,
  primary_goal text,raise_active boolean,weekly_capacity_hours numeric,assignment_reason text,updated_at timestamptz);`;

test('quiz name and brief replace a placeholder project created before the quiz',async()=>{
  const db=await fixture();try{
    await owner(db);await db.query("INSERT INTO projects(user_id,title,status) VALUES($1,'My project','active')",[user]);
    await asUser(db);await complete(db);await owner(db);
    const rows=(await db.query('SELECT title,idea_summary FROM projects')).rows;
    assert.equal(rows.length,1);
    assert.equal(rows[0].title,'Throughline');
    assert.equal(rows[0].idea_summary,founderAnswers.startupBrief);
  }finally{await db.close();}
});

test('a project title the founder chose is kept while an empty summary is filled',async()=>{
  const db=await fixture();try{
    await owner(db);await db.query("INSERT INTO projects(user_id,title,status) VALUES($1,'Chosen name','active')",[user]);
    await asUser(db);await complete(db);await owner(db);
    const row=(await db.query('SELECT title,idea_summary FROM projects')).rows[0];
    assert.equal(row.title,'Chosen name');
    assert.equal(row.idea_summary,founderAnswers.startupBrief);
  }finally{await db.close();}
});

test('a fundraising blocker marks the founder as raising',async()=>{
  const db=await fixture();try{
    await owner(db);await db.exec(cycleTable);
    await asUser(db);await complete(db,{...founderAnswers,blocker:'fundraising',fundraisingStatus:'preparing'});await owner(db);
    assert.equal((await db.query('SELECT raise_active FROM founder_cycle_state')).rows[0].raise_active,true);
  }finally{await db.close();}
});

test('editing the focus updates stored answers, stage and the project summary',async()=>{
  const db=await fixture();try{
    await owner(db);await db.exec(cycleTable);
    await asUser(db);await complete(db);
    const brief='We help agencies price projects from their client call notes.';
    await db.query('SELECT update_onboarding_focus_v1($1::jsonb,$2::jsonb,$3,$4::jsonb)',[
      JSON.stringify({startupBrief:brief,primaryGoal:'raise',blocker:'fundraising',weeklyCapacityHours:10,country:''}),
      JSON.stringify({assignedStage:3,businessStage:'validation',founderLoop:'SELL',selectedIntent:'analyze_pitch_deck'}),'raise_funding',null]);
    await owner(db);
    const profile=(await db.query('SELECT assigned_stage,business_stage,quiz_answers_v2 FROM profiles WHERE id=$1',[user])).rows[0];
    assert.equal(profile.assigned_stage,3);
    assert.equal(profile.business_stage,'validation');
    assert.equal(profile.quiz_answers_v2.answers.primaryGoal,'raise');
    assert.equal(profile.quiz_answers_v2.answers.blocker,'fundraising');
    assert.equal(profile.quiz_answers_v2.answers.startupBrief,undefined);
    assert.equal(profile.quiz_answers_v2.context.assignedStage,3);
    assert.equal((await db.query('SELECT idea_summary FROM projects')).rows[0].idea_summary,brief);
    assert.equal((await db.query('SELECT raise_active FROM founder_cycle_state')).rows[0].raise_active,true);
  }finally{await db.close();}
});

test('editing the brief never overwrites a project summary written elsewhere',async()=>{
  const db=await fixture();try{
    await asUser(db);await complete(db);
    await owner(db);await db.exec("UPDATE projects SET idea_summary='Summary edited on the project page'");
    await asUser(db);
    await db.query('SELECT update_onboarding_focus_v1($1::jsonb,$2::jsonb,$3,$4::jsonb)',[
      JSON.stringify({startupBrief:'A completely different brief about something else.'}),JSON.stringify({assignedStage:1,founderLoop:'PROVE'}),'validate_idea',null]);
    await owner(db);
    assert.equal((await db.query('SELECT idea_summary FROM projects')).rows[0].idea_summary,'Summary edited on the project page');
  }finally{await db.close();}
});

test('the one-time repair fills placeholder projects only for single-project founders',async()=>{
  const db=await fixture();try{
    await owner(db);
    const second='10000000-0000-0000-0000-000000000002';
    await db.query("INSERT INTO profiles(id,startup_name,startup_description,onboarding_completed) VALUES($1,'Two ventures','A brief for the first of two ventures.',true)",[second]);
    await db.query("UPDATE profiles SET startup_name='Solo venture',startup_description='A brief for a founder with one project.',onboarding_completed=true WHERE id=$1",[user]);
    await db.query("INSERT INTO projects(user_id,title,status) VALUES($1,'My project','active'),($2,'My project','active'),($2,'Another','active')",[user,second]);
    await db.exec(sql('20260928120000_onboarding_context_sync'));
    const solo=(await db.query('SELECT title,idea_summary FROM projects WHERE user_id=$1',[user])).rows[0];
    assert.equal(solo.title,'Solo venture');assert.equal(solo.idea_summary,'A brief for a founder with one project.');
    const untouched=(await db.query("SELECT count(*)::int n FROM projects WHERE user_id=$1 AND title='My project' AND idea_summary IS NULL",[second])).rows[0].n;
    assert.equal(untouched,1);
  }finally{await db.close();}
});

const focus=(db,patch,context={assignedStage:1,founderLoop:'PROVE'})=>db.query('SELECT update_onboarding_focus_v1($1::jsonb,$2::jsonb,$3,$4::jsonb)',[JSON.stringify(patch),JSON.stringify(context),'validate_idea',null]);

test('answers outside the allowed values are rejected before anything is stored',async()=>{
  const db=await fixture();try{
    await asUser(db);
    await assert.rejects(complete(db,{...founderAnswers,businessModel:'crypto'}),/Invalid value for businessModel/);
    await assert.rejects(complete(db,{...founderAnswers,sectors:['Made up sector']}),/Invalid sectors/);
    await assert.rejects(complete(db,{...founderAnswers,weeklyCapacityHours:7}),/weeklyCapacityHours/);
    await assert.rejects(complete(db,{...founderAnswers,runwayMonths:''}),/Required adaptive onboarding answers/);
    await assert.rejects(complete(db,{...founderAnswers,situation:'starting_project'}),/Required adaptive onboarding answers/);
    await assert.rejects(complete(db,founderAnswers,{assignedStage:9,founderLoop:'PROVE'}),/Invalid onboarding stage/);
    await assert.rejects(complete(db,founderAnswers,{assignedStage:1,founderLoop:'RAISE'}),/Invalid onboarding loop/);
    await owner(db);
    assert.equal((await db.query('SELECT status FROM onboarding_sessions')).rows[0].status,'in_progress');
    assert.equal((await db.query('SELECT count(*)::int n FROM projects')).rows[0].n,0);
  }finally{await db.close();}
});

test('the trusted entry points are not callable from the browser role',async()=>{
  const db=await fixture();try{
    await asUser(db);
    await assert.rejects(db.query('SELECT complete_onboarding_as_v1($1,$2,$3::jsonb,$4::jsonb)',[user,session,JSON.stringify(founderAnswers),JSON.stringify({assignedStage:1,founderLoop:'PROVE'})]),/permission denied/);
    await assert.rejects(db.query('SELECT update_onboarding_focus_as_v1($1,$2::jsonb,$3::jsonb,$4,$5::jsonb)',[user,'{}','{}','validate_idea',null]),/permission denied/);
  }finally{await db.close();}
});

test('completion stores the quiz context on the project it describes',async()=>{
  const db=await fixture();try{
    await asUser(db);await complete(db,{...founderAnswers,sectors:['FinTech']},{assignedStage:2,founderLoop:'PROVE',businessStage:'idea'});await owner(db);
    const context=(await db.query('SELECT context FROM projects')).rows[0].context;
    assert.equal(context.source,'onboarding');
    assert.equal(context.answers.primaryGoal,'validate_problem');
    assert.deepEqual(context.answers.sectors,['FinTech']);
    assert.equal(context.answers.startupBrief,undefined);
    assert.equal(context.context.assignedStage,2);
  }finally{await db.close();}
});

test('a focus edit can change business model, evidence, sectors, co-founder and fundraising',async()=>{
  const db=await fixture();try{
    await owner(db);await db.exec(cycleTable);
    await asUser(db);await complete(db);
    await focus(db,{businessModel:'b2b_saas',evidenceState:'payment',customerCountBand:'2',sectors:['SaaS','FinTech'],cofounderSituation:'actively_looking',fundraisingStatus:'preparing',primaryGoal:'raise'},
      {assignedStage:5,founderLoop:'SELL',businessStage:'launch'});
    await owner(db);
    const profile=(await db.query('SELECT startup_industry,user_preferences,assigned_stage,quiz_answers_v2 FROM profiles WHERE id=$1',[user])).rows[0];
    assert.deepEqual(profile.startup_industry,['SaaS','FinTech']);
    assert.deepEqual(profile.user_preferences.startupSectors,['SaaS','FinTech']);
    assert.equal(profile.user_preferences.cofounderSituation,'actively_looking');
    assert.equal(profile.assigned_stage,5);
    assert.equal(profile.quiz_answers_v2.answers.evidenceState,'payment');
    const cycle=(await db.query('SELECT business_model,customer_count,raise_active FROM founder_cycle_state')).rows[0];
    assert.equal(cycle.business_model,'b2b_saas');assert.equal(cycle.customer_count,2);assert.equal(cycle.raise_active,true);
    const context=(await db.query('SELECT context FROM projects')).rows[0].context;
    assert.equal(context.source,'focus_edit');
    assert.equal(context.answers.businessModel,'b2b_saas');
    assert.equal(context.context.assignedStage,5);
    await asUser(db);
    await assert.rejects(focus(db,{evidenceState:'viral'}),/Invalid value for evidenceState/);
  }finally{await db.close();}
});

test('the one-time context backfill covers single-project founders only',async()=>{
  const db=await fixture();try{
    await asUser(db);await complete(db);
    await owner(db);
    await db.exec("UPDATE projects SET context=NULL");
    const second='10000000-0000-0000-0000-000000000003';
    await db.query('INSERT INTO profiles(id) VALUES($1)',[second]);
    await db.query("INSERT INTO onboarding_sessions(id,user_id,status,answers,derived_context,completed_at) VALUES(gen_random_uuid(),$1,'completed','{\"primaryGoal\":\"launch\"}','{\"assignedStage\":4}',now())",[second]);
    await db.query("INSERT INTO projects(user_id,title,status) VALUES($1,'A','active'),($1,'B','active')",[second]);
    await db.exec(sql('20260929120000_onboarding_context_v2'));
    assert.equal((await db.query('SELECT context FROM projects WHERE user_id=$1',[user])).rows[0].context.source,'backfill');
    assert.equal((await db.query('SELECT count(*)::int n FROM projects WHERE user_id=$1 AND context IS NOT NULL',[second])).rows[0].n,0);
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
