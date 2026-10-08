import { ONBOARDING_SITUATIONS, classifyOnboardingSituation, situationForUserType } from '@/lib/onboardingClassification';
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Info, Loader2, Lock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { RoleProfileFields } from '@/components/workspace/RoleProfileFields';
import { InvestmentStageGuide } from '@/components/InvestmentStageGuide';
import { INVESTMENT_STAGES, missingRoleFields, sanitizeRoleProfile, type RoleProfile } from '@/lib/roleProfileSchema';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { submitAccountApplication, getMyAccountInvitationTypes } from '@/lib/accountApplications';
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
import { onboardingSupportNeeds } from '@/lib/onboardingSupportNeeds';
import { clearIntendedAccountType, readIntendedAccountType } from '@/lib/intendedAccountType';
import { clearToolHandoff, readToolHandoff } from '@/lib/toolHandoff';
import { clearGuestOnboarding } from '@/lib/guestOnboarding';
import { MAX_SECTORS } from '@/lib/onboardingAnswerRules';
import { cn } from '@/lib/utils';
import { trackOnboardingAccountTypeChanged, trackOnboardingPrefilled, trackOnboardingStepCompleted, trackOnboardingStepViewed } from '@/lib/analytics';

// Brief, business and evidence, goal and blocker, time and runway, review. The
// situation question is shown before these, so founders see six screens.
const CORE_STEPS = 5;
/** Index of the final review screen, for pages that seed a session onto it. */
export const ONBOARDING_LAST_STEP = CORE_STEPS - 1;
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

// Account classification is derived from the first situational answer.


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

