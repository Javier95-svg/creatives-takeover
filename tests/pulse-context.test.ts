import assert from 'node:assert/strict';
import test from 'node:test';
import { PulseDatabase } from './helpers/pulseDatabase.ts';
import { compactPulseData, resolvePulseContext, pulseRoleGuidance } from '../supabase/functions/_shared/pulse-context.ts';
import { pulseScope, readPulseScope, samePulseScope } from '../src/lib/pulseScope.ts';
import { handlePulseHome } from '../supabase/functions/_shared/pulse-home.ts';

const a = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const b = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
function fixture() {
  const db = new PulseDatabase();
  db.tables.projects = [{ id: a, user_id: 'owner', title: 'Orchard', idea_summary: 'Farm logistics', archived_at: null }, { id: b, user_id: 'owner', title: 'Different venture', archived_at: null }];
  db.tables.icp_analysis_results = [
    { id: 'current', user_id: 'owner', project_id: a, superseded_at: null, updated_at: '2026-09-01', target_audience: 'Farmers', analysis_data: { pain: 'Spoilage', confidence: 0 } },
    { id: 'old', user_id: 'owner', project_id: a, superseded_at: '2026-09-01', analysis_data: { pain: 'OUTDATED' } },
    { id: 'other-project', user_id: 'owner', project_id: b, superseded_at: null, updated_at: '2026-09-26', analysis_data: { pain: 'WRONG PROJECT' } },
    { id: 'other-user', user_id: 'someone-else', project_id: a, superseded_at: null, analysis_data: { pain: 'PRIVATE' } },
  ];
  db.tables.gtm_plans = [{ id: 'gtm-a', project_id: a, user_id: 'owner', superseded_at: null, plan_content: { primary_channel: 'Farm cooperatives' } }];
  return db;
}

test('context resolves actual current output content for the owned active project, not latest per user', async () => {
  const db = fixture();
  const context = await resolvePulseContext(db as never, 'owner', a);
  assert.equal(context.outcomes.icp.id, 'current');
  assert.match(JSON.stringify(context), /Spoilage/);
  assert.match(JSON.stringify(context), /Farm cooperatives/);
  assert.doesNotMatch(JSON.stringify(context), /OUTDATED|WRONG PROJECT|PRIVATE/);
  assert.equal(context.outcomes.icp.updatedAt, '2026-09-01');
  assert.equal(context.outcomes.pmf.state, 'missing');
  assert.equal(Object.keys(context.outcomes).length, 6);
  assert.match(JSON.stringify(context.onboarding.answers), /Validate demand/);
});

test('unauthorized and archived projects fail before stage records are queried', async () => {
  for (const change of ['owner', 'archive']) {
    const db = fixture();
    if (change === 'owner') db.tables.projects[0].user_id = 'other';
    else db.tables.projects[0].archived_at = '2026-09-26';
    await assert.rejects(resolvePulseContext(db as never, 'owner', a), { status: 404 });
    assert.deepEqual(db.reads, ['profiles', 'projects']);
  }
});

test('MVP context includes product setup but excludes integration metadata and custom prompts', async () => {
  const db = fixture();
  db.tables.mvp_projects = [{ id: 'mvp', user_id: 'owner', project_id: a, superseded_at: null,
    metadata: { framework: 'react', integrations: { connectionId: 'PRIVATE_CONNECTION' }, setupInput: { productName: 'Orchard', customPrompt: 'PRIVATE_PROMPT', essentialFeatures: ['Track deliveries'] } } }];
  const context = await resolvePulseContext(db as never, 'owner', a);
  assert.match(JSON.stringify(context.outcomes.mvp), /Orchard|Track deliveries/);
  assert.doesNotMatch(JSON.stringify(context), /PRIVATE_CONNECTION|PRIVATE_PROMPT/);
});

test('source failure is different from no result, and other sources still load', async () => {
  const db = fixture(); db.failures.add('pmf_analysis_results');
  const context = await resolvePulseContext(db as never, 'owner', a);
  assert.equal(context.outcomes.pmf.state, 'unavailable');
  assert.equal(context.outcomes.mvp.state, 'missing');
  assert.deepEqual(context.unavailableSources, ['pmf']);
  assert.equal(context.outcomes.icp.id, 'current');
});

test('each account type gets explicit verified context; non-founders never load a founder project', async () => {
  for (const userType of ['founder', 'builder', 'mentor', 'marketplace', 'investor'] as const) {
    const db = fixture();
    db.tables.profiles[0] = { id: 'owner', user_type: userType, approval_status: userType === 'mentor' ? 'pending' : 'approved', role_profile: { expertise: ['Pricing'], stages: ['Building'], experience: 'Delivered products', engagement: 'both' } };
    const context = await resolvePulseContext(db as never, 'owner', null);
    assert.equal(context.account.userType, userType);
    assert.deepEqual(db.reads, ['profiles']);
    assert.match(pulseRoleGuidance(context), new RegExp(userType === 'marketplace' ? 'service provider' : userType));
    if (userType === 'mentor') {
      assert.equal(context.account.hasCategoryAccess, false);
      assert.match(JSON.stringify(context.account.roleProfile), /Pricing/);
      assert.equal(context.onboarding.assignedStage, null);
      assert.match(pulseRoleGuidance(context), /Do not recommend restricted/);
      await assert.rejects(resolvePulseContext(db as never, 'owner', a), { status: 403 });
    }
  }
});

test('account load failure cannot silently fall back to founder guidance', async () => {
  const db = fixture(); db.failures.add('profiles');
  await assert.rejects(resolvePulseContext(db as never, 'owner', a), { status: 503 });
});

test('per-source compaction remains structured and preserves false and zero', () => {
  const output = compactPulseData({ score: 0, verified: false, missing: null, text: 'a'.repeat(100000) }, 1000);
  assert.equal((output as any).score, 0);
  assert.equal((output as any).verified, false);
  assert.equal((output as any).missing, null);
  assert.ok(JSON.stringify(output).length < 1200);
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(output)));
});

test('scope rejects missing, malformed and non-founder project identities', () => {
  assert.equal(readPulseScope({ version: 1, userType: 'founder' }), null);
  assert.equal(readPulseScope({ version: 1, userType: 'investor', projectId: a }), null);
  assert.equal(readPulseScope({ version: 1, userType: 'founder', projectId: 'not-an-id' }), null);
  assert.equal(samePulseScope(pulseScope('founder', a), pulseScope('founder', b)), false);
  assert.equal(samePulseScope(pulseScope('founder', a), pulseScope('builder', a)), false);
});

test('Home rejects project switches, unscoped legacy history and account changes before replaying a saved answer', async () => {
  const db = fixture();
  const conversation = db.tables.chatbot_conversations[0];
  conversation.business_context = { pulseScope: pulseScope('founder', a) };
  db.tables.chatbot_messages = [{ conversation_id: 'conv', role: 'assistant', content: 'OLD PROJECT SECRET', metadata: { homeTurnId: b } }];
  const input = { sessionId: conversation.session_id, turnId: b, message: 'Continue', projectId: b };
  assert.equal((await handlePulseHome(db as never, 'owner', input)).status, 409);
  db.tables.profiles[0].user_type = 'builder';
  assert.equal((await handlePulseHome(db as never, 'owner', { ...input, projectId: a })).status, 409);
  conversation.business_context = {};
  assert.equal((await handlePulseHome(db as never, 'owner', { ...input, projectId: a })).status, 409);
  assert.ok(!db.reads.includes('chatbot_messages'));
});
