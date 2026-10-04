export const WORKFLOW_STARTERS = {
  lead_capture: { label: 'Lead capture', task: 'Leave contact details for the owner', outcome: 'The owner can find the saved lead after reloading', features: ['Contact form', 'Saved leads', 'Owner sign-in'] },
  request_management: { label: 'Requests and status', task: 'Submit a request that the owner can manage', outcome: 'The owner can update a request status and reload it', features: ['Request form', 'Owner sign-in', 'Status management'] },
  customer_portal: { label: 'Customer portal', task: 'Sign in and save a personal record', outcome: 'The signed-in customer can reopen their saved record', features: ['Sign-in', 'Create a record', 'My saved records'] },
} as const;
export type WorkflowStarter = keyof typeof WORKFLOW_STARTERS;
export type WorkflowDefinition = { version: 1; starter: WorkflowStarter; customer: string; task: string; outcome: string; features: string[] };
export function publicKeyError(key:unknown):string|null {
  if(typeof key!=='string' || !key.trim())return 'Add the connected database publishable key.';
  if(/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(key))return null;
  try {const payload=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(payload.role==='anon')return null;}catch{}
  return 'Use a publishable or anon key. Secret and service-role keys cannot be placed in an app.';
}
export function workflowErrors(value: unknown): string[] {
  const w = value as WorkflowDefinition | undefined;
  if (!w || w.version !== 1 || !Object.prototype.hasOwnProperty.call(WORKFLOW_STARTERS, w.starter)) return ['Choose a supported workflow starter.'];
  const errors: string[] = [];
  for (const key of ['customer', 'task', 'outcome'] as const) if (typeof w[key] !== 'string' || !w[key].trim() || w[key].length > 500) errors.push('Describe the ' + key + ' in 1–500 characters.');
  if (!Array.isArray(w.features) || w.features.length < 1 || w.features.length > 3 || w.features.some(f => typeof f !== 'string' || !f.trim() || f.length > 200)) errors.push('Choose one to three essential features.');
  return errors;
}
export const REQUIRED_WORKFLOW_ASSERTIONS = ['customer_task', 'database_write', 'persisted_after_reload', 'access_control', 'no_runtime_errors', 'responsive_ui', 'cleanup'] as const;
export function workflowPrompt(value: unknown): string {
  if (workflowErrors(value).length) return '';
  const w = value as WorkflowDefinition;
  return '\nAGREED WORKFLOW (keep the initial build within this scope):\n' + JSON.stringify(w) + `
Use the connected Supabase project for real persistence and authentication. Never substitute localStorage, dummy arrays, or a success message for a database write. Use table ct_mvp_records with fields id (uuid), project_key (uuid), user_id (uuid nullable), email (text), body (text), status (text). Project key is the CT project ID supplied with this request. Insert project_key on every insert and filter it on every read. Lead submissions are anonymous; request and portal submissions require a real signed-in user_id. Owner views require sign-in. Requesters can read only their own requests and cannot change status. Provide a separate owner inbox to update request status. Respect RLS. Surface failed writes visibly; show success only after the database confirms the write.
For anonymous inserts use Prefer: return=minimal (anonymous visitors must not be able to read the lead list). Do not request the inserted row back. Include apikey on REST/auth calls, and the signed-in access token in Authorization for private reads and updates. Sign-in uses /auth/v1/token?grant_type=password. Persist that session and fetch records again on reload. Do not emit success before receiving a successful HTTP response. Never swallow a failed response.
Provide accessible labels and these stable data-testid hooks on real user controls:
Include a user-triggered password recovery action: POST /auth/v1/recover?redirect_to=<encoded published app origin> with email and apikey. Handle the returned recovery fragment on the published app, keep its access token out of logs, remove it from the URL, and let the user set a password through PUT /auth/v1/user with the recovery token. Owner accounts may initially have a random password, so recovery must be reachable before login. Include sign-up for customer portals using /auth/v1/signup, confirmation guidance, and visible API errors. Never send recovery or sign-up emails automatically on page load. A recovery request acknowledgement is not proof that the password changed.
ct-email, ct-body (request/portal text), ct-submit, ct-success (confirmed write only), ct-login-email, ct-login-password, ct-login-submit, ct-record (one per saved record containing its email/body), ct-status (select with new and done options), ct-save-status. Sign-in controls must be reachable on the initial page; owner records are hidden until signed in. Reload must fetch records from the database. For lead capture, ct-body is optional. For a portal or request workflow, sign in before showing ct-body and ct-submit. Add ct-logout and ct-signup-email, ct-signup-password, ct-signup-submit, ct-recover-email, ct-recover-submit, ct-new-password, ct-recover-save hooks. Owner status controls belong inside each ct-record. No external email, payment, analytics, or webhook side effects in the essential workflow.
Only HTML/CSS/browser JS or React/Vite are supported. Keep dependencies to react, react-dom, lucide-react; do not add a server runtime or install hooks. Use fetch for Supabase REST/auth so the app remains portable. Use public Supabase URL and publishable/anon key only; never service-role keys. Provide clear setup guidance when the connection or ct_mvp_records schema is missing. Preserve unrelated files on edits.
`;
}
