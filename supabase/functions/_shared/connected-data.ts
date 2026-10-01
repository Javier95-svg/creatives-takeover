// Pure mapping and provider readers. Raw payloads are never trusted to choose
// ownership, provenance, or a network host.
export type DataRow = Record<string, any>;
export type FieldMapping = Record<string, string>;
const enc = encodeURIComponent;
const MAX_ROWS = 1000;

export async function readProvider(provider: string, config: DataRow, token: string, fetcher: typeof fetch = fetch): Promise<DataRow[]> {
  async function get(url: string, body?: unknown, headers: Record<string, string> = {}) {
    const response = await fetcher(url, { method: body ? 'POST' : 'GET', redirect: 'error',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(25000) });
    if (!response.ok) throw new Error([401, 403].includes(response.status) ? 'Authorization expired or required read permission is missing. Reconnect this account.' : `The provider could not complete the import (${response.status}). Retry later.`);
    return response.json();
  }
  const required = (key: string) => { const value = String(config[key] ?? '').trim(); if (!value || value.length > 250) throw new Error(`Choose ${key} before syncing.`); return value; };
  const bounded = (rows: DataRow[]) => { if (rows.length > MAX_ROWS) throw new Error('More than 1,000 records match. Select a smaller source or date range before importing. No partial data was saved.'); return rows; };
  const since = typeof config.since === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(config.since) ? config.since : new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  if (provider === 'sheets') {
    const result = await get(`https://sheets.googleapis.com/v4/spreadsheets/${enc(required('spreadsheetId'))}/values/${enc(required('range'))}`);
    const [headers, ...rows] = result.values ?? [];
    if (!headers || new Set(headers).size !== headers.length || headers.some((h: string) => !h.trim())) throw new Error('Use unique, non-empty spreadsheet column headers.');
    return bounded(rows.map((values: unknown[]) => Object.fromEntries(headers.map((header: string, i: number) => [header, values[i] ?? '']))));
  }
  if (provider === 'tally') {
    const rows: DataRow[] = [];
    for (let page = 1; page <= 11; page++) {
      const data = await get(`https://api.tally.so/forms/${enc(required('formId'))}/submissions?filter=completed&limit=100&page=${page}&startDate=${enc(since + 'T00:00:00Z')}`);
      const questions = new Map((data.questions ?? []).map((q: DataRow) => [q.id, q.title]));
      rows.push(...(data.submissions ?? []).map((s: DataRow) => ({ id: s.id, date: s.createdAt, respondent: s.respondentId,
        ...Object.fromEntries((s.responses ?? []).map((r: DataRow) => [String(questions.get(r.questionId) || r.questionId), r.answer])) })));
      bounded(rows); if (!data.hasMore) return rows;
    }
    throw new Error('The provider returned an incomplete result. Choose a smaller date range.');
  }
  if (provider === 'typeform') {
    const data = await get(`https://api.typeform.com/forms/${enc(required('formId'))}/responses?page_size=1000&response_type=completed&since=${since}T00:00:00`);
    if (Number(data.total_items) > MAX_ROWS) throw new Error('Choose a smaller date range; this form has more than 1,000 matching responses.');
    return bounded((data.items ?? []).map((r: DataRow) => ({ id: r.response_id, date: r.submitted_at, respondent: r.response_id,
      ...Object.fromEntries((r.answers ?? []).map((a: DataRow) => [a.field.ref || a.field.id, a[a.type]])) })));
  }
  if (provider === 'stripe') {
    const rows: DataRow[] = [];
    for (const collection of ['charges', 'subscriptions']) {
      let cursor = '';
      while (true) {
        const query = new URLSearchParams({ limit: '100', ...(collection === 'charges' ? { 'created[gte]': String(Date.parse(since) / 1000) } : { status: 'all' }), ...(cursor ? { starting_after: cursor } : {}) });
        const data = await get(`https://api.stripe.com/v1/${collection}?${query}`);
        rows.push(...(data.data ?? []).map((r: DataRow) => ({ ...r, _kind: collection === 'charges' ? 'payment' : 'subscription', date: new Date(r.created * 1000).toISOString() })));
        bounded(rows); if (!data.has_more) break;
        const next = data.data?.at(-1)?.id; if (!next || next === cursor) throw new Error('Stripe pagination did not advance.'); cursor = next;
      }
    }
    return config.productKey ? rows.filter(row=>row.metadata?.ct_product_key===config.productKey) : rows;
  }
  if (provider === 'hubspot') {
    const rows: DataRow[] = [];
    for (const kind of ['contacts', 'deals']) {
      let after = '';
      while (true) {
        const properties = kind === 'contacts' ? 'email,firstname,lastname,lifecyclestage,hs_analytics_source,hs_analytics_first_url' : 'dealname,amount,deal_currency_code,dealstage,closedate,hs_is_closed_won,hs_analytics_source';
        const data = await get(`https://api.hubapi.com/crm/v3/objects/${kind}?limit=100&properties=${properties}${after ? `&after=${enc(after)}` : ''}${kind === 'deals' ? '&associations=contacts' : ''}`);
        rows.push(...(data.results ?? []).map((r: DataRow) => ({ id: `${kind}:${r.id}`, _kind: kind === 'deals' ? 'deal' : 'contact', date: r.createdAt, updatedAt: r.updatedAt, ...r.properties, associations: r.associations })));
        bounded(rows); const next = data.paging?.next?.after; if (!next) break; if (String(next) === after) throw new Error('HubSpot pagination did not advance.'); after = String(next);
      }
    }
    return rows;
  }
  if (provider === 'ga4') {
    const rows: DataRow[] = []; let offset = 0;
    while (true) {
      const data = await get(`https://analyticsdata.googleapis.com/v1beta/properties/${enc(required('propertyId'))}:runReport`, {
        dateRanges: [{ startDate: since, endDate: 'yesterday' }],
        dimensions: [{ name: 'date' }, { name: 'sessionSource' }, { name: 'sessionCampaignName' }],
        metrics: [{ name: 'sessions' }, { name: 'keyEvents' }], limit: '1000', offset: String(offset),
      });
      if (Number(data.rowCount) > MAX_ROWS) throw new Error('Choose a smaller GA4 date range.');
      rows.push(...(data.rows ?? []).map((r: DataRow) => {
        const date = r.dimensionValues[0].value.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
        return { id: `${date}:${r.dimensionValues[1].value}:${r.dimensionValues[2].value}`, date, _kind: 'campaign', source: r.dimensionValues[1].value, campaign: r.dimensionValues[2].value, sessions: Number(r.metricValues[0].value), conversions: Number(r.metricValues[1].value) };
      }));
      bounded(rows); offset = rows.length; if (offset >= Number(data.rowCount ?? 0)) return rows;
      if (!data.rows?.length) throw new Error('GA4 returned an incomplete report.');
    }
  }
  if (provider === 'posthog') {
    const host = config.region === 'eu' ? 'https://eu.posthog.com' : 'https://us.posthog.com';
    // Restrict event literals before constructing the provider query.
    const literal = (value: string) => { if (!/^[a-zA-Z0-9_$ .:/-]{1,120}$/.test(value)) throw new Error('Use an event name containing letters, numbers, spaces, or basic punctuation.'); return `'${value}'`; };
    const startEvent = literal(required('startEvent')), returnEvent = literal(required('returnEvent'));
    const end = new Date(); end.setUTCHours(0, 0, 0, 0);
    const rows: DataRow[] = [];
    for (const windowDays of [7, 30]) {
      const cohortEnd = new Date(end.getTime() - windowDays * 86400000).toISOString().slice(0, 10);
      const cohortStart = new Date(Date.parse(cohortEnd) - 7 * 86400000).toISOString().slice(0, 10);
      const query = `WITH starts AS (SELECT person_id, min(timestamp) AS started FROM events WHERE event = ${startEvent} GROUP BY person_id), cohort AS (SELECT person_id, started FROM starts WHERE started >= toDateTime('${cohortStart}') AND started < toDateTime('${cohortEnd}')), returns AS (SELECT DISTINCT c.person_id FROM cohort c JOIN events e ON c.person_id = e.person_id WHERE e.event = ${returnEvent} AND e.timestamp >= c.started + INTERVAL ${windowDays - 1} DAY AND e.timestamp < c.started + INTERVAL ${windowDays} DAY) SELECT (SELECT count() FROM cohort), (SELECT count() FROM returns)`;
      const data = await get(`${host}/api/projects/${enc(required('projectId'))}/query/`, { query: { kind: 'HogQLQuery', query }, name: `CT ${windowDays}-day cohort retention` });
      if (data.error || data.results?.[0]?.length !== 2) throw new Error('PostHog has not completed the cohort query. Retry the sync.');
      rows.push({ id: `retention:${windowDays}:${cohortStart}`, date: end.toISOString(), _kind: 'session', _metric: { metric: `retention_day_${windowDays}`, value: Number(data.results[0][1]), denominator: Number(data.results[0][0]), period_start: `${cohortStart}T00:00:00Z`, period_end: end.toISOString(), definition: { startEvent: config.startEvent, returnEvent: config.returnEvent, windowDays, cohortStart, cohortEnd, returningWindow: 'day_before_anniversary', timezone: 'UTC' } } });
    }
    const cutoff=new Date(end.getTime()-7*86400000).toISOString().slice(0,10);
    if(Date.parse(since)<Date.parse(cutoff)){
      const query=`WITH starts AS (SELECT person_id,min(timestamp) AS started FROM events WHERE event=${startEvent} GROUP BY person_id), cohort AS (SELECT person_id,started FROM starts WHERE started>=toDateTime('${since}') AND started<toDateTime('${cutoff}')), activated AS (SELECT DISTINCT c.person_id FROM cohort c JOIN events e ON c.person_id=e.person_id WHERE e.event=${returnEvent} AND e.timestamp>c.started AND e.timestamp<c.started+INTERVAL 7 DAY) SELECT (SELECT count() FROM cohort),(SELECT count() FROM activated)`;
      const data=await get(`${host}/api/projects/${enc(required('projectId'))}/query/`,{query:{kind:'HogQLQuery',query},name:'CT seven-day activation funnel'});
      if(data.error||data.results?.[0]?.length!==2)throw new Error('PostHog has not completed the activation query.');
      rows.push({id:`activation:${since}:${cutoff}`,date:end.toISOString(),_kind:'session',_metric:{metric:'activation_within_7_days',value:Number(data.results[0][1]),denominator:Number(data.results[0][0]),period_start:`${since}T00:00:00Z`,period_end:end.toISOString(),definition:{startEvent:config.startEvent,returnEvent:config.returnEvent,windowDays:7,cohortStart:since,cohortEnd:cutoff,returningWindow:'any_time_within_7_days',timezone:'UTC'}}});
    }
    return rows;
  }
  if (provider === 'shopify') {
    const shop = required('shop'); if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) throw new Error('Use your store.myshopify.com domain.');
    const rows: DataRow[] = []; let after: string | null = null;
    do {
      const data = await get(`https://${shop}/admin/api/2026-07/graphql.json`, { query: `query Orders($after: String, $query: String!) { orders(first: 100, after: $after, query: $query) { pageInfo { hasNextPage endCursor } nodes { id createdAt displayFinancialStatus customer { id } totalPriceSet { shopMoney { amount currencyCode } } totalRefundedSet { shopMoney { amount currencyCode } } } } }`, variables: { after, query: `created_at:>=${since}` } }, { 'X-Shopify-Access-Token': token });
      if (data.errors) throw new Error('Shopify denied the order query. Check read_orders permission.');
      const result = data.data?.orders; if (!result) throw new Error('Shopify did not return orders.');
      rows.push(...result.nodes.map((r: DataRow) => ({ ...r, date: r.createdAt, _kind: 'payment' }))); bounded(rows);
      const next = result.pageInfo.hasNextPage ? result.pageInfo.endCursor : null; if (next && next === after) throw new Error('Shopify pagination did not advance.'); after = next;
    } while (after);
    return rows;
  }
  if (provider === 'mailchimp') {
    const prefix = required('serverPrefix'); if (!/^us\d{1,3}$/.test(prefix)) throw new Error('Use the Mailchimp server prefix, such as us21.');
    const rows: DataRow[] = []; let offset = 0;
    while (true) {
      const data = await get(`https://${prefix}.api.mailchimp.com/3.0/reports?count=100&offset=${offset}&since_send_time=${since}T00:00:00Z`, undefined, { Authorization: `Basic ${btoa(`ct:${token}`)}` });
      rows.push(...(data.reports ?? []).map((r: DataRow) => ({ id: r.id, date: r.send_time, _kind: 'campaign', campaign: r.campaign_title, delivered: r.emails_sent, unique_clicks: r.clicks?.unique_subscriber_clicks, unsubscribed: r.unsubscribed }))); bounded(rows);
      offset = rows.length; if (offset >= Number(data.total_items ?? 0)) break; if (!data.reports?.length) throw new Error('Mailchimp returned an incomplete report.');
    }
    if(config.listId){const data=await get(`https://${prefix}.api.mailchimp.com/3.0/lists/${enc(required('listId'))}/growth-history?count=100` ,undefined,{Authorization:`Basic ${btoa(`ct:${token}`)}`});
      rows.push(...(data.history??[]).map((r:DataRow)=>({id:`audience:${config.listId}:${r.month}`,date:`${r.month}-01T00:00:00Z`,_kind:'campaign',campaign:'Audience growth',subscribed:r.subscribed,unsubscribed:r.unsubscribed})));}
    return bounded(rows);
  }
  throw new Error('Unsupported connector.');
}

