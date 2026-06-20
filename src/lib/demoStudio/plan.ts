// Demo Studio plan gating. Rookie and Starter always show the Creatives Takeover
// watermark on published demos; only Rising and Pro can remove it. Mirrors where
// Supademo/Arcade gate (watermark on lower tiers). See build spec section 12.
// Relative import (not the @/ alias) so this module loads under the node test runner.
import { normalizePlan, type Plan } from '../../config/planPermissions.ts';

export function canRemoveWatermark(planTier: string | null | undefined): boolean {
  const plan = normalizePlan(planTier);
  return plan === 'rising' || plan === 'pro';
}

/**
 * Resolve whether the watermark should render for a viewer, combining the demo's
 * own theme preference with the owner's plan (free tier cannot opt out).
 */
export function shouldShowWatermark(themeWatermark: boolean | undefined, planTier: string | null | undefined): boolean {
  if (!canRemoveWatermark(planTier)) return true;
  return themeWatermark !== false;
}

/**
 * Published-demo ceiling per tier. Free (rookie) is capped Arcade-style; paid
 * tiers are uncapped. Enforced at publish time in the api layer.
 */
export const PUBLISHED_DEMO_CAP: Record<Plan, number> = {
  rookie: 3,
  starter: Infinity,
  rising: Infinity,
  pro: Infinity,
};

export function getPublishedDemoCap(planTier: string | null | undefined): number {
  return PUBLISHED_DEMO_CAP[normalizePlan(planTier)];
}

export function canPublishDemo(planTier: string | null | undefined, currentPublishedCount: number): boolean {
  return currentPublishedCount < getPublishedDemoCap(planTier);
}
