function stableBucket(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 100;
}

function rolloutPercentage(raw: string | undefined, fallback: number) {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : fallback;
}

export function isFounderCycleRolloutEnabled(
  userId: string | null | undefined,
  posthogFlag?: boolean,
) {
  if (!userId) return false;
  if (import.meta.env.VITE_FOUNDER_CYCLE_V1 === 'false') return false;
  if (typeof posthogFlag === 'boolean') return posthogFlag;
  const fallback = import.meta.env.DEV || import.meta.env.VITE_FOUNDER_CYCLE_V1 === 'true' ? 100 : 0;
  return stableBucket(userId) < rolloutPercentage(
    import.meta.env.VITE_FOUNDER_CYCLE_V1_ROLLOUT_PERCENT,
    fallback,
  );
}

