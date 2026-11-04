import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const migration=read('supabase/migrations/20261104120000_phase_b_investor_updates.sql');
const generate=read('supabase/functions/generate-investor-update/index.ts');
const view=read('supabase/functions/view-investor-update/index.ts');
const publicPage=read('src/pages/InvestorUpdateSharePage.tsx');

test('reports are owner-readable but direct client mutation and share access are denied',()=>{
  assert.match(migration,/investor_updates_owner_read[\s\S]*auth\.uid\(\) = user_id/);
  assert.match(migration,/REVOKE INSERT, UPDATE, DELETE ON public\.investor_updates/);
  assert.match(migration,/REVOKE ALL ON public\.investor_update_rollout, public\.investor_update_pilots, public\.investor_update_shares/);
  assert.match(migration,/finalized_report_is_immutable/);
});

test('private shares use one-time high-entropy tokens and persist only SHA-256 hashes',()=>{
  assert.match(generate,/getRandomValues\(new Uint8Array\(32\)\)/);
  assert.match(generate,/digest\('SHA-256'/);
  assert.match(generate,/token_hash:hash/);
  assert.doesNotMatch(migration,/raw_token/);
  assert.match(view,/consume_investor_update_share_v1/);
});

test('the public endpoint is rate limited and serves no mutable evidence record',()=>{
  assert.match(view,/rateLimit\(/);
  assert.match(view,/X-Robots-Tag.*noindex/);
  assert.match(view,/result\.data/);
  assert.doesNotMatch(view,/evidence_snapshot/);
  assert.doesNotMatch(publicPage,/dangerouslySetInnerHTML/);
  assert.match(publicPage,/noindex,nofollow,noarchive/);
});

test('investor updates cannot send email or expose recipient lists',()=>{
  for(const source of [generate,view,publicPage]) {
    assert.doesNotMatch(source,/Resend|send-email|recipient|investor_contact/i);
  }
});

test('rollout is founder-scoped, defaults to pilot mode, and recommendations are in-app tasks',()=>{
  assert.match(migration,/general_release boolean NOT NULL DEFAULT false/);
  assert.match(migration,/p\.user_type = 'founder'/);
  assert.match(migration,/queue_investor_update_recommendations_v1/);
  assert.match(migration,/INSERT INTO public\.daily_tasks/);
  assert.doesNotMatch(migration,/email_outbox|send_email|resend/i);
});