export async function normalizeImport(provider: string, rows: DataRow[], mapping: FieldMapping, namespace: string) {
  const evidence: DataRow[] = [], metrics: DataRow[] = []; const seen = new Set<string>();
  const mapped = (r: DataRow, field: string) => r[mapping[field] || field];
  for (const row of rows) {
    const date = mapped(row, 'date');
    if (!date || !Number.isFinite(Date.parse(String(date)))) throw new Error('Map a valid observation date for every row.');
    const capturedAt = new Date(date).toISOString();
    const serialized = JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b))));
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized));
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const sourceKey = `${namespace}:${String(mapped(row, 'id') || hash)}`;
    if (seen.has(sourceKey)) continue; seen.add(sourceKey);
    const provenance = provider === 'sheets' || provider === 'csv' ? 'user_supplied' : 'provider';
    const participant = String(mapped(row, 'email') || row.billing_details?.email || mapped(row, 'respondent') || '').trim().toLowerCase();
    const participantDigest = participant ? await crypto.subtle.digest('SHA-256', new TextEncoder().encode(participant)) : null;
    const participantKey = participantDigest ? Array.from(new Uint8Array(participantDigest), byte => byte.toString(16).padStart(2, '0')).join('') : null;
    const usage = mapped(row, 'product_usage');
    evidence.push({ source_key: sourceKey, kind: row._kind || (provider === 'tally' || provider === 'typeform' ? 'survey' : 'interview'), participant_key: participantKey,
      segment: String(mapped(row, 'segment') || ''), incentivized: ['true','yes','1'].includes(String(mapped(row, 'incentivized')).toLowerCase()),
      product_usage: ['used','concept_only'].includes(usage) ? usage : 'unknown', provenance, captured_at: capturedAt, original: row,
      summary: { respondent: String(mapped(row, 'respondent') || ''), feedback: String(mapped(row, 'feedback') || ''), objections: String(mapped(row, 'objections') || ''), source: provider } });
    if (row._metric) metrics.push({ ...row._metric, source_key: sourceKey, provenance, status: Number(row._metric.denominator) > 0 ? 'complete' : 'unknown' });
    const observation=(metric:string,value:number,definition:DataRow,currency:string|null=null,day=false)=>{
      if(!Number.isFinite(value))throw new Error(`Invalid ${metric} value from source.`);
      metrics.push({source_key:sourceKey,metric,value,currency,period_start:capturedAt,period_end:new Date(Date.parse(capturedAt)+(day?86400000:1)).toISOString(),provenance,status:'complete',definition:{source:provider,...definition}});
    };
    if(provider==='stripe'&&row._kind==='payment'&&row.paid===true&&row.status==='succeeded'){
      const definition={unit:'minor_currency',basis:'charge_date',customer:typeof row.customer==='string'?row.customer:null,campaign:row.metadata?.utm_campaign||null,channel:row.metadata?.utm_source||null};
      observation('gross_payments',Number(row.amount),definition,row.currency);
      observation('refunded_payments',Number(row.amount_refunded||0),definition,row.currency);
      observation('net_payments',Number(row.amount)-Number(row.amount_refunded||0),definition,row.currency);
    }
    if(provider==='ga4'){
      const definition={unit:'count',campaign:row.campaign,channel:row.source,timezone:'property_reporting_timezone'};
      observation('campaign_visits',Number(row.sessions),definition,null,true);observation('campaign_key_events',Number(row.conversions),definition,null,true);
    }
    if(provider==='shopify'&&['PAID','PARTIALLY_REFUNDED','REFUNDED'].includes(row.displayFinancialStatus)){
      const currency=row.totalPriceSet?.shopMoney?.currencyCode,definition={unit:'major_currency',basis:'order_date',customer:row.customer?.id||null};
      observation('net_order_value',Number(row.totalPriceSet?.shopMoney?.amount)-Number(row.totalRefundedSet?.shopMoney?.amount||0),definition,currency);
    }
    if(provider==='mailchimp'){
      for(const field of ['unique_clicks','subscribed','unsubscribed'])if(row[field]!=null)observation(`email_${field}`,Number(row[field]),{unit:'count',campaign:row.campaign,scope:row.id.startsWith('audience:')?'audience_month':'campaign'});
    }
    if (mapping.metric && mapping.value) {
      const value = Number(mapped(row, 'value')); const start = mapped(row, 'period_start'), end = mapped(row, 'period_end');
      if (!Number.isFinite(value) || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(end) <= Date.parse(start)) throw new Error('Metric imports need a numeric value and valid start/end dates.');
      metrics.push({ source_key: sourceKey, metric: String(mapped(row, 'metric')), value, period_start: start, period_end: end, status: Date.parse(end) > Date.now() ? 'pending' : 'complete', provenance, definition: { source: provider, unit: String(mapped(row, 'unit') || 'count') } });
    }
  }
  return { evidence, metrics, duplicates: rows.length - seen.size };
}
