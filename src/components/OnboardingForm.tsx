import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { ANGEL_SECTOR_OPTIONS } from '@/data/angelSectors';
import {
  DEFAULT_CURRENT_STAGE,
  DEFAULT_HIGHEST_UNLOCKED_STAGE,
  onboardingSelectionToProgress,
  type OnboardingBizMapStageSelection,
} from '@/lib/bizmapStages';
import {
  getDefaultActivationJourney,
  mergeActivationJourneyIntoPreferences,
} from '@/lib/activationJourney';

interface OnboardingData {
  // Step 1
  businessStage: OnboardingBizMapStageSelection | '';
  startupIndustry: string;
  founderExperience: string;
  timeCommitment: string;
  launchTimeline: string;
  lookingForCofounder: string;

  // Step 2
  primaryPain: string;
  secondaryPains: string[];
  decisionMakingProcess: string;

  // Step 3
  communicationStyle: string;
  commitmentLevel: string;

  // Step 4
  acceptedTerms: boolean;
}

const PRIMARY_PAIN_OPTIONS = [
  {
    value: 'unclear_direction',
    label: 'Unclear direction - too many ideas, not enough focus',
  },
  {
    value: 'cant_validate',
    label: "Can't validate if anyone wants this",
  },
  {
    value: 'building_isolation',
    label: 'Building in isolation - no audience or feedback',
  },
  {
    value: 'worried_funding',
    label: 'Worried about how to fund this or convince investors',
  },
  {
    value: 'overwhelmed_execution',
    label: 'Overwhelmed by what to build first and how to execute',
  },
];

const SECONDARY_PAIN_OPTIONS = [
  { value: 'time_management', label: 'Time management - wearing too many hats' },
  { value: 'decision_paralysis', label: 'Decision paralysis - afraid of making the wrong move' },
  { value: 'imposter_syndrome', label: "Imposter syndrome - don't feel like a real founder" },
  { value: 'isolation', label: 'Isolation - no one to bounce ideas off' },
  { value: 'flying_blind', label: 'Flying blind - no data or metrics to guide decisions' },
  { value: 'competing_priorities', label: 'Competing priorities - product vs marketing vs fundraising' },
];

const STAGE_TO_PROFILE_BUSINESS_STAGE: Record<OnboardingBizMapStageSelection, string> = {
  stage_i: 'identity',
  stage_ii: 'prototype',
  stage_iii: 'building',
};

interface OnboardingFormProps {
  onComplete?: () => void;
}

