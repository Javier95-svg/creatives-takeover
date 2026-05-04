import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ArrowRight, Lightbulb, Target, Hammer } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  captureEvent,
  trackOnboardingCompleted,
  trackOnboardingStepCompleted,
} from '@/lib/analytics';
import { trackActivity } from '@/lib/activity';
import { getActivationRoute, startActivationJourney, type ActivationIntent } from '@/lib/retentionSystem';

interface OnboardingData {
  businessStage: string;
  primaryPain: string;
  activationIntent: ActivationIntent | '';
  acceptedTerms: boolean;
}

const PRIMARY_PAIN_OPTIONS = [
  { value: 'unclear_direction', label: "Too many ideas — I need focus" },
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
    headline: 'I know my customer — I need to test demand',
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
  { id: 'activation_intent' },
  { id: 'terms_confirmation' },
] as const;

interface OnboardingFormProps {
  onComplete?: (startRoute?: string) => void;
}

export const OnboardingForm = ({ onComplete }: OnboardingFormProps) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [startedAt] = useState(Date.now());
  const [errors, setErrors] = useState<Partial<Record<keyof OnboardingData, string>>>({});

  const [formData, setFormData] = useState<OnboardingData>({
    businessStage: '',
    primaryPain: '',
    activationIntent: '',
    acceptedTerms: false,
  });

  const totalSteps = ONBOARDING_STEPS.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof OnboardingData, string>> = {};

    switch (step) {
      case 0:
        if (!formData.businessStage) newErrors.businessStage = 'Please select where you are in your journey';
        if (!formData.primaryPain) newErrors.primaryPain = 'Please select your biggest challenge';
        break;
      case 1:
        if (!formData.activationIntent) newErrors.activationIntent = 'Choose the first action that should create your return trigger';
        break;
      case 2:
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
      });

      // FIX(retention): onboarding — activation intent selection is now captured with the canonical event name used by the retention recovery funnel.
      captureEvent('activation_intent_selected', {
        stage: formData.businessStage,
        painPoint: formData.primaryPain,
        activationIntent: selectedIntent,
        timeMs: Date.now() - startedAt,
        startRoute,
      });
      captureEvent('activation_path_selected', {
        stage: formData.businessStage,
        painPoint: formData.primaryPain,
        activationIntent: selectedIntent,
        timeMs: Date.now() - startedAt,
        startRoute,
      });
      // FIX(retention): onboarding — completion is now emitted explicitly so onboarding_started/onboarding_completed can be trusted again.
      trackOnboardingCompleted({
        userId: user.id,
        stage: formData.businessStage,
        painPoint: formData.primaryPain,
        activationIntent: selectedIntent,
        timeMs: Date.now() - startedAt,
      });
      void trackActivity('onboarding_completed', {
        stage: formData.businessStage,
        painPoint: formData.primaryPain,
        activationIntent: selectedIntent,
        startRoute,
      }, user.id);

      toast.success("One last step: complete your first value action before you explore the rest of the platform.");

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

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2 font-space-grotesk">
                Where are you in your startup journey?
              </h2>
              <p className="text-muted-foreground">
                Pick the option that fits best — we'll route you to your first win.
              </p>
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
                      setErrors((e) => ({ ...e, businessStage: undefined }));
                    }}
                    className={`w-full text-left flex items-start gap-4 rounded-xl border p-4 transition-all duration-150 cursor-pointer
                      ${isSelected
                        ? 'border-[#32b8c6] bg-[#32b8c6]/10 shadow-sm'
                        : 'border-border/60 bg-background/70 hover:bg-accent/60 hover:border-border'
                      }`}
                  >
                    <div className={`mt-0.5 flex-shrink-0 rounded-lg p-2 ${isSelected ? 'bg-[#32b8c6]/20' : 'bg-muted'}`}>
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-[#32b8c6]' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <p className={`font-semibold text-sm leading-snug mb-0.5 font-space-grotesk ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}>
                        {headline}
                      </p>
                      <p className="text-xs text-muted-foreground">{sub}</p>
                    </div>
                  </button>
                );
              })}
              {errors.businessStage && <p className="text-sm text-destructive">{errors.businessStage}</p>}
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">
                What's your biggest challenge right now? *
              </Label>
              <RadioGroup
                value={formData.primaryPain}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, primaryPain: value }));
                  setErrors((e) => ({ ...e, primaryPain: undefined }));
                }}
                className="space-y-2"
              >
                {PRIMARY_PAIN_OPTIONS.map((pain) => (
                  <Label
                    key={pain.value}
                    htmlFor={`pain-${pain.value}`}
                    className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer"
                  >
                    <RadioGroupItem value={pain.value} id={`pain-${pain.value}`} />
                    <span className="flex-1 text-sm">{pain.label}</span>
                  </Label>
                ))}
              </RadioGroup>
              {errors.primaryPain && <p className="text-sm text-destructive mt-1">{errors.primaryPain}</p>}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2 font-space-grotesk">
                Pick the action that should pull you back
              </h2>
              <p className="text-muted-foreground">
                The first session should create one concrete thing worth revisiting. Pick the path that should become your return trigger.
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
                        : 'border-border/60 bg-background/70 hover:bg-accent/60 hover:border-border'
                    }`}
                  >
                    <p className="font-semibold text-sm mb-1 font-space-grotesk">{card.headline}</p>
                    <p className="text-sm text-muted-foreground">{card.sub}</p>
                  </button>
                );
              })}
              {errors.activationIntent && <p className="text-sm text-destructive">{errors.activationIntent}</p>}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2 font-space-grotesk">
                Lock the plan and take the first step
              </h2>
              <p className="text-muted-foreground">
                You will land on a guided path, not a generic dashboard. Activation only completes after the first value-bearing action.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#32b8c6]/10 border border-[#32b8c6]/30">
              <p className="text-sm font-semibold text-foreground mb-1 font-space-grotesk">Your selected return trigger</p>
              <p className="text-sm text-muted-foreground">
                {formData.activationIntent === 'find_mentor' && (
                  <>You will go to mentors and create one relationship worth returning to.</>
                )}
                {formData.activationIntent === 'run_icp' && (
                  <>You will start with one prompt, get a fast ICP recommendation, and only expand the brief after the value shows up.</>
                )}
                {formData.activationIntent === 'start_validation' && (
                  <>You will score one startup idea and leave with a clearer decision instead of more passive exploration.</>
                )}
              </p>
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
    <div className="w-full max-w-[680px] mx-auto p-4 sm:p-6">
      <Card className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-md shadow-2xl hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300">
        <CardHeader className="space-y-4 pb-6 border-b border-border/60">
          <div>
            <CardTitle className="text-2xl sm:text-3xl font-semibold tracking-tight font-space-grotesk">
              Welcome to Creatives Takeover
            </CardTitle>
            <CardDescription className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Step {currentStep + 1} of {totalSteps}
            </CardDescription>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/50">
            <div
              className="h-full bg-[#32b8c6] transition-all rounded-full shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="min-h-[400px] pt-6">
          {renderStep()}
        </CardContent>

        <div className="px-6 pb-6 flex items-center justify-between gap-4">
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
                'Saving...'
              ) : currentStep === totalSteps - 1 ? (
                'Start First Value Action →'
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
