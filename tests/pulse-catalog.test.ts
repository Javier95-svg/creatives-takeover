import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogActions, catalogQuery, requestedCatalogKinds, searchPulseCatalog } from '../supabase/functions/_shared/pulse-catalog.ts';
import { validateHomeActions } from '../src/lib/pulseHome.ts';
import { handlePulseHome } from '../supabase/functions/_shared/pulse-home.ts';
import { PulseDatabase } from './helpers/pulseDatabase.ts';

const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
test('catalog destinations use verified identifiers rather than supplied URLs', () => {
  for (const [kind, route] of [['article', '/newspaper/pricing'], ['podcast', `/podcast?episode=${id}`], ['service', '/marketplace/pricing']]) {
    const [action] = validateHomeActions([{ kind, id, title: 'Pricing', reason: 'Relevant', slug: 'pricing', route: 'https://evil.example' }]);
    assert.equal(action.route, route);
  }
  assert.deepEqual(validateHomeActions([{ kind: 'article', id, title: 'Bad', reason: '', slug: '../admin' }]), []);
  assert.deepEqual(requestedCatalogKinds('recommend me an article of the newspaper section'), ['article']);
  assert.equal(catalogQuery('recommend me an article of the newspaper section'), '');
});

test('catalog search distinguishes empty and failed lookups and gives each type a card', async () => {
  const db = { rpc: async (_name: string, args: { p_kinds: string[] }) => {
    const kind = args.p_kinds[0];
    return kind === 'service' ? { error: new Error('offline') } : { data: kind === 'podcast' ? [] : [{ kind, id, slug: 'pricing', title: 'Pricing', summary: 'Test willingness to pay' }] };
  } };
  const results = await searchPulseCatalog(db as never, ['article', 'podcast', 'service'], 'pricing');
  assert.deepEqual(results.map(row => row.state), ['available', 'no_match', 'unavailable']);
  assert.deepEqual(catalogActions(results).map(row => row.route), ['/newspaper/pricing', '/podcast', '/marketplace']);
  assert.equal(results[0].evidence[0].basis, 'metadata');
});

test('an explicit Newspaper request retrieves real content even when classifier asks an irrelevant clarification', async () => {
  const db = new PulseDatabase();
  const queries: unknown[] = [];
  Object.assign(db, { rpc: async (_name: string, args: unknown) => {
    queries.push(args);
    return { data: [{ kind: 'article', id, slug: 'pricing', title: 'Pricing evidence', summary: 'Interviews about willingness to pay' }], error: null };
  } });
  const original = globalThis.fetch;
  (globalThis as any).Deno = { env: { get: () => 'synthetic' } };
  let answerPrompt = '';
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    if (!body.stream) return Response.json({ choices: [{ message: { content: JSON.stringify({ clarify: 'I do not recommend newspapers.' }) } }] });
    answerPrompt = JSON.stringify(body.messages);
    return new Response('data: {"choices":[{"delta":{"content":"Try this article."}}]}\n\ndata: [DONE]\n\n');
  };
  try {
    const response = await handlePulseHome(db as never, 'owner', { message: 'recommend me an article of the newspaper section', sessionId: '11111111-1111-4111-8111-111111111111', turnId: '22222222-2222-4222-8222-222222222222' });
    assert.match(await response.text(), /\/newspaper\/pricing/);
    assert.equal(queries.length, 1);
    assert.match(answerPrompt, /Interviews about willingness to pay/);
    assert.doesNotMatch(answerPrompt, /I do not recommend newspapers/);
    assert.equal(db.tables.chatbot_messages[1].metadata.homeActions[0].kind, 'article');
  } finally { globalThis.fetch = original; }
});
