function stableBucket(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 100;
}

function readPercentage(raw: string | undefined, fallback: number) {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : fallback;
}

export function isGTMStrategistV2Enabled(userId: string | null | undefined, posthogFlag?: boolean) {
  if (!userId) return import.meta.env.DEV;
  if (import.meta.env.VITE_GTM_STRATEGIST_V2_ENABLED === 'false') return false;
  if (typeof posthogFlag === 'boolean') return posthogFlag;
  const fallback = import.meta.env.DEV ? 100 : 0;
  const percentage = readPercentage(import.meta.env.VITE_GTM_V2_ROLLOUT_PERCENT, fallback);
  return stableBucket(userId) < percentage;
}
