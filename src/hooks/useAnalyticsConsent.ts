import { useSyncExternalStore } from 'react';
import { getAnalyticsConsent, onConsentChange, type ConsentStatus } from '@/lib/consent';

/**
 * Reactive view of the visitor's analytics-consent decision.
 * Server snapshot is 'unknown' so nothing renders as consented before hydration.
 */
export function useAnalyticsConsent(): ConsentStatus {
  return useSyncExternalStore(
    onConsentChange,
    getAnalyticsConsent,
    () => 'unknown' as ConsentStatus,
  );
}
