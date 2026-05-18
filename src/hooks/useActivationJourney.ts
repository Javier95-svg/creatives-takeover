import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import {
  type ActivationEntryStage,
  type ActivationJourneyState,
  getActivationEntryStageFirstOutputLabel,
  getActivationEntryStageFromBizMapStage,
  getActivationEntryStageNextRoute,
  getActivationEntryStageStartRoute,
  getDefaultActivationJourney,
  mergeActivationJourneyIntoPreferences,
  readActivationJourneyFromPreferences,
} from '@/lib/activationJourney';
import {
  buildActivationCompletionNotification,
  buildActivationReminderNotification,
  buildActivationWelcomeNotification,
  getDefaultActivationNotificationState,
  mergeActivationNotificationStateIntoPreferences,
  readActivationNotificationStateFromPreferences,
  type ActivationNotificationState,
} from '@/lib/activationNotifications';

const WAITLIST_TABLE = 'waitlist_pages' as any;
const ICP_RESULTS_TABLE = 'icp_analysis_results' as any;
const PMF_EVIDENCE_TABLE = 'pmf_validation_evidence' as any;

interface ActivationArtifactState {
  completedAt: string | null;
}

export function useActivationJourney(entryStageOverride?: ActivationEntryStage) {
  const { user } = useAuth();
  const { currentStage, refreshProgress } = useBizMapProgress();
  const [userPreferences, setUserPreferences] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [artifactState, setArtifactState] = useState<ActivationArtifactState>({ completedAt: null });
  const userPreferencesRef = useRef<Record<string, unknown> | null>(null);
  const inFlightNotificationKeysRef = useRef(new Set<string>());

  const fetchArtifactState = useCallback(
    async (entryStage: ActivationEntryStage): Promise<ActivationArtifactState> => {
      if (!user) return { completedAt: null };

      if (entryStage === 'stage_i') {
        const { data } = await supabase
          .from(ICP_RESULTS_TABLE)
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          completedAt: (data as { created_at?: string } | null)?.created_at ?? null,
        };
      }

      if (entryStage === 'stage_ii') {
        const { data } = await supabase
          .from(WAITLIST_TABLE)
          .select('created_at, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          completedAt:
            (data as { updated_at?: string; created_at?: string } | null)?.updated_at ??
            (data as { updated_at?: string; created_at?: string } | null)?.created_at ??
            null,
        };
      }

      const { data } = await supabase
        .from(PMF_EVIDENCE_TABLE)
        .select('checklist_saved_at')
        .eq('user_id', user.id)
        .maybeSingle();

      return {
        completedAt: (data as { checklist_saved_at?: string } | null)?.checklist_saved_at ?? null,
      };
    },
    [user],
  );

  const loadPreferences = useCallback(async () => {
    if (!user) {
      setUserPreferences(null);
      userPreferencesRef.current = null;
      setArtifactState({ completedAt: null });
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data } = await supabase
      .from('profiles')
      .select('user_preferences')
      .eq('id', user.id)
      .maybeSingle();

    const prefs = (data as { user_preferences?: Record<string, unknown> | null } | null)?.user_preferences ?? {};
    setUserPreferences(prefs);
    userPreferencesRef.current = prefs;

    const storedActivation = readActivationJourneyFromPreferences(prefs);
    const resolvedEntryStage =
      entryStageOverride ||
      storedActivation?.entryStage ||
      getActivationEntryStageFromBizMapStage(currentStage);

    const nextArtifactState = await fetchArtifactState(resolvedEntryStage);
    setArtifactState(nextArtifactState);
    setLoading(false);
  }, [currentStage, entryStageOverride, fetchArtifactState, user]);

  const persistUserPreferences = useCallback(
    async (nextPreferences: Record<string, unknown>) => {
      if (!user) return;

      userPreferencesRef.current = nextPreferences;
      setUserPreferences(nextPreferences);

      const { error } = await supabase
        .from('profiles')
        .update({ user_preferences: nextPreferences })
        .eq('id', user.id);

      if (error) {
        console.error('Failed to persist user preferences:', error);
      }
    },
    [user],
  );

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  const activationJourney = useMemo<ActivationJourneyState>(() => {
    const stored = readActivationJourneyFromPreferences(userPreferences);
    const entryStage =
      entryStageOverride ||
      stored?.entryStage ||
      getActivationEntryStageFromBizMapStage(currentStage);

    if (!stored) {
      const next = getDefaultActivationJourney(entryStage);
      return artifactState.completedAt
        ? {
            ...next,
            status: 'completed_first_output',
            completedAt: artifactState.completedAt,
          }
        : next;
    }

    return {
      entryStage,
      status: artifactState.completedAt ? 'completed_first_output' : stored.status,
      startRoute: stored.startRoute || getActivationEntryStageStartRoute(entryStage),
      nextRoute: stored.nextRoute || getActivationEntryStageNextRoute(entryStage),
      firstOutputLabel: stored.firstOutputLabel || getActivationEntryStageFirstOutputLabel(entryStage),
      startedAt: stored.startedAt ?? null,
      completedAt: artifactState.completedAt ?? stored.completedAt ?? null,
    };
  }, [artifactState.completedAt, currentStage, entryStageOverride, userPreferences]);

  const persistActivationJourney = useCallback(
    async (nextState: ActivationJourneyState) => {
      if (!user) return;

      const merged = mergeActivationJourneyIntoPreferences(userPreferencesRef.current, nextState);
      await persistUserPreferences(merged);
    },
    [persistUserPreferences, user],
  );

  const persistActivationNotificationState = useCallback(
    async (nextState: ActivationNotificationState) => {
      if (!user) return;

      const merged = mergeActivationNotificationStateIntoPreferences(userPreferencesRef.current, nextState);
      await persistUserPreferences(merged);
    },
    [persistUserPreferences, user],
  );

  useEffect(() => {
    if (!user || loading) return;
    const stored = readActivationJourneyFromPreferences(userPreferences);

    if (
      stored &&
      stored.status === activationJourney.status &&
      stored.entryStage === activationJourney.entryStage &&
      stored.startRoute === activationJourney.startRoute &&
      stored.nextRoute === activationJourney.nextRoute &&
      stored.firstOutputLabel === activationJourney.firstOutputLabel &&
      (stored.completedAt ?? null) === (activationJourney.completedAt ?? null)
    ) {
      return;
    }

    void persistActivationJourney(activationJourney);
  }, [activationJourney, loading, persistActivationJourney, user, userPreferences]);

  const createActivationBellNotification = useCallback(
    async (
      notificationKey: string,
      payload: {
        slug: string;
        title: string;
        message: string;
        route: string;
        imageUrl: string;
      },
    ) => {
      if (!user) return false;
      if (inFlightNotificationKeysRef.current.has(notificationKey)) return false;

      inFlightNotificationKeysRef.current.add(notificationKey);

      try {
        const { data: existingNotification, error: existingNotificationError } = await supabase
          .from('community_notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('notification_type', 'platform_update')
          .filter('metadata->>slug', 'eq', payload.slug)
          .limit(1);

        if (existingNotificationError) {
          console.error('Failed to check activation notification:', existingNotificationError);
          return false;
        }

        if (existingNotification && existingNotification.length > 0) {
          return true;
        }

        const { error } = await supabase
          .from('community_notifications')
          .insert({
            user_id: user.id,
            actor_id: user.id,
            notification_type: 'platform_update',
            read: false,
            metadata: {
              slug: payload.slug,
              title: payload.title,
              message: payload.message,
              route: payload.route,
              image_url: payload.imageUrl,
            },
          });

        if (error) {
          console.error('Failed to create activation notification:', error);
          return false;
        }

        return true;
      } finally {
        inFlightNotificationKeysRef.current.delete(notificationKey);
      }
    },
    [user],
  );

  useEffect(() => {
    if (!user || loading || !userPreferencesRef.current) return;

    const notificationState =
      readActivationNotificationStateFromPreferences(userPreferencesRef.current) ??
      getDefaultActivationNotificationState();

    const nowIso = new Date().toISOString();
    const startedAtMs = activationJourney.startedAt ? Date.parse(activationJourney.startedAt) : Number.NaN;
    const hasBeenInactiveFor24Hours =
      Number.isFinite(startedAtMs) && Date.now() - startedAtMs >= 24 * 60 * 60 * 1000;

    const maybeNotify = async () => {
      if (
        activationJourney.status === 'completed_first_output' &&
        notificationState.firstOutputCelebratedForStage !== activationJourney.entryStage
      ) {
        const sent = await createActivationBellNotification(
          `complete:${activationJourney.entryStage}`,
          buildActivationCompletionNotification(activationJourney, userPreferencesRef.current),
        );

        if (sent) {
          await persistActivationNotificationState({
            ...notificationState,
            firstOutputCelebratedForStage: activationJourney.entryStage,
            firstOutputCelebratedAt: nowIso,
          });
        }

        return;
      }

      if (
        activationJourney.status !== 'completed_first_output' &&
        notificationState.welcomeSentForStage !== activationJourney.entryStage
      ) {
        const sent = await createActivationBellNotification(
          `welcome:${activationJourney.entryStage}`,
          buildActivationWelcomeNotification(activationJourney, userPreferencesRef.current),
        );

        if (sent) {
          await persistActivationNotificationState({
            ...notificationState,
            welcomeSentForStage: activationJourney.entryStage,
            welcomeSentAt: nowIso,
          });
        }

        return;
      }

      if (
        activationJourney.status !== 'completed_first_output' &&
        hasBeenInactiveFor24Hours &&
        notificationState.reminderSentForStage !== activationJourney.entryStage
      ) {
        const sent = await createActivationBellNotification(
          `reminder:${activationJourney.entryStage}`,
          buildActivationReminderNotification(activationJourney, userPreferencesRef.current),
        );

        if (sent) {
          await persistActivationNotificationState({
            ...notificationState,
            reminderSentForStage: activationJourney.entryStage,
            reminderSentAt: nowIso,
          });
        }
      }
    };

    void maybeNotify();
  }, [
    activationJourney,
    createActivationBellNotification,
    loading,
    persistActivationNotificationState,
    user,
  ]);

  const refreshActivation = useCallback(async () => {
    await refreshProgress();
    await loadPreferences();
  }, [loadPreferences, refreshProgress]);

  return {
    loading,
    activationJourney,
    isActivated: activationJourney.status === 'completed_first_output',
    refreshActivation,
  };
}
