import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ACTIVATION_CATALOG,
  buildActivationJourneyUrl,
  parseActivationJourney,
  type ActivationJourneyV2,
} from '@/lib/activationJourneyV2';
import { isActivationV2Enabled } from '@/lib/activationRollout';
import { trackActivationJourneyEvent, type ActivationIntent } from '@/lib/retentionSystem';

export function useActivationJourneyV2() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const posthogFlag = useFeatureFlagEnabled('onboarding-activation-v2');
  const rolloutEnabled = isActivationV2Enabled(posthogFlag);
  const [journey, setJourney] = useState<ActivationJourneyV2 | null>(null);
  const [loading, setLoading] = useState(false);
  const viewedJourney = useRef<string | null>(null);

  const requestedJourneyId = searchParams.get('journey');
  const activationRequested = searchParams.get('activation') === '1';

  useEffect(() => {
    let cancelled = false;
    if (!rolloutEnabled || !activationRequested || !requestedJourneyId || !user) {
      setJourney(null);
      return;
    }
    setLoading(true);
    void supabase
      .from('profiles')
      .select('user_preferences')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const candidate = parseActivationJourney(data?.user_preferences && typeof data.user_preferences === 'object'
          ? (data.user_preferences as Record<string, unknown>).activationJourney
          : null);
        const expectedPath = candidate ? new URL(candidate.resumeUrl || ACTIVATION_CATALOG[candidate.selectedIntent].route, window.location.origin).pathname : null;
        setJourney(candidate?.journeyId === requestedJourneyId && expectedPath === location.pathname ? candidate : null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activationRequested, location.pathname, requestedJourneyId, rolloutEnabled, user]);

  const track = useCallback(async (
    event: Parameters<typeof trackActivationJourneyEvent>[0]['event'],
    properties: Record<string, unknown> = {},
  ) => {
    if (!user || !journey) return null;
    const next = await trackActivationJourneyEvent({ userId: user.id, journey, event, properties });
    setJourney(next);
    return next;
  }, [journey, user]);

  useEffect(() => {
    if (!journey || viewedJourney.current === journey.journeyId || journey.destinationViewedAt) return;
    viewedJourney.current = journey.journeyId;
    void track('activation_destination_viewed', {
      intent: journey.selectedIntent,
      destination: location.pathname,
    });
  }, [journey, location.pathname, track]);

  const changeGoal = useCallback(async (intent: ActivationIntent) => {
    if (!user || !journey || intent === journey.selectedIntent) return;
    const changed: ActivationJourneyV2 = {
      ...journey,
      selectedIntent: intent,
      source: 'quiz',
      resumeUrl: ACTIVATION_CATALOG[intent].route,
      destinationViewedAt: null,
      firstInputAt: null,
      firstOutputAt: null,
      firstArtifactAt: null,
      completedAt: null,
      status: 'active',
    };
    await trackActivationJourneyEvent({
      userId: user.id,
      journey: changed,
      event: 'activation_goal_changed',
      properties: { previous_intent: journey.selectedIntent, selected_intent: intent },
    });
    navigate(buildActivationJourneyUrl(intent, changed.journeyId, changed.resumeUrl));
  }, [journey, navigate, user]);

  const exit = useCallback(async () => {
    if (journey) await track('activation_exited', { intent: journey.selectedIntent });
    navigate('/dashboard');
  }, [journey, navigate, track]);

  return useMemo(() => ({
    active: Boolean(journey && journey.status === 'active'),
    loading,
    journey,
    catalog: journey ? ACTIVATION_CATALOG[journey.selectedIntent] : null,
    track,
    changeGoal,
    exit,
  }), [changeGoal, exit, journey, loading, track]);
}
