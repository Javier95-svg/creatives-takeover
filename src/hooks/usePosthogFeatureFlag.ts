import { useEffect, useState } from 'react';
import { onPosthogReady } from '@/lib/analytics';

/**
 * Feature-flag hook that keeps posthog-js out of the initial module graph.
 * The previous adapter imported the full analytics SDK synchronously even on
 * anonymous landing pages that do not read a feature flag.
 */
export const useFeatureFlagEnabled = (flag: string, aliases: string[] = []): boolean | undefined => {
  const [enabled, setEnabled] = useState<boolean | undefined>(undefined);
  const aliasKey = aliases.join("|");

  useEffect(() => {
    let detachFeatureFlags: (() => void) | undefined;
    const detachReady = onPosthogReady((client) => {
      detachFeatureFlags?.();
      const update = () => {
        const values = [flag, ...aliases].map((key) => client.isFeatureEnabled(key));
        if (values.some((value) => value === true)) {
          setEnabled(true);
        } else if (values.every((value) => value === false)) {
          setEnabled(false);
        } else {
          setEnabled(undefined);
        }
      };
      update();
      detachFeatureFlags = client.onFeatureFlags(update);
    });

    return () => {
      detachReady();
      detachFeatureFlags?.();
    };
  // aliasKey keeps the dependency stable for callers that pass an inline array.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aliasKey, flag]);

  return enabled;
};
