import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('credit status banner renders soft gate only for low positive rookie credits', () => {
  const source = readFileSync(new URL('../src/contexts/CreditGateContext.tsx', import.meta.url), 'utf8');

  assert.match(source, /shouldShowSoftGate = shouldGateRookieCredits && totalAvailable > 0 && totalAvailable <= 20/);
  assert.match(source, /shouldHardGate = shouldGateRookieCredits && totalAvailable === 0/);
});

test('hard gate opens from credit-consuming actions and cannot dismiss outside', () => {
  const contextSource = readFileSync(new URL('../src/contexts/CreditGateContext.tsx', import.meta.url), 'utf8');
  const creditActionsSource = readFileSync(new URL('../src/hooks/useCreditActions.ts', import.meta.url), 'utf8');

  assert.match(creditActionsSource, /currentTier === 'rookie' && totalAvailable === 0 && showHardGate\(\)/);
  assert.match(contextSource, /onEscapeKeyDown=\{\(event\) => event\.preventDefault\(\)\}/);
  assert.match(contextSource, /onPointerDownOutside=\{\(event\) => event\.preventDefault\(\)\}/);
  assert.match(contextSource, /Upgrade to Starter — \$9\/mo/);
});

test('soft and hard gates emit upgrade prompt analytics', () => {
  const bannerSource = readFileSync(new URL('../src/components/CreditStatusBanner.tsx', import.meta.url), 'utf8');
  const contextSource = readFileSync(new URL('../src/contexts/CreditGateContext.tsx', import.meta.url), 'utf8');
  const analyticsSource = readFileSync(new URL('../src/lib/analytics.ts', import.meta.url), 'utf8');

  assert.match(analyticsSource, /export const trackUpgradePromptShown/);
  assert.match(bannerSource, /trigger: "soft_gate_banner"/);
  assert.match(contextSource, /trigger: "hard_gate_modal"/);
});