// "Not spending" comes first: most people starting out are not burning money,
// and they should not have to read four runway bands to find their answer.
const RUNWAY_OPTIONS = [
  ['not_applicable', 'Not spending money on this yet'],
  ['under_3', 'Less than 3 months'],
  ['3_6', '3 to 6 months'],
  ['6_12', '6 to 12 months'],
  ['over_12', 'More than 12 months'],
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

// Plain-language names for values the summary screen shows. The stored codes
// never reach the page.
const LOOP_LABEL: Record<string, string> = {
  PROVE: 'Proving demand',
  SELL: 'Winning customers',
  GROW: 'Growing',
};

const ROUTINE_LABEL: Record<string, string> = {
  validate_idea: 'Validate the idea',
  find_cofounders: 'Find a co-founder',
  grow_audience: 'Win customers',
  launch_product: 'Ship and launch',
  raise_funding: 'Prepare to raise',
};

const CAPITAL_MOTION_LABEL: Record<string, string> = {
  preparing: 'Preparing to raise',
  active: 'Raising now',
};

// Kept in the sector list for existing investor records only; new projects
// choose between its two replacements.
const LEGACY_SECTORS = new Set(['Mobility & Logistics']);

const REVIEWED_STEP_NAMES = ['About you', 'Your details'] as const;

function stepNameFor(visibleStep: number, segment: string) {
  if (isReviewedType(segment)) return REVIEWED_STEP_NAMES[visibleStep - 1] ?? '';
  return [
    'About you',
    segment === 'builder' ? 'Your idea' : 'Your project',
    'Business and customers',
    'Goal and blocker',
    'Time and runway',
    'Final review',
  ][visibleStep - 1] ?? '';
}

function labelOf(options: readonly (readonly [string | number, string])[], value: string | number) {
  return options.find(([key]) => key === value)?.[1] ?? '';
}

/** "a", "a and b", "a, b and c". */
function joinList(items: string[]) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

interface AdaptiveOnboardingFormProps {
  session: OnboardingSessionV1;
  onComplete?: (startRoute?: string) => void;
  /**
   * Quiz for a visitor without an account. Nothing is sent to the server:
   * the final screen hands the answers to onPlanReady (which asks them to sign
   * up). A reviewed account type answers its details too, then goes to
   * onReviewedChoice: filing the request needs a sign-in, so that is where
   * they sign up, with their answers saved, rather than before the questions.
   */
  guest?: {
    onPlanReady: (snapshot: { answers: OnboardingAnswersV1; selectedIntent?: string }) => void;
    onReviewedChoice: (segment: ReviewedUserType, roleProfile: RoleProfile) => void;
  };
  /** Finish automatically when the session arrives complete (answers carried over from the guest quiz). */
  autoFinish?: boolean;
  /**
   * Start on screen 2 when the account type is already known from the
   * homepage mode (founder or builder only). Ignored for resumed sessions.
   */
  skipSituation?: boolean;
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

export function AdaptiveOnboardingForm({ session, onComplete, guest, autoFinish = false, skipSituation = false }: AdaptiveOnboardingFormProps) {
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
  // Investors are approved on submission, so their confirmation skips the review steps.
  const [submittedApproved, setSubmittedApproved] = useState(false);
  const [roleDraft, setRoleDraft] = useState<RoleProfile>(localFallback?.answers.roleProfile ?? session.answers.roleProfile ?? {});
  // A fresh session starts from the account type picked on the homepage, if
  // any. A resumed session keeps its own answer.
  const resumedSituation = localFallback?.answers.situation ?? session.answers.situation;
  const [intendedType] = useState(() => (resumedSituation ? null : readIntendedAccountType()));
  const initialSituation = resumedSituation ?? (intendedType ? situationForUserType(intendedType) : undefined);
  // What the visitor typed into a free tool before signing up. Only used for a
  // fresh session with no brief yet, so it never overwrites a real answer.
  const [toolHandoff] = useState(() => {
    const existingBrief = localFallback?.answers.startupBrief ?? session.answers.startupBrief;
    return resumedSituation || existingBrief?.trim() ? null : readToolHandoff();
  });
  const initialSegment = classifyOnboardingSituation(initialSituation);
  // The homepage mode already answers "What brings you here today?" (Idea ->
  // starting from scratch, Product -> have a project), so those visitors start
  // on screen 2. Back still returns to screen 1 to change it.
  const [skippedSituation] = useState(() => skipSituation && !resumedSituation
    && (initialSegment === 'founder' || initialSegment === 'builder'));
  // A reviewed account answers two questions: current situation, then
  // the fields that category is defined by. This is that second question,
  // kept out of currentStep so the founder step machine is untouched.
  const [reviewStage, setReviewStage] = useState<'choosing' | 'details'>(
    skippedSituation
      ? 'details'
      : !resumedSituation
        ? 'choosing'
        : localFallback?.answers.entryStage ?? session.answers.entryStage ?? (session.current_step > 0 ? 'details' : 'choosing'),
  );
  const [answers, setAnswers] = useState<OnboardingAnswersV1>({
    ...EMPTY_ONBOARDING_ANSWERS_V1,
    ...session.answers,
    ...localFallback?.answers,
    ...(toolHandoff ? {
      startupBrief: toolHandoff.seed,
      projectName: toolHandoff.projectName ?? '',
      // They typed an idea, so they are past "just exploring".
      ...(toolHandoff.mode === 'idea' && initialSegment === 'builder' ? { builderStartingPoint: 'idea_chosen' as const } : {}),
    } : {}),
    situation: initialSituation,
    founderSegment: initialSegment,
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
  const prefillTrackedRef = useRef(false);
  useEffect(() => {
    if (prefillTrackedRef.current || (!toolHandoff && !intendedType)) return;
    prefillTrackedRef.current = true;
    const fields = [
      intendedType ? 'situation' : null,
      toolHandoff ? 'startupBrief' : null,
      toolHandoff?.mode === 'idea' && initialSegment === 'builder' ? 'builderStartingPoint' : null,
      toolHandoff?.projectName ? 'projectName' : null,
    ].filter((field): field is string => Boolean(field));
    trackOnboardingPrefilled({ mode: toolHandoff?.mode ?? (intendedType === 'builder' ? 'idea' : 'product'), fields });
  }, [initialSegment, intendedType, toolHandoff]);
  const [currentStep, setCurrentStep] = useState(
    (localFallback?.answers.situation ?? session.answers.situation) ? localFallback?.currentStep ?? Math.min(session.current_step, CORE_STEPS - 1) : 0,
  );
  const [existingPreferences, setExistingPreferences] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completionAttempts, setCompletionAttempts] = useState(0);
  const [explicitIntent, setExplicitIntent] = useState(Boolean(session.answers.selectedIntent));
  // Set when a mentor or marketplace answer has no invitation on file. Shown
  // as a callout with a way forward rather than a bare error.
  const [invitationBlocked, setInvitationBlocked] = useState(false);
  // A resumed draft with optional answers opens the section so they stay visible.
  const [showOptionalDetails, setShowOptionalDetails] = useState(() => Boolean(answers.country || answers.investorVisible || answers.sectors.length));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(session.status === 'completed');
  const startedAtRef = useRef(new Date(session.started_at).getTime());
  const recommendationShownRef = useRef(false);
  const visibleStep = currentStep === 0 ? (reviewStage === 'details' ? 2 : 1) : currentStep + 2;

  const visibleTotal = isReviewedType(answers.founderSegment) ? 2 : CORE_STEPS + 1;

  useEffect(() => {
    // Bring the top of the card back into view on every step, which matters on
    // phones where the Continue button sits far below the question.
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    cardRef.current?.scrollIntoView?.({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    headingRef.current?.focus({ preventScroll: true });
  }, [currentStep, reviewStage, submittedReview]);

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
    // Guests have no server session; their progress stays in the local draft above.
    if (guest || completedRef.current || isSaving) return;
    const timer = window.setTimeout(() => {
      void saveOnboardingProgress({ sessionId: session.id, currentStep,
        answers: { ...answers, roleProfile: roleDraft, entryStage: reviewStage },
      }).catch(() => undefined);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [answers, roleDraft, reviewStage, currentStep, session.id, isSaving, guest]);

  // Snapshot the live step in a ref so the teardown below can read the latest
  // value without listing it as a dependency. Depending on currentStep here
  // would re-register the effect on every step, and its cleanup would fire an
  // abandonment on each forward transition rather than only on a real exit.
  const abandonRef = useRef({ currentStep, userId: user?.id, visibleStep, visibleTotal, userType: answers.founderSegment });
  useEffect(() => {
    abandonRef.current = { currentStep, userId: user?.id, visibleStep, visibleTotal, userType: answers.founderSegment };
  }, [currentStep, user?.id, visibleStep, visibleTotal, answers.founderSegment]);

  // Every screen shown, so a guest's last one marks where they left.
  const viewedStepName = stepNameFor(visibleStep, answers.founderSegment);
  useEffect(() => {
    trackOnboardingStepViewed({
      step: visibleStep,
      step_name: viewedStepName,
      total_steps: visibleTotal,
      segment: answers.founderSegment || 'unknown',
      is_guest: Boolean(guest),
      onboarding_session_id: session.id,
    });
    // Fires on a screen change only, not on every answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleStep, viewedStepName]);

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
      if (length < 20 || length > 280) {
        return answers.founderSegment === 'builder'
          ? 'Write 20 to 280 characters about the problem or area you want to explore.'
          : 'Write 20 to 280 characters about what you build and who it serves.';
      }
      // A project is mandatory for founders and builders, so it is asked for
      // here rather than chased afterwards. Providers never take this quiz.
      if (answers.investorVisible && !answers.investmentStage) return 'Choose the funding stage investors should match.';
      if (answers.founderSegment === 'builder' && !answers.builderStartingPoint) return 'Choose whether you are exploring or have an idea.';
      if (answers.founderSegment === 'founder' && !answers.projectName.trim()) return 'Give your project a name. Everything you build attaches to it.';
    }
    // Six screens: situation, brief, business and evidence, goal and blocker,
    // time and runway, review. Related questions share a screen so the quiz
    // does not feel longer than the answers it needs.
    if (step === 1) {
      if (!answers.businessModel) return 'Choose the business model that fits best.';
      if (!answers.evidenceState) return 'Choose the strongest evidence you have today.';
      if (requiresCustomerCount(answers.evidenceState) && !answers.customerCountBand) {
        return 'Choose your current paying-customer range.';
      }
    }
    if (step === 2) {
      if (!answers.primaryGoal) return 'Choose the most important 30-day outcome.';
      if (!answers.blocker) return 'Choose the blocker most likely to stop that outcome.';
      if (requiresCofounderSituation(answers.blocker) && !answers.cofounderSituation) {
        return 'Tell us whether you are actively looking for a co-founder.';
      }
      if (requiresFundraisingStatus(answers.primaryGoal, answers.blocker) && !answers.fundraisingStatus) {
        return 'Choose your current fundraising status.';
      }
    }
    if (step === 3) {
      if (!answers.weeklyCapacityHours) return 'Choose the time you can protect each week.';
      if (!answers.runwayMonths) return 'Choose how long you can keep going, or “Not spending money on this yet”.';
    }
    if (step === 4 && !answers.selectedIntent) return 'Choose a first action.';
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
      if (!answers.situation || !answers.founderSegment) { setError('Choose the option that describes your situation.'); return; }
      // The invitation check needs a sign-in, so a guest answers the details
      // first and the check runs when they confirm the choice after signup.
      if (!guest && (answers.founderSegment === 'mentor' || answers.founderSegment === 'marketplace')) {
        setIsSaving(true); submittingRef.current = true;
        try {
          const invitations = await getMyAccountInvitationTypes();
          if (!invitations.includes(answers.founderSegment)) { setInvitationBlocked(true); return; }
        } catch { setError('Could not check your invitation. Please try again.'); return; }
        finally { setIsSaving(false); submittingRef.current = false; }
      }
      setReviewStage('details');
      void trackRetentionEvent('onboarding_classified', { user_id: user?.id, user_type: answers.founderSegment, quiz_version: 2, onboarding_session_id: session.id });
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
        setError(`Fill in ${joinList(missing.map((field) => field.label.replace(/\?$/, '').toLowerCase()))}.`);
        return;
      }
      // Quiz finished: now ask the guest to sign up, so the request is sent.
      if (guest) {
        guest.onReviewedChoice(answers.founderSegment, sanitizeRoleProfile(answers.founderSegment, roleDraft));
        return;
      }
      setIsSaving(true);
      submittingRef.current = true;
      try {
        const { approvalStatus } = await submitAccountApplication({
          situation: answers.situation,
          sessionId: session.id,
          fullName: user?.user_metadata?.full_name ?? null,
          email: user?.email ?? null,
          roleProfile: sanitizeRoleProfile(answers.founderSegment, roleDraft),
        });
        completedRef.current = true;
        try { localStorage.removeItem(`adaptive_onboarding_${session.id}`); } catch { /* storage unavailable */ }
        clearIntendedAccountType();
        clearToolHandoff();
        clearGuestOnboarding();
        setSubmittedApproved(approvalStatus === 'approved');
        setSubmittedReview(answers.founderSegment);
        void queryClient.invalidateQueries({ queryKey: ['account-context', user?.id] });
        void trackRetentionEvent('onboarding_completed', { user_id: user?.id, user_type: answers.founderSegment, quiz_version: 2, onboarding_session_id: session.id, completion_kind: approvalStatus === 'approved' ? 'self_serve_approved' : 'application_submitted' });
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Could not send your request. Please try again.');
      } finally {
        submittingRef.current = false;
        setIsSaving(false);
      }
      return;
    }

    if (currentStep === CORE_STEPS - 1) {
      if (guest) {
        // Same completeness check as a real completion, then hand over for signup.
        const incomplete = isAdaptiveOnboardingComplete(answers) ? null : findIncompleteStep();
        if (incomplete) {
          setCurrentStep(incomplete.step);
          setError(incomplete.message);
          return;
        }
        guest.onPlanReady({ answers, selectedIntent: explicitIntent ? answers.selectedIntent || undefined : undefined });
        return;
      }
      await handleComplete();
      return;
    }

    trackOnboardingStepCompleted({
      step: visibleStep,
      step_name: ['startup_brief', 'business_and_evidence', 'goal_and_blocker', 'capacity'][currentStep],
      total_steps: visibleTotal,
      elapsed_ms: Date.now() - startedAtRef.current,
      quiz_version: 2,
      onboarding_session_id: session.id,
      flow_version: session.flow_version,
      rollout_variant: session.rollout_variant,
    });
    if (guest) {
      setCurrentStep((step) => step + 1);
      return;
    }
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
        supportAreasNeeded: onboardingSupportNeeds(answers.primaryGoal, answers.blocker),
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
      clearIntendedAccountType();
      clearToolHandoff();
      clearGuestOnboarding();
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
        supportAreas: onboardingSupportNeeds(answers.primaryGoal, answers.blocker),
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

  // Answers carried over from the guest quiz: save them without asking again.
  // Waits for the first action to be chosen with this account's real credits,
  // so the recommendation is not the reduced guest one. Runs once; a failure
  // leaves the final screen and its button in place.
  const autoFinishStartedRef = useRef(false);
  const [autoFinishing, setAutoFinishing] = useState(false);
  useEffect(() => {
    if (!autoFinish || guest || autoFinishStartedRef.current || !user || creditsLoading) return;
    if (currentStep !== CORE_STEPS - 1 || !answers.selectedIntent || !isAdaptiveOnboardingComplete(answers)) return;
    autoFinishStartedRef.current = true;
    setAutoFinishing(true);
    void handleComplete().finally(() => setAutoFinishing(false));
    // handleComplete reads the latest answers when it runs; it is not a trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFinish, guest, user, creditsLoading, currentStep, answers]);

  // A reviewed type is answering a two step flow, and a progress bar claiming
  // seven would be a lie about how much is left.
  const reviewing = currentStep === 0 && isReviewedType(answers.founderSegment) && !submittedReview;
  const totalSteps = visibleTotal;
  const displayStep = submittedReview ? 2 : visibleStep;
  const stepName = submittedReview ? (submittedApproved ? 'Account ready' : 'Request sent') : stepNameFor(displayStep, answers.founderSegment);

  const renderStep = () => {
    if (currentStep === 0) {
      // The request is filed and the category fields came with it, so this
      // is a confirmation and nothing more.
      if (submittedReview && submittedApproved) {
        return (
          <div className="mx-auto max-w-xl py-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-teal/15">
              <Check className="h-7 w-7 text-accent-teal" />
            </div>
            <h2 ref={headingRef} tabIndex={-1} className="mt-5 font-space-grotesk text-2xl font-semibold outline-none">Your {USER_TYPE_LABEL[submittedReview].toLowerCase()} account is ready.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Your workspace and founder matches are open now. You can refine your investment focus from your account details at any time.
            </p>
          </div>
        );
      }

      if (submittedReview) {
        return (
          <div className="mx-auto max-w-xl py-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-teal/15">
              <Check className="h-7 w-7 text-accent-teal" />
            </div>
            <h2 ref={headingRef} tabIndex={-1} className="mt-5 font-space-grotesk text-2xl font-semibold outline-none">Thanks, your request has been sent.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              You can use your workspace now. We will email you after review.
            </p>
            <ol className="mx-auto mt-6 grid max-w-sm gap-3 text-left text-sm">
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-teal/15 text-xs font-semibold text-accent-teal">1</span>An admin reviews the details you sent.</li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-teal/15 text-xs font-semibold text-accent-teal">2</span>You get an email with the decision.</li>
              <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-teal/15 text-xs font-semibold text-accent-teal">3</span>Once approved, you set up your public profile from your workspace.</li>
            </ol>
          </div>
        );
      }

      if (reviewStage === 'choosing') return <>
        <StepHeading eyebrow="Set up your account" title="What brings you here today?" description="Choose the statement that fits you best. It decides which workspace you get." headingRef={headingRef} />
        {intendedType && answers.founderSegment === intendedType ? (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-accent-teal/30 bg-accent-teal/10 px-3 py-2 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-teal" aria-hidden="true" />
            We selected this from your choice on the homepage. You can pick a different one.
          </p>
        ) : null}
        <div className="mt-6"><ChoiceGrid options={ONBOARDING_SITUATIONS} value={answers.situation ?? ''} onSelect={(situation) => {
          const founderSegment = classifyOnboardingSituation(situation);
          if (founderSegment !== answers.founderSegment) setRoleDraft({});
          // Moving off a type we pre-selected is the wrong-mode signal.
          if (intendedType && answers.founderSegment === intendedType && founderSegment && founderSegment !== intendedType) {
            trackOnboardingAccountTypeChanged({ from_type: intendedType, to_type: founderSegment });
          }
          setError(''); setInvitationBlocked(false); patchAnswers({ situation, founderSegment });
        }} /></div>
        {invitationBlocked ? (
          <div role="alert" className="mt-5 rounded-xl border border-warning/40 bg-warning-subtle p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><Lock className="h-4 w-4 text-warning" aria-hidden="true" />This option needs an invitation</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This participation requires an invitation for your verified sign-in email{user?.email ? <> (<span className="font-medium text-foreground">{user.email}</span>)</> : null}. If you were invited with another address, sign in with that one.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <a href="/contact" className="inline-flex items-center font-semibold text-primary hover:underline">Request an invitation <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" /></a>
              <span className="text-muted-foreground">or pick another option above.</span>
            </div>
          </div>
        ) : null}
      </>;

      // The second and last question a reviewed type is asked.
      if (reviewStage === 'details' && isReviewedType(answers.founderSegment)) {
        return (
          <>
            <StepHeading
              eyebrow={answers.founderSegment === 'investor' ? 'Set up your account' : 'Request access'}
              title={`Tell us about your ${USER_TYPE_LABEL[answers.founderSegment].toLowerCase()} work`}
              description={answers.founderSegment === 'investor' ? 'These answers decide which founders you are matched with. You can refine them from your workspace.' : 'These answers help us review your request. You can refine your public profile and preferences from your workspace.'}
              headingRef={headingRef}
            />
            <div className="mt-6">
              <RoleProfileFields userType={answers.founderSegment} value={roleDraft} onChange={setRoleDraft} />
            </div>
          </>
        );
      }

      const isBuilder = answers.founderSegment === 'builder';
      const briefLength = answers.startupBrief.trim().length;
      const optionalCount = [answers.country.trim(), answers.investorVisible, answers.sectors.length > 0].filter(Boolean).length;
      // Investor matching needs its funding stage, so that section cannot be
      // folded away while the box is ticked.
      const optionalOpen = showOptionalDetails || answers.investorVisible === true;
      return (
        <>
          <StepHeading
            title={isBuilder ? 'What problem or area would you like to explore?' : 'What are you building, and who is it for?'}
            description={isBuilder
              ? 'A sentence or two is enough. It does not need to be a finished idea.'
              : 'One or two sentences. Your dashboard uses this to make specific recommendations.'}
            headingRef={headingRef}
          />
          {toolHandoff || skippedSituation ? (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-accent-teal/30 bg-accent-teal/10 px-3 py-2 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-teal" aria-hidden="true" />
              <span>
                {toolHandoff ? 'We filled this in from what you wrote earlier. Edit anything.' : null}
                {skippedSituation
                  ? ` ${toolHandoff ? '' : 'We set this up from your choice on the homepage. '}Not a ${isBuilder ? 'builder' : 'founder'}? Use Back to change it.`
                  : null}
              </span>
            </p>
          ) : null}
          {isBuilder && (
            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold">Where are you starting?</p>
              <ChoiceGrid columns={2} options={[[ 'exploring', 'Exploring problems and ideas' ], [ 'idea_chosen', 'I have an idea to validate' ]] as const} value={answers.builderStartingPoint ?? ''} onSelect={(builderStartingPoint) => patchAnswers({ builderStartingPoint })} />
            </div>
          )}
          <label htmlFor="onboarding-brief" className="mt-6 block text-sm font-semibold">{isBuilder ? 'The problem or area' : 'Your brief'}</label>
          <Textarea
            id="onboarding-brief"
            value={answers.startupBrief}
            onChange={(event) => patchAnswers({ startupBrief: event.target.value.slice(0, 280) })}
            rows={4}
            placeholder={isBuilder
              ? 'Example: Freelance designers lose hours chasing unpaid invoices. I want to find out how common that is.'
              : 'Example: We help independent agencies turn client calls into clear project briefs and proposals.'}
            className="mt-2 resize-none"
            aria-describedby="onboarding-brief-count"
          />
          <p id="onboarding-brief-count" className="mt-2 flex justify-between gap-3 text-xs text-muted-foreground tabular-nums">
            <span className={cn(briefLength > 0 && briefLength < 20 && 'text-warning')}>
              {briefLength < 20 ? `${20 - briefLength} more ${20 - briefLength === 1 ? 'character' : 'characters'} needed` : <span className="inline-flex items-center gap-1 text-success"><Check className="h-3.5 w-3.5" aria-hidden="true" />Looks good</span>}
            </span>
            <span>{briefLength}/280</span>
          </p>
          <label htmlFor="onboarding-project-name" className="mt-6 block text-sm font-semibold">{isBuilder ? 'Working title (optional)' : 'What is your project called?'}</label>
          <Input
            id="onboarding-project-name"
            value={answers.projectName}
            onChange={(event) => patchAnswers({ projectName: event.target.value.slice(0, 120) })}
            placeholder="Throughline"
            maxLength={120}
            className="mt-2"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {isBuilder ? 'No name yet? We will save an editable “Untitled idea” project.' : 'Everything you build on Creatives Takeover is saved to this project.'}
          </p>

          <div className="mt-8 rounded-xl border border-border/60">
            <button
              type="button"
              aria-expanded={optionalOpen}
              aria-controls="onboarding-optional-details"
              onClick={() => setShowOptionalDetails(!optionalOpen)}
              disabled={answers.investorVisible === true}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left disabled:cursor-default"
            >
              <span>
                <span className="block text-sm font-semibold">Optional details</span>
                <span className="block text-xs text-muted-foreground">
                  {optionalCount > 0 ? `${optionalCount} added` : 'Country, sectors and investor matching. You can skip this.'}
                </span>
              </span>
              <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none', optionalOpen && 'rotate-180')} aria-hidden="true" />
            </button>
            {optionalOpen && (
          <div id="onboarding-optional-details" className="border-t border-border/60 px-4 pb-5">
          <label htmlFor="onboarding-country" className="mt-5 block text-sm font-semibold">Country</label>
          <Input id="onboarding-country" value={answers.country} placeholder={detectCountryFromLocale() || 'Your country'} maxLength={100} onChange={(event) => patchAnswers({ country: event.target.value })} className="mt-2" />
          <p className="mt-1 text-xs text-muted-foreground">Used for local recommendations. The placeholder is only a browser suggestion.</p>
          <div className="mt-5 flex items-start gap-3">
            <Checkbox id="onboarding-investor-visible" className="mt-0.5" checked={answers.investorVisible === true} onCheckedChange={(checked) => patchAnswers({ investorVisible: checked === true, investmentStage: checked === true ? answers.investmentStage : '' })} />
            <label htmlFor="onboarding-investor-visible" className="text-sm leading-5">Include my project summary in matches for approved investors. I can change this later in my account details.</label>
          </div>
          {answers.investorVisible && (
            <div className="mt-4 pl-7">
              <label htmlFor="investment-stage" className="block text-sm font-semibold">Funding stage to match</label>
              <Select value={answers.investmentStage || undefined} onValueChange={(investmentStage) => patchAnswers({ investmentStage })}>
                <SelectTrigger id="investment-stage" className="mt-2"><SelectValue placeholder="Choose a funding stage" /></SelectTrigger>
                <SelectContent>{INVESTMENT_STAGES.map((stage) => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}</SelectContent>
              </Select>
              <InvestmentStageGuide selected={answers.investmentStage} />
            </div>
          )}
          <p className="mt-5 text-sm font-semibold">Sectors</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ANGEL_SECTOR_OPTIONS.filter((sector) => !LEGACY_SECTORS.has(sector) || answers.sectors.includes(sector)).map((sector) => {
              const selected = answers.sectors.includes(sector);
              // The server accepts at most MAX_SECTORS, so stop at the same limit.
              const full = !selected && answers.sectors.length >= MAX_SECTORS;
              return (
                <button
                  key={sector}
                  type="button"
                  aria-pressed={selected}
                  disabled={full}
                  onClick={() => patchAnswers({
                    sectors: selected
                      ? answers.sectors.filter((item) => item !== sector)
                      : [...answers.sectors, sector],
                  })}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs transition-colors disabled:opacity-40',
                    selected ? 'border-accent-teal bg-accent-teal/10 text-foreground' : 'border-border/60 text-muted-foreground',
                  )}
                >
                  {sector}
                </button>
              );
            })}
          </div>
          </div>
            )}
          </div>
        </>
      );
    }
    if (currentStep === 1) {
      const isBuilder = answers.founderSegment === 'builder';
      return (
        <>
          <StepHeading
            title={isBuilder ? 'Your idea and its customers' : 'Your business and its customers'}
            description="Two quick questions. They shape the examples, playbooks and stage used across your dashboard."
            headingRef={headingRef}
          />
          {/* Someone starting from scratch has no business yet, so builders are
              asked for a best guess and see the honest answer first. */}
          <SubQuestion
            title={isBuilder ? 'How might this make money?' : 'How does this business make money?'}
            hint={isBuilder ? 'A best guess is fine. Pick “Not sure yet” if you have not decided.' : undefined}
          >
            <ChoiceGrid
              columns={2}
              options={isBuilder ? [['other', 'Not sure yet / another model'] as const, ...BUSINESS_MODELS.filter((option) => option[0] !== 'other')] : BUSINESS_MODELS}
              value={answers.businessModel}
              onSelect={(businessModel) => patchAnswers({ businessModel })}
            />
          </SubQuestion>
          <SubQuestion
            title="What is the strongest customer evidence you have?"
            hint="Pick the furthest point real customers have reached. Work you did on your own does not count yet."
          >
          <ChoiceGrid options={EVIDENCE_OPTIONS} value={answers.evidenceState} onSelect={(evidenceState) => {
            // Customer count and revenue only apply to paying evidence; drop
            // them when the answer moves below that so they are not saved stale.
            const keep = requiresCustomerCount(evidenceState);
            patchAnswers({ evidenceState, customerCountBand: keep ? answers.customerCountBand : '', revenueBand: keep ? answers.revenueBand : '' });
          }} />
          </SubQuestion>
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
    if (currentStep === 2) {
      return (
        <>
          <StepHeading title="Your next 30 days" description="What you want to achieve, and what is most likely to get in the way. Your Progress Tracker and first action are built from these." headingRef={headingRef} />
          <SubQuestion title="What outcome matters most in the next 30 days?">
            <ChoiceGrid columns={2} options={GOAL_OPTIONS} value={answers.primaryGoal} onSelect={(primaryGoal) => patchAnswers({
              primaryGoal,
              fundraisingStatus: requiresFundraisingStatus(primaryGoal, answers.blocker) ? answers.fundraisingStatus : '',
            })} />
          </SubQuestion>
          <SubQuestion title="What is most likely to stop that outcome?">
            <ChoiceGrid columns={2} options={BLOCKER_OPTIONS} value={answers.blocker} onSelect={(blocker) => patchAnswers({
              blocker,
              cofounderSituation: requiresCofounderSituation(blocker) ? answers.cofounderSituation : '',
              fundraisingStatus: requiresFundraisingStatus(answers.primaryGoal, blocker) ? answers.fundraisingStatus : '',
            })} />
          </SubQuestion>
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
          {/* Goal and blocker share this screen, so the follow-up is asked
              once for either reason and stays visible once answered. */}
          {requiresFundraisingStatus(answers.primaryGoal, answers.blocker) ? (
            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold">Where is fundraising today?</p>
              <ChoiceGrid options={FUNDRAISING_OPTIONS} value={answers.fundraisingStatus} onSelect={(fundraisingStatus) => patchAnswers({ fundraisingStatus })} />
            </div>
          ) : null}
        </>
      );
    }
    if (currentStep === 3) {
      return (
        <>
          <StepHeading title="What are you working with?" description="Your routine and daily missions are sized to the time and money you have." headingRef={headingRef} />
          <p className="mt-5 text-sm font-semibold">How much focused time can you give this each week?</p>
          <div className="mt-3"><ChoiceGrid columns={2} options={CAPACITY_OPTIONS} value={answers.weeklyCapacityHours} onSelect={(weeklyCapacityHours) => patchAnswers({ weeklyCapacityHours })} /></div>
          <div className="mt-6">
            <p className="mb-1 text-sm font-semibold">If you are spending money on this, how long can you keep going?</p>
            <p className="mb-3 text-xs text-muted-foreground">Only money you are spending on this project counts. A short runway changes which action is worth doing first.</p>
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
        <StepHeading title="Your plan is ready" description="This is how your answers shape your workspace. Use Back to change anything before you start." headingRef={headingRef} />
        <div className="mt-6 rounded-xl border border-accent-teal/30 bg-accent-teal/10 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{USER_TYPE_LABEL[answers.founderSegment || 'founder']} workspace</Badge>
            <Badge variant="outline">Stage {draftContext.assignedStage}: {draftContext.assignedStageLabel}</Badge>
            <Badge variant="outline">{LOOP_LABEL[draftContext.founderLoop] ?? draftContext.founderLoop}</Badge>
            <Badge variant="outline">
              {draftContext.stageConfidenceBand === 'high'
                ? 'Strong stage evidence'
                : draftContext.stageConfidenceBand === 'medium'
                  ? 'Moderate stage evidence'
                  : 'Stage will refine with evidence'}
            </Badge>
            {draftContext.capitalMotion !== 'inactive' ? (
              <Badge variant="outline">{CAPITAL_MOTION_LABEL[draftContext.capitalMotion] ?? 'Fundraising'}</Badge>
            ) : null}
            <Badge variant="outline">{labelOf(CAPACITY_OPTIONS, answers.weeklyCapacityHours) || `${answers.weeklyCapacityHours} hours`} a week</Badge>
          </div>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
            <div><dt className="text-muted-foreground">30-day goal</dt><dd className="mt-1 font-medium">{labelOf(GOAL_OPTIONS, answers.primaryGoal)}</dd></div>
            <div><dt className="text-muted-foreground">Daily routine</dt><dd className="mt-1 font-medium">{ROUTINE_LABEL[draftContext.routineGoal] ?? 'Your weekly routine'}</dd></div>
            <div><dt className="text-muted-foreground">Main blocker</dt><dd className="mt-1 font-medium">{labelOf(BLOCKER_OPTIONS, answers.blocker)}</dd></div>
          </dl>
        </div>
        <div className="mt-5 rounded-xl border-2 border-accent-teal bg-background/80 p-5">
          <Badge className="bg-accent-teal text-white">Recommended first win</Badge>
          <h3 className="mt-3 font-space-grotesk text-xl font-semibold">{selected.label}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{selected.output}{selected.estimatedMinutes ? ` in about ${selected.estimatedMinutes} minutes` : ''}.</p>
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
      {/* overflow-clip rather than overflow-hidden so the footer can stick. */}
      <Card ref={cardRef} className="scroll-mt-4 overflow-clip border-border/60 bg-card/95 shadow-2xl">
        <CardContent className="p-0">
          <div className="border-b border-border/60 bg-background/60 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-teal/15 text-accent-teal"><Sparkles className="h-5 w-5" /></span>
                <div>
                  <p className="font-semibold">{answers.founderSegment ? USER_TYPE_LABEL[answers.founderSegment] + ' setup' : 'Your workspace'}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {displayStep} of {totalSteps}
                    {stepName ? <> · {stepName}</> : null}
                  </p>
                </div>
              </div>
              <span className="text-sm font-medium text-muted-foreground tabular-nums">{Math.round((displayStep / totalSteps) * 100)}%</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-accent-teal transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${(displayStep / totalSteps) * 100}%` }} />
            </div>
            <p className="sr-only" aria-live="polite">Step {displayStep} of {totalSteps}: {stepName}</p>
          </div>
          <section className="min-h-96 p-5 sm:p-8">
            <div key={`${currentStep}-${reviewStage}-${submittedReview ?? ''}`} className="mx-auto max-w-2xl animate-fade-in-up motion-reduce:animate-none">{renderStep()}</div>
          </section>
          <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-border/60 bg-card/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-8">
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
              {autoFinishing ? <p className="mb-2 text-sm text-muted-foreground" role="status">Saving your plan…</p> : null}
              <Button type="button" onClick={() => void handleNext()} disabled={isSaving || autoFinishing}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submittedReview
                  ? 'Open my workspace'
                  : reviewing && reviewStage === 'details'
                    ? (answers.founderSegment === 'investor' ? 'Create my account' : 'Send my request')
                    : currentStep === CORE_STEPS - 1
                      ? guest ? 'Create my free account' : `Start: ${ACTIVATION_CATALOG[answers.selectedIntent || recommendation.intent].label}`
                      : 'Continue'}
                {!isSaving ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
              </Button>
              {guest && currentStep === CORE_STEPS - 1 ? (
                <p className="mt-2 max-w-xs text-xs text-muted-foreground">
                  Free, about 30 seconds. Your answers stay on this device until you create your account.
                </p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** One question within a screen that asks more than one. */
const SubQuestion = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => (
  <fieldset className="mt-8">
    <legend className="text-base font-semibold">{title}</legend>
    {hint ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    <div className="mt-3">{children}</div>
  </fieldset>
);

const StepHeading = ({
  eyebrow = 'Personalize your Progress Tracker',
  title,
  description,
  headingRef,
}: {
  /** Founder and builder screens keep the default; other flows say what they are. */
  eyebrow?: string;
  title: string;
  description: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) => (
  <div>
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-teal">{eyebrow}</p>
    <h2 ref={headingRef} tabIndex={-1} className="font-space-grotesk text-2xl font-semibold tracking-tight outline-none sm:text-3xl">{title}</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
  </div>
);
