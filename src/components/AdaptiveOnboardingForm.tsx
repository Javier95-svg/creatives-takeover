import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { ANGEL_SECTOR_OPTIONS } from '@/data/angelSectors';
import { detectCountryFromLocale } from '@/data/countries';
import { normalizePlan } from '@/config/planPermissions';
import {
  ACTIVATION_CATALOG,
  buildActivationJourneyUrl,
  createActivationJourney,
  getStageAvailableIntents,
  recommendActivation,
} from '@/lib/activationJourneyV2';
import { isPublishProofFirstEnabled, PUBLISH_PROOF_FIRST_FLAG } from '@/lib/publishProofRollout';
import { useFeatureFlagEnabled } from '@/hooks/usePosthogFeatureFlag';
import {
  deriveOnboardingContextV1,
  deriveStageAnswersFromOnboarding,
  EMPTY_ONBOARDING_ANSWERS_V1,
  isAdaptiveOnboardingComplete,
  normalizeWorkingDays,
  requiresCofounderSituation,
  requiresCustomerCount,
  requiresFundraisingStatus,
  WORKING_DAY_OPTIONS,
  type OnboardingAnswersV1,
  type OnboardingSessionV1,
} from '@/lib/onboardingContext';
import { getBrowserTimezone } from '@/lib/accountabilityPreferences';
import {
  abandonOnboardingSession,
  completeOnboardingSession,
  saveOnboardingProgress,
} from '@/lib/onboardingSession';
import { buildOnboardingFailureMessage } from '@/lib/onboardingFailureMessage';
import { mapFounderStageToBusinessStage } from '@/lib/stageDiagnostic';
import {
  ensureActivationGateVariant,
  startActivationJourney,
  trackActivationJourneyEvent,
  trackRetentionEvent,
  type ActivationIntent,
} from '@/lib/retentionSystem';
import { refreshOnboardingMentorRecommendations } from '@/lib/onboardingMentorRecommendations';
import { cn } from '@/lib/utils';
import { trackOnboardingStepCompleted } from '@/lib/analytics';

const CORE_STEPS = 7;
const AVAILABLE_INTENTS: ActivationIntent[] = [
  'find_mentor',
  'build_demo',
  'run_icp',
  'start_validation',
  'build_mvp',
  'first_customer_sprint',
  'plan_gtm',
  'log_traction',
  'analyze_pitch_deck',
];

const BUSINESS_MODELS = [
  ['b2b_saas', 'B2B SaaS or business software'],
  ['service', 'Agency, consultancy, or online service'],
  ['b2c_product', 'Consumer app or digital product'],
  ['marketplace', 'Marketplace'],
  ['ecommerce', 'E-commerce'],
  ['media', 'Creator, media, or audience business'],
  ['other', 'Another model'],
] as const;

const EVIDENCE_OPTIONS = [
  ['none', 'No external evidence yet'],
  ['prospects', 'I have named prospects to contact'],
  ['replies', 'Target customers have replied'],
  ['conversations', 'I completed qualified customer conversations'],
  ['commitment', 'A customer made a costly commitment or signed a pilot'],
  ['payment', 'A customer paid'],
  ['repeatable_growth', 'I have repeatable acquisition or retention'],
] as const;

const CUSTOMER_BANDS = [
  ['0', 'None yet'],
  ['1', '1 paying customer'],
  ['2', '2 paying customers'],
  ['3', '3 paying customers'],
  ['4_plus', 'More than 3'],
] as const;

const GOAL_OPTIONS = [
  ['validate_problem', 'Validate an urgent customer problem'],
  ['win_first_customer', 'Win the first paying customer'],
  ['reach_three_customers', 'Reach three paying customers'],
  ['repeatable_growth', 'Find a repeatable acquisition or retention signal'],
  ['build_product', 'Ship the smallest useful product'],
  ['launch', 'Launch and find the first channel'],
  ['raise', 'Prepare for or actively raise funding'],
] as const;

const BLOCKER_OPTIONS = [
  ['customer_clarity', 'The customer or problem is still too broad'],
  ['prospect_access', 'I cannot find or reach the right prospects'],
  ['messaging', 'My message is not earning replies'],
  ['sales_conversion', 'Interest is not converting into commitments'],
  ['product_delivery', 'I cannot deliver the promised result yet'],
  ['traction_growth', 'Acquisition or retention is not repeatable'],
  ['fundraising', 'Fundraising preparation or investor access'],
  ['accountability', 'I need accountability and prioritization'],
  ['team', 'I need the right co-founder or team'],
] as const;

