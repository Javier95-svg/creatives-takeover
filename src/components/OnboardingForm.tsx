import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Hammer, Lightbulb, Loader2, Search, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import { ANGEL_SECTOR_OPTIONS } from '@/data/angelSectors';
import { COUNTRY_OPTIONS } from '@/data/countries';
import { MENTOR_EXPERTISE_OPTIONS } from '@/data/mentorExpertise';
import {
  captureEvent,
  trackOnboardingCompleted,
  trackOnboardingStepCompleted,
} from '@/lib/analytics';
import { trackActivity } from '@/lib/activity';
import { refreshOnboardingMentorRecommendations } from '@/lib/onboardingMentorRecommendations';
import { getActivationRoute, startActivationJourney, type ActivationIntent } from '@/lib/retentionSystem';

interface OnboardingData {
  businessStage: string;
  startupSectors: string[];
  supportAreasNeeded: string[];
  country: string;
  primaryPain: string;
  activationIntent: ActivationIntent | '';
  acceptedTerms: boolean;
}

const PRIMARY_PAIN_OPTIONS = [
  { value: 'unclear_direction', label: 'Too many ideas - I need focus' },
  { value: 'cant_validate', label: "I can't tell if anyone wants this" },
  { value: 'building_isolation', label: 'Building alone with no feedback' },
  { value: 'worried_funding', label: 'Worried about funding and investors' },
  { value: 'overwhelmed_execution', label: "Don't know what to build first" },
];

const STAGE_CARDS = [
  {
    value: 'idea',
    icon: Lightbulb,
    headline: "I have an idea but don't know who it's for",
    sub: 'We will route you into a first action that creates a real return trigger.',
  },
  {
    value: 'validation',
    icon: Target,
    headline: 'I know my customer - I need to test demand',
    sub: 'We will push you toward one concrete founder action instead of generic exploration.',
  },
  {
    value: 'mvp',
    icon: Hammer,
    headline: "I'm building the product now",
    sub: 'Your first move should create follow-up, not just another page view.',
  },
];

const ACTIVATION_CARDS: Array<{
  value: ActivationIntent;
  headline: string;
  sub: string;
}> = [
  {
    value: 'find_mentor',
    headline: 'Find a mentor',
    sub: 'Start with one mentor worth saving, messaging, or booking so the first session creates a real return trigger.',
  },
  {
    value: 'run_icp',
    headline: 'Run ICP analysis',
    sub: 'Get to a fast first ICP recommendation with one prompt, then expand only after you see value.',
  },
  {
    value: 'start_validation',
    headline: 'Start validation',
    sub: 'Use Decision Sprint to score one idea before you disappear into passive browsing.',
  },
];

const ONBOARDING_STEPS = [
  { id: 'startup_stage' },
  { id: 'startup_sector' },
  { id: 'support_areas' },
  { id: 'country' },
  { id: 'primary_pain' },
  { id: 'activation_intent' },
  { id: 'terms_confirmation' },
] as const;

const emptyOnboardingData: OnboardingData = {
  businessStage: '',
  startupSectors: [],
  supportAreasNeeded: [],
  country: '',
  primaryPain: '',
  activationIntent: '',
  acceptedTerms: false,
};

interface OnboardingFormProps {
  onComplete?: (startRoute?: string) => void;
}