export const OnboardingForm = ({ onComplete }: OnboardingFormProps) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof OnboardingData, string>>>({});

  const [formData, setFormData] = useState<OnboardingData>({
    businessStage: '',
    startupIndustry: '',
    founderExperience: '',
    timeCommitment: '',
    launchTimeline: '',
    lookingForCofounder: '',
    primaryPain: '',
    secondaryPains: [],
    decisionMakingProcess: '',
    communicationStyle: '',
    commitmentLevel: '',
    acceptedTerms: false,
  });

  const totalSteps = 2;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const waitForProfile = async (userId: string) => {
    const maxAttempts = 20;
    const retryDelayMs = 250;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (profile) {
        return true;
      }

      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => window.setTimeout(resolve, retryDelayMs));
      }
    }

    return false;
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof OnboardingData, string>> = {};

    switch (step) {
      case 0:
        if (!formData.businessStage) {
          newErrors.businessStage = 'Please select your business stage';
        }
        if (!formData.startupIndustry) {
          newErrors.startupIndustry = 'Please choose your startup niche';
        }
        break;
      case 1:
        if (!formData.acceptedTerms) {
          newErrors.acceptedTerms = 'Please accept the Terms of Service and Privacy Policy';
        }
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    if (currentStep < totalSteps - 1) {
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
    if (!validateStep(currentStep)) {
      return;
    }

    if (!user) {
      toast.error('Please sign in to complete onboarding');
      return;
    }

    setIsLoading(true);

    try {
      const profileReady = await waitForProfile(user.id);
      if (!profileReady) {
        throw new Error('PROFILE_NOT_READY');
      }

      const selectedStage = formData.businessStage as OnboardingBizMapStageSelection;
      const startedAt = new Date().toISOString();
      const stageProgress = selectedStage
        ? onboardingSelectionToProgress(selectedStage)
        : {
            currentStage: DEFAULT_CURRENT_STAGE,
            highestUnlockedStage: DEFAULT_HIGHEST_UNLOCKED_STAGE,
          };

      const onboardingData = {
        businessStage: selectedStage || 'stage_i',
        startupIndustry: formData.startupIndustry,
        founderExperience: formData.founderExperience,
        timeCommitment: formData.timeCommitment,
        launchTimeline: formData.launchTimeline,
        lookingForCofounder: formData.lookingForCofounder,
        primaryPain: formData.primaryPain,
        secondaryPains: formData.secondaryPains,
        decisionMakingProcess: formData.decisionMakingProcess,
        communicationStyle: formData.communicationStyle,
        commitmentLevel: formData.commitmentLevel,
        onboardingCompletedAt: startedAt,
      };

      const activationEntryStage = selectedStage === 'stage_iii' ? 'stage_iii' : selectedStage === 'stage_ii' ? 'stage_ii' : 'stage_i';
      const userPreferences = mergeActivationJourneyIntoPreferences(
        onboardingData,
        getDefaultActivationJourney(activationEntryStage, startedAt),
      );

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          business_stage: selectedStage ? STAGE_TO_PROFILE_BUSINESS_STAGE[selectedStage] : 'identity',
          startup_industry: formData.startupIndustry ? [formData.startupIndustry] : null,
          quiz_completed: true,
          quiz_completed_at: new Date().toISOString(),
          quiz_is_first_startup: formData.founderExperience
            ? (formData.founderExperience === 'first-time' ? 'yes' : 'no')
            : null,
          quiz_current_stage: selectedStage || null,
          quiz_biggest_challenge: formData.primaryPain || null,
          quiz_launch_timeline: formData.launchTimeline || null,
          quiz_looking_for_cofounder: formData.lookingForCofounder || null,
          user_preferences: userPreferences,
        })
        .eq('id', user.id)
        .select('id')
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (!updatedProfile) {
        throw new Error('PROFILE_UPDATE_NOOP');
      }

      const progressPayload = {
        user_id: user.id,
        current_stage: stageProgress.currentStage,
        highest_unlocked_stage: stageProgress.highestUnlockedStage,
        ...(selectedStage === 'stage_ii' ? { identity_completed_at: startedAt } : {}),
        ...(selectedStage === 'stage_iii' ? { identity_completed_at: startedAt, prototype_completed_at: startedAt } : {}),
      };

      const { error: progressError } = await supabase
        .from('user_progress' as any)
        .upsert(
          progressPayload,
          { onConflict: 'user_id' },
        );

      if (progressError) {
        throw progressError;
      }

      toast.success('Onboarding completed successfully!');

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Failed to save onboarding data:', error);
      if (error instanceof Error && (error.message === 'PROFILE_NOT_READY' || error.message === 'PROFILE_UPDATE_NOOP')) {
        toast.error('Your account is still finishing setup. Please wait a moment and try again.');
      } else {
        toast.error('Failed to save onboarding data. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!user) {
      toast.error('Please sign in to continue');
      return;
    }

    setIsLoading(true);

    try {
      const profileReady = await waitForProfile(user.id);
      if (!profileReady) {
        throw new Error('PROFILE_NOT_READY');
      }

      const skippedAt = new Date().toISOString();
      const selectedStage = formData.businessStage as OnboardingBizMapStageSelection;
      const stageProgress = selectedStage
        ? onboardingSelectionToProgress(selectedStage)
        : {
            currentStage: DEFAULT_CURRENT_STAGE,
            highestUnlockedStage: DEFAULT_HIGHEST_UNLOCKED_STAGE,
          };
      const activationEntryStage = selectedStage === 'stage_iii' ? 'stage_iii' : selectedStage === 'stage_ii' ? 'stage_ii' : 'stage_i';
      const skippedPreferences = mergeActivationJourneyIntoPreferences(
        {
          onboardingSkippedAt: skippedAt,
          startupIndustry: formData.startupIndustry || null,
        },
        getDefaultActivationJourney(activationEntryStage, skippedAt),
      );
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          business_stage: selectedStage ? STAGE_TO_PROFILE_BUSINESS_STAGE[selectedStage] : 'identity',
          startup_industry: formData.startupIndustry ? [formData.startupIndustry] : null,
          quiz_completed: false,
          user_preferences: skippedPreferences,
        })
        .eq('id', user.id)
        .select('id')
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (!updatedProfile) {
        throw new Error('PROFILE_UPDATE_NOOP');
      }

      const skippedProgressPayload = {
        user_id: user.id,
        current_stage: stageProgress.currentStage,
        highest_unlocked_stage: stageProgress.highestUnlockedStage,
        ...(selectedStage === 'stage_ii' ? { identity_completed_at: skippedAt } : {}),
        ...(selectedStage === 'stage_iii' ? { identity_completed_at: skippedAt, prototype_completed_at: skippedAt } : {}),
      };

      const { error: progressError } = await supabase
        .from('user_progress' as any)
        .upsert(
          skippedProgressPayload,
          { onConflict: 'user_id' },
        );

      if (progressError) {
        throw progressError;
      }

      toast.success('You can complete onboarding later from your account.');
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Failed to skip onboarding:', error);
      if (error instanceof Error && (error.message === 'PROFILE_NOT_READY' || error.message === 'PROFILE_UPDATE_NOOP')) {
        toast.error('Your account is still finishing setup. Please wait a moment and try again.');
      } else {
        toast.error('Failed to skip onboarding. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSecondaryPain = (pain: string) => {
    const current = formData.secondaryPains;
    if (current.includes(pain)) {
      setFormData({ ...formData, secondaryPains: current.filter((p) => p !== pain) });
    } else {
      setFormData({ ...formData, secondaryPains: [...current, pain] });
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2 font-space-grotesk">Two quick questions</h2>
              <p className="text-muted-foreground mb-6 font-poppins">
                This is all we need to personalize your first tool and get you started in under a minute.
              </p>
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">Where are you right now? *</Label>
              <RadioGroup
                value={formData.businessStage}
                onValueChange={(value) =>
                  setFormData({ ...formData, businessStage: value as OnboardingBizMapStageSelection })
                }
                className="space-y-2"
              >
                <Label htmlFor="stage-i" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="stage_i" id="stage-i" />
                  <span className="flex-1">I have an idea — need to define who it's for</span>
                </Label>
                <Label htmlFor="stage-ii" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="stage_ii" id="stage-ii" />
                  <span className="flex-1">I'm validating — need to test real demand</span>
                </Label>
                <Label htmlFor="stage-iii" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="stage_iii" id="stage-iii" />
                  <span className="flex-1">I'm building — need to scope my MVP and raise</span>
                </Label>
              </RadioGroup>
              {errors.businessStage && <p className="text-sm text-destructive mt-1">{errors.businessStage}</p>}
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">What niche are you building in? *</Label>
              <Select
                value={formData.startupIndustry}
                onValueChange={(value) => setFormData({ ...formData, startupIndustry: value })}
              >
                <SelectTrigger className="h-12 rounded-lg border-border/60 bg-background/70">
                  <SelectValue placeholder="Choose the niche that best fits your startup" />
                </SelectTrigger>
                <SelectContent>
                  {ANGEL_SECTOR_OPTIONS.map((sector) => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.startupIndustry && <p className="text-sm text-destructive mt-1">{errors.startupIndustry}</p>}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2 font-space-grotesk">Almost there!</h2>
              <p className="text-muted-foreground mb-6 font-poppins">
                Review our terms and get ready to launch your founder journey.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-2 rounded-2xl border border-border/60 bg-background/70 p-4">
                <Checkbox
                  id="terms"
                  checked={formData.acceptedTerms}
                  onCheckedChange={(checked) => setFormData({ ...formData, acceptedTerms: checked === true })}
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
                  .
                </Label>
              </div>
              {errors.acceptedTerms && <p className="text-sm text-destructive mt-1">{errors.acceptedTerms}</p>}
            </div>

            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">What's next?</strong> We'll take you straight to your first tool — no long setup, no tutorials.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-[680px] mx-auto p-4 sm:p-6 font-poppins">
      <Card className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-md shadow-2xl hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300">
        <CardHeader className="space-y-4 pb-6 border-b border-border/60">
          <div>
            <CardTitle className="text-2xl sm:text-3xl font-semibold tracking-tight font-space-grotesk">Welcome to Creatives Takeover</CardTitle>
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
          <div className="flex items-center gap-2">
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
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              disabled={isLoading}
              className="rounded-full"
            >
              Skip for now
            </Button>
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
                'Loading...'
              ) : currentStep === totalSteps - 1 ? (
                'Get Started'
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
