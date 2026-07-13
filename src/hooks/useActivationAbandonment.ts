import { useEffect, useRef } from 'react';

import {
  trackActivationFunnelEvent,
  type ActivationFunnelProperties,
} from '@/lib/activationEntry';

export function useActivationAbandonment(
  properties: ActivationFunnelProperties,
  completed: boolean,
) {
  const propertiesRef = useRef(properties);
  const completedRef = useRef(completed);
  const trackedRef = useRef(false);
  propertiesRef.current = properties;
  completedRef.current = completed;

  useEffect(() => {
    const handlePageHide = () => {
      if (completedRef.current || trackedRef.current) return;
      trackedRef.current = true;
      trackActivationFunnelEvent('activation_abandoned', propertiesRef.current);
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, []);
}
