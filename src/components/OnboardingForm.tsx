import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Target,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { ANGEL_SECTOR_OPTIONS } from '@/data/angelSectors';
import { COUNTRY_OPTIONS } from '@/data/countries';
import {
  captureEvent,
  trackOnboardingAbandoned,
  trackOnboardingCompleted,
  trackOnboardingStepCompleted,
} from '@/lib/analytics';
import { trackActivity } from '@/lib/activity';
import { cn } from '@/lib/utils';
import { refreshOnboardingMentorRecommendations } from '@/lib/onboardingMentorRecommendations';
import { getActivationRoute, startActivationJourney, type ActivationIntent } from '@/lib/retentionSystem';
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
  activationIntent: ActivationIntent | '';
}

type StepKind = 'stage' | 'fundraising' | 'sector' | 'country' | 'activation';

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

const ACTIVATION_CARDS: ActivationCard[] = [
  {
    value: 'find_mentor',
    headline: 'Find a mentor',
    sub: 'Start with one mentor worth saving, messaging, or booking.',
    cta: 'Open mentor matches',
    icon: Users,
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

const emptyOnboardingData: OnboardingData = {
  stageAnswers: {},
  startupSectors: [],
  country: '',
  activationIntent: '',
};

// Increment this whenever the question set changes so PostHog cohorts stay clean.
const QUIZ_VERSION = 4;

interface OnboardingFormProps {
  onComplete?: (startRoute?: string) => void;
}

function toggleValue(current: string[], value: string) {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
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
  const [countrySearch, setCountrySearch] = useState('');
  const [currentStep, setCurrentStep] = useState(() => {
    try {
      const draft = sessionStorage.getItem(`onboarding_draft_${user?.id}`);
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
      const draft = sessionStorage.getItem(`onboarding_draft_${user?.id}`);
      if (draft) {
        const parsed = JSON.parse(draft);
        return {
          ...emptyOnboardingData,
          stageAnswers: parsed.stageAnswers ?? {},
          startupSectors: Array.isArray(parsed.startupSectors) ? parsed.startupSectors : [],
          country: parsed.country ?? '',
          activationIntent: parsed.activationIntent ?? '',
        };
      }
    } catch {
      /* ignore */
    }
    return emptyOnboardingData;
  });

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
      { id: 'activation_intent', kind: 'activation', chapter: 'First action', label: 'Launchpad' },
    );

    return list;
  }, [formData.stageAnswers.blocker]);

  const totalSteps = steps.length;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      sessionStorage.setItem(`onboarding_draft_${user.id}`, JSON.stringify({
        currentStep,
        stageAnswers: formData.stageAnswers,
        startupSectors: formData.startupSectors,
        country: formData.country,
        activationIntent: formData.activationIntent,
      }));
    } catch {
      /* ignore */
    }
  }, [
    currentStep,
    formData.activationIntent,
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

  const step = steps[Math.min(currentStep, totalSteps - 1)];
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const diagnostic = useMemo(() => getStageDiagnostic(formData.stageAnswers), [formData.stageAnswers]);
  const assignedStage = diagnostic?.assignedStage ?? null;
  const stageMeta = assignedStage ? STAGES[assignedStage] : null;
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
      case 'activation':
        if (!formData.activationIntent) newErrors.activationIntent = 'Choose the first action that would help this week';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleBack = () => {
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

      await startActivationJourney({
        userId: user.id,
        businessStage,
        primaryPain,
        activationIntent: selectedIntent,
        startupSectors: formData.startupSectors,
        supportAreasNeeded: supportAreas,
        country: formData.country,
        assignedStage: finalAssignedStage,
        quizAnswersV3: createQuizAnswersV3Payload(stageAnswers, finalDiagnostic),
      });

      await refreshOnboardingMentorRecommendations({
        userId: user.id,
        sectors: formData.startupSectors,
        supportAreas,
        assignedStage: finalAssignedStage,
        stageAnswers,
      });

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
        timeMs: Date.now() - startedAt,
        startRoute,
      });
      trackOnboardingCompleted({
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
      });
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
        startRoute,
      }, user.id);

      toast.success('Your launchpad is ready. Opening your first action now.');

      try {
        sessionStorage.removeItem(`onboarding_draft_${user.id}`);
      } catch {
        /* ignore */
      }

      onComplete?.(appendActivationParams(startRoute, selectedIntent));
    } catch (error) {
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
          <p className="mb-2 text-xs font-semibold uppercase text-[#32b8c6]">{step.chapter}</p>
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
                }}
                aria-pressed={selected}
                className={cn(
                  'flex min-h-14 items-start gap-3 rounded-lg border p-3 text-left transition-all',
                  selected
                    ? 'border-[#32b8c6] bg-[#32b8c6]/10 shadow-sm shadow-[#32b8c6]/10'
                    : 'border-border/60 bg-background/70 hover:border-[#32b8c6]/50 hover:bg-accent/60',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                    selected
                      ? 'border-[#32b8c6] bg-[#32b8c6] text-white'
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
        <p className="mb-2 text-xs font-semibold uppercase text-[#32b8c6]">Context</p>
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
                  ? 'border-[#32b8c6] bg-[#32b8c6]/10 text-foreground shadow-sm shadow-[#32b8c6]/10'
                  : 'border-border/60 bg-background/70 hover:border-[#32b8c6]/50 hover:bg-accent/60',
              )}
            >
              <span className="flex items-center justify-between gap-3 font-medium">
                <span>{option}</span>
                {selected ? <Check className="h-4 w-4 shrink-0 text-[#32b8c6]" /> : null}
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
        <p className="mb-2 text-xs font-semibold uppercase text-[#32b8c6]">Context</p>
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
            placeholder="Search countries"
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
                }}
                aria-pressed={selected}
                className={cn(
                  'min-h-10 rounded-md px-3 py-2 text-left text-sm transition-colors',
                  selected ? 'bg-[#32b8c6]/15 font-semibold text-foreground' : 'hover:bg-accent',
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
        <p className="mb-2 text-xs font-semibold uppercase text-[#32b8c6]">First action</p>
        <h2 className="font-space-grotesk text-2xl font-semibold tracking-tight sm:text-3xl">
          Choose your first win
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          We will save your profile, add recommendations, and send you straight into this action.
        </p>
      </div>

      {stageMeta && diagnostic ? (
        <div className="rounded-lg border border-[#32b8c6]/30 bg-[#32b8c6]/10 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-[#32b8c6]">Your founder stage</p>
              <p className="mt-1 font-space-grotesk text-xl font-semibold">
                Stage {stageMeta.id}: {stageMeta.name}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{stageMeta.description}</p>
            </div>
            <div className="shrink-0 rounded-full border border-[#32b8c6]/30 bg-background/70 px-3 py-1 text-sm font-semibold">
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
                  ? 'border-[#32b8c6] bg-[#32b8c6]/10 shadow-sm shadow-[#32b8c6]/10'
                  : 'border-border/60 bg-background/70 hover:border-[#32b8c6]/50 hover:bg-accent/60',
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                  isSelected ? 'bg-[#32b8c6] text-white' : 'bg-muted text-muted-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-space-grotesk text-base font-semibold">{card.headline}</span>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">{card.sub}</span>
                {isSelected && selectedRoute ? (
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#32b8c6]">
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
      case 'activation':
        return renderActivationStep();
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-6">
      <Card className="overflow-hidden rounded-lg border border-border/60 bg-card/95 shadow-2xl backdrop-blur-md">
        <CardContent className="p-0">
          <div className="grid min-h-[640px] lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="border-b border-border/60 bg-background/60 p-5 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#32b8c6]/15 text-[#32b8c6]">
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
                    className="h-full rounded-full bg-[#32b8c6]"
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
                        isActive ? 'bg-[#32b8c6]/10 text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                          isComplete
                            ? 'border-[#32b8c6] bg-[#32b8c6] text-white'
                            : isActive
                              ? 'border-[#32b8c6] text-[#32b8c6]'
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
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#32b8c6]" />
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
                        {selectedActivationCard?.cta ?? 'Start first action'}
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
