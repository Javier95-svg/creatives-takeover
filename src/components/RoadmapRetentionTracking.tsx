import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { hasAnalyticsConsent, onConsentChange } from '@/lib/consent';
import { recordRoadmapActivity, recordSectionTime, recordSectionVisit, syncConsentToAccount } from '@/lib/roadmapRetentionTracking';
import { createSectionTimer, type SectionTimer } from '@/lib/sectionTime';

const TICK_MS = 5_000;

export function RoadmapRetentionTracking() {
  const { user } = useAuth();
  const location = useLocation();
  const timer = useRef<SectionTimer | null>(null);

  useEffect(() => {
    if (!user) return;
    void recordRoadmapActivity({ status: 'opened' }).catch(() => {});
    void recordSectionVisit(location.pathname).catch(() => {});
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

  // Active time per section, only with analytics consent. The account's cookie
  // choice is saved too, so the adoption report knows what the time covers.
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    const sectionTimer = createSectionTimer((target, seconds) => void recordSectionTime(target, seconds).catch(() => {}));
    timer.current = sectionTimer;
    sectionTimer.setEnabled(hasAnalyticsConsent());
    sectionTimer.setVisible(document.visibilityState === 'visible');
    sectionTimer.setPath(window.location.pathname);
    void syncConsentToAccount(userId).catch(() => {});
    const offConsent = onConsentChange((status) => {
      sectionTimer.setEnabled(status === 'granted');
      void syncConsentToAccount(userId).catch(() => {});
    });

    let lastMove = 0;
    const onInput = () => sectionTimer.input();
    const onMove = () => {
      if (Date.now() - lastMove < TICK_MS) return;
      lastMove = Date.now();
      sectionTimer.input();
    };
    const onVisibility = () => sectionTimer.setVisible(document.visibilityState === 'visible');
    const onPageHide = () => sectionTimer.flush();
    const inputs = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    for (const name of inputs) window.addEventListener(name, onInput, { passive: true });
    // Scrolling inside the workspace's own panes does not bubble, so listen in capture.
    document.addEventListener('scroll', onMove, { capture: true, passive: true });
    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    const interval = window.setInterval(() => sectionTimer.tick(), TICK_MS);

    return () => {
      sectionTimer.flush();
      timer.current = null;
      offConsent();
      for (const name of inputs) window.removeEventListener(name, onInput);
      document.removeEventListener('scroll', onMove, { capture: true });
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.clearInterval(interval);
    };
  }, [user?.id]);

  useEffect(() => {
    timer.current?.setPath(location.pathname);
  }, [location.pathname]);

  return null;
}
