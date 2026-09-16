// Run only against STAGING with two dedicated, authenticated test accounts.
// Tokens are read from environment, never printed or written. No AI call or purchase.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const { STAGING_SUPABASE_URL: url, STAGING_SUPABASE_PUBLIC_KEY: key,
  STAGING_ACCOUNT_A_TOKEN: tokenA, STAGING_ACCOUNT_B_TOKEN: tokenB } = process.env;
assert.ok(url && key && tokenA && tokenB, 'Supply staging URL, public key, and two test-account access tokens.');
assert.equal(process.env.CONFIRM_STAGING_ISOLATION_TEST, 'yes', 'Confirm staging test; it creates and removes one test conversation.');
const request = (path, token, method = 'GET', body) => fetch(`${url}${path}`, {
  method, headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
const identity = async token => {
  const response = await request('/auth/v1/user', token);
  assert.equal(response.status, 200, 'Test account must have a valid authenticated session');
  return (await response.json()).id;
};
const [a, b] = await Promise.all([identity(tokenA), identity(tokenB)]);
assert.notEqual(a, b, 'Use two different accounts');
const sessionId = randomUUID();
let conversationId;
try {
  const created = await request('/rest/v1/chatbot_conversations', tokenA, 'POST', { user_id: a, session_id: sessionId, chat_mode: 'freeform', purpose: 'pulse_home' });
  assert.equal(created.status, 201, 'Account A can create its own Home conversation');
  conversationId = (await created.json())[0].id;
  const path = `/rest/v1/chatbot_conversations?id=eq.${conversationId}`;
  assert.deepEqual(await (await request(path, tokenB)).json(), [], 'Account B cannot read Account A history');
  assert.deepEqual(await (await request(`/rest/v1/chatbot_messages?conversation_id=eq.${conversationId}`, tokenB)).json(), [], 'Cross-account message query returns no records');
  for (const patch of [{ purpose: null }, { user_id: b }, { session_id: randomUUID() }]) {
    assert.ok(!(await request(path, tokenA, 'PATCH', patch)).ok, 'Home scope mutation must be denied even to the owner');
    await request(path, tokenB, 'PATCH', patch);
  }
  const unchanged = await (await request(path, tokenA)).json();
  assert.equal(unchanged[0].purpose, 'pulse_home');
  assert.equal(unchanged[0].user_id, a);
  assert.equal(unchanged[0].session_id, sessionId);
  assert.ok(!(await request('/rest/v1/chatbot_messages', tokenA, 'POST', { conversation_id: conversationId, role: 'assistant', content: 'Isolation test - must not be saved' })).ok, 'Client cannot forge assistant messages');
  const input = { surface: 'pulse_home', chatMode: 'pulse', sessionId, turnId: randomUUID(), message: 'Isolation test', businessContext: {} };
  const denied = await request('/functions/v1/chatbot-streaming', tokenB, 'POST', input);
  assert.ok([403, 404].includes(denied.status), 'Streaming denies cross-account conversation before AI');
  const unauthenticated = await request('/functions/v1/chatbot-streaming', 'invalid-expired-test-token', 'POST', input);
  assert.equal(unauthenticated.status, 401, 'Invalid sessions are rejected');
  console.log('PASS: staging owner isolation, immutable scope, client write denial and endpoint rejection.');
} finally {
  if (conversationId) {
    const deleted = await request(`/rest/v1/chatbot_conversations?id=eq.${conversationId}`, tokenA, 'DELETE');
    assert.ok(deleted.ok, 'Test conversation cleanup failed; remove the test record in staging');
  }
}
