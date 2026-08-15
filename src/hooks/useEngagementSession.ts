import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { captureEvent } from '@/lib/analytics';
import {
  ENGAGEMENT_RECENT_INTERACTION_MS,
  ENGAGEMENT_SESSION_TIMEOUT_MS,
  ENGAGEMENT_TICK_MS,
  MEANINGFUL_ACTION_EVENT,
  createEngagementSession,
  engagementSummarySignature,
  resolveEngagementSection,
  shouldStartNewEngagementSession,
  type EngagementSessionState,
  type MeaningfulActionDetail,
} from '@/lib/engagementSession';

const STORAGE_KEY = 'ct_engagement_session_v2';

function readStoredSession(): EngagementSessionState | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as EngagementSessionState;
    return value && typeof value.id === 'string' && typeof value.lastActivityAt === 'number'
      ? value
      : null;
  } catch {
    return null;
  }
}

function writeStoredSession(state: EngagementSessionState) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Engagement measurement must never block the product experience.
  }
}

function daysSince(dateValue: string | null | undefined): number {
  if (!dateValue) return 0;
  const timestamp = new Date(dateValue).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

export function useEngagementSession() {
  const location = useLocation();
  const { user } = useAuth();
  const routeRef = useRef(location.pathname);
  const stateRef = useRef<EngagementSessionState | null>(null);
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    const now = Date.now();
    const section = resolveEngagementSection(location.pathname);
    const stored = readStoredSession();
    stateRef.current = shouldStartNewEngagementSession(stored, now)
      ? createEngagementSession(now, section)
      : { ...stored!, currentSection: section };
    writeStoredSession(stateRef.current);

    const plan = () => {
      const currentUser = userRef.current;
      const metadataPlan = currentUser?.user_metadata?.subscription_tier
        ?? currentUser?.app_metadata?.subscription_tier;
      return typeof metadataPlan === 'string' ? metadataPlan.toLowerCase() : 'unknown';
    };

    const startIfNeeded = () => {
      const state = stateRef.current;
      if (!state || state.startedEventSent) return;
      captureEvent('engagement_session_started', {
        session_id: state.id,
        section: state.entrySection,
        plan: plan(),
        days_since_signup: daysSince(userRef.current?.created_at),
      });
      state.startedEventSent = true;
      writeStoredSession(state);
    };

    const emitSummary = (completionReason: string, isFinal = false) => {
      const state = stateRef.current;
      if (!state) return;
      const signature = engagementSummarySignature(state);
      if (!isFinal && signature === state.lastSummarySignature) return;
      state.summarySequence += 1;
      state.lastSummarySignature = signature;
      captureEvent('engagement_session_completed', {
        session_id: state.id,
        section: state.currentSection,
        plan: plan(),
        days_since_signup: daysSince(userRef.current?.created_at),
        active_seconds: state.activeSeconds,
        interaction_count: state.interactionCount,
        meaningful_action_count: state.meaningfulActionCount,
        summary_sequence: state.summarySequence,
        completion_reason: completionReason,
        is_final: isFinal,
      });
      writeStoredSession(state);
    };

    const ensureCurrentSession = () => {
      const timestamp = Date.now();
      const current = stateRef.current;
      if (!shouldStartNewEngagementSession(current, timestamp)) return current!;
      if (current) emitSummary('inactivity_timeout', true);
      const next = createEngagementSession(timestamp, resolveEngagementSection(routeRef.current));
      stateRef.current = next;
      writeStoredSession(next);
      startIfNeeded();
      return next;
    };

    const recordInteraction = () => {
      const state = ensureCurrentSession();
      const timestamp = Date.now();
      state.lastActivityAt = timestamp;
      state.lastInteractionAt = timestamp;
      state.interactionCount += 1;
      writeStoredSession(state);
    };

    const recordMeaningful = (event: Event) => {
      const detail = (event as CustomEvent<MeaningfulActionDetail>).detail;
      const state = ensureCurrentSession();
      state.lastActivityAt = Date.now();
      state.lastInteractionAt = state.lastActivityAt;
      state.meaningfulActionCount += 1;
      state.currentSection = detail?.section ?? state.currentSection;
      writeStoredSession(state);
    };

    const tick = () => {
      const state = ensureCurrentSession();
      const timestamp = Date.now();
      if (
        document.visibilityState === 'visible'
        && timestamp - state.lastInteractionAt <= ENGAGEMENT_RECENT_INTERACTION_MS
      ) {
        state.activeSeconds += ENGAGEMENT_TICK_MS / 1000;
        state.lastActivityAt = timestamp;
        writeStoredSession(state);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') emitSummary('visibility_hidden');
      else recordInteraction();
    };
    const onPageHide = () => emitSummary('pagehide', true);

    startIfNeeded();
    const interval = window.setInterval(tick, ENGAGEMENT_TICK_MS);
    const checkpoint = window.setInterval(() => emitSummary('periodic_checkpoint'), 60_000);
    const passiveEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    passiveEvents.forEach((eventName) => window.addEventListener(eventName, recordInteraction, { passive: true }));
    window.addEventListener(MEANINGFUL_ACTION_EVENT, recordMeaningful);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      emitSummary('provider_unmounted');
      window.clearInterval(interval);
      window.clearInterval(checkpoint);
      passiveEvents.forEach((eventName) => window.removeEventListener(eventName, recordInteraction));
      window.removeEventListener(MEANINGFUL_ACTION_EVENT, recordMeaningful);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const previousRoute = routeRef.current;
    routeRef.current = location.pathname;
    const state = stateRef.current;
    if (!state) return;
    state.currentSection = resolveEngagementSection(location.pathname);
    state.lastActivityAt = Date.now();
    writeStoredSession(state);
    if (previousRoute !== location.pathname) {
      captureEvent('engagement_section_transitioned', {
        session_id: state.id,
        from_section: resolveEngagementSection(previousRoute),
        to_section: state.currentSection,
      });
    }
  }, [location.pathname]);
}
