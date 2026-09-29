// Pulse quality eval: runs the fixed conversations in tests/pulse-golden through
// the real Pulse pipeline (prompts, routing, memory) with synthetic data, then
// asks a judge model to score each answer against its rubric.
//
// Costs real model calls, so it is NOT part of `npm test`. Run it before and
// after a Pulse change and compare the reports:
//   $env:LOVABLE_API_KEY = "<key from Supabase secrets>"
//   node --experimental-strip-types scripts/pulse-eval.ts [scenario-id ...]
// Writes reports/pulse-eval-<date>.md and prints a summary.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { handlePulseHome } from '../supabase/functions/_shared/pulse-home.ts';
import { PulseDatabase } from '../tests/helpers/pulseDatabase.ts';

type Scenario = { id: string; message: string; strategy: boolean; rubric: string[]; profile?: Record<string, unknown>; tables?: Record<string, Record<string, unknown>[]> };
const file = JSON.parse(readFileSync(new URL('../tests/pulse-golden/scenarios.json', import.meta.url), 'utf8')) as { defaults: { profile: Record<string, unknown> }; scenarios: Scenario[] };

const key = process.env.LOVABLE_API_KEY;
if (!key) { console.error('Set LOVABLE_API_KEY (Supabase > Edge Functions > Secrets) to run the eval.'); process.exit(1); }
(globalThis as { Deno?: unknown }).Deno = { env: { get: (name: string) => name === 'LOVABLE_API_KEY' ? key : undefined } };

const only = process.argv.slice(2);
const scenarios = file.scenarios.filter(scenario => !only.length || only.includes(scenario.id));
const JUDGE_MODEL = 'google/gemini-2.5-pro';
const gateway = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const today = new Date().toISOString().slice(0, 10);

async function runScenario(scenario: Scenario, index: number) {
  const db = new PulseDatabase();
  db.tables.profiles[0] = { ...file.defaults.profile, ...(scenario.profile ?? {}) };
  for (const [table, rows] of Object.entries(scenario.tables ?? {})) {
    db.tables[table] = rows.map((row, rowIndex) => ({
      id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(index * 100 + rowIndex).padStart(12, '0')}`, user_id: 'owner', project_id: null,
      status: 'active', due_on: null, last_asked_on: null, created_at: `${today}T08:00:00Z`, updated_at: `${today}T08:00:00Z`, ...row,
    }));
  }
  const turnId = crypto.randomUUID();
  const stream = await (await handlePulseHome(db as never, 'owner', { message: scenario.message, sessionId: '11111111-1111-4111-8111-111111111111', turnId })).text();
  const saved = db.tables.chatbot_messages.find(row => row.role === 'assistant');
  if (!saved) return { scenario, answer: '', model: 'none', depth: 'none', scores: [], failed: stream.match(/"error":"([^"]+)"/)?.[1] ?? 'no answer' };
  const judge = await fetch(gateway, {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: JUDGE_MODEL, temperature: 0, response_format: { type: 'json_object' }, messages: [
      { role: 'system', content: 'You grade an AI co-founder\'s answer. For each rubric line, give pass true/false and a short reason. Also check "invented": true if the answer states any specific fact, number, customer or result that is not in the provided context. Return JSON: {"rubric":[{"line":"...","pass":true,"reason":"..."}],"invented":false,"inventedReason":""}.' },
      { role: 'user', content: JSON.stringify({ context: { profile: db.tables.profiles[0], savedMemory: db.tables.pulse_memories }, userMessage: scenario.message, answer: saved.content, rubric: scenario.rubric }) },
    ] }),
  });
  const verdict = JSON.parse((await judge.json()).choices?.[0]?.message?.content ?? '{}') as { rubric?: { line: string; pass: boolean; reason: string }[]; invented?: boolean; inventedReason?: string };
  return { scenario, answer: saved.content as string, model: saved.metadata.model as string, depth: saved.metadata.depth as string,
    memorySuggestions: saved.metadata.memorySuggestions ?? [], scores: verdict.rubric ?? [], invented: Boolean(verdict.invented), inventedReason: verdict.inventedReason ?? '' };
}

const results = [];
for (const [index, scenario] of scenarios.entries()) {
  process.stdout.write(`${scenario.id} … `);
  try { const result = await runScenario(scenario, index); results.push(result); console.log(result.failed ? `FAILED (${result.failed})` : `${result.scores.filter(s => s.pass).length}/${result.scores.length}${result.invented ? ' INVENTED' : ''}`); }
  catch (error) { console.log(`ERROR ${(error as Error).message}`); results.push({ scenario, answer: '', model: 'none', depth: 'none', scores: [], failed: (error as Error).message }); }
}

const graded = results.filter(result => !result.failed);
const passed = graded.reduce((sum, result) => sum + result.scores.filter(score => score.pass).length, 0);
const total = graded.reduce((sum, result) => sum + result.scores.length, 0);
const invented = graded.filter(result => result.invented).length;
const routing = graded.filter(result => (result.depth === 'strategy') === result.scenario.strategy).length;
const summary = `Rubric ${passed}/${total} (${total ? Math.round(passed / total * 100) : 0}%) · invented facts in ${invented}/${graded.length} answers · depth routing ${routing}/${graded.length} · failures ${results.length - graded.length}`;
const report = [`# Pulse eval ${today}`, '', summary, '',
  ...results.flatMap(result => [`## ${result.scenario.id}`, '', `**Message:** ${result.scenario.message}`, '',
    result.failed ? `**Failed:** ${result.failed}` : `**Model:** ${result.model} · **depth:** ${result.depth} (expected ${result.scenario.strategy ? 'strategy' : 'quick'})${result.invented ? ` · **Invented:** ${result.inventedReason}` : ''}`, '',
    ...result.scores.map(score => `- ${score.pass ? '✅' : '❌'} ${score.line}: ${score.reason}`), '',
    result.answer ? `<details><summary>Answer</summary>\n\n${result.answer}\n\n</details>` : '', ''])].join('\n');
mkdirSync(new URL('../reports/', import.meta.url), { recursive: true });
writeFileSync(new URL(`../reports/pulse-eval-${today}.md`, import.meta.url), report);
console.log(`\n${summary}\nReport: reports/pulse-eval-${today}.md`);
