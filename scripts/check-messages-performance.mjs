const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const accessToken = process.env.MESSAGES_TEST_ACCESS_TOKEN;
const conversationId = process.env.MESSAGES_TEST_CONVERSATION_ID;
const samples = Math.min(Math.max(Number(process.env.MESSAGES_PERF_SAMPLES || 20), 5), 100);

if (!url || !anonKey || !accessToken || !conversationId) {
  console.error('Set SUPABASE_URL, SUPABASE_ANON_KEY, MESSAGES_TEST_ACCESS_TOKEN and MESSAGES_TEST_CONVERSATION_ID.');
  process.exit(2);
}

const request = async (rpc, body) => {
  const startedAt = performance.now();
  const response = await fetch(`${url}/rest/v1/rpc/${rpc}`, {
    method: 'POST',
    headers: { apikey: anonKey, authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${rpc} failed (${response.status}): ${await response.text()}`);
  await response.arrayBuffer();
  return performance.now() - startedAt;
};

const percentile = (values, fraction) => values.toSorted((a, b) => a - b)[Math.min(values.length - 1, Math.ceil(values.length * fraction) - 1)];
const runs = { inbox: [], conversation: [] };

for (let index = 0; index < samples; index += 1) {
  runs.inbox.push(await request('get_inbox_v2', { p_section: 'inbox', p_limit: 30, p_cursor: null }));
  runs.conversation.push(await request('get_message_page_v2', { p_conversation_id: conversationId, p_limit: 30, p_before_created_at: null, p_before_id: null, p_anchor_message_id: null }));
}

const report = Object.fromEntries(Object.entries(runs).map(([name, values]) => [name, {
  samples: values.length,
  p50Ms: Math.round(percentile(values, 0.5)),
  p95Ms: Math.round(percentile(values, 0.95)),
  maxMs: Math.round(Math.max(...values))
}]));

console.log(JSON.stringify(report, null, 2));
if (report.inbox.p95Ms > 750 || report.conversation.p95Ms > 750) {
  console.error('Messaging p95 exceeded the 750ms release threshold.');
  process.exit(1);
}
