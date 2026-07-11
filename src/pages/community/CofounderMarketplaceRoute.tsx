import { useFeatureFlagEnabled } from 'posthog-js/react';
import FindCoFounder from '@/pages/community/FindCoFounder';
import CofounderMarketplacePage from '@/pages/community/CofounderMarketplacePage';
import { COFOUNDER_MARKETPLACE_FLAGS, isCofounderMarketplaceEnvironmentEnabled } from '@/lib/cofounderMarketplaceFlags';

export default function CofounderMarketplaceRoute() {
  const release1 = useFeatureFlagEnabled(COFOUNDER_MARKETPLACE_FLAGS.release1);
  if (!isCofounderMarketplaceEnvironmentEnabled() || !release1) return <FindCoFounder />;
  return <CofounderMarketplacePage />;
}
