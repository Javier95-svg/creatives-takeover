export const CORE_TOOLS_FLAG = 'core-tools-connected-v1';
export type ConnectorProvider = 'sheets' | 'tally' | 'stripe' | 'posthog' | 'ga4' | 'hubspot' | 'typeform' | 'shopify' | 'mailchimp';
export const CONNECTORS: Array<{ id: ConnectorProvider; name: string; purpose: string; fields: string[]; optionalFields?: string[] }> = [
  { id: 'sheets', name: 'Google Sheets', purpose: 'Customer interviews and business metrics', fields: ['spreadsheetId', 'range'] },
  { id: 'tally', name: 'Tally', purpose: 'Survey responses and customer feedback', fields: ['formId'] },
  { id: 'stripe', name: 'Stripe', purpose: 'Payments, refunds and subscriptions', fields: ['productKey'], optionalFields: ['productKey'] },
  { id: 'posthog', name: 'PostHog', purpose: 'Activation and returning customer cohorts', fields: ['projectId', 'region', 'startEvent', 'returnEvent'] },
  { id: 'ga4', name: 'Google Analytics', purpose: 'Campaign traffic and conversions', fields: ['propertyId'] },
  { id: 'hubspot', name: 'HubSpot', purpose: 'Contacts and sales opportunities', fields: [] },
  { id: 'typeform', name: 'Typeform', purpose: 'Customer survey responses', fields: ['formId'] },
  { id: 'shopify', name: 'Shopify', purpose: 'Orders and repeat purchases', fields: ['shop'] },
  { id: 'mailchimp', name: 'Mailchimp', purpose: 'Campaign clicks and audience growth', fields: ['serverPrefix', 'listId'], optionalFields: ['listId'] },
];

export interface CohortMeasurement {
  cohortSize: number | null;
  returned: number | null;
  periodStart: string;
  periodEnd: string;
  startEvent: string;
  returnEvent: string;
  windowDays: number;
}

export function cohortResult(input: CohortMeasurement | null | undefined, now = new Date()) {
  if (!input) return { status: 'unknown' as const, rate: null };
  const end = Date.parse(input.periodEnd);
  const start = Date.parse(input.periodStart);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !input.startEvent.trim() || !input.returnEvent.trim() || (!Number.isInteger(input.windowDays) || input.windowDays <= 0) || end - start < input.windowDays * 86400000) return { status: 'unknown' as const, rate: null };
  if (now.getTime() < end) return { status: 'pending' as const, rate: null };
  if (input.cohortSize == null || input.returned == null || !Number.isInteger(input.cohortSize) || !Number.isInteger(input.returned) || input.cohortSize <= 0 || input.returned < 0 || input.returned > input.cohortSize) return { status: 'unknown' as const, rate: null };
  return { status: 'complete' as const, rate: input.returned / input.cohortSize };
}

export function comparableMetricKey(metric: string, definition: Record<string, unknown>, currency?: string | null) {
  const sorted = Object.fromEntries(Object.entries(definition).sort(([a], [b]) => a.localeCompare(b)));
  return JSON.stringify([metric.trim().toLowerCase(), sorted, currency ?? null]);
}

export function sourceFreshness(capturedAt: string | null, now = Date.now()) {
  const age = capturedAt ? now - Date.parse(capturedAt) : NaN;
  return !Number.isFinite(age) ? 'Never synced' : age > 36 * 3600000 ? 'Needs refresh' : 'Up to date';
}

export function campaignUrl(url: string, channel: string, playId: string) {
  const result = new URL(url);
  if (!['https:', 'http:'].includes(result.protocol)) throw new Error('Use an HTTP or HTTPS product URL.');
  result.searchParams.set('utm_source', channel);
  result.searchParams.set('utm_medium', 'founder_campaign');
  result.searchParams.set('utm_campaign', playId);
  return result.toString();
}

/** RFC 4180 fields, including quoted newlines and escaped quotes. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); if (row.some(Boolean)) rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (quoted) throw new Error('An imported quoted field is incomplete.');
  row.push(field); if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift()?.map(value => value.replace(/^\uFEFF/, '').trim()) ?? [];
  if (!headers.length || headers.some(value => !value) || new Set(headers).size !== headers.length) throw new Error('Use unique, non-empty column headers.');
  if (rows.length > 1000) throw new Error('Import up to 1,000 rows at a time.');
  return rows.map(values => { if (values.length !== headers.length) throw new Error('Every row must match the header columns.'); return Object.fromEntries(headers.map((header, i) => [header, values[i]])); });
}
