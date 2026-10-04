// Turns a form submission from a published MVP Builder app into a lead row.
// Pure so it can be tested: field names are free-form (whatever the generated
// form used), so email, name and message are found by common names and the
// rest are kept as fields, all trimmed and size-capped.

export interface LeadRow {
  email: string | null;
  name: string | null;
  message: string | null;
  fields: Record<string, string>;
}

const EMAIL_KEYS = ['email', 'e-mail', 'mail', 'email_address', 'emailaddress', 'your-email'];
const NAME_KEYS = ['name', 'full_name', 'fullname', 'your-name', 'first_name', 'firstname'];
const MESSAGE_KEYS = ['message', 'msg', 'notes', 'comments', 'comment', 'details', 'request', 'question'];
const MAX_FIELDS = 20;

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export function toLeadRow(input: unknown): LeadRow | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const fields: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(input as Record<string, unknown>).slice(0, MAX_FIELDS)) {
    if (typeof rawValue !== 'string' && typeof rawValue !== 'number' && typeof rawValue !== 'boolean') continue;
    const key = rawKey.trim().toLowerCase().slice(0, 60);
    const value = String(rawValue).trim().slice(0, 2000);
    // Honeypot-style fields and empty values are dropped.
    if (!key || !value || /^(_|bot|honeypot|website_url_hp)/.test(key)) continue;
    fields[key] = value;
  }
  const pick = (keys: string[]) => keys.map((key) => fields[key]).find((value) => value && value.length > 0) ?? null;
  const emailCandidate = pick(EMAIL_KEYS) ?? Object.values(fields).find((value) => isEmail(value)) ?? null;
  const email = emailCandidate && isEmail(emailCandidate) ? emailCandidate.toLowerCase().slice(0, 320) : null;
  const name = pick(NAME_KEYS)?.slice(0, 200) ?? null;
  const message = pick(MESSAGE_KEYS)?.slice(0, 4000) ?? null;
  if (!email && !name && !message && Object.keys(fields).length === 0) return null;
  return { email, name, message, fields };
}

/** A honeypot field filled in means a bot; accept quietly and store nothing. */
export function isBotSubmission(input: unknown): boolean {
  if (!input || typeof input !== 'object') return false;
  const record = input as Record<string, unknown>;
  return ['_hp', 'honeypot', 'website_url_hp'].some((key) => typeof record[key] === 'string' && String(record[key]).trim().length > 0);
}
