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

test('credit-pack success screen waits for the matching fulfillment transaction and shows the wallet total', () => {
  const page = read('../src/pages/SubscriptionSuccess.tsx');

  assert.match(page, /eq\("metadata->>stripeSessionId", checkoutSessionId\)/);
  assert.match(page, /const \{ refreshBalance, balance, totalAvailable \} = useCredits\(\);/);
  assert.match(page, /\{totalAvailable\}<\/p><p className="text-sm text-muted-foreground">Current available credits/);
});

test('completed but unfulfilled credit packs are repaired once with an auditable purchase record', () => {
  const migration = read('../supabase/migrations/20260902150000_repair_unfulfilled_credit_pack_purchases.sql');

  assert.match(migration, /checkout_session\.status = 'completed'/);
  assert.match(migration, /transaction\.metadata ->> 'idempotencyKey' = v_idempotency_key/);
  assert.match(migration, /SET balance = balance \+ v_purchase\.credits/);
  assert.match(migration, /'credit_pack_fulfillment_repair'/);
});
