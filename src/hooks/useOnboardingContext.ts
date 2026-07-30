import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  CONTROL_ONBOARDING_FLOW_VERSION,
  deriveOnboardingContextV1,
  EMPTY_ONBOARDING_ANSWERS_V1,
  type OnboardingAnswersV1,
  type OnboardingContextV1,
  type OnboardingSessionV1,
} from '@/lib/onboardingContext';
import { normalizeActivationIntent } from '@/lib/activationJourneyV2';
import { getLatestOnboardingSession } from '@/lib/onboardingSession';

type DashboardOnboardingContext = {
  answers: OnboardingAnswersV1;
  context: OnboardingContextV1;
  session: OnboardingSessionV1 | null;
  isLegacy: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function legacyBlocker(value: unknown): OnboardingAnswersV1['blocker'] {
  if (value === 'customer_clarity') return 'customer_clarity';
  if (value === 'demand_validation') return 'prospect_access';
  if (value === 'product_build') return 'product_delivery';
  if (value === 'go_to_market') return 'messaging';
  if (value === 'traction_growth') return 'traction_growth';
  if (value === 'fundraising') return 'fundraising';
  if (value === 'solo') return 'accountability';
  return 'customer_clarity';
}

function legacyGoal(stage: number): OnboardingAnswersV1['primaryGoal'] {
  if (stage >= 7) return 'raise';
  if (stage >= 6) return 'repeatable_growth';
  if (stage >= 5) return 'launch';
  if (stage >= 4) return 'build_product';
  if (stage >= 3) return 'win_first_customer';
  return 'validate_problem';
}

function legacyEvidence(stage: number): OnboardingAnswersV1['evidenceState'] {
  if (stage >= 6) return 'repeatable_growth';
  if (stage >= 5) return 'payment';
  if (stage >= 4) return 'commitment';
  if (stage >= 3) return 'conversations';
  if (stage >= 2) return 'prospects';
  return 'none';
}

function buildLegacyContext(profile: Record<string, unknown>): DashboardOnboardingContext {
  const preferences = asRecord(profile.user_preferences);
  const assignedStage = Number(profile.assigned_stage ?? preferences.founderStage ?? 1);
  const selectedIntent = normalizeActivationIntent(preferences.activationIntent) ?? 'run_icp';
  const startupName = typeof profile.startup_name === 'string' ? profile.startup_name.trim() : '';
  const startupDescription = typeof profile.startup_description === 'string'
    ? profile.startup_description.trim()
    : '';
  const currentFocus = typeof profile.current_focus === 'string' ? profile.current_focus.trim() : '';
  const answers: OnboardingAnswersV1 = {
    ...EMPTY_ONBOARDING_ANSWERS_V1,
    startupBrief: startupDescription || [startupName, currentFocus].filter(Boolean).join(' — '),
    businessModel: 'other',
    evidenceState: legacyEvidence(assignedStage),
    customerCountBand: assignedStage >= 5 ? '1' : '',
    primaryGoal: legacyGoal(assignedStage),
    blocker: legacyBlocker(profile.quiz_biggest_challenge ?? preferences.primaryPain),
    weeklyCapacityHours: 5,
    sectors: Array.isArray(profile.startup_industry)
      ? profile.startup_industry.filter((item): item is string => typeof item === 'string')
      : [],
    country: typeof profile.country === 'string' ? profile.country : '',
    selectedIntent,
  };
  return {
    answers,
    context: deriveOnboardingContextV1(answers, {
      flowVersion: CONTROL_ONBOARDING_FLOW_VERSION,
      selectedIntent,
      dataCompleteness: 'legacy_partial',
    }),
    session: null,
    isLegacy: true,
  };
}

export function useOnboardingContext() {
  const { user } = useAuth();
  const [value, setValue] = useState<DashboardOnboardingContext | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setValue(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const session = await getLatestOnboardingSession();
      if (session?.derived_context) {
        setValue({
          answers: { ...EMPTY_ONBOARDING_ANSWERS_V1, ...session.answers } as OnboardingAnswersV1,
          context: session.derived_context,
          session,
          isLegacy: false,
        });
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('assigned_stage, country, current_focus, quiz_biggest_challenge, startup_description, startup_industry, startup_name, user_preferences')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      setValue(buildLegacyContext(asRecord(data)));
    } catch (error) {
      console.warn('Unable to load onboarding context; dashboard defaults remain available.', error);
      setValue(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { value, loading, refetch: load };
}
