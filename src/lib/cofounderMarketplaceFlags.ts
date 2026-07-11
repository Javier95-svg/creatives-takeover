export const COFOUNDER_MARKETPLACE_FLAGS = {
  release1: 'cofounder-marketplace-r1',
  matching: 'cofounder-marketplace-matching-r2',
  requests: 'cofounder-marketplace-requests-r3',
  trust: 'cofounder-marketplace-trust-r4',
} as const;

export function isCofounderMarketplaceEnvironmentEnabled() {
  return import.meta.env.VITE_COFUNDER_MARKETPLACE_V2 !== 'false';
}