const CAPACITY_OPTIONS = [
  [2, 'About 2 hours'],
  [5, 'About 5 hours'],
  [10, 'About 10 hours'],
  [20, '20 or more hours'],
] as const;

const RUNWAY_OPTIONS = [
  ['under_3', 'Less than 3 months'],
  ['3_6', '3 to 6 months'],
  ['6_12', '6 to 12 months'],
  ['over_12', 'More than 12 months'],
  ['not_applicable', 'Not burning money yet'],
] as const;

const REVENUE_OPTIONS = [
  ['none', 'No revenue yet'],
  ['under_1k', 'Under $1k / month'],
  ['1k_10k', '$1k to $10k / month'],
  ['10k_50k', '$10k to $50k / month'],
  ['over_50k', 'Over $50k / month'],
] as const;

const FUNDRAISING_OPTIONS = [
  ['not_now', 'Not yet - just planning ahead'],
  ['preparing', 'Preparing deck and materials'],
  ['talking_investors', 'Talking to investors'],
  ['raising_now', 'Actively raising a round'],
] as const;

interface AdaptiveOnboardingFormProps {
  session: OnboardingSessionV1;
  onComplete?: (startRoute?: string) => void;
}

function readAdaptiveDraft(session: OnboardingSessionV1): {
  currentStep: number;
  answers: Partial<OnboardingAnswersV1>;
} | null {
  try {
    const raw = localStorage.getItem(`adaptive_onboarding_${session.id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { currentStep?: unknown; answers?: unknown };
    const currentStep = Number(parsed.currentStep ?? 0);
    if (
      !Number.isInteger(currentStep)
      || currentStep <= session.current_step
      || !parsed.answers
      || typeof parsed.answers !== 'object'
      || Array.isArray(parsed.answers)
    ) {
      return null;
    }
    return {
      currentStep: Math.min(currentStep, CORE_STEPS - 1),
      answers: parsed.answers as Partial<OnboardingAnswersV1>,
    };
  } catch {
    return null;
  }
}

function ChoiceGrid<T extends string | number>({
  options,
  value,
  onSelect,
  columns = 1,
}: {
  options: readonly (readonly [T, string])[];
  value: T | '' | null;
  onSelect: (value: T) => void;
  columns?: 1 | 2;
}) {
  return (
    <div className={cn('grid gap-2', columns === 2 && 'sm:grid-cols-2')} role="group">
      {options.map(([optionValue, label], index) => {
        const selected = value === optionValue;
        return (
          <button
            key={String(optionValue)}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(optionValue)}
            className={cn(
              'flex min-h-14 items-start gap-3 rounded-lg border p-3 text-left transition-all',
              selected
                ? 'border-accent-teal bg-accent-teal/10 shadow-sm shadow-accent-teal/10'
                : 'border-border/60 bg-background/70 hover:border-accent-teal/50 hover:bg-accent/60',
            )}
          >
            <span className={cn(
              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
              selected ? 'border-accent-teal bg-accent-teal text-white' : 'border-border text-muted-foreground',
            )}>
              {selected ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className="text-sm font-medium leading-6">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function AdaptiveOnboardingForm({ session, onComplete }: AdaptiveOnboardingFormProps) {
  const { user } = useAuth();
  const { subscriptionData } = useSubscription({ fetchTiers: false });
  const { checkFeatureAccess } = useFeatureGating();
  const { totalAvailable, loading: creditsLoading } = useCredits();
  const currentPlan = normalizePlan(subscriptionData?.subscription_tier);
  const localFallback = useMemo(() => readAdaptiveDraft(session), [session]);
  const [answers, setAnswers] = useState<OnboardingAnswersV1>({
    ...EMPTY_ONBOARDING_ANSWERS_V1,
    ...session.answers,
    ...localFallback?.answers,
    sectors: Array.isArray(localFallback?.answers.sectors)
      ? localFallback.answers.sectors
      : Array.isArray(session.answers.sectors)
        ? session.answers.sectors
        : [],
    // This flow has no country step, but country feeds mentor matching and
    // routine scheduling. Prefill from the browser locale rather than spending
    // a step on it; a resumed session keeps whatever it already had.
    country: localFallback?.answers.country
      || session.answers.country
      || detectCountryFromLocale()
      || '',
  });
  const [currentStep, setCurrentStep] = useState(
    localFallback?.currentStep ?? Math.min(session.current_step, CORE_STEPS - 1),
  );
  const [existingPreferences, setExistingPreferences] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completionAttempts, setCompletionAttempts] = useState(0);
  const [explicitIntent, setExplicitIntent] = useState(Boolean(session.answers.selectedIntent));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const completedRef = useRef(session.status === 'completed');
  const startedAtRef = useRef(new Date(session.started_at).getTime());
  const recommendationShownRef = useRef(false);

  useEffect(() => {
    headingRef.current?.focus();
  }, [currentStep]);

  useEffect(() => {
    if (!user?.id) return;
    void supabase
      .from('profiles')
      .select('user_preferences')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.user_preferences && typeof data.user_preferences === 'object' && !Array.isArray(data.user_preferences)) {
          setExistingPreferences(data.user_preferences as Record<string, unknown>);
        }
      });
  }, [user?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(`adaptive_onboarding_${session.id}`, JSON.stringify({
        currentStep,
        answers,
        updatedAt: new Date().toISOString(),
      }));
    } catch {
      // Server progress remains authoritative; local storage is only an offline fallback.
    }
  }, [answers, currentStep, session.id]);

  // Snapshot the live step in a ref so the teardown below can read the latest
  // value without listing it as a dependency. Depending on currentStep here
  // would re-register the effect on every step, and its cleanup would fire an
  // abandonment on each forward transition rather than only on a real exit.
  const abandonRef = useRef({ currentStep, userId: user?.id });
  useEffect(() => {
    abandonRef.current = { currentStep, userId: user?.id };
  }, [currentStep, user?.id]);

  useEffect(() => {
    const startedAt = startedAtRef.current;
    return () => {
      const { currentStep: lastStep, userId } = abandonRef.current;
      if (completedRef.current || !userId) return;
      void trackRetentionEvent('onboarding_abandoned', {
        user_id: userId,
        onboarding_session_id: session.id,
        flow_version: session.flow_version,
        rollout_variant: session.rollout_variant,
        last_step: lastStep + 1,
        total_steps: CORE_STEPS,
        elapsed_ms: Date.now() - startedAt,
      });
      // Durable counterpart, mirroring the control flow. Keeps the session
      // resumable while marking where the founder stalled.
      void abandonOnboardingSession({
        sessionId: session.id,
        currentStep: lastStep,
        reason: 'page_exit',
      });
    };
  }, [session.flow_version, session.id, session.rollout_variant]);

  const availableIntents = useMemo(() => {
    const planIntents = new Set(getStageAvailableIntents(currentPlan));
    return AVAILABLE_INTENTS.filter((intent) => {
      if (!planIntents.has(intent)) return false;
      if (!creditsLoading && totalAvailable <= 0 && ['plan_gtm', 'log_traction', 'analyze_pitch_deck'].includes(intent)) {
        return false;
      }
      const featureKey = ACTIVATION_CATALOG[intent].featureKey;
      if (!featureKey) return true;
      try {
        return checkFeatureAccess(featureKey).hasAccess;
      } catch {
        return true;
      }
    });
  }, [checkFeatureAccess, creditsLoading, currentPlan, totalAvailable]);

  const stageAnswers = useMemo(() => deriveStageAnswersFromOnboarding(answers), [answers]);
  const draftContext = useMemo(
    () => deriveOnboardingContextV1(answers, {
      selectedIntent: answers.selectedIntent || undefined,
    }),
    [answers],
  );
  const publishProofFirst = isPublishProofFirstEnabled(useFeatureFlagEnabled(PUBLISH_PROOF_FIRST_FLAG));
  const recommendation = useMemo(() => recommendActivation({
    assignedStage: draftContext.assignedStage,
    blocker: stageAnswers.blocker,
    productStatus: stageAnswers.productStatus,
    userPreferences: existingPreferences,
    availableIntents,
    publishProofFirst,
  }), [availableIntents, draftContext.assignedStage, existingPreferences, publishProofFirst, stageAnswers.blocker, stageAnswers.productStatus]);

  useEffect(() => {
    if (explicitIntent || !recommendation) return;
    setAnswers((current) => current.selectedIntent === recommendation.intent
      ? current
      : { ...current, selectedIntent: recommendation.intent });
  }, [explicitIntent, recommendation]);

  useEffect(() => {
    if (currentStep !== CORE_STEPS - 1 || recommendationShownRef.current || !user?.id) return;
    recommendationShownRef.current = true;
    void trackRetentionEvent('activation_recommendation_shown', {
      user_id: user.id,
      onboarding_session_id: session.id,
      flow_version: session.flow_version,
      rollout_variant: session.rollout_variant,
      recommendation_intent: recommendation.intent,
      assigned_stage: draftContext.assignedStage,
      founder_loop: draftContext.founderLoop,
    });
  }, [
    currentStep,
    draftContext.assignedStage,
    draftContext.founderLoop,
    recommendation.intent,
    session.flow_version,
    session.id,
    session.rollout_variant,
    user?.id,
  ]);

  const patchAnswers = (patch: Partial<OnboardingAnswersV1>) => {
    setAnswers((current) => ({ ...current, ...patch }));
    setError(null);
  };

  const validateStepAt = (step: number) => {
    if (step === 0) {
      const length = answers.startupBrief.trim().length;
      if (length < 20 || length > 280) return 'Write 20 to 280 characters about what you build and who it serves.';
    }
    if (step === 1 && !answers.businessModel) return 'Choose the business model that fits best.';
    if (step === 2) {
      if (!answers.evidenceState) return 'Choose the strongest evidence you have today.';
      if (requiresCustomerCount(answers.evidenceState) && !answers.customerCountBand) {
        return 'Choose your current paying-customer range.';
      }
    }
    if (step === 3) {
      if (!answers.primaryGoal) return 'Choose the most important 30-day outcome.';
      if (requiresFundraisingStatus(answers.primaryGoal, answers.blocker) && !answers.fundraisingStatus) {
        return 'Choose your current fundraising status.';
      }
    }
    if (step === 4) {
      if (!answers.blocker) return 'Choose the blocker most likely to stop that outcome.';
      if (requiresCofounderSituation(answers.blocker) && !answers.cofounderSituation) {
        return 'Tell us whether you are actively looking for a co-founder.';
      }
      if (requiresFundraisingStatus(answers.primaryGoal, answers.blocker) && !answers.fundraisingStatus) {
        return 'Choose your current fundraising status.';
      }
    }
    if (step === 5) {
      if (!answers.weeklyCapacityHours) return 'Choose the time you can protect each week.';
      if (!answers.runwayMonths) return 'Choose how long you can keep going at your current burn.';
    }
    if (step === 6 && !answers.selectedIntent) return 'Choose a first action.';
    return null;
  };

  const validateStep = () => validateStepAt(currentStep);

  /**
   * The first step that is still missing an answer, or null.
   *
   * A session started before a question became required can reach the last
   * step with an earlier answer missing. Rather than refusing to finish with a
   * message about a question that is not on screen, send the founder back to
   * the step that actually needs them.
   */
  const findIncompleteStep = () => {
    for (let step = 0; step < CORE_STEPS; step += 1) {
      const message = validateStepAt(step);
      if (message) return { step, message };
    }
    return null;
  };

  const handleNext = async () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (currentStep === CORE_STEPS - 1) {
      await handleComplete();
      return;
    }

    trackOnboardingStepCompleted({
      step: currentStep + 1,
      step_name: ['startup_brief', 'business_model', 'evidence', 'primary_goal', 'blocker', 'capacity'][currentStep],
      total_steps: CORE_STEPS,
      elapsed_ms: Date.now() - startedAtRef.current,
      quiz_version: 1,
      onboarding_session_id: session.id,
      flow_version: session.flow_version,
      rollout_variant: session.rollout_variant,
    });
    setIsSaving(true);
    try {
      await saveOnboardingProgress({
        sessionId: session.id,
        currentStep: currentStep + 1,
        answers,
      });
      setCurrentStep((step) => step + 1);
    } catch {
      // Preserve momentum if the draft endpoint is temporarily unavailable.
      // Completion still performs a validated atomic write.
      setCurrentStep((step) => step + 1);
      toast.info('Progress is saved on this device. We will sync it when you finish.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    if (!isAdaptiveOnboardingComplete(answers)) {
      // Point at the step that is actually missing rather than stating a
      // generic rule, so a session that predates a newly required question
      // has somewhere to go.
      const incomplete = findIncompleteStep();
      if (incomplete) {
        setCurrentStep(incomplete.step);
        setError(incomplete.message);
      } else {
        setError('Complete the required answers before opening your first action.');
      }
      return;
    }
    setIsSaving(true);
    try {
      const derivedContext = deriveOnboardingContextV1(answers, {
        selectedIntent: answers.selectedIntent as ActivationIntent,
      });
      const context = {
        ...derivedContext,
        recommendedIntent: recommendation.intent,
        recommendationAccepted: answers.selectedIntent === recommendation.intent,
        recommendationReasonCodes: recommendation.intent === derivedContext.recommendedIntent
          ? derivedContext.recommendationReasonCodes
          : [...derivedContext.recommendationReasonCodes, 'entitlement_fallback'],
      };
      const activeRecommendation = {
        ...recommendation,
        intent: recommendation.intent,
      };
      const journey = {
        ...createActivationJourney(activeRecommendation, context.selectedIntent),
        onboardingSessionId: session.id,
        flowVersion: session.flow_version,
        rolloutVariant: session.rollout_variant,
      };
      const now = new Date().toISOString();
      const activationGateVariant = await ensureActivationGateVariant(user.id);
      const preferencePatch = {
        activationIntent: context.selectedIntent,
        activationGateVariant,
        activationStartedAt: now,
        activationCompletedAt: null,
        activationSource: 'onboarding',
        firstValueAction: null,
        firstArtifactType: null,
        firstArtifactCreatedAt: null,
        firstArtifactId: null,
        firstArtifactLabel: null,
        firstArtifactResumeUrl: null,
        activationJourney: journey,
        supportAreasNeeded: [],
        // Captured once here so cron-driven senders can resolve the founder's
        // local day without a browser. Without it they default to UTC.
        timezone: getBrowserTimezone(),
        onboardingLocalDate: new Intl.DateTimeFormat('en-CA').format(new Date()),
        onboardingSessionId: session.id,
        onboardingFlowVersion: session.flow_version,
        onboardingRolloutVariant: session.rollout_variant,
      };

      await completeOnboardingSession({
        sessionId: session.id,
        answers,
        context,
        profileUpdates: {
          business_stage: context.businessStage,
          quiz_current_stage: context.businessStage,
          quiz_biggest_challenge: answers.blocker,
          assigned_stage: context.assignedStage,
          startup_industry: answers.sectors,
          country: answers.country || undefined,
          quiz_completed: true,
          quiz_completed_at: now,
          quiz_answers_v2: {
            version: 4,
            onboardingSessionId: session.id,
            answers: stageAnswers,
            context,
          },
        },
        preferencePatch,
      });

      await startActivationJourney({
        userId: user.id,
        businessStage: mapFounderStageToBusinessStage(context.assignedStage),
        primaryPain: answers.blocker,
        activationIntent: context.selectedIntent,
        startupSectors: answers.sectors,
        country: answers.country || undefined,
        assignedStage: context.assignedStage,
        quizAnswersV3: {
          version: 4,
          onboardingSessionId: session.id,
          answers: stageAnswers,
          context,
        },
        cofounderSituation: answers.cofounderSituation || undefined,
        onboardingLocalDate: new Intl.DateTimeFormat('en-CA').format(new Date()),
        activationJourney: journey,
        skipPersistence: true,
        onboardingSessionId: session.id,
        flowVersion: session.flow_version,
        rolloutVariant: session.rollout_variant,
      });

      await trackActivationJourneyEvent({
        userId: user.id,
        journey,
        event: 'onboarding_completed',
        properties: {
          onboarding_session_id: session.id,
          flow_version: session.flow_version,
          rollout_variant: session.rollout_variant,
          assigned_stage: context.assignedStage,
          founder_loop: context.founderLoop,
          primary_goal: answers.primaryGoal,
          blocker: answers.blocker,
          activation_intent: context.selectedIntent,
          recommendation_accepted: context.recommendationAccepted,
          plan: currentPlan,
          device: window.innerWidth < 768 ? 'mobile' : 'desktop',
        },
      });
      await trackRetentionEvent(
        context.recommendationAccepted
          ? 'activation_recommendation_accepted'
          : 'activation_recommendation_overridden',
        {
          user_id: user.id,
          onboarding_session_id: session.id,
          flow_version: session.flow_version,
          rollout_variant: session.rollout_variant,
          recommendation_intent: context.recommendedIntent,
          selected_intent: context.selectedIntent,
          assigned_stage: context.assignedStage,
          founder_loop: context.founderLoop,
        },
      );
      await trackRetentionEvent('activation_first_action_opened', {
        user_id: user.id,
        activation_intent: context.selectedIntent,
        selected_path: journey.resumeUrl,
        source: 'onboarding',
        onboarding_session_id: session.id,
        flow_version: session.flow_version,
        rollout_variant: session.rollout_variant,
      });

      completedRef.current = true;
      try {
        localStorage.removeItem(`adaptive_onboarding_${session.id}`);
      } catch {
        // Ignore local storage cleanup failures.
      }

      // Matching is useful but not required for onboarding completion.
      void refreshOnboardingMentorRecommendations({
        userId: user.id,
        sectors: answers.sectors,
        supportAreas: [],
        assignedStage: context.assignedStage,
        stageAnswers,
      }).catch((mentorError) => {
        console.warn('Mentor enrichment failed after onboarding completion', mentorError);
      });

      onComplete?.(buildActivationJourneyUrl(context.selectedIntent, journey.journeyId, journey.resumeUrl));
    } catch (completionError) {
      console.error('Failed to complete adaptive onboarding', completionError);
      // Keep this in the step's alert slot, not only in a toast: a founder who
      // cannot finish setup needs the way out to stay on screen.
      const attempt = completionAttempts + 1;
      setCompletionAttempts(attempt);
      const message = buildOnboardingFailureMessage(attempt, session.id);
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderStep = () => {
    if (currentStep === 0) {
      return (
        <>
          <StepHeading title="What are you building, and who is it for?" description="One concise brief gives your dashboard enough context to make specific recommendations." ref={headingRef} />
          <Textarea
            value={answers.startupBrief}
            onChange={(event) => patchAnswers({ startupBrief: event.target.value.slice(0, 280) })}
            rows={5}
            placeholder="Example: We help independent agencies turn client calls into clear project briefs and proposals."
            className="mt-5 resize-none"
          />
          <div className="mt-2 text-right text-xs text-muted-foreground">{answers.startupBrief.trim().length}/280</div>
          <p className="mt-5 text-sm font-semibold">Optional sectors</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ANGEL_SECTOR_OPTIONS.map((sector) => {
              const selected = answers.sectors.includes(sector);
              return (
                <button
                  key={sector}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => patchAnswers({
                    sectors: selected
                      ? answers.sectors.filter((item) => item !== sector)
                      : [...answers.sectors, sector],
                  })}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs transition-colors',
                    selected ? 'border-accent-teal bg-accent-teal/10 text-foreground' : 'border-border/60 text-muted-foreground',
                  )}
                >
                  {sector}
                </button>
              );
            })}
          </div>
        </>
      );
    }
    if (currentStep === 1) {
      return (
        <>
          <StepHeading title="How does this business make money?" description="This shapes the operating loop and examples used across your dashboard." ref={headingRef} />
          <div className="mt-5"><ChoiceGrid options={BUSINESS_MODELS} value={answers.businessModel} onSelect={(businessModel) => patchAnswers({ businessModel })} /></div>
        </>
      );
    }
    if (currentStep === 2) {
      return (
        <>
          <StepHeading title="What is the strongest customer evidence you have?" description="Choose an external signal, not a completed internal task." ref={headingRef} />
          <div className="mt-5"><ChoiceGrid options={EVIDENCE_OPTIONS} value={answers.evidenceState} onSelect={(evidenceState) => patchAnswers({ evidenceState, customerCountBand: requiresCustomerCount(evidenceState) ? answers.customerCountBand : '' })} /></div>
          {requiresCustomerCount(answers.evidenceState) ? (
            <>
              <div className="mt-6">
                <p className="mb-3 text-sm font-semibold">How many paying customers do you have?</p>
                <ChoiceGrid options={CUSTOMER_BANDS} value={answers.customerCountBand} onSelect={(customerCountBand) => patchAnswers({ customerCountBand })} columns={2} />
              </div>
              <div className="mt-6">
                <p className="mb-1 text-sm font-semibold">Roughly what is your monthly revenue?</p>
                <p className="mb-3 text-xs text-muted-foreground">Optional. Used to size traction targets against founders at your level.</p>
                <ChoiceGrid options={REVENUE_OPTIONS} value={answers.revenueBand} onSelect={(revenueBand) => patchAnswers({ revenueBand })} columns={2} />
              </div>
            </>
          ) : null}
        </>
      );
    }
    if (currentStep === 3) {
      return (
        <>
          <StepHeading title="What outcome matters most in the next 30 days?" description="Your Command Center will prioritize this outcome over a generic startup checklist." ref={headingRef} />
          <div className="mt-5"><ChoiceGrid options={GOAL_OPTIONS} value={answers.primaryGoal} onSelect={(primaryGoal) => patchAnswers({ primaryGoal })} /></div>
          {requiresFundraisingStatus(answers.primaryGoal, answers.blocker) ? (
            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold">Where is fundraising today?</p>
              <ChoiceGrid options={FUNDRAISING_OPTIONS} value={answers.fundraisingStatus} onSelect={(fundraisingStatus) => patchAnswers({ fundraisingStatus })} />
            </div>
          ) : null}
        </>
      );
    }
    if (currentStep === 4) {
      return (
        <>
          <StepHeading title="What is most likely to stop that outcome?" description="This determines the action and support your dashboard recommends first." ref={headingRef} />
          <div className="mt-5"><ChoiceGrid options={BLOCKER_OPTIONS} value={answers.blocker} onSelect={(blocker) => patchAnswers({ blocker })} /></div>
          {requiresCofounderSituation(answers.blocker) ? (
            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold">Are you actively looking for a co-founder?</p>
              <ChoiceGrid
                options={[
                  ['actively_looking', 'Yes, I am actively looking'],
                  ['solo_ok', 'No, I am comfortable building solo'],
                ] as const}
                value={answers.cofounderSituation}
                onSelect={(cofounderSituation) => patchAnswers({ cofounderSituation })}
              />
            </div>
          ) : null}
          {requiresFundraisingStatus(answers.primaryGoal, answers.blocker) && !answers.fundraisingStatus ? (
            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold">Where is fundraising today?</p>
              <ChoiceGrid options={FUNDRAISING_OPTIONS} value={answers.fundraisingStatus} onSelect={(fundraisingStatus) => patchAnswers({ fundraisingStatus })} />
            </div>
          ) : null}
        </>
      );
    }
    if (currentStep === 5) {
      return (
        <>
          <StepHeading title="What are you working with?" description="Your routine, missions, and how urgently they push you are all sized from these constraints." ref={headingRef} />
          <p className="mt-5 text-sm font-semibold">How much focused execution time can you protect each week?</p>
          <div className="mt-3"><ChoiceGrid options={CAPACITY_OPTIONS} value={answers.weeklyCapacityHours} onSelect={(weeklyCapacityHours) => patchAnswers({ weeklyCapacityHours })} /></div>
          <div className="mt-6">
            <p className="mb-1 text-sm font-semibold">How long can you keep going at your current burn?</p>
            <p className="mb-3 text-xs text-muted-foreground">A short runway changes which action is worth doing first. Pick &ldquo;Not burning money yet&rdquo; if that is closer.</p>
            <ChoiceGrid options={RUNWAY_OPTIONS} value={answers.runwayMonths} onSelect={(runwayMonths) => patchAnswers({ runwayMonths })} columns={2} />
          </div>
          <fieldset className="mt-6">
            <legend className="text-sm font-medium">Which days do you actually work on this?</legend>
            <p className="mt-1 text-xs text-muted-foreground">
              Optional. Your routine is scheduled on these days instead of assuming Monday to Friday.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {WORKING_DAY_OPTIONS.map((option) => {
                const selected = answers.workingDays.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    aria-label={option.label}
                    onClick={() => patchAnswers({
                      workingDays: normalizeWorkingDays(
                        selected
                          ? answers.workingDays.filter((day) => day !== option.value)
                          : [...answers.workingDays, option.value],
                      ),
                    })}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition-colors',
                      selected
                        ? 'border-accent-teal bg-accent-teal/15 font-medium text-foreground'
                        : 'border-border text-muted-foreground hover:border-accent-teal/50',
                    )}
                  >
                    {option.short}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </>
      );
    }

    const selectedIntent = (answers.selectedIntent || recommendation.intent) as ActivationIntent;
    const selected = ACTIVATION_CATALOG[selectedIntent];
    return (
      <>
        <StepHeading title="Your Command Center focus is ready" description="Review how your answers will shape the dashboard, then open your first useful action." ref={headingRef} />
        <div className="mt-5 rounded-xl border border-accent-teal/30 bg-accent-teal/10 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{draftContext.founderLoop} loop</Badge>
            <Badge variant="outline">Stage {draftContext.assignedStage}: {draftContext.assignedStageLabel}</Badge>
            <Badge variant="outline">
              {draftContext.stageConfidenceBand === 'high'
                ? 'Strong stage evidence'
                : draftContext.stageConfidenceBand === 'medium'
                  ? 'Moderate stage evidence'
                  : 'Stage will refine with evidence'}
            </Badge>
            {draftContext.capitalMotion !== 'inactive' ? (
              <Badge variant="outline">Fundraising {draftContext.capitalMotion}</Badge>
            ) : null}
            <Badge variant="outline">{answers.weeklyCapacityHours} hours/week</Badge>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Daily mission</dt><dd className="mt-1 font-medium">Advance {answers.primaryGoal.replaceAll('_', ' ')}</dd></div>
            <div><dt className="text-muted-foreground">Routine</dt><dd className="mt-1 font-medium">{draftContext.routineGoal.replaceAll('_', ' ')}</dd></div>
            <div><dt className="text-muted-foreground">Primary blocker</dt><dd className="mt-1 font-medium">{answers.blocker.replaceAll('_', ' ')}</dd></div>
          </dl>
        </div>
        <div className="mt-5 rounded-xl border-2 border-accent-teal bg-background/80 p-5">
          <Badge className="bg-accent-teal text-white">Recommended first win</Badge>
          <h3 className="mt-3 text-xl font-semibold">{selected.label}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{selected.output} in about {selected.estimatedMinutes} minutes.</p>
          <ol className="mt-4 grid gap-2 sm:grid-cols-3">
            {selected.steps.map((item, index) => (
              <li key={item} className="flex items-center gap-2 text-sm">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-teal/15 text-xs font-semibold text-accent-teal">{index + 1}</span>
                {item}
              </li>
            ))}
          </ol>
        </div>
        <details className="mt-4 rounded-lg border border-border/60">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Choose another first action</summary>
          <div className="grid gap-2 border-t p-3 sm:grid-cols-2">
            {availableIntents.filter((intent) => intent !== selectedIntent).map((intent) => (
              <button
                key={intent}
                type="button"
                onClick={() => {
                  setExplicitIntent(true);
                  patchAnswers({ selectedIntent: intent });
                }}
                className="rounded-lg border border-border/60 p-3 text-left hover:border-accent-teal/60"
              >
                <span className="block text-sm font-semibold">{ACTIVATION_CATALOG[intent].label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{ACTIVATION_CATALOG[intent].output}</span>
              </button>
            ))}
          </div>
        </details>
      </>
    );
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-3 py-4 sm:px-6">
      <Card className="overflow-hidden border-border/60 bg-card/95 shadow-2xl">
        <CardContent className="p-0">
          <div className="border-b border-border/60 bg-background/60 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-teal/15 text-accent-teal"><Sparkles className="h-5 w-5" /></span>
                <div><p className="font-semibold">Founder launchpad</p><p className="text-xs text-muted-foreground">{currentStep + 1} of {CORE_STEPS}</p></div>
              </div>
              <span className="text-sm font-medium text-muted-foreground">{Math.round(((currentStep + 1) / CORE_STEPS) * 100)}%</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-accent-teal transition-[width] motion-reduce:transition-none" style={{ width: `${((currentStep + 1) / CORE_STEPS) * 100}%` }} />
            </div>
            <p className="sr-only" aria-live="polite">Step {currentStep + 1} of {CORE_STEPS}</p>
          </div>
          <section className="min-h-96 p-5 sm:p-8">
            <div className="mx-auto max-w-2xl">{renderStep()}</div>
          </section>
          <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-background/50 p-4 sm:px-8">
            <Button type="button" variant="secondary" onClick={() => setCurrentStep((step) => Math.max(0, step - 1))} disabled={currentStep === 0 || isSaving}>
              <ArrowLeft className="mr-2 h-4 w-4" />Back
            </Button>
            <div className="text-right">
              {error ? <p className="mb-2 max-w-md text-sm text-destructive" role="alert">{error}</p> : null}
              <Button type="button" onClick={() => void handleNext()} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {currentStep === CORE_STEPS - 1 ? `Open ${ACTIVATION_CATALOG[answers.selectedIntent || recommendation.intent].label}` : 'Continue'}
                {!isSaving ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const StepHeading = ({
  title,
  description,
  ref,
}: {
  title: string;
  description: string;
  ref: RefObject<HTMLHeadingElement>;
}) => (
  <div>
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-teal">Personalize your Command Center</p>
    <h2 ref={ref} tabIndex={-1} className="font-space-grotesk text-2xl font-semibold tracking-tight outline-none sm:text-3xl">{title}</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
  </div>
);
