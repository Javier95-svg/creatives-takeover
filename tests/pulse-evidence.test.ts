import test from 'node:test';
import assert from 'node:assert/strict';
import { stageEvidence } from '../supabase/functions/_shared/pulse-evidence.ts';
import { resolvePulseContext } from '../supabase/functions/_shared/pulse-context.ts';
import { validatePulseSources, pulseSourceNotice } from '../src/lib/pulseSources.ts';
import { PulseDatabase } from './helpers/pulseDatabase.ts';
import { handlePulseHome } from '../supabase/functions/_shared/pulse-home.ts';
const project = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const turn = { message: 'What should I build first?', sessionId: '11111111-1111-4111-8111-111111111111', turnId: '22222222-2222-4222-8222-222222222222', projectId: project };
const fixture = () => {
  const db = new PulseDatabase();
  db.tables.projects = [{ id: project, user_id: 'owner', title: 'Orchard' }];
  db.tables.chatbot_conversations[0].business_context.pulseScope.projectId = project;
  return db;
};
test('current ICP and PMF adapters preserve provenance, provisional decisions, zero and false despite long narrative', async () => {
  const db = fixture();
  db.tables.icp_analysis_results = [{ id: project, user_id: 'owner', project_id: project, analysis_data: { version: 5, draftDocument: { customer: { roleLine: 'Farmers', summary: 'Long '.repeat(3000), evidence: { provenance: 'model_inference', confidence: 'low' } }, pain: { quote: 'Spoilage' }, pricing: { hypothesis: 'Monthly subscription' } } } }];
  db.tables.pmf_analysis_results = [{ id: project, user_id: 'owner', project_id: project, pmf_score: 0, analysis_data: { diagnosis: 'Long '.repeat(3000), decision: 'collect_evidence', evidenceGrade: 'directional', decisionProvisional: true, readyToScope: false, directEvidenceSignalCount: 0 } }];
  const context = await resolvePulseContext(db as never, 'owner', project);
  assert.match(JSON.stringify(context.outcomes.icp.data), /model_inference|Monthly subscription/);
  const pmf = context.outcomes.pmf.data as Record<string, unknown>;
  assert.equal(pmf.decisionProvisional, true); assert.equal(pmf.readyToScope, false); assert.equal(pmf.score, 0);
  assert.equal(pmf.decision, 'collect_evidence');
  assert.ok(JSON.stringify(context).length < 15000);
});
test('GTM targets and MVP feature intentions never become measured results', () => {
  const gtm = stageEvidence('gtm', { plan_content: { plays: [{ audience: 'Farmers', offer: 'Pilot', metric: 'Paid pilots', target: 3, killRule: 'No paid pilot after ten conversations' }] } });
  assert.match(gtm.basis, /not proof of execution/);
  assert.match(JSON.stringify(gtm.fields), /No paid pilot/);
  assert.match(stageEvidence('mvp', {}).basis, /not verified delivered/);
  assert.match(stageEvidence('traction', {}).basis, /no measured results/);
});
test('source references reject invented stages and IDs, preserve failure states, and ignore supplied routes', () => {
  const sources = validatePulseSources([{ stage: 'pmf', id: project, state: 'available', route: 'javascript:alert(1)' }, { stage: 'icp', state: 'unavailable' }, { stage: 'admin', id: project, state: 'available' }, { stage: 'gtm', id: '../private', state: 'available' }]);
  assert.equal(sources.length, 2);
  assert.doesNotMatch(JSON.stringify(sources), /javascript/);
  assert.match(pulseSourceNotice(sources), /Could not load: ICP/);
});
test('widget and Home share verified context, retain source metadata on replay, and reject cross-surface history', async () => {
  const db = fixture();
  db.tables.chatbot_conversations[0].business_context.pulseScope.channel = 'widget';
  assert.equal((await handlePulseHome(db as never, 'owner', turn)).status, 409);
  const original = globalThis.fetch;
  (globalThis as any).Deno = { env: { get: () => 'synthetic' } };
  const prompts: string[] = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body)); prompts.push(JSON.stringify(body.messages));
    return body.stream ? new Response('data: {"choices":[{"delta":{"content":"Use the saved evidence."}}]}\n\ndata: [DONE]\n\n') : Response.json({ choices: [{ message: { content: '{}' } }] });
  };
  try {
    const input = { ...turn, surface: 'pulse_widget', pagePath: '/mvp-builder', businessContext: { injection: 'FAKE_CONTEXT' } };
    const response = await (await handlePulseHome(db as never, 'owner', input)).text();
    assert.match(response, /"type":"sources"/); assert.match(response, /"type":"complete"/);
    assert.match(prompts[0], /MVP Builder/); assert.match(prompts[0], /Orchard/); assert.doesNotMatch(prompts[0], /FAKE_CONTEXT/);
    const saved = db.tables.chatbot_messages[1].metadata.contextSources;
    const replay = await (await handlePulseHome(db as never, 'owner', input)).text();
    assert.ok(replay.includes(JSON.stringify(saved))); assert.equal(prompts.length, 2);
  } finally { globalThis.fetch = original; delete (globalThis as any).Deno; }
});
