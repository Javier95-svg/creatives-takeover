import {unsupportedRequest} from './mvp-capabilities.ts';
export const BUILD_TYPES = {
  landing: { label: 'Landing page', example: 'A landing page for a SaaS analytics tool', task: 'Understand the offer and follow the main call to action', features: ['Product story', 'Pricing and FAQ', 'Call to action'], data: false, guidance: 'Build working navigation and a real supplied CTA. A contact form requires a configured destination; never pretend to send it.' },
  app: { label: 'Web & mobile app', example: 'A habit tracker with daily check-ins and streaks', task: 'Save a record and return to update it', features: ['Sign-in', 'Saved records', 'Mobile-friendly interactions'], data: true, guidance: 'Build a responsive web app. Do not claim native installation, background reminders or app-store distribution. Check-ins and streaks must derive from stored dates, not fabricated numbers.' },
  dashboard: { label: 'Dashboard', example: 'A dashboard for my startup weekly metrics', task: 'Add real data and filter the resulting metrics', features: ['Data entry or CSV import', 'Charts and totals', 'Date and category filters'], data: true, guidance: 'Calculate every chart and total from the same supplied/imported records. Include CSV validation, empty states and filters. Clearly label sample data and keep it separate from live data.' },
  store: { label: 'Online store', example: 'An online store for handmade ceramics', task: 'Browse products, manage a cart and continue to checkout', features: ['Product catalogue', 'Cart and quantities', 'Hosted checkout'], data: true, guidance: 'Build a functional cart with quantities and calculated totals. Only use supplied provider-hosted checkout URLs. Never accept card numbers, simulate payment success, trust a query string as payment proof, or invent order confirmation. Multi-item prices and fulfillment require a real provider integration; explain that setup.' },
  saas: { label: 'SaaS MVP', example: 'A customer portal for saving and managing project notes', task: 'Sign in, complete onboarding and use the core saved workflow', features: ['Onboarding and sign-in', 'Core saved workflow', 'Pricing'], data: true, guidance: 'Implement real session handling and private saved records when connected. Pricing buttons need supplied checkout URLs. Subscription entitlements require server verification; never grant paid access from a return URL.' },
  internal: { label: 'Internal tool', example: 'An internal support request panel for my team', task: 'Find a request, update its status and retrieve the saved change', features: ['Staff sign-in', 'Searchable records', 'Status management'], data: true, guidance: 'Enforce staff ownership through database policies, not hiding controls. Provide search, filters, edit validation, visible save failures and a status history when supported.' },
} as const;

export type BuildType = keyof typeof BUILD_TYPES;
export interface MVPBuildBrief {
  version: 1;
  kind: BuildType;
  idea: string;
  customer: string;
  task: string;
  features: string[];
  delivery: 'preview' | 'connected';
  ctaUrl?: string;
  checkoutUrl?: string;
}

export function inferBuildType(idea: string): BuildType {
  if (/\b(stores?|shops?|commerce|checkout|carts?)\b/i.test(idea)) return 'store';
  if (/\b(admin|internal|support team|ops)\b/i.test(idea)) return 'internal';
  if (/\b(dashboards?|metrics|charts?|reports?)\b/i.test(idea) && !/landing page/i.test(idea)) return 'dashboard';
  if (/\b(landing|waitlist|portfolio|website|lead capture|lead form|capture leads|collect leads|newsletter|contact form)\b/i.test(idea)) return 'landing';
  if (/\b(saas|portal|subscription)\b/i.test(idea)) return 'saas';
  return 'app';
}

export function createBuildBrief(idea: string, kind = inferBuildType(idea)): MVPBuildBrief {
  const defaults=BUILD_TYPES[kind];
  return {version:1,kind,idea:idea.slice(0,4000),customer:'',task:defaults.task,features:[...defaults.features],delivery:'preview'};
}

export function buildBriefErrors(value: unknown): string[] {
  const b=value as MVPBuildBrief | undefined;
  if(!b || b.version!==1 || !Object.prototype.hasOwnProperty.call(BUILD_TYPES,b.kind))return ['Choose a product type.'];
  const errors:string[]=[];
  for(const k of ['idea','customer','task'] as const)if(typeof b[k]!=='string' || !b[k].trim() || b[k].length>(k==='idea'?4000:500))errors.push('Complete the '+k+'.');
  if(!['preview','connected'].includes(b.delivery))errors.push('Choose a build mode.');
  if(!Array.isArray(b.features) || b.features.length<1 || b.features.length>3 || b.features.some(f=>typeof f!=='string'||!f.trim()||f.length>200))errors.push('Choose one to three essential features.');
  const unsupported=unsupportedRequest([b.idea,b.task,...(Array.isArray(b.features)?b.features:[])].filter(f=>typeof f==='string').join(' '));
  if(unsupported)errors.push(unsupported);
  for(const k of ['ctaUrl','checkoutUrl'] as const)if(b[k]){try{const u=new URL(b[k]!);if(u.protocol!=='https:' || u.username || u.password)throw Error();}catch{errors.push('Use a complete HTTPS '+(k==='ctaUrl'?'call-to-action':'checkout')+' URL.');}}
  return errors;
}

export function buildBriefPrompt(brief: MVPBuildBrief): string {
  if(buildBriefErrors(brief).length)throw new Error('Invalid build brief');
  return 'APPROVED PRODUCT BRIEF\n'+JSON.stringify(brief)+'\n'+BUILD_TYPES[brief.kind].guidance+`
Implement every essential feature as a usable interaction, including loading, empty and error states. Use accessible labels, keyboard operation and a layout that fits 390px screens.
For a CTA-only landing page, put data-testid="ct-cta" on the primary anchor and use the exact supplied ctaUrl. Every hash navigation link must point to an existing section. A static page with no form or account does not need a database.
${brief.delivery==='preview'?'This is an explicitly chosen preview/export build. Display a visible Preview badge where data or authentication is simulated. Browser-only storage may support real local interactions, but label it "Saved on this device". Never describe browser storage as cloud persistence or claim a real account was authenticated. Disable external submissions without a configured destination and show what needs connecting.':'This is a connected build. Use the supplied public database configuration and actual authenticated requests. Never substitute sample data, localStorage or success messages for confirmed database writes. Report missing schema/connection instead of silently falling back.'}
Never fabricate customers, testimonials, payment confirmations, credentials or connected providers. Never put service-role or secret keys in browser code. Payment/email/notification services are only connected when actual configuration is supplied. Preserve unrelated files on edits. Record remaining setup honestly in setup_instructions and generation_notes.
`;
}
