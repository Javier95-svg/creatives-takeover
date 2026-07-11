import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Loader2,
  MapPin,
  Rocket,
  Search,
  Sparkles,
  Target,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useFeatureFlagEnabled } from 'posthog-js/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ANGEL_SECTOR_OPTIONS } from '@/data/angelSectors';
import { COUNTRY_OPTIONS } from '@/data/countries';
import {
  captureEvent,
  trackActivationFunnelEvent,
  trackOnboardingAbandoned,
  trackOnboardingCompleted,
  trackOnboardingStepCompleted,
} from '@/lib/analytics';
import { trackActivity } from '@/lib/activity';
import { cn } from '@/lib/utils';
import { refreshOnboardingMentorRecommendations } from '@/lib/onboardingMentorRecommendations';
import { seedDefaultRoutineForOnboarding } from '@/lib/onboardingPath';
import { getActivationRoute, startActivationJourney, trackActivationJourneyEvent, trackRetentionEvent, type ActivationIntent } from '@/lib/retentionSystem';
import {
  ACTIVATION_CATALOG,
  buildActivationJourneyUrl,
  createActivationJourney,
  getStageAvailableIntents,
  normalizeActivationIntent,
  recommendActivation,
  type ActivationRecommendation,
  type ActivationJourneyV2,
} from '@/lib/activationJourneyV2';
import { isActivationV2Enabled } from '@/lib/activationRollout';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { normalizePlan } from '@/config/planPermissions';
import { useSubscription } from '@/hooks/useSubscription';
import { useCredits } from '@/hooks/useCredits';
import {
  assignFounderStageV3,
  createQuizAnswersV3Payload,
  FOUNDER_STAGE_QUESTIONS,
  FUNDRAISING_STATUS_QUESTION,
  mapFounderStageToBusinessStage,
  STAGES,
  type FounderBlocker,
  type FounderStageDiagnosticResult,
  type FounderStageQuestionDef,
  type FounderStageQuizAnswersV3,
} from '@/lib/stageDiagnostic';

interface OnboardingData {
  stageAnswers: Partial<FounderStageQuizAnswersV3>;
  startupSectors: string[];
  country: string;
  cofounderSituation: CofounderSituation | '';
  activationIntent: ActivationIntent | '';
}

type CofounderSituation = 'actively_looking' | 'solo_ok';
type StepKind = 'stage' | 'fundraising' | 'sector' | 'country' | 'cofounder' | 'activation';

interface OnboardingStep {
  id: string;
  kind: StepKind;
  chapter: string;
  label: string;
}

interface ActivationCard {
  value: ActivationIntent;
  headline: string;
  sub: string;
  cta: string;
  icon: LucideIcon;
  /** Small highlight chip rendered next to the headline (e.g. the default path). */
  badge?: string;
}

// Each primary blocker seeds the mentor-expertise areas used for matching, so we
// no longer need a separate support-areas question.
const BLOCKER_TO_SUPPORT_AREAS: Record<FounderBlocker, string[]> = {
  customer_clarity: ['Strategy'],
  demand_validation: ['Sales', 'Growth Marketing'],
  product_build: ['Product Development', 'Technology'],
  go_to_market: ['Growth Marketing', 'Sales'],
  traction_growth: ['Growth Marketing'],
  fundraising: ['Fundraising'],
  solo: ['Strategy', 'HR & Team Building'],
};

function deriveSupportAreas(blocker?: FounderBlocker): string[] {
  if (!blocker) return [];
  return Array.from(new Set(BLOCKER_TO_SUPPORT_AREAS[blocker] ?? []));
}

// Mentor-first on purpose: mentorship actions are the most common first
// artifact in the data, so the human path leads and the tools follow.
const ACTIVATION_CARDS: ActivationCard[] = [
  {
    value: 'find_mentor',
    headline: 'Find a mentor',
    sub: "Talk to someone who's built one — your first message to any mentor is free.",
    cta: 'Open mentor matches',
    icon: Users,
    badge: 'Most founders start here',
  },
  {
    value: 'build_demo',
    headline: 'Build demo and pitch video',
    sub: 'Turn screenshots into a live demo first, then save it as your first launch asset.',
    cta: 'Open Demo Studio',
    icon: Rocket,
  },
  {
    value: 'run_icp',
    headline: 'Run ICP analysis',
    sub: 'Turn your context into a sharper ideal customer profile.',
    cta: 'Start ICP Builder',
    icon: Target,
  },
  {
    value: 'start_validation',
    headline: 'Start validation',
    sub: 'Score one idea and choose the next concrete move.',
    cta: 'Start Decision Sprint',
    icon: Zap,
  },
];

const V2_ONBOARDING_INTENTS: ActivationIntent[] = ['find_mentor', 'build_demo', 'run_icp', 'start_validation', 'build_mvp', 'plan_gtm', 'log_traction', 'analyze_pitch_deck'];

