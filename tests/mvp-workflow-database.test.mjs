import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
const owner='10000000-0000-0000-0000-000000000001',other='10000000-0000-0000-0000-000000000002',project='20000000-0000-0000-0000-000000000001';
test('workflow SQL enforces ownership, revisions, leases, immutable publishing and atomic charging',async t=>{
 const db=new PGlite({extensions:{pgcrypto}});
 try{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE SCHEMA extensions;CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
 CREATE TABLE auth.users(id uuid PRIMARY KEY);INSERT INTO auth.users VALUES('${owner}'),('${other}');
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
 GRANT USAGE ON SCHEMA auth TO authenticated;GRANT EXECUTE ON FUNCTION auth.uid(),auth.role() TO authenticated;
 CREATE TABLE mvp_projects(id uuid PRIMARY KEY,user_id uuid,title text,project_files jsonb,generated_code text,versions jsonb DEFAULT '[]',metadata jsonb,project_type text DEFAULT 'html_single',supabase_connection_id uuid,subdomain_slug text UNIQUE,deployment_url text,deployment_status text,updated_at timestamptz,search_indexing_requested boolean DEFAULT false,search_indexing_review_status text,seo_title text,seo_description text,seo_image_url text);
 CREATE TABLE mvp_builder_credit_reservations(id uuid PRIMARY KEY,user_id uuid,action_feature text,idempotency_key text,status text DEFAULT 'pending');
 CREATE TABLE charges(id uuid PRIMARY KEY);
 CREATE FUNCTION finalize_mvp_builder_credit_reservation(p_reservation_id uuid,p_metadata jsonb) RETURNS jsonb LANGUAGE plpgsql AS $$ BEGIN INSERT INTO charges VALUES(p_reservation_id) ON CONFLICT DO NOTHING; RETURN '{"success":true}'::jsonb; END $$;
 INSERT INTO mvp_projects(id,user_id,title,project_files,metadata,supabase_connection_id,subdomain_slug,deployment_status) VALUES('${project}','${owner}','Example','[{"filename":"index.html","content":"legacy"}]','{"setupInput":{"workflow":{"version":1,"starter":"lead_capture","customer":"Buyers","task":"Subscribe","outcome":"Saved","features":["Form"]}}}','30000000-0000-0000-0000-000000000001','example','deployed');
 SELECT set_config('request.jwt.claim.sub','${owner}',false);
 `);
 await db.exec(readFileSync('supabase/migrations/20261001120000_mvp_workflow_tests.sql','utf8'));
 const call=async(sql,params=[])=> (await db.query(sql,params)).rows;
 await t.test('product briefs invalidate revisions without changing legacy project hashes',async()=>{
  const revision=(await call('SELECT mvp_workflow_revision(p) revision FROM mvp_projects p WHERE id=$1',[project]))[0].revision;
  await db.exec(readFileSync('supabase/migrations/20261001130000_mvp_build_brief_revision.sql','utf8'));
  assert.equal((await call('SELECT mvp_workflow_revision(p) revision FROM mvp_projects p WHERE id=$1',[project]))[0].revision,revision);
  await call("UPDATE mvp_projects SET metadata=jsonb_set(metadata,'{setupInput,buildBrief}',$2) WHERE id=$1",[project,{version:1,kind:'landing',delivery:'preview'}]);
  assert.notEqual((await call('SELECT mvp_workflow_revision(p) revision FROM mvp_projects p WHERE id=$1',[project]))[0].revision,revision);
  await call("UPDATE mvp_projects SET metadata=metadata #- '{setupInput,buildBrief}' WHERE id=$1",[project]);
 });
 let id,lease;
 await t.test('backfill freezes existing URLs while drafts change',async()=>{
  await db.exec(`UPDATE mvp_projects SET project_files='[{"filename":"index.html","content":"draft"}]' WHERE id='${project}';`);
  assert.equal((await call("SELECT content FROM get_published_mvp_file('example','/')"))[0].content,'legacy');
 });
 await t.test('owner queues one test per revision; another user cannot queue it',async()=>{
  id=(await call('SELECT request_mvp_workflow_test($1) id',[project]))[0].id;
  assert.equal((await call('SELECT request_mvp_workflow_test($1) id',[project]))[0].id,id);
  await db.exec(`SELECT set_config('request.jwt.claim.sub','${other}',false);`);
  await assert.rejects(call('SELECT request_mvp_workflow_test($1)',[project]),/Project not found/);
  await db.exec(`SELECT set_config('request.jwt.claim.sub','${owner}',false);`);
 });
 await t.test('the worker must own a current lease and supply all outcome assertions',async()=>{
  lease=(await call('SELECT * FROM claim_mvp_workflow_test()'))[0].lease;
  await assert.rejects(call("SELECT finish_mvp_workflow_test($1,$2,'{}',null,null)",[id,other]),/lease/);
  await call("SELECT finish_mvp_workflow_test($1,$2,'{\"customer_task\":true}',null,'No database write')",[id,lease]);
  assert.equal((await call('SELECT status FROM mvp_build_tests WHERE id=$1',[id]))[0].status,'failed');
  id=(await call('SELECT request_mvp_workflow_test($1) id',[project]))[0].id;lease=(await call('SELECT * FROM claim_mvp_workflow_test()'))[0].lease;
  await call("SELECT finish_mvp_workflow_test($1,$2,$3,$4,null)",[id,lease,{customer_task:true,database_write:true,persisted_after_reload:true,access_control:true,no_runtime_errors:true,responsive_ui:true,cleanup:true},[{filename:'index.html',content:'tested build'}]]);
 });
 await t.test('stale results and wrong-owner tests cannot publish or charge',async()=>{
  assert.equal((await call('SELECT inspect_mvp_workflow_test($1,$2,$3) value',[project,other,id]))[0].value,null);
  await db.exec(`UPDATE mvp_projects SET project_files='[{"filename":"index.html","content":"edited"}]' WHERE id='${project}';`);
  await assert.rejects(call('SELECT publish_tested_mvp($1,$2,$3,$4,$5,$6)',[project,owner,id,'example','https://example.test',other]),/current saved revision/);
  assert.equal((await call('SELECT count(*)::int n FROM charges'))[0].n,0);
  await db.exec(`UPDATE mvp_projects SET project_files='[{"filename":"index.html","content":"draft"}]' WHERE id='${project}';`);
 });
 await t.test('publish and retry charge once and serve the tested artifact',async()=>{
  await call('INSERT INTO mvp_builder_credit_reservations(id,user_id,action_feature,idempotency_key) VALUES($1,$2,$3,$4)',[other,owner,'APP_BUILDER_DEPLOY','workflow-publish:'+project+':'+id]);
  for(let i=0;i<2;i++)await call('SELECT publish_tested_mvp($1,$2,$3,$4,$5,$6)',[project,owner,id,'example','https://example.test',other]);
  assert.equal((await call('SELECT count(*)::int n FROM charges'))[0].n,1);
  assert.equal((await call("SELECT content FROM get_published_mvp_file('example','index.html')"))[0].content,'tested build');
 });
 await t.test('owner cannot forge test results or a published URL',async()=>{
  await db.exec(`SELECT set_config('request.jwt.claim.role','authenticated',false);`);
  await assert.rejects(db.exec(`UPDATE mvp_projects SET deployment_url='https://forged.test' WHERE id='${project}';`),/tested publication/);
  await db.exec('SET ROLE authenticated;');
  await assert.rejects(db.exec("UPDATE mvp_build_tests SET status='passed'"),/permission denied/);
  await assert.rejects(call('SELECT finish_mvp_workflow_test($1,$2,null,null,null)',[id,lease]),/permission denied/);
  await db.exec('RESET ROLE;');
 });
 await t.test('a recovery checkpoint restores source but keeps the published artifact',async()=>{
  await call('SELECT mvp_edit_checkpoint($1,false)',[project]);await db.exec(`UPDATE mvp_projects SET project_files='[]' WHERE id='${project}';`);await call('SELECT mvp_edit_checkpoint($1,true)',[project]);
  assert.equal((await call('SELECT project_files FROM mvp_projects WHERE id=$1',[project]))[0].project_files[0].content,'draft');
  assert.equal((await call("SELECT content FROM get_published_mvp_file('example','index.html')"))[0].content,'tested build');
 });
 await t.test('demo undo restores removed screens atomically and rejects cross-owner snapshots',async()=>{
  await db.exec(`CREATE TABLE demo_studio_demos(id uuid PRIMARY KEY,owner_id uuid,title text,theme jsonb,updated_at timestamptz);
   CREATE TABLE demo_studio_demo_steps(id uuid PRIMARY KEY,demo_id uuid REFERENCES demo_studio_demos(id),position integer,asset_type text,asset_url text,asset_width integer,asset_height integer,asset_captured_at timestamptz,title text,caption text,speaker_notes text);
   CREATE TABLE demo_studio_demo_hotspots(id uuid PRIMARY KEY,step_id uuid REFERENCES demo_studio_demo_steps(id) ON DELETE CASCADE,x numeric,y numeric,w numeric,h numeric,type text,label text,action text,action_target text);
   INSERT INTO demo_studio_demos VALUES('${project}','${owner}','Demo','{}',now()),('${other}','${other}','Private','{}',now());
   INSERT INTO demo_studio_demo_steps(id,demo_id,position) VALUES('${other}','${other}',0);
  `);
  await db.exec(readFileSync('supabase/migrations/20261001121000_demo_editor_recovery.sql','utf8'));
  const steps=[{id:owner,position:0,asset_type:'image',asset_url:'https://example.com/image.png',caption:'First screen',hotspots:[]}];
  await call('SELECT restore_demo_edit($1,$2,$3,$4)',[project,'Demo',{},steps]);
  await call('SELECT restore_demo_edit($1,$2,$3,$4)',[project,'Demo',{},[]]);
  await call('SELECT restore_demo_edit($1,$2,$3,$4)',[project,'Demo',{},steps]);
  assert.equal((await call('SELECT count(*)::int n FROM demo_studio_demo_steps WHERE demo_id=$1',[project]))[0].n,1);
  await assert.rejects(call('SELECT restore_demo_edit($1,$2,$3,$4)',[project,'Demo',{},[{...steps[0],id:other}]]),/another demo/);
  assert.equal((await call('SELECT caption FROM demo_studio_demo_steps WHERE id=$1',[owner]))[0].caption,'First screen');
  await assert.rejects(call('SELECT reorder_demo_screens($1)',[[owner,owner]]),/Screen list changed/);
  await call('SELECT reorder_demo_screens($1)',[[owner]]);
 });
 await t.test('workflow database policies protect saved customer records and owner-only leads',async()=>{
  await db.exec('GRANT USAGE ON SCHEMA auth TO anon;');
  await db.exec(readFileSync('workers/mvp-workflow/schema.sql','utf8'));
  await call('INSERT INTO ct_mvp_workflow_owners VALUES($1,$2)',[project,owner]);
  await db.exec('SET ROLE anon;');
  await call("INSERT INTO ct_mvp_records(project_key,email) VALUES($1,'lead@example.invalid')",[project]);
  await assert.rejects(call('SELECT * FROM ct_mvp_records'),/permission denied/);
  await db.exec(`RESET ROLE;SELECT set_config('request.jwt.claim.sub','${owner}',false);SET ROLE authenticated;`);
  assert.equal((await call('SELECT * FROM ct_mvp_records')).length,1);
  await db.exec(`RESET ROLE;SELECT set_config('request.jwt.claim.sub','${other}',false);SET ROLE authenticated;`);
  assert.equal((await call('SELECT * FROM ct_mvp_records')).length,0);
  await call("INSERT INTO ct_mvp_records(project_key,user_id,body) VALUES($1,$2,'My task')",[project,other]);
  assert.equal((await call('SELECT * FROM ct_mvp_records')).length,1);
  await assert.rejects(call("INSERT INTO ct_mvp_records(project_key,user_id,body) VALUES($1,$2,'Forged')",[project,owner]),/row-level security/);
  await db.exec('RESET ROLE;');
 });
 }finally{await db.close();}
});
