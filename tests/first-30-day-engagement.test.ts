import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Insighta pipeline and return cues are owner-scoped and deduplicated', () => {
  const sql = read('../supabase/migrations/20260814120000_first_30_day_engagement_foundation.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.insighta_pipeline_items/);
  assert.match(sql, /entity_type IN \('vc', 'accelerator'\)/);
  assert.match(sql, /'ready_to_contact'.*'contacted'.*'replied'.*'meeting'.*'closed'/s);
  assert.match(sql, /auth\.uid\(\) = user_id/);
  assert.match(sql, /UNIQUE \(user_id, entity_type, entity_id\)/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.user_return_cues/);
  assert.match(sql, /UNIQUE \(user_id, dedupe_key\)/);
  assert.match(sql, /get_dashboard_snapshot_v2/);
  assert.match(sql, /crossSectionFollowUps/);
});

test('return-cue worker claims atomically and enforces messaging caps', () => {
  const sql = read('../supabase/migrations/20260814140000_return_cue_orchestration.sql');
  const worker = read('../supabase/functions/process-return-cues/index.ts');
  assert.match(sql, /FOR UPDATE SKIP LOCKED/);
  assert.match(sql, /interval '48 hours'/);
  assert.match(sql, /interval '7 days'/);
  assert.match(sql, /\) < 3/);
  assert.match(sql, /unsubscribed IS TRUE/);
  assert.match(sql, /retention_emails/);
  assert.match(sql, /metadata->>'cueId'/);
  assert.match(worker, /claim_due_return_cues_v1/);
  assert.match(worker, /finalize_return_cue_email_v1/);
  assert.match(worker, /send-retention-email/);
});

test('credit quotes are server-authoritative and include affordability forecasting', () => {
  const quote = read('../supabase/functions/credit-quote/index.ts');
  const notice = read('../src/components/CreditCostNotice.tsx');
  assert.match(quote, /getUserFromAuth/);
  assert.match(quote, /available/);
  assert.match(quote, /balanceAfter/);
  assert.match(quote, /giftApplied/);
  assert.match(quote, /affordable/);
  assert.match(quote, /recommendedPurchase/);
  assert.match(quote, /coveredNextActions/);
  assert.match(notice, /useCreditQuote/);
  assert.match(notice, /balanceAfter/);
  assert.match(notice, /Top-up recommended/);
});

test('future social actions are free without rewriting historical transactions', () => {
  const client = read('../src/config/constants.ts');
  const server = read('../supabase/functions/_shared/credit-constants.ts');
  const sql = read('../supabase/migrations/20260814130000_free_social_loops.sql');
  for (const source of [client, server]) {
    assert.match(source, /DISCOVERY_CALL:\s*0/);
    assert.match(source, /MENTOR_DM:\s*0/);
    assert.match(source, /COFOUNDER_POST:\s*0/);
  }
  assert.match(sql, /DROP TRIGGER IF EXISTS trg_charge_mentor_dm/);
  assert.match(sql, /held_amount = 0/);
  assert.match(sql, /credits_charged = false/);
  assert.doesNotMatch(sql, /DELETE FROM public\.credit_transactions\s*;/);
});
