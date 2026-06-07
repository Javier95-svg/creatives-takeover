// Demo Studio plan gating. The free (rookie) tier always shows the Creatives
// Takeover watermark on published demos; paid tiers can remove it. Mirrors where
// Supademo/Arcade gate (watermark on free). See build spec section 12.
import { normalizePlan } from '@/config/planPermissions';

export function canRemoveWatermark(planTier: string | null | undefined): boolean {
  return normalizePlan(planTier) !== 'rookie';
}

/**
 * Resolve whether the watermark should render for a viewer, combining the demo's
 * own theme preference with the owner's plan (free tier cannot opt out).
 */
export function shouldShowWatermark(themeWatermark: boolean | undefined, planTier: string | null | undefined): boolean {
  if (!canRemoveWatermark(planTier)) return true;
  return themeWatermark !== false;
}
