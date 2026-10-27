import { PULSE_UUID } from './pulseScope.ts';

export const PULSE_STAGES = {
  icp: { title: 'ICP', route: '/icp-builder' },
  pmf: { title: 'PMF Lab', route: '/pmf-lab' },
  mvp: { title: 'MVP Builder', route: '/mvp-builder' },
  gtm: { title: 'GTM Strategy', route: '/go-to-market' },
  demo: { title: 'Demo Studio', route: '/demo-studio' },
  traction: { title: 'Traction Engine', route: '/traction-engine' },
  tasks: { title: 'Account tasks', route: '/dashboard/tasks' },
  bookings: { title: 'Your bookings', route: '/mentor/bookings' },
  enquiries: { title: 'Your contact activity', route: '/marketplace/enquiries' },
  matches: { title: 'Your investor matches', route: '/investors/matches' },
} as const;
export type PulseStage = keyof typeof PULSE_STAGES;
export interface PulseSourceReference {
  stage: PulseStage;
  id?: string;
  state: 'available' | 'missing' | 'unavailable';
  updatedAt?: string | null;
  basis?: string;
}
export interface PulseRetrievalReference {
  kind: 'pedia' | 'article' | 'podcast' | 'service' | 'mentor' | 'investor' | 'cofounder' | 'vc' | 'accelerator' | 'directory' | 'community';
  id: string;
  title: string;
  route: string;
  basis: string;
  updatedAt?: string | null;
}

export function validatePulseRetrievalSources(value: unknown): PulseRetrievalReference[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(['pedia', 'article', 'podcast', 'service', 'mentor', 'investor', 'cofounder', 'vc', 'accelerator', 'directory', 'community']);
  return value.slice(0, 6).flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const source = item as PulseRetrievalReference;
    if (!allowed.has(source.kind) || typeof source.id !== 'string' || typeof source.title !== 'string' || typeof source.basis !== 'string') return [];
    const expected = source.kind === 'pedia' ? `/startup-pedia/${encodeURIComponent(source.id)}`
      : source.kind === 'cofounder' && PULSE_UUID.test(source.id) ? `/co-founder/listing/${source.id}`
      : source.kind === 'community' && PULSE_UUID.test(source.id) ? `/rooms/posts/${source.id}`
      : source.kind === 'directory' && /^[a-z0-9-]+$/.test(source.id) ? `/directories?source=pulse&directory=${encodeURIComponent(source.id)}`
      : (source.kind === 'vc' || source.kind === 'accelerator') && PULSE_UUID.test(source.id) && /^\/insighta\/(?:vc|accelerator)\/[a-z0-9_-]+$/i.test(source.route)
        ? source.route : null;
    if (!expected) return [];
    return [{ kind: source.kind, id: source.id, title: source.title.slice(0, 180), route: expected,
      basis: source.basis.slice(0, 120), updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : null }];
  });
}
export function validatePulseSources(value: unknown): PulseSourceReference[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.slice(0, Object.keys(PULSE_STAGES).length).flatMap(item => {
    if (!item || !Object.prototype.hasOwnProperty.call(PULSE_STAGES, item.stage) || seen.has(item.stage) || !['available', 'missing', 'unavailable'].includes(item.state)) return [];
    if (item.state === 'available' && (typeof item.id !== 'string' || !PULSE_UUID.test(item.id))) return [];
    seen.add(item.stage);
    return [{ stage: item.stage, state: item.state, id: item.id,
      updatedAt: typeof item.updatedAt === 'string' && Number.isFinite(Date.parse(item.updatedAt)) ? item.updatedAt : null,
      basis: typeof item.basis === 'string' ? item.basis.slice(0, 200) : undefined }];
  });
}
export function pulseSourceNotice(sources: PulseSourceReference[]): string {
  const failed = sources.filter(source => source.state === 'unavailable').map(source => PULSE_STAGES[source.stage].title);
  return failed.length ? `Could not load: ${failed.join(', ')}. Pulse will identify gaps rather than guess.` : '';
}