const emptyOnboardingData: OnboardingData = {
  stageAnswers: {},
  startupSectors: [],
  country: '',
  cofounderSituation: '',
  activationIntent: '',
};

// Increment this whenever the question set changes so PostHog cohorts stay clean.
const QUIZ_VERSION = 5;

interface OnboardingFormProps {
  onComplete?: (startRoute?: string) => void;
}

function toggleValue(current: string[], value: string) {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

// Draft persists in localStorage (not sessionStorage) so closing the tab
// mid-quiz doesn't lose progress; the sessionStorage read is a migration
// fallback for drafts saved before this change.
function readOnboardingDraft(userId: string | undefined): string | null {
  if (!userId) return null;
  const key = `onboarding_draft_${userId}`;
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

// Best-effort guess from the browser locale so most users just confirm their
// country instead of searching for it.
function detectCountryFromLocale(): string | null {
  try {
    const region = (navigator.language || '').split('-')[1];
    if (!region || region.length !== 2) return null;
    const name = new Intl.DisplayNames(['en'], { type: 'region' }).of(region.toUpperCase());
    if (!name) return null;
    const lower = name.toLowerCase();
    return (
      COUNTRY_OPTIONS.find((country) => country.toLowerCase() === lower) ??
      COUNTRY_OPTIONS.find((country) => country.toLowerCase().startsWith(lower)) ??
      null
    );
  } catch {
    return null;
  }
}

function hasCompleteStageAnswers(stageAnswers: Partial<FounderStageQuizAnswersV3>) {
  return FOUNDER_STAGE_QUESTIONS.every((question) => Boolean(stageAnswers[question.id]));
}

function getStageDiagnostic(stageAnswers: Partial<FounderStageQuizAnswersV3>): FounderStageDiagnosticResult | null {
  if (!hasCompleteStageAnswers(stageAnswers)) return null;
  return assignFounderStageV3(stageAnswers as FounderStageQuizAnswersV3);
}

function appendActivationParams(route: string, intent: ActivationIntent) {
  const separator = route.includes('?') ? '&' : '?';
  if (route.includes('activation=')) {
    return `${route}${separator}intent=${intent}`;
  }
  return `${route}${separator}activation=1&intent=${intent}`;
}

export const OnboardingForm = ({ onComplete }: OnboardingFormProps) => {
  const { user } = useAuth();
  const activationFlag = useFeatureFlagEnabled('onboarding-activation-v2');
  const activationV2Enabled = isActivationV2Enabled(activationFlag);
  const { checkFeatureAccess } = useFeatureGating();
  const { subscriptionData } = useSubscription({ fetchTiers: false });
  const { totalAvailable, loading: creditsLoading } = useCredits();
  const currentPlan = normalizePlan(subscriptionData?.subscription_tier);
  const [existingPreferences, setExistingPreferences] = useState<Record<string, unknown>>({});
  const [explicitIntentChoice, setExplicitIntentChoice] = useState(false);
  const [handoff, setHandoff] = useState<{ journey: ActivationJourneyV2; stageName: string } | null>(null);
  const [countrySearch, setCountrySearch] = useState('');
  const [currentStep, setCurrentStep] = useState(() => {
    try {
      const draft = readOnboardingDraft(user?.id);
      return draft ? (JSON.parse(draft).currentStep ?? 0) : 0;
    } catch {
      return 0;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [startedAt] = useState(Date.now());
  const stepEnteredAt = useRef(Date.now());
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const [formData, setFormData] = useState<OnboardingData>(() => {
    try {
      const draft = readOnboardingDraft(user?.id);
      if (draft) {
        const parsed = JSON.parse(draft);
        return {
          ...emptyOnboardingData,
          stageAnswers: parsed.stageAnswers ?? {},
          startupSectors: Array.isArray(parsed.startupSectors) ? parsed.startupSectors : [],
          country: parsed.country ?? '',
          cofounderSituation: parsed.cofounderSituation ?? '',
          activationIntent: parsed.activationIntent ?? '',
        };
      }
    } catch {
      /* ignore */
    }
    return { ...emptyOnboardingData, country: detectCountryFromLocale() ?? '' };
  });

  useEffect(() => {
    if (!user?.id || !activationV2Enabled) return;
    let cancelled = false;
    void supabase.from('profiles').select('user_preferences').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (!cancelled && data?.user_preferences && typeof data.user_preferences === 'object' && !Array.isArray(data.user_preferences)) {
        setExistingPreferences(data.user_preferences as Record<string, unknown>);
      }
    });
    return () => { cancelled = true; };
  }, [activationV2Enabled, user?.id]);

  // Steps are dynamic: the fundraising follow-up only appears when the primary
  // blocker is fundraising, so it never taxes the other ~85% of founders.
  const steps = useMemo<OnboardingStep[]>(() => {
    const list: OnboardingStep[] = FOUNDER_STAGE_QUESTIONS.map((question) => ({
      id: question.id,
      kind: 'stage' as const,
      chapter: 'Stage',
      label: 'Founder stage',
    }));

    if (formData.stageAnswers.blocker === 'fundraising') {
      list.push({ id: 'fundraisingStatus', kind: 'fundraising', chapter: 'Stage', label: 'Fundraising' });
    }

    list.push(
      { id: 'startup_sector', kind: 'sector', chapter: 'Context', label: 'Market' },
      { id: 'country', kind: 'country', chapter: 'Context', label: 'Location' },
      { id: 'cofounder_situation', kind: 'cofounder', chapter: 'Team', label: 'Co-founder' },
      { id: 'activation_intent', kind: 'activation', chapter: 'First action', label: 'Launchpad' },
    );

    return list;
  }, [formData.stageAnswers.blocker]);

  const totalSteps = steps.length;
  // Declared here (before the abandonment ref/effect below use it) to avoid a
  // temporal-dead-zone crash on render.
  const step = steps[Math.min(currentStep, totalSteps - 1)];

  // Keep currentStep valid if the conditional fundraising step disappears.
  useEffect(() => {
    if (currentStep > totalSteps - 1) {
      setCurrentStep(totalSteps - 1);
    }
  }, [currentStep, totalSteps]);

  // Fire abandonment event when the user navigates away mid-quiz.
  // Uses a ref snapshot so the closure captures the latest values without
  // needing them in the dependency array (which would re-register on every step).
  const abandonRef = useRef({ currentStep, totalSteps, step, startedAt });
  useEffect(() => {
    abandonRef.current = { currentStep, totalSteps, step, startedAt };
  }, [currentStep, totalSteps, step, startedAt]);

  useEffect(() => {
    return () => {
      const { currentStep: s, totalSteps: t, step: st, startedAt: sa } = abandonRef.current;
      // Only fire if the user left before the final step (completion is tracked separately).
      if (s < t - 1) {
        trackOnboardingAbandoned({
          last_step: s + 1,
          last_step_name: st.id,
          total_steps: t,
          elapsed_ms: Date.now() - sa,
          quiz_version: QUIZ_VERSION,
        });
      }
    };
     
  }, []);

  // Drop a stale fundraising answer if the blocker is no longer fundraising,
  // so it can't inflate the Fundraising stage.
  useEffect(() => {
    if (formData.stageAnswers.blocker !== 'fundraising' && formData.stageAnswers.fundraisingStatus) {
      setFormData((prev) => {
        const { fundraisingStatus, ...restStageAnswers } = prev.stageAnswers;
        return { ...prev, stageAnswers: restStageAnswers };
      });
    }
  }, [formData.stageAnswers.blocker, formData.stageAnswers.fundraisingStatus]);

  useEffect(() => {
    if (!user?.id) return;
    try {
      localStorage.setItem(`onboarding_draft_${user.id}`, JSON.stringify({
        currentStep,
        stageAnswers: formData.stageAnswers,
        startupSectors: formData.startupSectors,
        country: formData.country,
        cofounderSituation: formData.cofounderSituation,
        activationIntent: formData.activationIntent,
      }));
    } catch {
      /* ignore */
    }
  }, [
    currentStep,
    formData.activationIntent,
    formData.cofounderSituation,
    formData.country,
    formData.stageAnswers,
    formData.startupSectors,
    user?.id,
  ]);

  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) return COUNTRY_OPTIONS.slice(0, 12);
    return COUNTRY_OPTIONS.filter((country) => country.toLowerCase().includes(query)).slice(0, 12);
  }, [countrySearch]);

  const progress = ((currentStep + 1) / totalSteps) * 100;
  const diagnostic = useMemo(() => getStageDiagnostic(formData.stageAnswers), [formData.stageAnswers]);
  const assignedStage = diagnostic?.assignedStage ?? null;
  const stageMeta = assignedStage ? STAGES[assignedStage] : null;
  const availableIntents = useMemo(() => {
    const planIntents = new Set(getStageAvailableIntents(currentPlan));
    const originIntent = normalizeActivationIntent(existingPreferences.activationIntent);
    const candidates = originIntent && !V2_ONBOARDING_INTENTS.includes(originIntent)
      ? [...V2_ONBOARDING_INTENTS, originIntent]
      : V2_ONBOARDING_INTENTS;
    return candidates.filter((intent) => {
      if (!planIntents.has(intent)) return false;
      if (!creditsLoading && totalAvailable <= 0 && ['plan_gtm', 'log_traction', 'analyze_pitch_deck'].includes(intent)) return false;
      const featureKey = ACTIVATION_CATALOG[intent].featureKey;
      if (!featureKey) return true;
      try {
        return checkFeatureAccess(featureKey).hasAccess;
      } catch {
        return true;
      }
    });
  }, [checkFeatureAccess, creditsLoading, currentPlan, existingPreferences.activationIntent, totalAvailable]);
  const recommendation = useMemo<ActivationRecommendation | null>(() => {
    if (!diagnostic || !formData.stageAnswers.blocker || !formData.stageAnswers.productStatus) return null;
    return recommendActivation({
      assignedStage: diagnostic.assignedStage,
      blocker: formData.stageAnswers.blocker,
      productStatus: formData.stageAnswers.productStatus,
      userPreferences: existingPreferences,
      availableIntents,
    });
  }, [availableIntents, diagnostic, existingPreferences, formData.stageAnswers.blocker, formData.stageAnswers.productStatus]);

  useEffect(() => {
    if (!activationV2Enabled || explicitIntentChoice || !recommendation) return;
    setFormData((previous) => previous.activationIntent === recommendation.intent
      ? previous
      : { ...previous, activationIntent: recommendation.intent });
  }, [activationV2Enabled, explicitIntentChoice, recommendation]);

  const selectedActivationCard = ACTIVATION_CARDS.find((card) => card.value === formData.activationIntent) ?? null;
  const selectedRoute = formData.activationIntent ? getActivationRoute(formData.activationIntent) : null;
  const profileTags = [
    ...formData.startupSectors,
    ...deriveSupportAreas(formData.stageAnswers.blocker),
    formData.country,
  ].filter(Boolean);

  const validateStep = (stepIndex: number): boolean => {
    const target = steps[stepIndex];
    if (!target) return false;
    const newErrors: Record<string, string> = {};

    switch (target.kind) {
      case 'stage':
        if (!formData.stageAnswers[target.id as keyof FounderStageQuizAnswersV3]) {
          newErrors[target.id] = 'Choose the option that best describes you today';
        }
        break;
      case 'fundraising':
        if (!formData.stageAnswers.fundraisingStatus) {
          newErrors.fundraisingStatus = 'Pick where your raise is today';
        }
        break;
      case 'sector':
        if (formData.startupSectors.length === 0) newErrors.startupSectors = 'Select at least one startup sector';
        break;
      case 'country':
        if (!formData.country) newErrors.country = 'Select your country';
        break;
      case 'cofounder':
        if (!formData.cofounderSituation) newErrors.cofounderSituation = 'Choose the option that matches your situation';
        break;
      case 'activation':
        if (!formData.activationIntent) newErrors.activationIntent = 'Choose the first action that would help this week';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Single-select steps advance automatically shortly after a choice, saving a
  // "Next" click per question. The latest-handleNext ref ensures the deferred
  // call validates against the just-committed answer; re-clicks reset the timer.
  const handleNextRef = useRef<() => void | Promise<void>>(() => {});
  const autoAdvanceTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) window.clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  const queueAutoAdvance = () => {
    if (autoAdvanceTimer.current) window.clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = window.setTimeout(() => {
      autoAdvanceTimer.current = null;
      void handleNextRef.current();
    }, 300);
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    const now = Date.now();

    if (currentStep < totalSteps - 1) {
      trackOnboardingStepCompleted({
        step: currentStep + 1,
        step_name: step.id,
        total_steps: totalSteps,
        elapsed_ms: now - startedAt,
        step_time_ms: now - stepEnteredAt.current,
        quiz_version: QUIZ_VERSION,
        stage: formData.stageAnswers.productStatus,
        painPoint: formData.stageAnswers.blocker,
      });
      stepEnteredAt.current = now;
      setCurrentStep((prev) => prev + 1);
      return;
    }

    await handleSubmit();
  };

  useEffect(() => {
    handleNextRef.current = handleNext;
  });

  const handleBack = () => {
    if (autoAdvanceTimer.current) {
      window.clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    if (!user) {
      toast.error('Please sign in to complete onboarding');
      return;
    }

    setIsLoading(true);

    try {
      const selectedIntent = formData.activationIntent as ActivationIntent;
      const startRoute = getActivationRoute(selectedIntent);
      const stageAnswers = formData.stageAnswers as FounderStageQuizAnswersV3;
      const finalDiagnostic = assignFounderStageV3(stageAnswers);
      const finalAssignedStage = finalDiagnostic.assignedStage;
      const businessStage = mapFounderStageToBusinessStage(finalAssignedStage);
      const primaryPain = stageAnswers.blocker;
      const supportAreas = deriveSupportAreas(stageAnswers.blocker);
      const activeRecommendation = recommendation ?? {
        intent: selectedIntent,
        source: 'quiz' as const,
        resumeUrl: ACTIVATION_CATALOG[selectedIntent].route,
        reason: 'Selected as your first founder win.',
      };
      const baseJourney = activationV2Enabled
        ? createActivationJourney(activeRecommendation, selectedIntent)
        : null;
      const activationJourney = baseJourney && selectedIntent === 'build_demo' && stageAnswers.productStatus === 'idea_only'
        ? { ...baseJourney, resumeUrl: `${ACTIVATION_CATALOG.build_demo.route}?mode=no_assets` }
        : baseJourney;

      if (activationJourney) setHandoff({ journey: activationJourney, stageName: STAGES[finalAssignedStage].name });

      await startActivationJourney({
        userId: user.id,
        businessStage,
        primaryPain,
        activationIntent: selectedIntent,
        startupSectors: formData.startupSectors,
        supportAreasNeeded: supportAreas,
        country: formData.country,
        assignedStage: finalAssignedStage,
        quizAnswersV3: {
          ...createQuizAnswersV3Payload(stageAnswers, finalDiagnostic),
          cofounderSituation: formData.cofounderSituation,
        },
        cofounderSituation: formData.cofounderSituation as CofounderSituation,
        onboardingLocalDate: new Intl.DateTimeFormat('en-CA').format(new Date()),
        activationJourney: activationJourney ?? undefined,
      });

      await refreshOnboardingMentorRecommendations({
        userId: user.id,
        sectors: formData.startupSectors,
        supportAreas,
        assignedStage: finalAssignedStage,
        stageAnswers,
      });

      // RET-003: seed the starter routine here too — previously only the
      // dashboard path gate did this, and the quiz is now the primary path.
      void seedDefaultRoutineForOnboarding(user.id);

      captureEvent('activation_intent_selected', {
        stage: businessStage,
        assignedStage: finalAssignedStage,
        stageLabel: STAGES[finalAssignedStage].name,
        stageConfidence: finalDiagnostic.confidence,
        painPoint: primaryPain,
        activationIntent: selectedIntent,
        startupSectors: formData.startupSectors,
        supportAreasNeeded: supportAreas,
        country: formData.country,
        cofounderSituation: formData.cofounderSituation,
        timeMs: Date.now() - startedAt,
        startRoute,
      });
      captureEvent('activation_path_selected', {
        stage: businessStage,
        assignedStage: finalAssignedStage,
        stageLabel: STAGES[finalAssignedStage].name,
        painPoint: primaryPain,
        activationIntent: selectedIntent,
        startupSectors: formData.startupSectors,
        supportAreasNeeded: supportAreas,
        country: formData.country,
        cofounderSituation: formData.cofounderSituation,
        timeMs: Date.now() - startedAt,
        startRoute,
      });
      if (!activationJourney) {
        trackActivationFunnelEvent('first_action_opened', {
          user_id: user.id,
          activation_intent: selectedIntent,
          selected_path: startRoute,
          source: 'onboarding',
        });
        void trackRetentionEvent('activation_first_action_opened', {
          user_id: user.id,
          activation_intent: selectedIntent,
          selected_path: startRoute,
          source: 'onboarding',
        });
      }
      const onboardingProperties = {
        quiz_completed: true,
        creative_niche: null,
        business_stage: businessStage || null,
        quiz_version: QUIZ_VERSION,
        total_steps: totalSteps,
        total_time_ms: Date.now() - startedAt,
        assigned_stage: finalAssignedStage,
        stage_confidence: finalDiagnostic.confidence,
        pain_point: primaryPain,
        activation_intent: selectedIntent,
        cofounder_situation: formData.cofounderSituation,
      };
      if (activationJourney) {
        await trackActivationJourneyEvent({
          userId: user.id,
          journey: activationJourney,
          event: 'onboarding_completed',
          properties: { ...onboardingProperties, assigned_stage: finalAssignedStage, plan: currentPlan, device: window.innerWidth < 768 ? 'mobile' : 'desktop' },
        });
      } else {
        trackOnboardingCompleted(onboardingProperties);
        void trackActivity('onboarding_completed', {
        stage: businessStage,
        assignedStage: finalAssignedStage,
        stageLabel: STAGES[finalAssignedStage].name,
        stageConfidence: finalDiagnostic.confidence,
        painPoint: primaryPain,
        activationIntent: selectedIntent,
        startupSectors: formData.startupSectors,
        supportAreasNeeded: supportAreas,
        country: formData.country,
        cofounderSituation: formData.cofounderSituation,
        startRoute,
        }, user.id);
      }

      toast.success('Your launchpad is ready. Opening your first action now.');

      try {
        localStorage.removeItem(`onboarding_draft_${user.id}`);
        sessionStorage.removeItem(`onboarding_draft_${user.id}`);
      } catch {
        /* ignore */
      }

      onComplete?.(activationJourney
        ? buildActivationJourneyUrl(selectedIntent, activationJourney.journeyId, activationJourney.resumeUrl)
        : appendActivationParams(startRoute, selectedIntent));
    } catch (error) {
      setHandoff(null);
      console.error('Failed to save onboarding data:', error);
      toast.error('Failed to save onboarding data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSingleSelectQuestion = (
    question: FounderStageQuestionDef,
    helperText: string,
  ) => {
    const selectedValue = (formData.stageAnswers[question.id] ?? '') as string;

    return (
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-accent-teal">{step.chapter}</p>
          <h2 className="font-space-grotesk text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {question.question}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{helperText}</p>
        </div>

        <div className="grid gap-2">
          {question.options.map((option, index) => {
            const selected = selectedValue === option.value;
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    stageAnswers: {
                      ...prev.stageAnswers,
                      [question.id]: option.value as FounderStageQuizAnswersV3[typeof question.id],
                    },
                  }));
                  setErrors((prev) => ({ ...prev, [question.id]: undefined }));
                  queueAutoAdvance();
                }}
                aria-pressed={selected}
                className={cn(
                  'flex min-h-14 items-start gap-3 rounded-lg border p-3 text-left transition-all',
                  selected
                    ? 'border-accent-teal bg-accent-teal/10 shadow-sm shadow-accent-teal/10'
                    : 'border-border/60 bg-background/70 hover:border-accent-teal/50 hover:bg-accent/60',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                    selected
                      ? 'border-accent-teal bg-accent-teal text-white'
                      : 'border-border text-muted-foreground',
                  )}
                >
                  {selected ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className="min-w-0 flex-1 text-sm font-medium leading-6 text-foreground">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
        {errors[question.id] ? <p className="text-sm text-destructive">{errors[question.id]}</p> : null}
      </div>
    );
  };

  const renderSectorStep = () => (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-accent-teal">Context</p>
        <h2 className="font-space-grotesk text-2xl font-semibold tracking-tight sm:text-3xl">
          What sector are you in?
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Choose the sectors that best match your market. This tunes investor and mentor matching.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {ANGEL_SECTOR_OPTIONS.map((option) => {
          const selected = formData.startupSectors.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, startupSectors: toggleValue(prev.startupSectors, option) }));
                setErrors((prev) => ({ ...prev, startupSectors: undefined }));
              }}
              aria-pressed={selected}
              className={cn(
                'group min-h-12 rounded-lg border px-3 py-3 text-left text-sm transition-all',
                selected
                  ? 'border-accent-teal bg-accent-teal/10 text-foreground shadow-sm shadow-accent-teal/10'
                  : 'border-border/60 bg-background/70 hover:border-accent-teal/50 hover:bg-accent/60',
              )}
            >
              <span className="flex items-center justify-between gap-3 font-medium">
                <span>{option}</span>
                {selected ? <Check className="h-4 w-4 shrink-0 text-accent-teal" /> : null}
              </span>
            </button>
          );
        })}
      </div>
      {errors.startupSectors ? <p className="text-sm text-destructive">{errors.startupSectors}</p> : null}
    </div>
  );

  const renderCountryStep = () => (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-accent-teal">Context</p>
        <h2 className="font-space-grotesk text-2xl font-semibold tracking-tight sm:text-3xl">
          Where are you building from?
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Location helps surface nearby founders, market context, and better recommendations.
        </p>
      </div>
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={countrySearch}
            onChange={(event) => setCountrySearch(event.target.value)}
            className="h-11 rounded-full border-border/70 bg-background/80 pl-9"
            placeholder="Type your country here"
          />
        </div>
        {formData.country ? (
          <Badge variant="secondary" className="w-fit gap-1 rounded-full">
            <MapPin className="h-3.5 w-3.5" />
            {formData.country}
          </Badge>
        ) : null}
        <div className="grid max-h-72 gap-2 overflow-y-auto rounded-lg border border-border/60 bg-background/70 p-2 sm:grid-cols-2">
          {filteredCountries.map((country) => {
            const selected = formData.country === country;
            return (
              <button
                key={country}
                type="button"
                onClick={() => {
                  setFormData((prev) => ({ ...prev, country }));
                  setCountrySearch(country);
                  setErrors((prev) => ({ ...prev, country: undefined }));
                  queueAutoAdvance();
                }}
                aria-pressed={selected}
                className={cn(
                  'min-h-10 rounded-md px-3 py-2 text-left text-sm transition-colors',
                  selected ? 'bg-accent-teal/15 font-semibold text-foreground' : 'hover:bg-accent',
                )}
              >
                {country}
              </button>
            );
          })}
        </div>
        {errors.country ? <p className="text-sm text-destructive">{errors.country}</p> : null}
      </div>
    </div>
  );

  const renderActivationStep = () => (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-accent-teal">First action</p>
        <h2 className="font-space-grotesk text-2xl font-semibold tracking-tight sm:text-3xl">
          Choose your first win
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          We will save your profile, add recommendations, and send you straight into this action.
        </p>
      </div>

      {stageMeta && diagnostic ? (
        <div className="rounded-lg border border-accent-teal/30 bg-accent-teal/10 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-accent-teal">Your founder stage</p>
              <p className="mt-1 font-space-grotesk text-xl font-semibold">
                Stage {stageMeta.id}: {stageMeta.name}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{stageMeta.description}</p>
            </div>
            <div className="shrink-0 rounded-full border border-accent-teal/30 bg-background/70 px-3 py-1 text-sm font-semibold">
              {diagnostic.confidence}% match
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {profileTags.slice(0, 8).map((item) => (
              <Badge key={item} variant="outline" className="bg-background/50">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {activationV2Enabled && recommendation ? (
        <div className="space-y-4">
          {(() => {
            const selectedIntent = (formData.activationIntent || recommendation.intent) as ActivationIntent;
            const selected = ACTIVATION_CATALOG[selectedIntent];
            return (
              <div className="rounded-xl border-2 border-accent-teal bg-accent-teal/10 p-5 shadow-sm shadow-accent-teal/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge className="rounded-full bg-accent-teal text-white hover:bg-accent-teal">
                    {recommendation.source === 'resume' && selectedIntent === recommendation.intent
                      ? 'Continue what you started'
                      : selectedIntent === recommendation.intent
                        ? 'Recommended first win'
                        : 'Your selected first win'}
                  </Badge>
                  <span className="text-sm font-medium text-muted-foreground">About {selected.estimatedMinutes} min</span>
                </div>
                <h3 className="mt-4 font-space-grotesk text-xl font-semibold">{selected.label}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {selectedIntent === recommendation.intent ? recommendation.reason : selected.description}
                </p>
                <div className="mt-4 rounded-lg border border-border/60 bg-background/75 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">You will leave with</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{selected.output}</p>
                </div>
                <ol className="mt-4 grid gap-2 sm:grid-cols-3" aria-label="First-win steps">
                  {selected.steps.map((item, index) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-teal/15 text-xs font-semibold text-accent-teal">{index + 1}</span>
                      {item}
                    </li>
                  ))}
                </ol>
              </div>
            );
          })()}

          <details className="group rounded-lg border border-border/60 bg-background/60">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Choose another goal
              <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <div className="grid gap-2 border-t border-border/60 p-3 sm:grid-cols-2">
              {availableIntents
                .filter((intent) => V2_ONBOARDING_INTENTS.includes(intent))
                .filter((intent) => intent !== formData.activationIntent)
                .map((intent) => {
                  const entry = ACTIVATION_CATALOG[intent];
                  return (
                    <button
                      key={intent}
                      type="button"
                      className="min-h-11 rounded-lg border border-border/60 bg-card p-3 text-left transition-colors hover:border-accent-teal/60 hover:bg-accent"
                      onClick={() => {
                        setExplicitIntentChoice(true);
                        setFormData((previous) => ({ ...previous, activationIntent: intent }));
                        setErrors((previous) => ({ ...previous, activationIntent: undefined }));
                      }}
                    >
                      <span className="block text-sm font-semibold">{entry.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{entry.output} · {entry.estimatedMinutes} min</span>
                    </button>
                  );
                })}
            </div>
          </details>
          {errors.activationIntent ? <p className="text-sm text-destructive">{errors.activationIntent}</p> : null}
        </div>
      ) : (
      <div className="grid gap-3">
        {ACTIVATION_CARDS.map((card) => {
          const Icon = card.icon;
          const isSelected = formData.activationIntent === card.value;
          return (
            <button
              key={card.value}
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, activationIntent: card.value }));
                setErrors((prev) => ({ ...prev, activationIntent: undefined }));
              }}
              aria-pressed={isSelected}
              className={cn(
                'flex min-h-24 w-full items-start gap-4 rounded-lg border p-4 text-left transition-all',
                isSelected
                  ? 'border-accent-teal bg-accent-teal/10 shadow-sm shadow-accent-teal/10'
                  : 'border-border/60 bg-background/70 hover:border-accent-teal/50 hover:bg-accent/60',
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                  isSelected ? 'bg-accent-teal text-white' : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-space-grotesk text-base font-semibold">{card.headline}</span>
                  {card.badge ? (
                    <span className="rounded-full bg-accent-teal/15 px-2 py-0.5 text-xs font-semibold text-accent-teal">
                      {card.badge}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">{card.sub}</span>
                {isSelected && selectedRoute ? (
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-accent-teal">
                    {card.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
        {errors.activationIntent ? <p className="text-sm text-destructive">{errors.activationIntent}</p> : null}
      </div>
      )}
    </div>
  );

  const renderCofounderStep = () => (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-accent-teal">Team</p>
        <h2 className="font-space-grotesk text-2xl font-semibold tracking-tight sm:text-3xl">
          What&apos;s your co-founder situation?
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          We use this to add a relevant next action to your dashboard—never to change your founder stage.
        </p>
      </div>
      <div className="grid gap-3">
        {([
          { value: 'actively_looking', label: "I'm actively looking for a co-founder.", description: 'Add a focused task to find and publish a co-founder post.' },
          { value: 'solo_ok', label: "I'm a solo founder and I'm OK with that.", description: 'Keep the dashboard focused on your current product and growth priorities.' },
        ] as const).map((option) => {
          const selected = formData.cofounderSituation === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              className={cn(
                'min-h-20 rounded-xl border p-4 text-left transition-colors',
                selected ? 'border-accent-teal bg-accent-teal/10' : 'border-border/60 bg-background/70 hover:border-accent-teal/50 hover:bg-accent/60',
              )}
              onClick={() => {
                setFormData((previous) => ({ ...previous, cofounderSituation: option.value }));
                setErrors((previous) => ({ ...previous, cofounderSituation: undefined }));
                queueAutoAdvance();
              }}
            >
              <span className="block font-space-grotesk text-base font-semibold">{option.label}</span>
              <span className="mt-1 block text-sm leading-6 text-muted-foreground">{option.description}</span>
            </button>
          );
        })}
        {errors.cofounderSituation ? <p className="text-sm text-destructive">{errors.cofounderSituation}</p> : null}
      </div>
    </div>
  );

  const renderStep = () => {
    switch (step.kind) {
      case 'stage': {
        const question = FOUNDER_STAGE_QUESTIONS.find((item) => item.id === step.id);
        if (!question) return null;
        return renderSingleSelectQuestion(
          question,
          'Pick the closest match. We will use this to place you on the right founder path.',
        );
      }
      case 'fundraising':
        return renderSingleSelectQuestion(
          FUNDRAISING_STATUS_QUESTION,
          'This tells us whether you are in the Fundraising phase or still building traction.',
        );
      case 'sector':
        return renderSectorStep();
      case 'country':
        return renderCountryStep();
      case 'cofounder':
        return renderCofounderStep();
      case 'activation':
        return renderActivationStep();
      default:
        return null;
    }
  };

  if (handoff) {
    const entry = ACTIVATION_CATALOG[handoff.journey.selectedIntent];
    return (
      <div className="mx-auto flex min-h-[620px] w-full max-w-3xl items-center px-4 py-10" role="status" aria-live="polite">
        <Card className="w-full border-accent-teal/30 bg-card/95 shadow-2xl">
          <CardContent className="p-7 text-center sm:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-teal/15 text-accent-teal">
              <Loader2 className="h-7 w-7 animate-spin motion-reduce:animate-none" />
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-accent-teal">Stage assigned</p>
            <h1 className="mt-2 font-space-grotesk text-3xl font-semibold">{handoff.stageName}</h1>
            <p className="mt-4 text-sm text-muted-foreground">Preparing your focused first win</p>
            <p className="mt-1 text-lg font-semibold">{entry.label}</p>
            <div className="mx-auto mt-6 h-2 max-w-sm overflow-hidden rounded-full bg-muted">
              <motion.div className="h-full w-3/4 rounded-full bg-accent-teal" initial={{ width: '10%' }} animate={{ width: '82%' }} transition={{ duration: 1.4 }} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Your quiz and journey are saved before we open the tool.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-6">
      <Card className="overflow-hidden rounded-lg border border-border/60 bg-card/95 shadow-2xl backdrop-blur-md">
        <CardContent className="p-0">
          <div className="grid min-h-[640px] lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="border-b border-border/60 bg-background/60 p-5 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-teal/15 text-accent-teal">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-space-grotesk text-base font-semibold">Founder launchpad</p>
                  <p className="text-xs text-muted-foreground">{currentStep + 1} of {totalSteps}</p>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{step.chapter}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-accent-teal"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <div className="mt-7 hidden space-y-2 lg:block">
                {steps.map((item, index) => {
                  const isActive = index === currentStep;
                  const isComplete = index < currentStep;
                  return (
                    <div
                      key={`${item.id}-${index}`}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        isActive ? 'bg-accent-teal/10 text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                          isComplete
                            ? 'border-accent-teal bg-accent-teal text-white'
                            : isActive
                              ? 'border-accent-teal text-accent-teal'
                              : 'border-border',
                        )}
                      >
                        {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>
                  );
                })}
              </div>

              {stageMeta ? (
                <div className="mt-7 rounded-lg border border-border/60 bg-background/70 p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-teal" />
                    <div>
                      <p className="text-sm font-semibold">{stageMeta.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{stageMeta.topFocus[0]?.label}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </aside>

            <section className="flex min-h-0 flex-col">
              <div className="flex-1 p-5 sm:p-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="mx-auto max-w-2xl"
                  >
                    {renderStep()}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex flex-col gap-3 border-t border-border/60 bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleBack}
                  disabled={currentStep === 0 || isLoading}
                  className="order-2 gap-2 rounded-full border border-border/60 bg-background/80 sm:order-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>

                <div className="order-1 flex items-center justify-between gap-3 sm:order-2">
                  <span className="text-sm text-muted-foreground">
                    {currentStep + 1} / {totalSteps}
                  </span>
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={isLoading}
                    className="gap-2 rounded-full px-5 font-semibold shadow-sm"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : currentStep === totalSteps - 1 ? (
                      <>
                        {activationV2Enabled && formData.activationIntent
                          ? ACTIVATION_CATALOG[formData.activationIntent].label
                          : selectedActivationCard?.cta ?? 'Start first action'}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
