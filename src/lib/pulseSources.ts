import { PULSE_UUID } from './pulseScope.ts';

export const PULSE_STAGES = {
  icp: { title: 'ICP', route: '/icp-builder' },
  pmf: { title: 'PMF Lab', route: '/pmf-lab' },
  mvp: { title: 'MVP Builder', route: '/mvp-builder' },
  gtm: { title: 'GTM Strategy', route: '/go-to-market' },
  demo: { title: 'Demo Studio', route: '/demo-studio' },
  traction: { title: 'Traction Engine', route: '/traction-engine' },
} as const;
export type PulseStage = keyof typeof PULSE_STAGES;
export interface PulseSourceReference {
  stage: PulseStage;
  id?: string;
  state: 'available' | 'missing' | 'unavailable';
  updatedAt?: string | null;
  basis?: string;
}
export function validatePulseSources(value: unknown): PulseSourceReference[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.slice(0, 6).flatMap(item => {
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