function toggleValue(current: string[], value: string) {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
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
  const [errors, setErrors] = useState<Partial<Record<keyof OnboardingData, string>>>({});

  const [formData, setFormData] = useState<OnboardingData>(() => {
    try {
      const draft = sessionStorage.getItem(`onboarding_draft_${user?.id}`);
      if (draft) {
        const parsed = JSON.parse(draft);
        return {
          ...emptyOnboardingData,
          businessStage: parsed.businessStage ?? '',
          startupSectors: Array.isArray(parsed.startupSectors) ? parsed.startupSectors : [],
          supportAreasNeeded: Array.isArray(parsed.supportAreasNeeded) ? parsed.supportAreasNeeded : [],
          country: parsed.country ?? '',
          primaryPain: parsed.primaryPain ?? '',
          activationIntent: parsed.activationIntent ?? '',
        };
      }
    } catch {
      /* ignore */
    }
    return emptyOnboardingData;
  });

  useEffect(() => {
    if (!user?.id) return;
    try {
      sessionStorage.setItem(`onboarding_draft_${user.id}`, JSON.stringify({
        currentStep,
        businessStage: formData.businessStage,
        startupSectors: formData.startupSectors,
        supportAreasNeeded: formData.supportAreasNeeded,
        country: formData.country,
        primaryPain: formData.primaryPain,
        activationIntent: formData.activationIntent,
      }));
    } catch {
      /* ignore */
    }
  }, [
    currentStep,
    formData.activationIntent,
    formData.businessStage,
    formData.country,
    formData.primaryPain,
    formData.startupSectors,
    formData.supportAreasNeeded,
    user?.id,
  ]);

  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) return COUNTRY_OPTIONS.slice(0, 12);
    return COUNTRY_OPTIONS.filter((country) => country.toLowerCase().includes(query)).slice(0, 12);
  }, [countrySearch]);

  const totalSteps = ONBOARDING_STEPS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof OnboardingData, string>> = {};

    switch (step) {
      case 0:
        if (!formData.businessStage) newErrors.businessStage = 'Please select where you are in your journey';
        break;
      case 1:
        if (formData.startupSectors.length === 0) newErrors.startupSectors = 'Select at least one startup sector';
        break;
      case 2:
        if (formData.supportAreasNeeded.length === 0) newErrors.supportAreasNeeded = 'Select at least one support area';
        break;
      case 3:
        if (!formData.country) newErrors.country = 'Please select your country';
        break;
      case 4:
        if (!formData.primaryPain) newErrors.primaryPain = 'Please select your biggest challenge';
        break;
      case 5:
        if (!formData.activationIntent) newErrors.activationIntent = 'Choose the first action that should create your return trigger';
        break;
      case 6:
        if (!formData.acceptedTerms) newErrors.acceptedTerms = 'You must accept the terms to continue';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    if (currentStep < totalSteps - 1) {
      trackOnboardingStepCompleted({
        step: currentStep + 1,
        step_name: ONBOARDING_STEPS[currentStep].id,
        total_steps: ONBOARDING_STEPS.length,
        stage: formData.businessStage,
        painPoint: formData.primaryPain,
      });
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

      await startActivationJourney({
        userId: user.id,
        businessStage: formData.businessStage,
        primaryPain: formData.primaryPain,
        activationIntent: selectedIntent,
        startupSectors: formData.startupSectors,
        supportAreasNeeded: formData.supportAreasNeeded,
        country: formData.country,
      });

      await refreshOnboardingMentorRecommendations({
        userId: user.id,
        sectors: formData.startupSectors,
        supportAreas: formData.supportAreasNeeded,
      });

      captureEvent('activation_intent_selected', {
        stage: formData.businessStage,
        painPoint: formData.primaryPain,
        activationIntent: selectedIntent,
        startupSectors: formData.startupSectors,
        supportAreasNeeded: formData.supportAreasNeeded,
        country: formData.country,
        timeMs: Date.now() - startedAt,
        startRoute,
      });
      captureEvent('activation_path_selected', {
        stage: formData.businessStage,
        painPoint: formData.primaryPain,
        activationIntent: selectedIntent,
        startupSectors: formData.startupSectors,
        supportAreasNeeded: formData.supportAreasNeeded,
        country: formData.country,
        timeMs: Date.now() - startedAt,
        startRoute,
      });
      trackOnboardingCompleted({
        quiz_completed: true,
        creative_niche: null,
        business_stage: formData.businessStage || null,
      });
      void trackActivity('onboarding_completed', {
        stage: formData.businessStage,
        painPoint: formData.primaryPain,
        activationIntent: selectedIntent,
        startupSectors: formData.startupSectors,
        supportAreasNeeded: formData.supportAreasNeeded,
        country: formData.country,
        startRoute,
      }, user.id);

      toast.success('Your startup context is saved. We added mentor recommendations to your saved list.');

      try {
        sessionStorage.removeItem(`onboarding_draft_${user.id}`);
      } catch {
        /* ignore */
      }

      if (onComplete) {
        const separator = startRoute.includes('?') ? '&' : '?';
        onComplete(`${startRoute}${separator}activation=1&intent=${selectedIntent}`);
      }
    } catch (error) {
      console.error('Failed to save onboarding data:', error);
      toast.error('Failed to save onboarding data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderOptionGrid = (
    options: readonly string[],
    selectedValues: string[],
    field: 'startupSectors' | 'supportAreasNeeded',
  ) => (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const selected = selectedValues.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => {
              setFormData((prev) => ({ ...prev, [field]: toggleValue(prev[field], option) }));
              setErrors((prev) => ({ ...prev, [field]: undefined }));
            }}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
              selected
                ? 'border-[#32b8c6] bg-[#32b8c6]/10 text-foreground'
                : 'border-border/60 bg-background/70 hover:bg-accent/60'
            }`}
          >
            <span className="font-medium">{option}</span>
          </button>
        );
      })}
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="mb-2 font-space-grotesk text-2xl font-semibold tracking-tight sm:text-3xl">
                Where are you in your startup journey?
              </h2>
              <p className="text-muted-foreground">Pick the option that fits best and we will route you to your first win.</p>
            </div>

            <div className="space-y-3">
              {STAGE_CARDS.map(({ value, icon: Icon, headline, sub }) => {
                const isSelected = formData.businessStage === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, businessStage: value }));
                      setErrors((prev) => ({ ...prev, businessStage: undefined }));
                    }}
                    className={`flex w-full cursor-pointer items-start gap-4 rounded-xl border p-4 text-left transition-all duration-150 ${
                      isSelected
                        ? 'border-[#32b8c6] bg-[#32b8c6]/10 shadow-sm'
                        : 'border-border/60 bg-background/70 hover:border-border hover:bg-accent/60'
                    }`}
                  >
                    <div className={`mt-0.5 flex-shrink-0 rounded-lg p-2 ${isSelected ? 'bg-[#32b8c6]/20' : 'bg-muted'}`}>
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-[#32b8c6]' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <p className="mb-0.5 font-space-grotesk text-sm font-semibold leading-snug">{headline}</p>
                      <p className="text-xs text-muted-foreground">{sub}</p>
                    </div>
                  </button>
                );
              })}
              {errors.businessStage && <p className="text-sm text-destructive">{errors.businessStage}</p>}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="mb-2 font-space-grotesk text-2xl font-semibold tracking-tight sm:text-3xl">
                What sector does your startup operate in?
              </h2>
              <p className="text-muted-foreground">Choose all that apply. These match the investor sector filters.</p>
            </div>
            {renderOptionGrid(ANGEL_SECTOR_OPTIONS, formData.startupSectors, 'startupSectors')}
            {errors.startupSectors && <p className="text-sm text-destructive">{errors.startupSectors}</p>}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="mb-2 font-space-grotesk text-2xl font-semibold tracking-tight sm:text-3xl">
                Which areas do you need support with?
              </h2>
              <p className="text-muted-foreground">We will use this to recommend mentors with matching expertise.</p>
            </div>
            {renderOptionGrid(MENTOR_EXPERTISE_OPTIONS, formData.supportAreasNeeded, 'supportAreasNeeded')}
            {errors.supportAreasNeeded && <p className="text-sm text-destructive">{errors.supportAreasNeeded}</p>}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="mb-2 font-space-grotesk text-2xl font-semibold tracking-tight sm:text-3xl">
                Which country are you based in?
              </h2>
              <p className="text-muted-foreground">This helps surface founders building near you or in similar markets.</p>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={countrySearch}
                  onChange={(event) => setCountrySearch(event.target.value)}
                  className="pl-9"
                  placeholder="Search countries"
                />
              </div>
              {formData.country ? (
                <Badge variant="secondary" className="rounded-full">{formData.country}</Badge>
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
                      className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
                        selected ? 'bg-[#32b8c6]/15 font-semibold text-foreground' : 'hover:bg-accent'
                      }`}
                    >
                      {country}
                    </button>
                  );
                })}
              </div>
              {errors.country && <p className="text-sm text-destructive">{errors.country}</p>}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="mb-2 font-space-grotesk text-2xl font-semibold tracking-tight sm:text-3xl">
                What's your biggest challenge right now?
              </h2>
              <p className="text-muted-foreground">This helps us point you at the right tool first.</p>
            </div>

            <RadioGroup
              value={formData.primaryPain}
              onValueChange={(value) => {
                setFormData((prev) => ({ ...prev, primaryPain: value }));
                setErrors((prev) => ({ ...prev, primaryPain: undefined }));
              }}
              className="space-y-2"
            >
              {PRIMARY_PAIN_OPTIONS.map((pain) => (
                <Label
                  key={pain.value}
                  htmlFor={`pain-${pain.value}`}
                  className="flex cursor-pointer items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60"
                >
                  <RadioGroupItem value={pain.value} id={`pain-${pain.value}`} />
                  <span className="flex-1 text-sm">{pain.label}</span>
                </Label>
              ))}
            </RadioGroup>
            {errors.primaryPain && <p className="mt-1 text-sm text-destructive">{errors.primaryPain}</p>}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="mb-2 font-space-grotesk text-2xl font-semibold tracking-tight sm:text-3xl">
                Pick the action that should pull you back
              </h2>
              <p className="text-muted-foreground">
                The first session should create one concrete thing worth revisiting.
              </p>
            </div>

            <div className="space-y-3">
              {ACTIVATION_CARDS.map((card) => {
                const isSelected = formData.activationIntent === card.value;
                return (
                  <button
                    key={card.value}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, activationIntent: card.value }));
                      setErrors((prev) => ({ ...prev, activationIntent: undefined }));
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition-all duration-150 ${
                      isSelected
                        ? 'border-[#32b8c6] bg-[#32b8c6]/10 shadow-sm'
                        : 'border-border/60 bg-background/70 hover:border-border hover:bg-accent/60'
                    }`}
                  >
                    <p className="mb-1 font-space-grotesk text-sm font-semibold">{card.headline}</p>
                    <p className="text-sm text-muted-foreground">{card.sub}</p>
                  </button>
                );
              })}
              {errors.activationIntent && <p className="text-sm text-destructive">{errors.activationIntent}</p>}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="mb-2 font-space-grotesk text-2xl font-semibold tracking-tight sm:text-3xl">
                Lock the plan and take the first step
              </h2>
              <p className="text-muted-foreground">
                We will save your recommendations and land you on a guided path.
              </p>
            </div>

            <div className="rounded-2xl border border-[#32b8c6]/30 bg-[#32b8c6]/10 p-4">
              <p className="mb-2 font-space-grotesk text-sm font-semibold text-foreground">Your matching profile</p>
              <div className="flex flex-wrap gap-2">
                {[...formData.startupSectors, ...formData.supportAreasNeeded, formData.country].filter(Boolean).map((item) => (
                  <Badge key={item} variant="outline">{item}</Badge>
                ))}
              </div>
            </div>

            <div className="flex items-start space-x-2 rounded-2xl border border-border/60 bg-background/70 p-4">
              <Checkbox
                id="terms"
                checked={formData.acceptedTerms}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, acceptedTerms: checked === true }))
                }
                className="mt-1"
              />
              <Label htmlFor="terms" className="cursor-pointer text-sm leading-relaxed">
                I agree to the{' '}
                <Link to="/terms" className="text-[#32b8c6] hover:underline" target="_blank">
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link to="/privacy-policy" className="text-[#32b8c6] hover:underline" target="_blank">
                  Privacy Policy
                </Link>
                . *
              </Label>
            </div>
            {errors.acceptedTerms && <p className="text-sm text-destructive">{errors.acceptedTerms}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mx-auto w-full max-w-[760px] p-4 sm:p-6">
      <Card className="rounded-2xl border border-border/60 bg-card/90 shadow-2xl backdrop-blur-md transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10">
        <CardHeader className="space-y-4 border-b border-border/60 pb-6">
          <div>
            <CardTitle className="font-space-grotesk text-2xl font-semibold tracking-tight sm:text-3xl">
              Welcome to Creatives Takeover
            </CardTitle>
            <CardDescription className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Step {currentStep + 1} of {totalSteps}
            </CardDescription>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/50">
            <div
              className="h-full rounded-full bg-[#32b8c6] shadow-sm transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="min-h-[420px] pt-6">
          {renderStep()}
        </CardContent>

        <div className="flex items-center justify-between gap-4 px-6 pb-6">
          <div>
            {currentStep > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleBack}
                disabled={isLoading}
                className="gap-2 rounded-full border border-border/60 bg-background/80"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} / {totalSteps}
            </span>
            <Button
              type="button"
              onClick={handleNext}
              disabled={isLoading}
              className="gap-2 rounded-full px-6 font-semibold shadow-sm hover:shadow-md"
              style={{ backgroundColor: currentStep === totalSteps - 1 ? '#32b8c6' : undefined }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : currentStep === totalSteps - 1 ? (
                'Start First Value Action ->'
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
