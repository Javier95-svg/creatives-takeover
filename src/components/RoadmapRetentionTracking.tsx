import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { recordRoadmapActivity } from '@/lib/roadmapRetentionTracking';

export function RoadmapRetentionTracking() {
  const { user } = useAuth();
  const location = useLocation();
  useEffect(() => {
    if (!user) return;
    void recordRoadmapActivity({ status: 'opened' }).catch(() => {});
    // Visible user interaction refreshes inactivity; an idle tab does not.
    let lastRecorded = Date.now();
    let hasInput = false;
    const recordInput = () => {
      if (hasInput) return;
      hasInput = true;
      void recordRoadmapActivity({ status: 'progress' }).catch(() => {});
    };
    const recordInteraction = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastRecorded < 60_000) return;
      lastRecorded = Date.now();
      void recordRoadmapActivity().catch(() => {});
    };
    window.addEventListener('pointerdown', recordInteraction);
    window.addEventListener('keydown', recordInteraction);
    window.addEventListener('input', recordInput);
    return () => {
      window.removeEventListener('pointerdown', recordInteraction);
      window.removeEventListener('keydown', recordInteraction);
      window.removeEventListener('input', recordInput);
    };
  }, [user?.id, location.pathname]);
  return null;
}
