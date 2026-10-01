import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {APP_SCHEMA_V1} from '../supabase/functions/_shared/mvp-app-schema.ts';
import {COMMERCE_SCHEMA_V1} from '../supabase/functions/_shared/mvp-commerce-schema.ts';
const app='10000000-0000-0000-0000-000000000001',otherApp='10000000-0000-0000-0000-000000000002';
const owner='20000000-0000-0000-0000-000000000001',customer='20000000-0000-0000-0000-000000000002',other='20000000-0000-0000-0000-000000000003';
test('reviewed app modules enforce stored outcomes and permissions',async t=>{
 const db=new PGlite();
 const rows=async(sql,p=[])=> (await db.query(sql,p)).rows;
 const as=async(user,role='authenticated')=>{await db.exec('RESET ROLE');await rows("SELECT set_config('request.jwt.claim.sub',$1,false)",[user||'']);await db.exec('SET ROLE '+role);};
 try{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;GRANT USAGE ON SCHEMA auth TO anon,authenticated;INSERT INTO auth.users VALUES('${owner}'),('${customer}'),('${other}');`);
 await db.exec(APP_SCHEMA_V1);
 await db.exec(APP_SCHEMA_V1); // Safe provisioning retry, no data reset.
 await db.exec(COMMERCE_SCHEMA_V1);
 await rows('INSERT INTO ct_app_config VALUES($1,$3,$4),($2,$3,$4)',[app,otherApp,'1.0.0',['auth','records','leads','habits','booking','dashboard']]);
 await rows('INSERT INTO ct_app_members VALUES($1,$2,$3)',[app,owner,'owner']);
 let record,slot;
 await t.test('public lead retries keep the first source and cannot read the list',async()=>{
  await as(null,'anon');
  await rows('SELECT ct_capture_lead($1,$2,$3)',[app,'Buyer@example.com','first']);
  await rows('SELECT ct_capture_lead($1,$2,$3)',[app,'buyer@example.com','second']);
  await assert.rejects(rows('SELECT * FROM ct_app_leads'),/permission denied/);
  await as(owner);
  const leads=await rows('SELECT * FROM ct_app_leads');assert.equal(leads.length,1);assert.equal(leads[0].referral,'first');
 });
 await t.test('private records persist, reject forged ownership, and hide other users',async()=>{
  await as(customer);
  record=(await rows('INSERT INTO ct_app_records(app_id,title) VALUES($1,$2) RETURNING id',[app,'Real record']))[0].id;
  await assert.rejects(rows('INSERT INTO ct_app_records(app_id,user_id,title) VALUES($1,$2,$3)',[app,other,'Forged']),/row-level security/);
  await as(other);assert.equal((await rows('SELECT * FROM ct_app_records')).length,0);
  await as(customer);assert.equal((await rows('SELECT * FROM ct_app_records'))[0].title,'Real record');
  await assert.rejects(rows('UPDATE ct_app_records SET app_id=$1 WHERE id=$2',[otherApp,record]),/ownership/);
 });
 await t.test('habit check-ins use server dates and are idempotent',async()=>{
  await as(customer);
  for(let i=0;i<2;i++)await rows('SELECT ct_checkin($1,$2,$3)',[app,record,'America/Lima']);
  assert.equal((await rows('SELECT * FROM ct_app_checkins')).length,1);
  await assert.rejects(rows('SELECT ct_checkin($1,$2,$3)',[app,record,'Made/Up']),/time zone/);
  await as(other);await assert.rejects(rows('SELECT ct_checkin($1,$2,$3)',[app,record,'UTC']),/not found/);
 });
 await t.test('booking retries never duplicate or exceed capacity; cancellation frees it',async()=>{
  await as(owner);
  slot=(await rows("INSERT INTO ct_app_slots(app_id,starts_at,ends_at,timezone,capacity) VALUES($1,now()+interval '1 day',now()+interval '25 hours','UTC',1) RETURNING id",[app]))[0].id;
  await as(customer);const booking=(await rows('SELECT ct_book_slot($1,$2) id',[app,slot]))[0].id;
  assert.equal((await rows('SELECT ct_book_slot($1,$2) id',[app,slot]))[0].id,booking);
  await as(other);await assert.rejects(rows('SELECT ct_book_slot($1,$2)',[app,slot]),/full/);
  await assert.rejects(rows('SELECT ct_cancel_booking($1,$2)',[app,booking]),/not found/);
  await as(customer);await rows('SELECT ct_cancel_booking($1,$2)',[app,booking]);
  await as(other);assert.ok((await rows('SELECT ct_book_slot($1,$2) id',[app,slot]))[0].id);
 });
 await t.test('dashboard data is private and invalid imports cannot partially succeed',async()=>{
  await as(customer);
  await rows("INSERT INTO ct_app_metrics(app_id,source_key,day,category,amount) VALUES($1,'a','2026-10-01','sales',12.5),($1,'b','2026-10-02','sales',7.5)",[app]);
  assert.equal(Number((await rows('SELECT sum(amount) n FROM ct_app_metrics'))[0].n),20);
  await assert.rejects(rows("INSERT INTO ct_app_metrics(app_id,source_key,day,category,amount) VALUES($1,'c','2026-10-01','sales',4),($1,'d','invalid','sales',9)",[app]),/date/);
  assert.equal((await rows('SELECT count(*)::int n FROM ct_app_metrics'))[0].n,2);
  await as(other);assert.equal((await rows('SELECT * FROM ct_app_metrics')).length,0);
 });
 await t.test('checkout uses authoritative prices, reserves stock once and reconciles retries',async()=>{
  await db.exec('RESET ROLE');
  await rows("UPDATE ct_app_config SET modules=array_append(modules,'commerce') WHERE app_id=$1",[app]);
  await rows("INSERT INTO ct_store_settings(app_id,currency,shipping_cents) VALUES($1,'usd',300)",[app]);
  const product=(await rows("INSERT INTO ct_catalogue(app_id,title,price_cents,stock) VALUES($1,'Cup',1200,3) RETURNING id",[app]))[0].id;
  const key='30000000-0000-0000-0000-000000000001';
  const cart=[{id:product,quantity:2,price_cents:1}];
  const order=(await rows('SELECT (ct_reserve_order($1,$2,$3)).*',[app,key,cart]))[0];
  assert.equal(Number(order.total_cents),2700);
  assert.equal((await rows('SELECT (ct_reserve_order($1,$2,$3)).id',[app,key,cart]))[0].id,order.id);
  assert.equal((await rows('SELECT stock FROM ct_catalogue WHERE id=$1',[product]))[0].stock,1);
  await assert.rejects(rows('SELECT ct_reserve_order($1,$2,$3)',[app,key,[{id:product,quantity:1}]]),/changed/);
  await assert.rejects(rows('SELECT ct_reserve_order($1,$2,$3)',[app,'30000000-0000-0000-0000-000000000002',cart]),/inventory/);
  for(let i=0;i<2;i++)await rows("SELECT ct_reconcile_order($1,$2,'evt_paid','paid','cs_test_1','pi_test_1',0)",[app,order.id]);
  assert.equal((await rows('SELECT count(*)::int n FROM ct_payment_events'))[0].n,1);
  assert.equal((await rows('SELECT status FROM ct_orders WHERE id=$1',[order.id]))[0].status,'paid');
  await rows("SELECT ct_reconcile_order($1,$2,'evt_refund','refunded','cs_test_1','pi_test_1',2700)",[app,order.id]);
  assert.equal((await rows('SELECT status FROM ct_orders WHERE id=$1',[order.id]))[0].status,'refunded');
  await as(customer);await assert.rejects(rows("SELECT ct_reconcile_order($1,$2,'forged','paid','cs_test_1','pi_test_1',0)",[app,order.id]),/permission denied/);
 });
 await t.test('abandoned checkout returns inventory once and delayed payments need review',async()=>{
  await db.exec('RESET ROLE');
  const product=(await rows("INSERT INTO ct_catalogue(app_id,title,price_cents,stock) VALUES($1,'Bowl',1000,1) RETURNING id",[app]))[0].id;
  const order=(await rows('SELECT (ct_reserve_order($1,$2,$3)).*',[app,'30000000-0000-0000-0000-000000000003',[{id:product,quantity:1}]]))[0];
  for(const event of ['expired-1','expired-2'])await rows("SELECT ct_reconcile_order($1,$2,$3,'expired','cs_test_2',null,0)",[app,order.id,event]);
  assert.equal((await rows('SELECT stock FROM ct_catalogue WHERE id=$1',[product]))[0].stock,1);
  await rows("SELECT ct_reconcile_order($1,$2,'late-paid','paid','cs_test_2','pi_test_2',0)",[app,order.id]);
  assert.equal((await rows('SELECT status FROM ct_orders WHERE id=$1',[order.id]))[0].status,'review');
 });
 await t.test('subscription access is enforced by database policy, including payment failure',async()=>{
  await db.exec('RESET ROLE');
  await rows("UPDATE ct_app_config SET modules=array_append(modules,'billing') WHERE app_id=$1",[otherApp]);
  await as(customer);
  await assert.rejects(rows("INSERT INTO ct_app_records(app_id,title) VALUES($1,'Paid feature')",[otherApp]),/row-level security/);
  await db.exec('RESET ROLE');
  await rows("INSERT INTO ct_subscriptions VALUES($1,$2,'sub_test','active',now()+interval '1 day','price_test',now())",[otherApp,customer]);
  await as(customer);await rows("INSERT INTO ct_app_records(app_id,title) VALUES($1,'Paid feature')",[otherApp]);
  await db.exec('RESET ROLE');await rows("UPDATE ct_subscriptions SET status='past_due' WHERE app_id=$1",[otherApp]);
  await as(customer);assert.equal((await rows('SELECT * FROM ct_app_records WHERE app_id=$1',[otherApp])).length,0);
  await assert.rejects(rows("UPDATE ct_subscriptions SET status='active' WHERE app_id=$1",[otherApp]),/permission denied/);
 });
 }finally{await db.close();}
});
