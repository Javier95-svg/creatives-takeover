import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  DEFAULT_CURRENT_STAGE,
  DEFAULT_HIGHEST_UNLOCKED_STAGE,
  onboardingSelectionToProgress,
  type OnboardingBizMapStageSelection,
} from '@/lib/bizmapStages';

interface OnboardingData {
  // Step 1
  businessStage: OnboardingBizMapStageSelection | '';
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

  const totalSteps = 4;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof OnboardingData, string>> = {};

    switch (step) {
      case 0:
        if (!formData.businessStage) {
          newErrors.businessStage = 'Please select your business stage';
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
      const selectedStage = formData.businessStage as OnboardingBizMapStageSelection;
      const stageProgress = selectedStage
        ? onboardingSelectionToProgress(selectedStage)
        : {
            currentStage: DEFAULT_CURRENT_STAGE,
            highestUnlockedStage: DEFAULT_HIGHEST_UNLOCKED_STAGE,
          };

      const onboardingData = {
        businessStage: selectedStage || 'stage_i',
        founderExperience: formData.founderExperience,
        timeCommitment: formData.timeCommitment,
        launchTimeline: formData.launchTimeline,
        lookingForCofounder: formData.lookingForCofounder,
        primaryPain: formData.primaryPain,
        secondaryPains: formData.secondaryPains,
        decisionMakingProcess: formData.decisionMakingProcess,
        communicationStyle: formData.communicationStyle,
        commitmentLevel: formData.commitmentLevel,
        onboardingCompletedAt: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          business_stage: selectedStage ? STAGE_TO_PROFILE_BUSINESS_STAGE[selectedStage] : 'identity',
          quiz_completed: true,
          quiz_completed_at: new Date().toISOString(),
          quiz_is_first_startup: formData.founderExperience
            ? (formData.founderExperience === 'first-time' ? 'yes' : 'no')
            : null,
          quiz_current_stage: selectedStage || null,
          quiz_biggest_challenge: formData.primaryPain || null,
          quiz_launch_timeline: formData.launchTimeline || null,
          quiz_looking_for_cofounder: formData.lookingForCofounder || null,
          user_preferences: onboardingData,
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      const { error: progressError } = await supabase
        .from('user_progress' as any)
        .upsert(
          {
            user_id: user.id,
            current_stage: stageProgress.currentStage,
            highest_unlocked_stage: stageProgress.highestUnlockedStage,
          },
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
      toast.error('Failed to save onboarding data. Please try again.');
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
      const skippedAt = new Date().toISOString();
      const selectedStage = formData.businessStage as OnboardingBizMapStageSelection;
      const stageProgress = selectedStage
        ? onboardingSelectionToProgress(selectedStage)
        : {
            currentStage: DEFAULT_CURRENT_STAGE,
            highestUnlockedStage: DEFAULT_HIGHEST_UNLOCKED_STAGE,
          };
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          business_stage: selectedStage ? STAGE_TO_PROFILE_BUSINESS_STAGE[selectedStage] : 'identity',
          quiz_completed: false,
          user_preferences: {
            onboardingSkippedAt: skippedAt,
          },
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      const { error: progressError } = await supabase
        .from('user_progress' as any)
        .upsert(
          {
            user_id: user.id,
            current_stage: stageProgress.currentStage,
            highest_unlocked_stage: stageProgress.highestUnlockedStage,
          },
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
      toast.error('Failed to skip onboarding. Please try again.');
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
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2 font-space-grotesk">Tell us about your current reality</h2>
              <p className="text-muted-foreground mb-6 font-poppins">
                Understanding where you are helps us personalize your experience.
              </p>
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">Which BizMap stage are you currently in? *</Label>
              <RadioGroup
                value={formData.businessStage}
                onValueChange={(value) =>
                  setFormData({ ...formData, businessStage: value as OnboardingBizMapStageSelection })
                }
                className="space-y-2"
              >
                <Label htmlFor="stage-i" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="stage_i" id="stage-i" />
                  <span className="flex-1">Stage I: Identity (ICP Builder)</span>
                </Label>
                <Label htmlFor="stage-ii" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="stage_ii" id="stage-ii" />
                  <span className="flex-1">Stage II: Prototype (Waitlist Maker)</span>
                </Label>
              </RadioGroup>
              <p className="text-xs text-muted-foreground mt-2">
                Stage III+ unlocks only after you complete Stage I and Stage II.
              </p>
              {errors.businessStage && <p className="text-sm text-destructive mt-1">{errors.businessStage}</p>}
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">What's your founder experience?</Label>
              <RadioGroup
                value={formData.founderExperience}
                onValueChange={(value) => setFormData({ ...formData, founderExperience: value })}
                className="space-y-2"
              >
                <Label htmlFor="exp-first" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="first-time" id="exp-first" />
                  <span className="flex-1">First-time founder</span>
                </Label>
                <Label htmlFor="exp-1-2" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="1-2" id="exp-1-2" />
                  <span className="flex-1">1-2 previous ventures</span>
                </Label>
                <Label htmlFor="exp-3plus" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="3+" id="exp-3plus" />
                  <span className="flex-1">3+ previous ventures</span>
                </Label>
              </RadioGroup>
              {errors.founderExperience && <p className="text-sm text-destructive mt-1">{errors.founderExperience}</p>}
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">What's your time commitment?</Label>
              <RadioGroup
                value={formData.timeCommitment}
                onValueChange={(value) => setFormData({ ...formData, timeCommitment: value })}
                className="space-y-2"
              >
                <Label htmlFor="time-full" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="full-time" id="time-full" />
                  <span className="flex-1">Full-time</span>
                </Label>
                <Label htmlFor="time-part" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="part-time" id="time-part" />
                  <span className="flex-1">Part-time</span>
                </Label>
                <Label htmlFor="time-weekends" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="weekends" id="time-weekends" />
                  <span className="flex-1">Weekends/evenings</span>
                </Label>
              </RadioGroup>
              {errors.timeCommitment && <p className="text-sm text-destructive mt-1">{errors.timeCommitment}</p>}
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">When do you want to launch?</Label>
              <RadioGroup
                value={formData.launchTimeline}
                onValueChange={(value) => setFormData({ ...formData, launchTimeline: value })}
                className="space-y-2"
              >
                <Label htmlFor="launch-30" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="30-days" id="launch-30" />
                  <span className="flex-1">Within 30 days</span>
                </Label>
                <Label htmlFor="launch-60" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="60-days" id="launch-60" />
                  <span className="flex-1">Within 60 days</span>
                </Label>
                <Label htmlFor="launch-90" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="90-plus-days" id="launch-90" />
                  <span className="flex-1">Within 90+ days</span>
                </Label>
                <Label htmlFor="launch-unsure" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="not-sure" id="launch-unsure" />
                  <span className="flex-1">Not sure yet</span>
                </Label>
              </RadioGroup>
              {errors.launchTimeline && <p className="text-sm text-destructive mt-1">{errors.launchTimeline}</p>}
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">Are you looking for a co-founder?</Label>
              <RadioGroup
                value={formData.lookingForCofounder}
                onValueChange={(value) => setFormData({ ...formData, lookingForCofounder: value })}
                className="space-y-2"
              >
                <Label htmlFor="cofounder-yes" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="yes" id="cofounder-yes" />
                  <span className="flex-1">Yes</span>
                </Label>
                <Label htmlFor="cofounder-no" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="no" id="cofounder-no" />
                  <span className="flex-1">No</span>
                </Label>
              </RadioGroup>
              {errors.lookingForCofounder && <p className="text-sm text-destructive mt-1">{errors.lookingForCofounder}</p>}
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2 font-space-grotesk">Let's dive into your challenges</h2>
              <p className="text-muted-foreground mb-6 font-poppins">
                Understanding your pain points helps us provide better guidance.
              </p>
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">What's your primary pain point?</Label>
              <RadioGroup
                value={formData.primaryPain}
                onValueChange={(value) => setFormData({ ...formData, primaryPain: value })}
                className="space-y-2"
              >
                {PRIMARY_PAIN_OPTIONS.map((pain) => (
                  <Label
                    key={pain.value}
                    htmlFor={`pain-${pain.value}`}
                    className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer"
                  >
                    <RadioGroupItem value={pain.value} id={`pain-${pain.value}`} />
                    <span className="flex-1">{pain.label}</span>
                  </Label>
                ))}
              </RadioGroup>
              {errors.primaryPain && <p className="text-sm text-destructive mt-1">{errors.primaryPain}</p>}
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">What other challenges do you face? (Select all that apply)</Label>
              <div className="space-y-2">
                {SECONDARY_PAIN_OPTIONS.map((pain) => (
                  <Label
                    key={pain.value}
                    htmlFor={`secondary-${pain.value}`}
                    className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer"
                  >
                    <Checkbox
                      id={`secondary-${pain.value}`}
                      checked={formData.secondaryPains.includes(pain.value)}
                      onCheckedChange={() => toggleSecondaryPain(pain.value)}
                    />
                    <span className="flex-1">{pain.label}</span>
                  </Label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">How do you typically make important decisions?</Label>
              <RadioGroup
                value={formData.decisionMakingProcess}
                onValueChange={(value) => setFormData({ ...formData, decisionMakingProcess: value })}
                className="space-y-2"
              >
                <Label htmlFor="decision-gut" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="gut-feel" id="decision-gut" />
                  <span className="flex-1">Gut feeling</span>
                </Label>
                <Label htmlFor="decision-research" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="research" id="decision-research" />
                  <span className="flex-1">Research and data</span>
                </Label>
                <Label htmlFor="decision-community" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="community" id="decision-community" />
                  <span className="flex-1">Community input</span>
                </Label>
                <Label htmlFor="decision-mentor" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="mentor" id="decision-mentor" />
                  <span className="flex-1">Mentor guidance</span>
                </Label>
              </RadioGroup>
              {errors.decisionMakingProcess && <p className="text-sm text-destructive mt-1">{errors.decisionMakingProcess}</p>}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2 font-space-grotesk">Personalize your experience</h2>
              <p className="text-muted-foreground mb-6 font-poppins">
                Help us tailor the platform to your preferences.
              </p>
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">What's your preferred communication style?</Label>
              <RadioGroup
                value={formData.communicationStyle}
                onValueChange={(value) => setFormData({ ...formData, communicationStyle: value })}
                className="space-y-2"
              >
                <Label htmlFor="comm-visual" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="visual" id="comm-visual" />
                  <span className="flex-1">Visual (charts, graphs, infographics)</span>
                </Label>
                <Label htmlFor="comm-text" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="text-focused" id="comm-text" />
                  <span className="flex-1">Text-focused (detailed explanations)</span>
                </Label>
                <Label htmlFor="comm-mixed" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="mixed" id="comm-mixed" />
                  <span className="flex-1">Mixed (both visual and text)</span>
                </Label>
              </RadioGroup>
              {errors.communicationStyle && <p className="text-sm text-destructive mt-1">{errors.communicationStyle}</p>}
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">What's your commitment level?</Label>
              <RadioGroup
                value={formData.commitmentLevel}
                onValueChange={(value) => setFormData({ ...formData, commitmentLevel: value })}
                className="space-y-2"
              >
                <Label htmlFor="commit-serious" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="serious" id="commit-serious" />
                  <span className="flex-1">Serious - ready to take action</span>
                </Label>
                <Label htmlFor="commit-exploring" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="exploring" id="commit-exploring" />
                  <span className="flex-1">Exploring - seeing what's possible</span>
                </Label>
                <Label htmlFor="commit-casual" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="casual" id="commit-casual" />
                  <span className="flex-1">Casual - just checking it out</span>
                </Label>
              </RadioGroup>
              {errors.commitmentLevel && <p className="text-sm text-destructive mt-1">{errors.commitmentLevel}</p>}
            </div>
          </div>
        );

      case 3:
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
                <strong className="text-foreground">What's next?</strong> Complete this setup or skip for now and start using your account immediately.
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
