import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('ICP browser drafts are session scoped, expiring, and auth-handoff protected', () => {
  const source = read('../src/lib/icpBuilderSession.ts');
  assert.match(source, /ct_icp_builder_session_v5/);
  assert.match(source, /48 \* 60 \* 60 \* 1000/);
  assert.match(source, /getSafeSessionStorage/);
  assert.match(source, /ownerUserId/);
  assert.match(source, /handoff\.sessionId !== session\.sessionId/);
  assert.match(source, /ownerUserId && session\.ownerUserId !== userId/);
});

test('signup abandonment uses a stable one-shot page lifecycle handler', () => {
  const source = read('../src/pages/Signup.tsx');
  assert.match(source, /abandonmentTracked = useRef\(false\)/);
  assert.match(source, /window\.addEventListener\('pagehide', emitAbandonmentOnce\)/);
  assert.match(source, /formSubmitted\.current = true/);
  for (const field of ['firstName', 'lastName', 'username', 'email', 'password']) {
    assert.match(source, new RegExp(`trackFieldInteraction\\('${field}'\\)`));
  }
});

test('all audited activation signup sources map to concrete intents', () => {
  const source = read('../src/lib/retentionSystem.ts');
  for (const mapping of [
    "'demo-try': 'build_demo'",
    "'pitch-deck-unlock': 'unlock_pitch_deck'",
    "'tech-stack': 'unlock_tech_stack'",
    "'insighta-test': 'unlock_insighta'",
    "'icp-draft-unlock': 'run_icp'",
    "'icp-draft-share': 'run_icp'",
    "'hero-icp-builder': 'run_icp'",
  ]) assert.ok(source.includes(mapping), mapping);
});

test('hydration never silently authorizes a Tech Stack or Insighta credit charge', () => {
  const tech = read('../src/components/tech-stack/TechStack.tsx');
  const insightClient = read('../src/components/blog/FundraisingReadinessToolkitAll.tsx');
  const insightEdge = read('../supabase/functions/fundraising-readiness-analyzer/index.ts');
  assert.match(tech, /confirmation_required/);
  assert.match(tech, /handleSeeBudget\(false\)/);
  assert.match(tech, /Generate full plan — 4 credits/);
  assert.match(insightClient, /allow_credit_charge: confirmCreditCharge/);
  assert.match(insightClient, /analyzeReadiness\(false\)/);
  assert.match(insightEdge, /CREDIT_CONFIRMATION_REQUIRED/);
  assert.match(insightEdge, /assessmentId: savedAssessment\.id/);
  assert.match(insightEdge, /giftUsed/);
});

test('Pitch Deck guest result contains one signup gate render', () => {
  const source = read('../src/components/pitch-deck-analyzer/AnalysisResults.tsx');
  assert.equal((source.match(/guestCta \?\? null/g) ?? []).length, 1);
});

test('canonical activation events share a session id and required dimensions', () => {
  const source = read('../src/lib/activationEntry.ts');
  for (const event of [
    'activation_entry_opened',
    'activation_step_completed',
    'activation_validation_failed',
    'activation_generation_failed',
    'activation_gate_shown',
    'activation_gate_clicked',
    'activation_resume_succeeded',
    'activation_resume_failed',
    'activation_abandoned',
  ]) assert.ok(source.includes(event), event);
  assert.match(source, /anonymous_session_id/);
  assert.match(source, /entry_id/);
  assert.match(source, /is_authenticated/);
});
