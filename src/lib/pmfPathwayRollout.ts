export const PMF_PATHWAY_FEATURE_FLAG = 'pmf-pathway-v1';

export function isPMFPathwayEnvironmentEnabled(): boolean {
  return String(import.meta.env.VITE_PMF_PATHWAY_ENABLED ?? 'true').toLowerCase() !== 'false';
}
