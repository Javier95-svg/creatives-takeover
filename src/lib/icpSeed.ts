export const ICP_SEED_STORAGE_KEY = 'ct_icp_seed';

export function normalizeIcpSeed(seed: string | null | undefined): string {
  return (seed || '').trim();
}

export function buildIcpSeedReturnPath(seed: string | null | undefined): string {
  const normalizedSeed = normalizeIcpSeed(seed);
  if (!normalizedSeed) {
    return '/icp-builder';
  }

  return `/icp-builder?seed=${encodeURIComponent(normalizedSeed)}`;
}

export function persistIcpSeed(seed: string | null | undefined): string {
  const normalizedSeed = normalizeIcpSeed(seed);

  if (typeof window === 'undefined') {
    return normalizedSeed;
  }

  if (normalizedSeed) {
    window.sessionStorage.setItem(ICP_SEED_STORAGE_KEY, normalizedSeed);
  } else {
    window.sessionStorage.removeItem(ICP_SEED_STORAGE_KEY);
  }

  return normalizedSeed;
}

export function consumeStoredIcpSeed(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const normalizedSeed = normalizeIcpSeed(window.sessionStorage.getItem(ICP_SEED_STORAGE_KEY));
  window.sessionStorage.removeItem(ICP_SEED_STORAGE_KEY);
  return normalizedSeed;
}
