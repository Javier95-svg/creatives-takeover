import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { CREDIT_COSTS as CLIENT_CREDIT_COSTS } from '../src/config/constants.ts';
import { CREDIT_COSTS as EDGE_CREDIT_COSTS } from '../supabase/functions/_shared/credit-constants.ts';

test('client and edge credit costs stay in sync', () => {
  assert.deepEqual(CLIENT_CREDIT_COSTS, EDGE_CREDIT_COSTS);
});

test('admin accounts are not exempt from metered tool credit checks', () => {
  const creditActionsSource = readFileSync(new URL('../src/hooks/useCreditActions.ts', import.meta.url), 'utf8');
  const creditsSource = readFileSync(new URL('../src/hooks/useCredits.ts', import.meta.url), 'utf8');
  const edgeDeductionSource = readFileSync(new URL('../supabase/functions/_shared/credit-deduction.ts', import.meta.url), 'utf8');

  assert.doesNotMatch(creditActionsSource, /isAdminEmail/);
  assert.doesNotMatch(creditsSource, /isAdminEmail/);
  assert.doesNotMatch(edgeDeductionSource, /ADMIN_EMAIL/);
  assert.doesNotMatch(edgeDeductionSource, /auth\.admin\.getUserById/);
  assert.doesNotMatch(edgeDeductionSource, /usedFromQuota:\s*0,[\s\S]*usedFromBalance:\s*0[\s\S]*isAdmin/);
});

test('credit receipts record canonical completed tool activity', () => {
  const source = readFileSync(new URL('../src/hooks/useCreditActions.ts', import.meta.url), 'utf8');

  assert.match(source, /trackActivity\('tool_completed'/);
  assert.match(source, /feature_key: feature/);
  assert.match(source, /credits_charged: creditsUsed/);
  assert.match(source, /charge_status: creditsUsed > 0 \? 'charged' : 'free'/);
  assert.match(source, /balance_after: nextBalance/);
});

test('Tech Stack charges once per completed budget generation', () => {
  const source = readFileSync(new URL('../src/components/tech-stack/TechStack.tsx', import.meta.url), 'utf8');

  assert.match(source, /generatedBudgetKey/);
  assert.match(source, /showBudget && generatedBudgetKey === selectedProductsKey/);
  assert.match(source, /deductCredits\('TECH_STACK_GENERATION'/);
  assert.match(source, /setShowBudget\(true\)/);
  assert.match(source, /setGeneratedBudgetKey\(selectedProductsKey\)/);
  assert.match(source, /setShowBudget\(false\)/);
});

test('local publish flows perform real deductions, not receipt-only accounting', () => {
  const source = readFileSync(new URL('../src/components/waitlist/WaitlistEditor.tsx', import.meta.url), 'utf8');

  assert.match(source, /deductCredits\('WAITLIST_GENERATION'/);
  assert.doesNotMatch(source, /const requiredCredits = ensureCredits\('WAITLIST_GENERATION', \{[\s\S]*Waitlist Page Generation/);
  assert.doesNotMatch(source, /showCreditReceipt\('WAITLIST_GENERATION', requiredCredits, undefined, \{ featureName: 'Waitlist Maker' \}\)/);
});
