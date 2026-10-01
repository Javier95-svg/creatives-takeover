import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, cohortResult, campaignUrl, comparableMetricKey } from '../src/lib/coreTools.ts';
import { normalizeImport, readProvider } from '../supabase/functions/_shared/connected-data.ts';
import { calculateTractionMeasurement } from '../src/lib/tractionMeasurement.ts';

test('CSV mapping preserves quotes, commas and embedded newlines and rejects ambiguous headers', () => {
  assert.deepEqual(parseCsv('name,date,feedback\r\nAda,2026-09-01,"Needed, urgently\nsaid ""yes"""'), [{ name: 'Ada', date: '2026-09-01', feedback: 'Needed, urgently\nsaid "yes"' }]);
  assert.throws(() => parseCsv('name,name\na,b'), /unique/);
  assert.throws(() => parseCsv('name,date\na'), /match/);
});
test('retention follows a complete cohort and never invents a zero from missing data', () => {
  const base = { periodStart: '2026-09-01', periodEnd: '2026-09-08', startEvent: 'signup', returnEvent: 'purchase', windowDays: 7, cohortSize: 10, returned: 4 };
  assert.deepEqual(cohortResult(base, new Date('2026-09-10')), { status: 'complete', rate: .4 });
  assert.equal(cohortResult(base, new Date('2026-09-05')).status, 'pending');
  assert.equal(cohortResult({ ...base, returned: 11 }).status, 'unknown');
  assert.equal(cohortResult({ ...base, cohortSize: null }).rate, null);
  assert.equal(cohortResult({ ...base, cohortSize: 0, returned: 0 }).status, 'unknown');
});
test('imports deduplicate stable source identities and preserve manual provenance and incentive labels', async () => {
  const row = { record: 'a', date: '2026-09-01', email: 'ADA@example.com', feedback: 'Needs faster checkout', incentivized: 'yes' };
  const result = await normalizeImport('sheets', [row, row], { id: 'record' }, 'connection');
  assert.equal(result.evidence.length, 1); assert.equal(result.duplicates, 1);
  assert.equal(result.evidence[0].provenance, 'user_supplied'); assert.equal(result.evidence[0].incentivized, true);
  assert.equal(result.evidence[0].original.feedback, row.feedback);
  assert.equal(result.evidence[0].product_usage, 'unknown');
  await assert.rejects(normalizeImport('csv', [{ feedback: 'undated' }], {}, 'csv'), /valid observation date/);
});
test('Stripe pagination includes refunds and cancelled subscriptions and refuses partial imports', async () => {
  const calls: string[] = [];
  const fake = async (url: any) => {
    calls.push(String(url));
    if (String(url).includes('subscriptions')) return Response.json({ data: [{ id: 'sub_1', created: 1, status: 'canceled' }], has_more: false });
    if (String(url).includes('starting_after')) return Response.json({ data: [{ id: 'ch_2', created: 2, amount: 100, amount_refunded: 100 }], has_more: false });
    return Response.json({ data: [{ id: 'ch_1', created: 1, amount: 100, amount_refunded: 50 }], has_more: true });
  };
  const rows = await readProvider('stripe', {}, 'secret', fake as typeof fetch);
  assert.equal(rows.length, 3); assert.equal(rows[1].amount_refunded, 100); assert.equal(rows[2].status, 'canceled');
  assert.ok(calls.some(url => url.includes('starting_after=ch_1')));
  await assert.rejects(readProvider('stripe', {}, 'secret', (async () => new Response('', { status: 429 })) as typeof fetch), /429/);
});
test('provider hosts cannot be redirected to caller supplied addresses', async () => {
  await assert.rejects(readProvider('shopify', { shop: 'localhost/steal' }, 'secret'), /myshopify/);
  await assert.rejects(readProvider('mailchimp', { serverPrefix: 'attacker.example' }, 'secret'), /prefix/);
});
test('execution discipline is separate from outcome units and missing retention', () => {
  const input = { experiments: [{ channel: 'Search', hypothesis: 'People need this', actionTaken: 'Tested landing', targetMetric: 'Clicks', targetValue: 100, resultValue: 100, timeInvestedHours: 2, decision: 'iterate' as const }],
    retention: { newUsers: 2, sevenDayActiveUsers: 100, thirtyDayActiveUsers: 1000, primaryAcquisitionChannel: 'Search', productCategory: 'saas' as const }, currentWeekStart: '2026-09-28', previousLogDates: [], previousScores: [] };
  const result = calculateTractionMeasurement(input);
  assert.equal(result.retentionStatus, 'unknown'); assert.equal(result.retentionHealthScore, 0); assert.equal(result.phaseSevenReady, false);
  assert.equal(result.calculationVersion, 2);
  assert.notEqual(comparableMetricKey('clicks', {}), comparableMetricKey('customers', {}));
  assert.match(campaignUrl('https://example.com/pricing', 'Search', 'play123'), /utm_campaign=play123/);
});
