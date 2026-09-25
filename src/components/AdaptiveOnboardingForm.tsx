import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { RoleProfileFields } from '@/components/workspace/RoleProfileFields';
import { INVESTMENT_STAGES, missingRoleFields, sanitizeRoleProfile, type RoleProfile } from '@/lib/roleProfileSchema';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { submitAccountApplication } from '@/lib/accountApplications';
import { REVIEWED_USER_TYPES, USER_TYPE_LABEL, type ReviewedUserType } from '@/lib/accountTypes';
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

// Splits accounts into the two groups the platform tags people by. "Live"
// deliberately means anything real and reachable, not revenue, so it is easy to
// answer honestly and lands the split where we expect it.
// The five account types. Founder and builder are self serve; the other three
// are offering something to the network, so they are reviewed before the
// account is activated and the quiz stops as soon as one is chosen.
const ACCOUNT_TYPE_OPTIONS = [
  ['founder', 'Founder', 'You already have a project'],
  ['builder', 'Builder', 'You are starting a project from scratch'],
  ['mentor', 'Mentor', 'You offer your coaching to our network'],
  ['marketplace', 'Service provider', 'You offer your services to our network'],
  ['investor', 'Investor', "You are interested in investing in our users' projects"],
] as const;

function isReviewedType(value: string): value is ReviewedUserType {
  return (REVIEWED_USER_TYPES as readonly string[]).includes(value);
}

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
      || currentStep < 0
      || Date.parse(String((parsed as { updatedAt?: string }).updatedAt ?? '')) < Date.parse(session.updated_at)
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
  /** [value, title] or [value, title, description]. */
  options: readonly (readonly [T, string] | readonly [T, string, string])[];
  value: T | '' | null;
  onSelect: (value: T) => void;
  columns?: 1 | 2;
}) {
  return (
    <div className={cn('grid gap-2', columns === 2 && 'sm:grid-cols-2')} role="group">
      {options.map(([optionValue, label, description], index) => {
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
            <span className="min-w-0">
              <span className="block text-sm font-medium leading-6">{label}</span>
              {description && <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{description}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AdaptiveOnboardingForm({ session, onComplete }: AdaptiveOnboardingFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const submittingRef = useRef(false);
  const { subscriptionData } = useSubscription({ fetchTiers: false });
  const { checkFeatureAccess } = useFeatureGating();
  const { totalAvailable, loading: creditsLoading } = useCredits();
  const currentPlan = normalizePlan(subscriptionData?.subscription_tier);
  const localFallback = useMemo(() => readAdaptiveDraft(session), [session]);
  // Set once a mentor, marketplace or investor request has been filed. The
  // quiz stops there: nothing after the first step applies to them, and the
  // account stays unapproved until an admin reviews it.
  const [submittedReview, setSubmittedReview] = useState<ReviewedUserType | null>(null);
  // A reviewed type answers two questions, not seven: which category, then
  // the fields that category is defined by. This is that second question,
  // kept out of currentStep so the founder step machine is untouched.
  const [reviewStage, setReviewStage] = useState<'choosing' | 'details'>(localFallback?.answers.entryStage ?? session.answers.entryStage ?? (session.current_step > 0 ? 'details' : 'choosing'));
  const [roleDraft, setRoleDraft] = useState<RoleProfile>(localFallback?.answers.roleProfile ?? session.answers.roleProfile ?? {});
  const [answers, setAnswers] = useState<OnboardingAnswersV1>({
    ...EMPTY_ONBOARDING_ANSWERS_V1,
    ...session.answers,
    ...localFallback?.answers,
    sectors: Array.isArray(localFallback?.answers.sectors)
      ? localFallback.answers.sectors
      : Array.isArray(session.answers.sectors)
        ? session.answers.sectors
        : [],
    // Country is only stored when the user enters or confirms it.
    country: localFallback?.answers.country
      || session.answers.country
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
  const visibleStep = currentStep === 0 ? (reviewStage === 'details' ? 2 : 1) : currentStep + 2;
  const visibleTotal = isReviewedType(answers.founderSegment) ? 2 : CORE_STEPS + 1;

  useEffect(() => {
    headingRef.current?.focus();
  }, [currentStep, reviewStage]);

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
    if (completedRef.current) return;
    try {
      localStorage.setItem(`adaptive_onboarding_${session.id}`, JSON.stringify({
        currentStep,
        answers: { ...answers, roleProfile: roleDraft, entryStage: reviewStage },
        updatedAt: new Date().toISOString(),
      }));
    } catch {
      // Server progress remains authoritative; local storage is only an offline fallback.
    }
  }, [answers, roleDraft, reviewStage, currentStep, session.id]);

  // Debounce draft writes; the local copy remains available during network errors.
  useEffect(() => {
    if (completedRef.current || isSaving) return;
    const timer = window.setTimeout(() => {
      void saveOnboardingProgress({ sessionId: session.id, currentStep,
        answers: { ...answers, roleProfile: roleDraft, entryStage: reviewStage },
      }).catch(() => undefined);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [answers, roleDraft, reviewStage, currentStep, session.id, isSaving]);

  // Snapshot the live step in a ref so the teardown below can read the latest
  // value without listing it as a dependency. Depending on currentStep here
  // would re-register the effect on every step, and its cleanup would fire an
  // abandonment on each forward transition rather than only on a real exit.
  const abandonRef = useRef({ currentStep, userId: user?.id, visibleStep, visibleTotal, userType: answers.founderSegment });
  useEffect(() => {
    abandonRef.current = { currentStep, userId: user?.id, visibleStep, visibleTotal, userType: answers.founderSegment };
  }, [currentStep, user?.id, visibleStep, visibleTotal, answers.founderSegment]);

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
        last_step: abandonRef.current.visibleStep,
        total_steps: abandonRef.current.visibleTotal,
        user_type: abandonRef.current.userType,
        quiz_version: 2,
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
      // Mentors, marketplace members and investors are asked for their
      // category and nothing else here. Demanding a startup brief and a
      // project name from them contradicts the rule that a project is not
      // mandatory for them, and there is nothing truthful they could type.
      if (isReviewedType(answers.founderSegment)) {
        return answers.founderSegment ? null : 'Choose the option that describes you.';
      }
      if (!answers.founderSegment) return 'Choose the option that describes you.';
      if (reviewStage === 'choosing') return null;
      const length = answers.startupBrief.trim().length;
      if (length < 20 || length > 280) return 'Write 20 to 280 characters about what you build and who it serves.';
      // A project is mandatory for founders and builders, so it is asked for
      // here rather than chased afterwards. Providers never take this quiz.
      if (answers.investorVisible && !answers.investmentStage) return 'Choose the funding stage investors should match.';
      if (answers.founderSegment === 'builder' && !answers.builderStartingPoint) return 'Choose whether you are exploring or have an idea.';
      if (answers.founderSegment === 'founder' && !answers.projectName.trim()) return 'Give your project a name. Everything you build attaches to it.';
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
    if (submittingRef.current) return;
    if (submittedReview) { onComplete?.('/'); return; }
    if (currentStep === 0 && reviewStage === 'choosing') {
      if (!answers.founderSegment) { setError('Choose the option that describes you.'); return; }
      setReviewStage('details');
      void trackRetentionEvent('onboarding_role_selected', { user_id: user?.id, user_type: answers.founderSegment, quiz_version: 2, onboarding_session_id: session.id });
      return;
    }
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    // Mentors, marketplace providers and investors never see the rest of the
    // quiz. Their request is filed here and the flow ends.
    if (currentStep === 0 && isReviewedType(answers.founderSegment)) {
      // First pass: move to the fields for the category they picked. The
      // application is not sent until those are answered, so nothing is
      // filed that a reviewer cannot act on.
      if (reviewStage === 'choosing') {
        setReviewStage('details');
        setError('');
        return;
      }
      const missing = missingRoleFields(answers.founderSegment, roleDraft);
      if (missing.length > 0) {
        setError(`Fill in ${missing.map((field) => field.label.toLowerCase()).join(' and ')}.`);
        return;
      }
      setIsSaving(true);
      submittingRef.current = true;
      try {
        await submitAccountApplication({
          userType: answers.founderSegment,
          sessionId: session.id,
          fullName: user?.user_metadata?.full_name ?? null,
          email: user?.email ?? null,
          roleProfile: sanitizeRoleProfile(answers.founderSegment, roleDraft),
        });
        completedRef.current = true;
        try { localStorage.removeItem(`adaptive_onboarding_${session.id}`); } catch { /* storage unavailable */ }
        setSubmittedReview(answers.founderSegment);
        void queryClient.invalidateQueries({ queryKey: ['account-context', user?.id] });
        void trackRetentionEvent('onboarding_completed', { user_id: user?.id, user_type: answers.founderSegment, quiz_version: 2, onboarding_session_id: session.id, completion_kind: 'application_submitted' });
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Could not send your request. Please try again.');
      } finally {
        submittingRef.current = false;
        setIsSaving(false);
      }
      return;
    }

    if (currentStep === CORE_STEPS - 1) {
      await handleComplete();
      return;
    }

    trackOnboardingStepCompleted({
      step: visibleStep,
      step_name: ['startup_brief', 'business_model', 'evidence', 'primary_goal', 'blocker', 'capacity'][currentStep],
      total_steps: visibleTotal,
      elapsed_ms: Date.now() - startedAtRef.current,
      quiz_version: 2,
      onboarding_session_id: session.id,
      flow_version: session.flow_version,
      rollout_variant: session.rollout_variant,
    });
    setIsSaving(true);
    try {
      await saveOnboardingProgress({
        sessionId: session.id,
        currentStep: currentStep + 1,
        answers: { ...answers, entryStage: 'details', roleProfile: roleDraft },
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
          // A stated answer, so it replaces whatever the backfill inferred from
          // business_stage for accounts that predate this question.
          founder_segment: answers.founderSegment || undefined,
          quiz_current_stage: context.businessStage,
          quiz_biggest_challenge: answers.blocker,
          assigned_stage: context.assignedStage,
          startup_name: answers.projectName.trim() || undefined,
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

      completedRef.current = true;
      try { localStorage.removeItem(`adaptive_onboarding_${session.id}`); } catch { /* storage unavailable */ }
      void queryClient.invalidateQueries({ queryKey: ['account-context', user?.id] });
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
      if (completedRef.current) {
        toast.info('Your setup is saved. Opening your workspace.');
        onComplete?.('/');
        return;
      }
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

  // A reviewed type is answering a two step flow, and a progress bar claiming
  // seven would be a lie about how much is left.
  const reviewing = currentStep === 0 && isReviewedType(answers.founderSegment) && !submittedReview;
  const totalSteps = visibleTotal;
  const displayStep = submittedReview ? 2 : visibleStep;

  const renderStep = () => {
    if (currentStep === 0) {
      // The request is filed and the category fields came with it, so this
      // is a confirmation and nothing more.
      if (submittedReview) {
        return (
          <Card className="mx-auto max-w-xl">
            <CardContent className="p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-teal/15">
                <Check className="h-6 w-6 text-accent-teal" />
              </div>
              <h2 className="mt-5 text-xl font-semibold">Thanks, your request has been sent.</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                You can use your workspace now. We will email you after review. Approval enables category features; your public listing still needs its own setup.
              </p>
            </CardContent>
          </Card>
        );
      }

      if (reviewStage === 'choosing') return <>
        <StepHeading title="What brings you here today?" description="Choose your primary workspace. You can have other interests without changing your account category." headingRef={headingRef} />
        <div className="mt-6"><ChoiceGrid options={ACCOUNT_TYPE_OPTIONS} value={answers.founderSegment} onSelect={(founderSegment) => { if (founderSegment !== answers.founderSegment) setRoleDraft({}); patchAnswers({ founderSegment }); }} /></div>
      </>;

      // The second and last question a reviewed type is asked.
      if (reviewStage === 'details' && isReviewedType(answers.founderSegment)) {
        return (
          <>
            <StepHeading
              title={`Tell us about your ${USER_TYPE_LABEL[answers.founderSegment].toLowerCase()} work`}
              description="These answers help us review your request. You can refine your public profile and preferences from your workspace."
              headingRef={headingRef}
            />
            <div className="mt-6">
              <RoleProfileFields userType={answers.founderSegment} value={roleDraft} onChange={setRoleDraft} />
            </div>
          </>
        );
      }

  return (
        <>
          {answers.founderSegment === 'builder' && <div className="mb-5"><p className="mb-2 font-semibold">Where are you starting?</p><ChoiceGrid options={[[ 'exploring', 'Exploring problems and ideas' ], [ 'idea_chosen', 'I have an idea to validate' ]] as const} value={answers.builderStartingPoint ?? ''} onSelect={(builderStartingPoint) => patchAnswers({ builderStartingPoint })} /></div>}
          <StepHeading title={answers.founderSegment === 'builder' ? 'What problem or area would you like to explore?' : 'What are you building, and who is it for?'} description="One concise brief gives your dashboard enough context to make specific recommendations." headingRef={headingRef} />
          <Textarea
            value={answers.startupBrief}
            onChange={(event) => patchAnswers({ startupBrief: event.target.value.slice(0, 280) })}
            rows={5}
            placeholder="Example: We help independent agencies turn client calls into clear project briefs and proposals."
            className="mt-5 resize-none"
          />
          <div className="mt-2 text-right text-xs text-muted-foreground">{answers.startupBrief.trim().length}/280</div>
          <p className="mt-6 text-sm font-semibold">{answers.founderSegment === 'builder' ? 'Working title (optional)' : 'What is your project called?'}</p>
          <Input
            value={answers.projectName}
            onChange={(event) => patchAnswers({ projectName: event.target.value.slice(0, 120) })}
            placeholder="Throughline"
            maxLength={120}
            className="mt-2"
          />
          {answers.founderSegment === 'builder' && <p className="mt-2 text-xs text-muted-foreground">No name yet? We will save an editable “Untitled idea” project.</p>}
          <label htmlFor="onboarding-country" className="mt-5 block text-sm font-semibold">Country (optional)</label>
          <Input id="onboarding-country" value={answers.country} placeholder={detectCountryFromLocale() || 'Your country'} maxLength={100} onChange={(event) => patchAnswers({ country: event.target.value })} />
          <p className="mt-1 text-xs text-muted-foreground">Confirm your country if you want it used for recommendations. The placeholder is only a browser suggestion.</p>
          <label className="mt-5 flex items-start gap-2 text-sm"><input type="checkbox" checked={answers.investorVisible === true} onChange={(event) => patchAnswers({ investorVisible: event.target.checked })} /> Include my project summary in matches for approved investors. I can change this later in my account details.</label>
          {answers.investorVisible && <div className="mt-3"><label htmlFor="investment-stage" className="block text-sm font-semibold">Funding stage to match</label><select id="investment-stage" className="mt-2 w-full rounded border bg-background p-2" value={answers.investmentStage ?? ''} onChange={(event) => patchAnswers({ investmentStage: event.target.value })}><option value="">Choose a funding stage</option>{INVESTMENT_STAGES.map((stage) => <option key={stage}>{stage}</option>)}</select></div>}
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
          <StepHeading title="How does this business make money?" description="This shapes the operating loop and examples used across your dashboard." headingRef={headingRef} />
          <div className="mt-5"><ChoiceGrid options={answers.founderSegment === 'builder' ? BUSINESS_MODELS.map((option) => option[0] === 'other' ? ['other', 'Not sure yet / another model'] as const : option) : BUSINESS_MODELS} value={answers.businessModel} onSelect={(businessModel) => patchAnswers({ businessModel })} /></div>
        </>
      );
    }
    if (currentStep === 2) {
      return (
        <>
          <StepHeading title="What is the strongest customer evidence you have?" description="Choose an external signal, not a completed internal task." headingRef={headingRef} />
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
          <StepHeading title="What outcome matters most in the next 30 days?" description="Your Progress Tracker will prioritize this outcome over a generic startup checklist." headingRef={headingRef} />
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
          <StepHeading title="What is most likely to stop that outcome?" description="This determines the action and support your dashboard recommends first." headingRef={headingRef} />
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
          <StepHeading title="What are you working with?" description="Your routine, missions, and how urgently they push you are all sized from these constraints." headingRef={headingRef} />
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
        <StepHeading title="Your Progress Tracker focus is ready" description="Review how your answers will shape the dashboard, then open your first useful action." headingRef={headingRef} />
        <p className="mt-4 text-sm">You are joining as <strong>{USER_TYPE_LABEL[answers.founderSegment || 'founder']}</strong>. Your next goal: <strong>{GOAL_OPTIONS.find(([key]) => key === answers.primaryGoal)?.[1]}</strong>. Use Back to edit your answers.</p>
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
                <div><p className="font-semibold">{answers.founderSegment ? USER_TYPE_LABEL[answers.founderSegment] + ' setup' : 'Your workspace'}</p><p className="text-xs text-muted-foreground">{displayStep} of {totalSteps}</p></div>
              </div>
              <span className="text-sm font-medium text-muted-foreground">{Math.round((displayStep / totalSteps) * 100)}%</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-accent-teal transition-[width] motion-reduce:transition-none" style={{ width: `${(displayStep / totalSteps) * 100}%` }} />
            </div>
            <p className="sr-only" aria-live="polite">Step {displayStep} of {totalSteps}</p>
          </div>
          <section className="min-h-96 p-5 sm:p-8">
            <div className="mx-auto max-w-2xl">{renderStep()}</div>
          </section>
          <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-background/50 p-4 sm:px-8">
            <Button type="button" variant="secondary"
              onClick={() => {
                setError('');
                if (currentStep === 0 && reviewStage === 'details') { setReviewStage('choosing'); return; }
                setCurrentStep((step) => Math.max(0, step - 1));
              }}
              disabled={(currentStep === 0 && reviewStage !== 'details') || isSaving || Boolean(submittedReview)}>
              <ArrowLeft className="mr-2 h-4 w-4" />Back
            </Button>
            <div className="text-right">
              {error ? <p className="mb-2 max-w-md text-sm text-destructive" role="alert">{error}</p> : null}
              <Button type="button" onClick={() => void handleNext()} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submittedReview ? 'Open my workspace' : reviewing && reviewStage === 'details' ? 'Send my request' : currentStep === CORE_STEPS - 1 ? `Open ${ACTIVATION_CATALOG[answers.selectedIntent || recommendation.intent].label}` : 'Continue'}
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
  headingRef,
}: {
  title: string;
  description: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) => (
  <div>
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-teal">Personalize your Progress Tracker</p>
    <h2 ref={headingRef} tabIndex={-1} className="font-space-grotesk text-2xl font-semibold tracking-tight outline-none sm:text-3xl">{title}</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
  </div>
);
