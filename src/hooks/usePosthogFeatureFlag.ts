import { useEffect, useState } from 'react';
import { onPosthogReady } from '@/lib/analytics';

/**
 * Feature-flag hook that keeps posthog-js out of the initial module graph.
 * The previous adapter imported the full analytics SDK synchronously even on
 * anonymous landing pages that do not read a feature flag.
 */
export const useFeatureFlagEnabled = (flag: string): boolean | undefined => {
  const [enabled, setEnabled] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let detachFeatureFlags: (() => void) | undefined;
    const detachReady = onPosthogReady((client) => {
      detachFeatureFlags?.();
      const update = () => setEnabled(client.isFeatureEnabled(flag));
      update();
      detachFeatureFlags = client.onFeatureFlags(update);
    });

    return () => {
      detachReady();
      detachFeatureFlags?.();
    };
  }, [flag]);

  return enabled;
};
