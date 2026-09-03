import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('credit-pack webhook reads the RPC idempotency status from the response data', () => {
  const webhook = read('../supabase/functions/stripe-webhook/index.ts');

  assert.match(
    webhook,
    /const \{ data: idempotencyStatus, error: idempotencyError \} = await supabaseAdmin\.rpc\("idempotency_try_begin"/,
  );
  assert.match(webhook, /if \(idempotencyError\) throw idempotencyError;/);
  assert.doesNotMatch(
    webhook,
    /const idempotencyStatus = await supabaseAdmin\.rpc\("idempotency_try_begin"/,
  );
});

test('credit-pack checkout returns customers to dedicated purchase history after refreshing the wallet', () => {
  const page = read('../src/pages/SubscriptionSuccess.tsx');
  const app = read('../src/App.tsx');

  assert.match(page, /await refreshBalance\(\);/);
  assert.match(page, /navigate\(\s*`\/purchase-history/);
  assert.match(app, /Route path="\/purchase-history" element=\{<PurchaseHistory \/>\}/);
});

test('settings credit activity includes a dated purchase history and lifetime purchase total', () => {
  const card = read('../src/components/CreditActivityCard.tsx');

  assert.match(card, /Purchase History/);
  assert.match(card, /credits purchased/);
  assert.match(card, /Purchased \{formatDate\(purchase\.created_at\)\}/);
});

test('completed but unfulfilled credit packs are repaired once with an auditable purchase record', () => {
  const migration = read('../supabase/migrations/20260902150000_repair_unfulfilled_credit_pack_purchases.sql');

  assert.match(migration, /checkout_session\.status = 'completed'/);
  assert.match(migration, /transaction\.metadata ->> 'idempotencyKey' = v_idempotency_key/);
  assert.match(migration, /SET balance = balance \+ v_purchase\.credits/);
  assert.match(migration, /'credit_pack_fulfillment_repair'/);
});
