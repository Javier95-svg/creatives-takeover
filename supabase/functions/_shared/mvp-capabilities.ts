import type { MVPBuildBrief } from './mvp-build-brief.ts';

export const MODULE_VERSION = '1.0.0';
export const RUNTIME_VERSION = '1.0.0';
export type AppModule = 'auth' | 'records' | 'leads' | 'team' | 'habits' | 'booking' | 'dashboard' | 'commerce' | 'billing';
export type AcceptanceProfile = 'static_landing' | 'lead_capture_v2' | 'private_records' | 'request_management' | 'habits' | 'booking' | 'dashboard' | 'store' | 'subscription' | 'internal';
export type CapabilityManifest = {
  version: 1; category: MVPBuildBrief['kind']; profile: AcceptanceProfile;
  runtimeVersion: string; schemaVersion: string; modules: AppModule[];
  persistence: boolean; payments: boolean;
  permissions: 'public_cta' | 'public_submit_owner_read' | 'private_user' | 'owner_staff';
  fields: { name: string; type: 'text' | 'number' | 'date'; required: boolean }[];
};
const modules: Record<AcceptanceProfile, AppModule[]> = {
  static_landing: [], lead_capture_v2: ['auth','leads'], private_records: ['auth','records'], request_management: ['auth','records'],
  habits: ['auth','records','habits'], booking: ['auth','booking'], dashboard: ['auth','dashboard'],
  store: ['auth','commerce'], subscription: ['auth','records','billing'], internal: ['auth','records','team'],
};
export function deriveCapabilities(brief: MVPBuildBrief): CapabilityManifest {
  const words = [brief.idea, brief.task, ...brief.features].join(' ');
  let profile: AcceptanceProfile;
  switch (brief.kind) {
    case 'landing': profile = /\b(lead|waitlist|signup|sign.up|email|referr|contact form|newsletter)/i.test(words) ? 'lead_capture_v2' : 'static_landing'; break;
    case 'app': profile = /\b(request|ticket|support inbox|status tracking)/i.test(words) ? 'request_management' : /\b(book|reserv|appointment|capacity)/i.test(words) ? 'booking' : /\b(habit|streak|check.in)/i.test(words) ? 'habits' : 'private_records'; break;
    case 'dashboard': profile = 'dashboard'; break;
    case 'store': profile = 'store'; break;
    case 'saas': profile = /\b(subscription|paid access|billing)/i.test(words) ? 'subscription' : /\b(request|ticket|support inbox|status tracking)/i.test(words) ? 'request_management' : 'private_records'; break;
    case 'internal': profile = /\b(request|ticket|support)/i.test(words) ? 'request_management' : 'internal'; break;
    default: throw new Error('Unsupported product category');
  }
  return { version:1, category:brief.kind, profile, runtimeVersion:RUNTIME_VERSION, schemaVersion:MODULE_VERSION,
    modules:[...modules[profile]], persistence:profile!=='static_landing', payments:profile==='store'||profile==='subscription',
    permissions:profile==='static_landing'?'public_cta':profile==='lead_capture_v2'?'public_submit_owner_read':profile==='internal'?'owner_staff':'private_user',
    fields:[{name:'title',type:'text',required:true},{name:'body',type:'text',required:false}],
  };
}
export function requiredAssertions(profile: AcceptanceProfile): string[] {
  const base=['customer_task','no_runtime_errors','responsive_ui','cleanup'];
  if(profile==='static_landing')return [...base,'cta_navigation'];
  const data=[...base,'database_write','persisted_after_reload','access_control','failed_write'];
  const extra: Record<Exclude<AcceptanceProfile,'static_landing'>, string[]> = {
    lead_capture_v2:[], request_management:['requester_status','owner_only_status'], private_records:[], habits:['dated_streak'],
    booking:['capacity_contention','cancellation','timezone'], dashboard:['calculated_totals','filtered_totals','invalid_csv'],
    store:['authoritative_price','inventory','duplicate_event','abandoned_checkout','refund'],
    subscription:['paid_access','cancellation','payment_failure','duplicate_event'], internal:['staff_permissions','history','csv_export'],
  };
  return [...data,...extra[profile]];
}
export function unsupportedRequest(idea: string): string | null {
  if(/\b(native (ios|android|mobile)|app.store binary|swift app|kotlin app)\b/i.test(idea))return 'This release builds responsive web apps. Native app-store apps are outside its scope.';
  if(/\b(multi.vendor|marketplace|warehouse management|carrier integration)\b/i.test(idea))return 'This release ships lead capture, request tracking and customer portals. Marketplaces, carrier integrations and warehouses are deferred.';
  if (/\b(arbitrary backend|server action|react native|swift app|kotlin app|node(?:\.js|js)? server|express backend|django|flask backend|rails backend|python backend)\b/i.test(idea)) return 'This release supports browser apps with managed Supabase workflows; arbitrary server stacks and native apps are deferred.';
  if (/\b(subscriptions?|payment processing|paid access|billing integration|accept payments|stripe checkout|checkout integration)\b/i.test(idea)) return 'Payments and subscriptions are deferred. This release ships leads, requests and private customer records.';
  return null;
}

export const RELEASED_MANAGED_PROFILES = ['lead_capture_v2', 'request_management', 'private_records'] as const;
