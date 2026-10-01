import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const uid='10000000-0000-0000-0000-000000000001', other='10000000-0000-0000-0000-000000000002';
const product='20000000-0000-0000-0000-000000000001', second='20000000-0000-0000-0000-000000000002';
const sql=name=>readFileSync(new URL(`../supabase/migrations/${name}.sql`,import.meta.url),'utf8');
async function fixture({ install = true } = {}) {
  const db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,created_at timestamptz DEFAULT now()-interval '30 days');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
    CREATE TABLE prebuild_validation_contexts(id uuid PRIMARY KEY,user_id uuid);
    CREATE TABLE gtm_plans(id uuid PRIMARY KEY,user_id uuid,plan_content jsonb,current_version integer DEFAULT 1,updated_at timestamptz);
    CREATE TABLE gtm_plan_versions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),plan_id uuid,user_id uuid,version integer,plan_content jsonb,research_sources jsonb,research_status text,UNIQUE(plan_id,version));
    CREATE TABLE gtm_plays(id uuid PRIMARY KEY,user_id uuid,plan_id uuid,play_content jsonb,status text,plan_version_id uuid);
    CREATE TABLE gtm_tasks(id text PRIMARY KEY,user_id uuid,plan_id uuid,play_id text,week_number integer,title text,detail text,owner_label text,time_estimate_minutes integer,expected_output text,metric text,status text);
    CREATE TABLE gtm_play_assets(id text PRIMARY KEY,user_id uuid,plan_id uuid,content text,status text);
    CREATE TABLE gtm_weekly_reviews(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),plan_id uuid,play_id uuid,traction_experiment_id uuid,user_id uuid,week_start date,decision text,next_best_action text,evidence_summary text,adaptation jsonb,health_snapshot jsonb,review_input jsonb,signals jsonb,change_log jsonb,UNIQUE(plan_id,week_start));
    CREATE TABLE user_credits(user_id uuid PRIMARY KEY,balance integer DEFAULT 0,updated_at timestamptz);
    CREATE TABLE credit_transactions(user_id uuid,amount integer,tx_type text,reason text,feature text,metadata jsonb);
    CREATE TABLE pmf_interviews(id uuid PRIMARY KEY,user_id uuid,validation_context_id uuid,interviewee_name text,basic_profile text,segment text,main_feedback text,objections text,interest_level integer,buying_intent text,created_at timestamptz,evidence_origin text);
    INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('${uid}','founder@example.com',now()),('${other}','reviewer@example.com',now());
    INSERT INTO user_credits(user_id) VALUES('${uid}'),('${other}');
  `);
  await db.exec(sql('20260426120000_create_traction_engine_tables'));
  await db.exec(`GRANT SELECT ON traction_engine_weekly_logs,traction_engine_experiments,traction_engine_sprints TO authenticated;
    ALTER TABLE traction_engine_weekly_logs ADD COLUMN verification_mode text;
    ALTER TABLE traction_engine_sprints ADD COLUMN source_gtm_plan_id uuid,ADD COLUMN source_gtm_play_id uuid,
      ADD COLUMN activation_payload jsonb,ADD COLUMN activation_idempotency_key text,ADD COLUMN review_due_at timestamptz;
    ALTER TABLE traction_engine_experiments ADD COLUMN recommended_decision text,ADD COLUMN override_rationale text;
  `);
  if (!install) {
    // Supabase-only network/scheduler functions are inert test doubles. All
    // application migration SQL is executed unchanged by the manual installer.
    await db.exec(`
      CREATE SCHEMA private;
      CREATE TABLE private.service_config(key text PRIMARY KEY,value text);
      CREATE SCHEMA cron;
      CREATE TABLE cron.test_jobs(name text PRIMARY KEY,schedule text,command text);
      CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE plpgsql AS $$
      BEGIN INSERT INTO cron.test_jobs VALUES($1,$2,$3) ON CONFLICT(name) DO UPDATE SET schedule=$2,command=$3; RETURN 1; END $$;
      CREATE SCHEMA net;
      CREATE FUNCTION net.http_post(url text,headers jsonb,body jsonb) RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;
      CREATE TABLE pmf_survey_responses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),sean_ellis_answer text NOT NULL CHECK(sean_ellis_answer IN ('very','somewhat','not')));
      CREATE TABLE pmf_context_evidence(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),survey_results_count integer,sean_ellis_very_disappointed integer,sean_ellis_somewhat_disappointed integer,sean_ellis_not_disappointed integer);
      INSERT INTO pmf_context_evidence(survey_results_count,sean_ellis_very_disappointed,sean_ellis_somewhat_disappointed,sean_ellis_not_disappointed) VALUES(3,1,1,1);
    `);
    return db;
  }
  for(const migration of ['20260930161000_core_tools_data_foundation','20260930161100_core_connection_oauth','20260930161200_core_connection_events','20260930162000_traction_measurement_v2','20260930162500_gtm_product_activation','20260930163000_gtm_review_proposals','20260930164000_pmf_connected_evidence','20260930165000_validation_sessions','20260930165100_validation_session_actions']) await db.exec(sql(migration));
  await db.exec(`INSERT INTO ct_products(id,user_id,name) VALUES('${product}','${uid}','One'),('${second}','${uid}','Two'); SELECT set_config('request.jwt.claim.sub','${uid}',false); SET ROLE authenticated;`);
  return db;
}
const experiment=(channel='Search')=>({channel,hypothesis:'A buyer problem',actionTaken:'Sent a message',targetMetric:'Replies',targetValue:5,resultValue:2,timeInvestedHours:2,decision:'iterate',sampleSize:10});
async function save(db,experiments=[experiment()],p=product) {
  const {rows}=await db.query(`SELECT save_traction_week_v2($1,date_trunc('week',current_date)::date,$2::jsonb,$3::jsonb) result`,[p,JSON.stringify(experiments),JSON.stringify({newUsers:3,sevenDayActiveUsers:100,thirtyDayActiveUsers:200})]);
  return rows[0].result;
}
test('product ownership and provider provenance are protected by database permissions',async()=>{
  const db=await fixture();try {
    await assert.rejects(db.exec(`INSERT INTO ct_evidence(user_id,product_id,source_key,kind,provenance,captured_at,original) VALUES('${uid}','${product}','fake','payment','provider',now(),'{}')`),/permission denied/);
    await db.exec(`SELECT set_config('request.jwt.claim.sub','${other}',false)`);
    assert.equal((await db.query('SELECT * FROM ct_products')).rows.length,0);
    await assert.rejects(save(db),/Product not found/);
  } finally {await db.close();}
});
test('weekly saves isolate products, preserve experiment IDs and retain revisions',async()=>{
  const db=await fixture();try {
    const first=await save(db); const e=await db.query('SELECT id FROM traction_engine_experiments');
    const repeat=await save(db,[{...experiment(),resultValue:3}]);
    assert.equal(first.logId,repeat.logId); assert.equal(repeat.revision,2);
    assert.equal((await db.query('SELECT id FROM traction_engine_experiments')).rows[0].id,e.rows[0].id);
    const different=await save(db,[experiment()],second); assert.notEqual(different.logId,first.logId);
    const log=(await db.query('SELECT * FROM traction_engine_weekly_logs WHERE id=$1',[first.logId])).rows[0];
    assert.equal(log.calculation_version,2);assert.equal(log.retention_health_score,0);assert.equal(log.phase_seven_ready,false);
    assert.equal(log.score_breakdown.retentionStatus,'unknown');
  } finally {await db.close();}
});
test('a failed weekly transaction leaves the earlier log and experiments intact',async()=>{
  const db=await fixture();try {
    const first=await save(db,[experiment('Search'),experiment('Email')]);
    await assert.rejects(save(db,[experiment('New channel')]),/third channel/);
    assert.equal((await db.query('SELECT * FROM traction_engine_experiments WHERE weekly_log_id=$1',[first.logId])).rows.length,2);
    assert.equal((await db.query('SELECT * FROM ct_traction_revisions')).rows.length,1);
  } finally {await db.close();}
});

test('imports are atomic, idempotent, version corrected evidence and retain different metrics',async()=>{
 const db=await fixture();try{
  await db.exec('RESET ROLE');
  const batch=async()=> (await db.query(`INSERT INTO ct_import_batches(user_id,product_id,rows) VALUES($1,$2,'[]') RETURNING id`,[uid,product])).rows[0].id;
  const evidence=[{source_key:'payment:1',kind:'payment',provenance:'provider',captured_at:'2026-09-01T00:00:00Z',original:{amount:200},summary:{}}];
  const metric=name=>({source_key:'payment:1',metric:name,definition:{unit:'minor_currency'},value:200,status:'complete',provenance:'provider',period_start:'2026-09-01T00:00:00Z',period_end:'2026-09-02T00:00:00Z'});
  const b=await batch();const publish=(id,e,m)=>db.query('SELECT ct_publish_import($1,$2::jsonb,$3::jsonb) n',[id,JSON.stringify(e),JSON.stringify(m)]);
  await publish(b,evidence,[metric('gross'),metric('net')]);assert.equal((await db.query('SELECT * FROM ct_metric_observations')).rows.length,2);
  assert.equal((await publish(b,evidence,[])).rows[0].n,0);
  await publish(await batch(),[{...evidence[0],original:{amount:100}}],[]);assert.equal((await db.query('SELECT * FROM ct_evidence_revisions')).rows.length,1);
  await assert.rejects(publish(await batch(),[{...evidence[0],source_key:'rollback'}],[{...metric('bad'),period_end:'bad-date'}]));
  assert.equal((await db.query("SELECT * FROM ct_evidence WHERE source_key='rollback'")).rows.length,0);
 }finally{await db.close();}
});

test('GTM proposals preserve completed tasks and reject stale plans',async()=>{
 const db=await fixture();try{
  await db.exec('RESET ROLE');const plan='30000000-0000-0000-0000-000000000001',play='40000000-0000-0000-0000-000000000001';
  await db.query('INSERT INTO gtm_plans(id,user_id,plan_content) VALUES($1,$2,$3)',[plan,uid,{version:1}]);await db.query('INSERT INTO gtm_plays(id,user_id,plan_id) VALUES($1,$2,$3)',[play,uid,plan]);
  await db.query("INSERT INTO gtm_tasks(id,user_id,plan_id,title,status) VALUES('done',$1,$2,'Completed original','done')",[uid,plan]);
  const proposed={version:2,plays:[],assets:[],tasks:[{id:'done',playId:play,week:2,title:'Overwritten',status:'todo',timeEstimateMinutes:30}]};
  const create=async(base)=>(await db.query('INSERT INTO ct_gtm_review_proposals(user_id,plan_id,play_id,base_plan,proposed_plan,review) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[uid,plan,play,base,proposed,{week_start:'2026-09-28',decision:'iterate'}])).rows[0].id;
  const proposal=await create({version:1}),stale=await create({version:0});
  await db.exec('SET ROLE authenticated');await db.query('SELECT apply_gtm_review_proposal($1)',[proposal]);await db.query('SELECT apply_gtm_review_proposal($1)',[proposal]);
  await assert.rejects(db.query('SELECT apply_gtm_review_proposal($1)',[stale]),/plan changed/);
  await db.exec('RESET ROLE');assert.equal((await db.query("SELECT title FROM gtm_tasks WHERE id='done'")).rows[0].title,'Completed original');
 }finally{await db.close();}
});

test('validation rewards require identity attendance, feedback, hold and issue one ledger grant',async()=>{
 const db=await fixture();try{
  await db.exec('RESET ROLE');const context='50000000-0000-0000-0000-000000000001';
  await db.query('INSERT INTO prebuild_validation_contexts VALUES($1,$2)',[context,uid]);
  const create=async()=>(await db.query(`INSERT INTO ct_validation_sessions(founder_id,reviewer_id,product_id,context_id,starts_at,status) VALUES($1,$2,$3,$4,now()-interval '2 days','completed') RETURNING id`,[uid,other,product,context])).rows[0].id;
  const id=await create();assert.equal((await db.query('SELECT ct_grant_validation_reward($1) r',[id])).rows[0].r,'pending');
  await db.query(`UPDATE ct_validation_sessions SET attendance_status='verified',overlap_seconds=900,feedback='{"objections":"No thanks"}',pre_feedback='{"workaround":"Existing product"}',feedback_at=now()-interval '25 hours',reward_status='held' WHERE id=$1`,[id]);
  assert.equal((await db.query('SELECT ct_grant_validation_reward($1) r',[id])).rows[0].r,'granted');await db.query('SELECT ct_grant_validation_reward($1)',[id]);
  assert.equal((await db.query('SELECT balance FROM user_credits WHERE user_id=$1',[other])).rows[0].balance,20);assert.equal((await db.query('SELECT * FROM credit_transactions')).rows.length,1);
  const duplicate=await create();await db.query(`UPDATE ct_validation_sessions SET attendance_status='verified',overlap_seconds=1200,feedback='{"objections":"Different"}',pre_feedback='{}',feedback_at=now()-interval '25 hours' WHERE id=$1`,[duplicate]);
  assert.equal((await db.query('SELECT ct_grant_validation_reward($1) r',[duplicate])).rows[0].r,'ineligible');
  await db.exec('SET ROLE authenticated');await assert.rejects(db.query('SELECT ct_grant_validation_reward($1)',[id]),/permission denied/);
 }finally{await db.close();}
});

test('invited customers book one offered time and contribute attributed, ineligible-for-reward feedback',async()=>{
 const db=await fixture();try{
  await db.exec('RESET ROLE');const context='50000000-0000-0000-0000-000000000002';await db.query('INSERT INTO prebuild_validation_contexts VALUES($1,$2)',[context,uid]);
  const {rows:[slot]}=await db.query("SELECT now()+interval '1 day' time");
  const {rows:[s]}=await db.query("INSERT INTO ct_validation_sessions(founder_id,product_id,context_id,starts_at,offered_slots,status) VALUES($1,$2,$3,$4,$5,'invited') RETURNING id",[uid,product,context,slot.time,JSON.stringify([slot.time])]);
  await db.query('SELECT ct_book_validation_guest($1,$2,$3,$4)',[s.id,slot.time,'Target Buyer','buyer@example.com']);
  await assert.rejects(db.query('SELECT ct_book_validation_guest($1,$2,$3,$4)',[s.id,slot.time,'Second Buyer','second@example.com']),/available invitation/);
  await db.query("SELECT ct_submit_validation_feedback($1,'{\"recentBehavior\":\"Paid for a workaround\"}',true)",[s.id]);
  await assert.rejects(db.query("SELECT ct_submit_validation_feedback($1,'{}',false)",[s.id]),/finish the session/);
  await db.query("UPDATE ct_validation_sessions SET starts_at=now()-interval '1 hour' WHERE id=$1",[s.id]);
  await db.query("SELECT ct_submit_validation_feedback($1,'{\"clarity\":\"Unclear\",\"objections\":\"Would not pay\"}',false)",[s.id]);
  const evidence=(await db.query('SELECT * FROM ct_evidence')).rows[0];assert.equal(evidence.product_usage,'concept_only');assert.equal(evidence.incentivized,false);assert.equal(evidence.kind,'session');
  assert.equal((await db.query('SELECT ct_grant_validation_reward($1) r',[s.id])).rows[0].r,'ineligible');
 }finally{await db.close();}
});

test('the reward pilot cannot exceed 100 grants or 2,000 credits',async()=>{
 const db=await fixture();try{
  await db.exec('RESET ROLE');const context='50000000-0000-0000-0000-000000000003',third='10000000-0000-0000-0000-000000000003';await db.query('INSERT INTO prebuild_validation_contexts VALUES($1,$2)',[context,uid]);await db.query('INSERT INTO auth.users(id) VALUES($1)',[third]);
  await db.query(`WITH sessions AS (INSERT INTO ct_validation_sessions(founder_id,reviewer_id,product_id,context_id,starts_at,status) SELECT $1,$2,$3,$4,now()-interval '60 days','completed' FROM generate_series(1,100) RETURNING id) INSERT INTO ct_validation_rewards(session_id,reviewer_id,founder_id) SELECT id,$2,$1 FROM sessions`,[uid,third,product,context]);
  const {rows:[s]}=await db.query(`INSERT INTO ct_validation_sessions(founder_id,reviewer_id,product_id,context_id,starts_at,status,attendance_status,overlap_seconds,feedback,pre_feedback,feedback_at) VALUES($1,$2,$3,$4,now()-interval '2 days','completed','verified',1200,'{}','{}',now()-interval '25 hours') RETURNING id`,[uid,other,product,context]);
  assert.equal((await db.query('SELECT ct_grant_validation_reward($1) r',[s.id])).rows[0].r,'ineligible');assert.equal((await db.query('SELECT sum(amount) total FROM ct_validation_rewards')).rows[0].total,2000);assert.equal((await db.query('SELECT * FROM credit_transactions')).rows.length,0);
 }finally{await db.close();}
});

test('GTM activation never reuses a same-channel sprint from another product',async()=>{
 const db=await fixture();try{
  await db.exec('RESET ROLE');
  const activate=async(p,suffix)=>{
   const plan='30000000-0000-0000-0000-00000000000'+suffix,play='40000000-0000-0000-0000-00000000000'+suffix;
   await db.query('INSERT INTO gtm_plans(id,user_id,plan_content) VALUES($1,$2,$3)',[plan,uid,{plays:[{id:play}]}]);
   await db.query('INSERT INTO gtm_plays(id,user_id,plan_id) VALUES($1,$2,$3)',[play,uid,plan]);
   await db.query("SELECT ct_link_product_artifact($1,'gtm_strategist',$2)",[p,plan]);
   return (await db.query("SELECT * FROM activate_gtm_play_v2($1,$2,'Search','{}',$3)",[plan,play,'activation-'+suffix])).rows[0].sprint_id;
  };
  const first=await activate(product,'1'),secondSprint=await activate(second,'2');
  assert.notEqual(first,secondSprint);
  const sprints=(await db.query('SELECT product_id,source_gtm_plan_id FROM traction_engine_sprints ORDER BY product_id')).rows;
  assert.equal(sprints.length,2);assert.equal(sprints[0].product_id,product);assert.equal(sprints[1].product_id,second);
  assert.notEqual(sprints[0].source_gtm_plan_id,sprints[1].source_gtm_plan_id);
 }finally{await db.close();}
});

const installer = readFileSync(new URL('../docs/product/ct-core-tools-migrations.sql',import.meta.url),'utf8');
const installStep = n => {
  const parts=installer.split(/(?=-- CT core tools: step \d+ of 11,)/);
  return parts[n];
};
test('manual SQL installer executes all eleven migrations and can be rerun without resetting evidence',async()=>{
 const db=await fixture({install:false});try{
  await db.exec(installer);
  assert.equal((await db.query('SELECT count(*)::int n FROM private.ct_core_tools_sql_runs')).rows[0].n,11);
  assert.equal((await db.query('SELECT count(*)::int n FROM cron.test_jobs')).rows[0].n,2);
  await db.exec('UPDATE pmf_context_evidence SET survey_results_count=9');
  await db.exec(installer);
  assert.equal((await db.query('SELECT survey_results_count FROM pmf_context_evidence')).rows[0].survey_results_count,9);
  assert.equal((await db.query('SELECT count(*)::int n FROM private.ct_core_tools_sql_runs')).rows[0].n,11);
  await db.exec('SET ROLE authenticated');
  await assert.rejects(db.query('SELECT * FROM private.ct_core_tools_sql_runs'),/permission denied/);
 }finally{await db.close();}
});
test('manual SQL installer preserves committed steps and resumes after a policy deadlock',async()=>{
 const db=await fixture({install:false});try{
  await db.exec(installStep(1));
  await db.exec(`CREATE FUNCTION inject_policy_deadlock() RETURNS event_trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION USING ERRCODE='40P01',MESSAGE='Injected concurrent policy conflict'; END $$;
    CREATE EVENT TRIGGER test_policy_deadlock ON ddl_command_start WHEN TAG IN ('CREATE POLICY') EXECUTE FUNCTION inject_policy_deadlock();`);
  await assert.rejects(db.exec(installStep(2)),/Step 2\/11 could not obtain database locks/);
  await db.exec('ROLLBACK; DROP EVENT TRIGGER test_policy_deadlock');
  assert.equal((await db.query('SELECT count(*)::int n FROM private.ct_core_tools_sql_runs')).rows[0].n,1);
  assert.equal((await db.query("SELECT to_regclass('public.ct_products') AS relation")).rows[0].relation,null);
  await db.exec(installer);
  assert.equal((await db.query('SELECT count(*)::int n FROM private.ct_core_tools_sql_runs')).rows[0].n,11);
 }finally{await db.close();}
});
test('manual SQL installer rejects out-of-order steps and altered completed migrations',async()=>{
 const db=await fixture({install:false});try{
  await assert.rejects(db.exec(installStep(2)),/Run step 1 successfully/);
  await db.exec(installStep(1));
  await db.exec("UPDATE private.ct_core_tools_sql_runs SET source_checksum='different'");
  await assert.rejects(db.exec(installStep(1)),/applied from different SQL/);
 }finally{await db.close();}
});

test('step five acquires DDL locks before changes, reports the failing SQL, and preserves steps one to four',async()=>{
 const db=await fixture({install:false});try{
  for(let step=1;step<=4;step++)await db.exec(installStep(step));
  const before=(await db.query('SELECT version,source_checksum,applied_at FROM private.ct_core_tools_sql_runs ORDER BY version')).rows;
  await db.exec(`CREATE FUNCTION test_step_five_lock_failure() RETURNS event_trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF (SELECT count(DISTINCT relation) FROM pg_locks WHERE pid=pg_backend_pid() AND mode='AccessExclusiveLock' AND granted
        AND relation IN ('public.traction_engine_weekly_logs'::regclass,'public.traction_engine_sprints'::regclass,'public.traction_engine_experiments'::regclass)) <> 3 THEN
        RAISE EXCEPTION 'Expected all three DDL locks before ALTER TABLE';
      END IF;
      RAISE EXCEPTION USING ERRCODE='55P03',MESSAGE='Injected busy database',DETAIL='Test lock holder';
    END $$;
    CREATE EVENT TRIGGER test_step_five_busy ON ddl_command_start WHEN TAG IN ('ALTER TABLE') EXECUTE FUNCTION test_step_five_lock_failure();`);
  await assert.rejects(db.exec(installStep(5)),error=>{
    assert.equal(error.code,'55P03');
    assert.match(error.detail,/Test lock holder/);
    assert.match(error.detail,/Failing SQL context/);
    assert.match(error.detail,/ALTER TABLE public.traction_engine_weekly_logs ADD COLUMN product_id/);
    assert.match(error.hint,/lock-diagnostics/);
    return true;
  });
  await db.exec('ROLLBACK; DROP EVENT TRIGGER test_step_five_busy');
  assert.deepEqual((await db.query('SELECT version,source_checksum,applied_at FROM private.ct_core_tools_sql_runs ORDER BY version')).rows,before);
  assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_name='traction_engine_weekly_logs' AND column_name='product_id'")).rows[0].n,0);
  await db.exec(installStep(5));
  assert.equal((await db.query('SELECT count(*)::int n FROM private.ct_core_tools_sql_runs')).rows[0].n,5);
  await db.exec(readFileSync(new URL('../docs/product/ct-core-tools-lock-diagnostics.sql',import.meta.url),'utf8'));
 }finally{await db.close();}
});
