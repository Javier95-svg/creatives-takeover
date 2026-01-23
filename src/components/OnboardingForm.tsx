import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface OnboardingData {
  // Step 0
  name: string;
  email: string;
  password: string;
  confirmPassword: string;

  // Step 1
  businessStage: string;
  founderExperience: string;
  timeCommitment: string;
  launchTimeline: string;
  lookingForCofounder: string;

  // Step 2
  primaryPain: string;
  secondaryPains: string[];
  decisionMakingProcess: string;

  // Step 3
  selectedFeatures: string[];

  // Step 4
  communicationStyle: string;
  commitmentLevel: string;

  // Step 5
  acceptedTerms: boolean;
}

const PRIMARY_PAIN_OPTIONS = [
  {
    value: 'unclear_direction',
    label: 'Unclear direction—too many ideas, not enough focus'
  },
  {
    value: 'cant_validate',
    label: "Can't validate if anyone wants this"
  },
  {
    value: 'building_isolation',
    label: 'Building in isolation—no audience or feedback'
  },
  {
    value: 'worried_funding',
    label: 'Worried about how to fund this / convince investors'
  },
  {
    value: 'overwhelmed_execution',
    label: 'Overwhelmed by what to build first and how to execute'
  }
];

const SECONDARY_PAIN_OPTIONS = [
  { value: 'time_management', label: 'Time management—wearing too many hats' },
  { value: 'decision_paralysis', label: 'Decision paralysis—afraid of making the wrong move' },
  { value: 'imposter_syndrome', label: "Imposter syndrome—don't feel like a 'real' founder" },
  { value: 'isolation', label: "Isolation—no one to bounce ideas off" },
  { value: 'flying_blind', label: 'Flying blind—no data or metrics to guide decisions' },
  { value: 'competing_priorities', label: 'Competing priorities—product vs. marketing vs. fundraising' }
];

const FEATURES = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Founder control center, visualize progress',
    painPoint: 'Get clarity on your business metrics and track your journey'
  },
  {
    id: 'bizmap_ai',
    title: 'BizMap AI',
    description: 'AI-powered business planning roadmap',
    painPoint: 'Turn your ideas into actionable plans with AI guidance'
  },
  {
    id: 'community',
    title: 'Community',
    description: 'Connect with founders, feedback, demo days',
    painPoint: 'Build your network and get real feedback from peers'
  },
  {
    id: 'insighta',
    title: 'Insighta',
    description: 'Data-driven recommendations and fundraising insights',
    painPoint: 'Make informed decisions based on your business data'
  }
];

interface OnboardingFormProps {
  onComplete?: () => void;
}

export const OnboardingForm = ({ onComplete }: OnboardingFormProps) => {
  const { signUp, user } = useAuth();


  // If user is already logged in, skip the signup step (Step 0)
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (user && currentStep === 0) {
      setCurrentStep(1);
    }
  }, [user, currentStep]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof OnboardingData, string>>>({});
  const [isSigningUp, setIsSigningUp] = useState(false);

  const [formData, setFormData] = useState<OnboardingData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessStage: '',
    founderExperience: '',
    timeCommitment: '',
    launchTimeline: '',
    lookingForCofounder: '',
    primaryPain: '',
    secondaryPains: [],
    decisionMakingProcess: '',
    selectedFeatures: ['dashboard', 'bizmap_ai', 'community', 'insighta'],
    communicationStyle: '',
    commitmentLevel: '',
    acceptedTerms: false
  });

  const totalSteps = 6;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate current step
  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof OnboardingData, string>> = {};

    switch (step) {
      case 0:
        if (!formData.name.trim()) {
          newErrors.name = 'Name is required';
        }
        if (!formData.email.trim()) {
          newErrors.email = 'Email is required';
        } else if (!validateEmail(formData.email)) {
          newErrors.email = 'Please enter a valid email address';
        }
        if (!formData.password) {
          newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
          newErrors.password = 'Password must be at least 6 characters';
        }
        if (!formData.confirmPassword) {
          newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        break;
      case 1:
        if (!formData.businessStage) {
          newErrors.businessStage = 'Please select your business stage';
        }
        if (!formData.founderExperience) {
          newErrors.founderExperience = 'Please select your founder experience';
        }
        if (!formData.timeCommitment) {
          newErrors.timeCommitment = 'Please select your time commitment';
        }
        if (!formData.launchTimeline) {
          newErrors.launchTimeline = 'Please select your launch timeline';
        }
        if (!formData.lookingForCofounder) {
          newErrors.lookingForCofounder = 'Please indicate if you are looking for a co-founder';
        }
        break;
      case 2:
        if (!formData.primaryPain) {
          newErrors.primaryPain = 'Please select your primary pain point';
        }
        if (!formData.decisionMakingProcess) {
          newErrors.decisionMakingProcess = 'Please select your decision-making process';
        }
        break;
      case 3:
        if (formData.selectedFeatures.length === 0) {
          newErrors.selectedFeatures = 'Please select at least one feature';
        }
        break;
      case 4:
        if (!formData.communicationStyle) {
          newErrors.communicationStyle = 'Please select your communication style';
        }
        if (!formData.commitmentLevel) {
          newErrors.commitmentLevel = 'Please select your commitment level';
        }
        break;
      case 5:
        if (!formData.acceptedTerms) {
          newErrors.acceptedTerms = 'You must accept the terms to continue';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle next step
  const handleNext = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    // Step 0: Handle signup
    if (currentStep === 0 && !user) {
      setIsSigningUp(true);
      setIsLoading(true);

      try {
        const { error } = await signUp(
          formData.email,
          formData.password,
          formData.name.trim()
        );

        if (error) {
          let errorMessage = error.message || 'Failed to create account. Please try again.';

          if (error.message?.includes('User already registered') || error.message?.includes('already exists')) {
            errorMessage = 'An account with this email already exists. Please sign in instead.';
          } else if (error.message?.includes('Email rate limit')) {
            errorMessage = 'Too many signup attempts. Please wait a few minutes and try again.';
          } else if (error.message?.includes('Invalid email')) {
            errorMessage = 'Please enter a valid email address.';
          } else if (error.message?.includes('Password')) {
            errorMessage = 'Password does not meet requirements. Please use a stronger password.';
          }

          toast.error(errorMessage);
          setIsSigningUp(false);
          setIsLoading(false);
          return;
        }

        // Check if user has a session (email confirmation might be required)
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          // Email confirmation required
          toast.success('Account created! Please check your email to confirm your account before continuing.');
          setIsSigningUp(false);
          setIsLoading(false);
          return;
        }

        // Wait a bit for auth state to update
        await new Promise(resolve => setTimeout(resolve, 500));

        toast.success('Account created successfully!');
      } catch (error) {
        console.error('Signup error:', error);
        toast.error('Failed to create account. Please try again.');
        setIsSigningUp(false);
        setIsLoading(false);
        return;
      } finally {
        setIsSigningUp(false);
        setIsLoading(false);
      }
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleSubmit();
    }
  };

  // Handle back step
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  // Handle final submission
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser) {
        toast.error('Please sign in to complete onboarding');
        setIsLoading(false);
        return;
      }

      // Prepare onboarding data for storage
      const onboardingData = {
        // Step 1
        businessStage: formData.businessStage,
        founderExperience: formData.founderExperience,
        timeCommitment: formData.timeCommitment,

        // Step 2
        primaryPain: formData.primaryPain,
        secondaryPains: formData.secondaryPains,
        decisionMakingProcess: formData.decisionMakingProcess,

        // Step 3
        selectedFeatures: formData.selectedFeatures,

        // Step 4
        communicationStyle: formData.communicationStyle,
        commitmentLevel: formData.commitmentLevel,

        // Metadata
        onboardingCompletedAt: new Date().toISOString()
      };

      // Update profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          business_stage: formData.businessStage,
          full_name: formData.name.trim() || undefined,
          // Sync with quiz/legacy columns
          quiz_completed: true,
          quiz_completed_at: new Date().toISOString(),
          quiz_is_first_startup: formData.founderExperience === 'first-time' ? 'yes' : 'no',
          quiz_current_stage: formData.businessStage,
          quiz_biggest_challenge: formData.primaryPain,
          quiz_launch_timeline: formData.launchTimeline,
          quiz_looking_for_cofounder: formData.lookingForCofounder,
          user_preferences: onboardingData
        })
        .eq('id', currentUser.id);

      if (updateError) {
        throw updateError;
      }

      toast.success('Onboarding completed successfully! 🚀');

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

  // Toggle feature selection
  const toggleFeature = (featureId: string) => {
    const current = formData.selectedFeatures;
    if (current.includes(featureId)) {
      setFormData({ ...formData, selectedFeatures: current.filter(f => f !== featureId) });
    } else {
      setFormData({ ...formData, selectedFeatures: [...current, featureId] });
    }
  };

  // Toggle secondary pain
  const toggleSecondaryPain = (pain: string) => {
    const current = formData.secondaryPains;
    if (current.includes(pain)) {
      setFormData({ ...formData, secondaryPains: current.filter(p => p !== pain) });
    } else {
      setFormData({ ...formData, secondaryPains: [...current, pain] });
    }
  };

  // Render step content
  const renderStep = () => {
    switch (currentStep) {
      case 0: // Welcome
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2 font-space-grotesk">Welcome to Creatives Takeover! 👋</h2>
              <p className="text-muted-foreground mb-6 font-poppins">
                Let's get started by creating your account. We'll guide you through a quick onboarding to personalize your experience.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-foreground">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`bg-background/70 border-border/60 focus-visible:ring-primary/30 ${errors.name ? 'border-destructive' : ''}`}
                />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-foreground">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`bg-background/70 border-border/60 focus-visible:ring-primary/30 ${errors.email ? 'border-destructive' : ''}`}
                />
                {errors.email && <p className="text-sm text-destructive mt-1">{errors.email}</p>}
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-medium text-foreground">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`bg-background/70 border-border/60 focus-visible:ring-primary/30 ${errors.password ? 'border-destructive' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-destructive mt-1">{errors.password}</p>}
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={`bg-background/70 border-border/60 focus-visible:ring-primary/30 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-sm text-destructive mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>
          </div>
        );

      case 1: // Current Reality
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2 font-space-grotesk">Tell us about your current reality 🎯</h2>
              <p className="text-muted-foreground mb-6 font-poppins">
                Understanding where you are helps us personalize your experience.
              </p>
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">What stage is your business at? *</Label>
              <RadioGroup
                value={formData.businessStage}
                onValueChange={(value) => setFormData({ ...formData, businessStage: value })}
                className="space-y-2"
              >
                <Label htmlFor="stage-idea" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="idea" id="stage-idea" />
                  <span className="flex-1">💡 Just an idea</span>
                </Label>
                <Label htmlFor="stage-validation" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="validation" id="stage-validation" />
                  <span className="flex-1">🔍 Validating the idea</span>
                </Label>
                <Label htmlFor="stage-mvp" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="mvp" id="stage-mvp" />
                  <span className="flex-1">🚀 Building MVP</span>
                </Label>
                <Label htmlFor="stage-launched" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="launched" id="stage-launched" />
                  <span className="flex-1">✨ Launched</span>
                </Label>
                <Label htmlFor="stage-scaling" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="scaling" id="stage-scaling" />
                  <span className="flex-1">📈 Scaling</span>
                </Label>
              </RadioGroup>
              {errors.businessStage && <p className="text-sm text-destructive mt-1">{errors.businessStage}</p>}
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">What's your founder experience? *</Label>
              <RadioGroup
                value={formData.founderExperience}
                onValueChange={(value) => setFormData({ ...formData, founderExperience: value })}
                className="space-y-2"
              >
                <Label htmlFor="exp-first" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="first-time" id="exp-first" />
                  <span className="flex-1">🌱 First-time founder</span>
                </Label>
                <Label htmlFor="exp-1-2" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="1-2" id="exp-1-2" />
                  <span className="flex-1">📚 1-2 previous ventures</span>
                </Label>
                <Label htmlFor="exp-3plus" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="3+" id="exp-3plus" />
                  <span className="flex-1">🎯 3+ previous ventures</span>
                </Label>
              </RadioGroup>
              {errors.founderExperience && <p className="text-sm text-destructive mt-1">{errors.founderExperience}</p>}
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">What's your time commitment? *</Label>
              <RadioGroup
                value={formData.timeCommitment}
                onValueChange={(value) => setFormData({ ...formData, timeCommitment: value })}
                className="space-y-2"
              >
                <Label htmlFor="time-full" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="full-time" id="time-full" />
                  <span className="flex-1">⏰ Full-time</span>
                </Label>
                <Label htmlFor="time-part" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="part-time" id="time-part" />
                  <span className="flex-1">📅 Part-time</span>
                </Label>
                <Label htmlFor="time-weekends" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="weekends" id="time-weekends" />
                  <span className="flex-1">🌙 Weekends/evenings</span>
                </Label>
              </RadioGroup>
              {errors.timeCommitment && <p className="text-sm text-destructive mt-1">{errors.timeCommitment}</p>}
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">When do you want to launch? *</Label>
              <RadioGroup
                value={formData.launchTimeline}
                onValueChange={(value) => setFormData({ ...formData, launchTimeline: value })}
                className="space-y-2"
              >
                <Label htmlFor="launch-30" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="30-days" id="launch-30" />
                  <span className="flex-1">🚀 Within 30 days</span>
                </Label>
                <Label htmlFor="launch-60" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="60-days" id="launch-60" />
                  <span className="flex-1">📅 Within 60 days</span>
                </Label>
                <Label htmlFor="launch-90" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="90-plus-days" id="launch-90" />
                  <span className="flex-1">🗓️ Within 90+ days</span>
                </Label>
                <Label htmlFor="launch-unsure" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="not-sure" id="launch-unsure" />
                  <span className="flex-1">🤔 Not sure yet</span>
                </Label>
              </RadioGroup>
              {errors.launchTimeline && <p className="text-sm text-destructive mt-1">{errors.launchTimeline}</p>}
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">Are you looking for a co-founder? *</Label>
              <RadioGroup
                value={formData.lookingForCofounder}
                onValueChange={(value) => setFormData({ ...formData, lookingForCofounder: value })}
                className="space-y-2"
              >
                <Label htmlFor="cofounder-yes" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="yes" id="cofounder-yes" />
                  <span className="flex-1">👋 Yes</span>
                </Label>
                <Label htmlFor="cofounder-no" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="no" id="cofounder-no" />
                  <span className="flex-1">👤 No</span>
                </Label>
              </RadioGroup>
              {errors.lookingForCofounder && <p className="text-sm text-destructive mt-1">{errors.lookingForCofounder}</p>}
            </div>
          </div >
        );

      case 2: // Pain Point Deep Dive
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2 font-space-grotesk">Let's dive into your challenges 💭</h2>
              <p className="text-muted-foreground mb-6 font-poppins">
                Understanding your pain points helps us provide better guidance.
              </p>
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">What's your primary pain point? *</Label>
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
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">How do you typically make important decisions? *</Label>
              <RadioGroup
                value={formData.decisionMakingProcess}
                onValueChange={(value) => setFormData({ ...formData, decisionMakingProcess: value })}
                className="space-y-2"
              >
                <Label htmlFor="decision-gut" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="gut-feel" id="decision-gut" />
                  <span className="flex-1">🎲 Gut feeling</span>
                </Label>
                <Label htmlFor="decision-research" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="research" id="decision-research" />
                  <span className="flex-1">📊 Research and data</span>
                </Label>
                <Label htmlFor="decision-community" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="community" id="decision-community" />
                  <span className="flex-1">👥 Community input</span>
                </Label>
                <Label htmlFor="decision-mentor" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="mentor" id="decision-mentor" />
                  <span className="flex-1">🎓 Mentor guidance</span>
                </Label>
              </RadioGroup>
              {errors.decisionMakingProcess && <p className="text-sm text-destructive mt-1">{errors.decisionMakingProcess}</p>}
            </div>
          </div>
        );

      case 3: // Meet Your Toolkit
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2 font-space-grotesk">Meet Your Toolkit 🛠️</h2>
              <p className="text-muted-foreground mb-6 font-poppins">
                Here's what you get in your toolkit. You can explore more inside the platform.
              </p>
            </div>

            <div className="space-y-4">
              {FEATURES.map((feature) => (
                <Card
                  key={feature.id}
                  className="rounded-2xl border border-border/60 bg-card/80"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-space-grotesk">{feature.title}</CardTitle>
                        <CardDescription className="mt-1">{feature.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">💡 {feature.painPoint}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {errors.selectedFeatures && <p className="text-sm text-destructive mt-1">{errors.selectedFeatures}</p>}
          </div>
        );

      case 4: // Personalization
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2 font-space-grotesk">Personalize your experience ✨</h2>
              <p className="text-muted-foreground mb-6 font-poppins">
                Help us tailor the platform to your preferences.
              </p>
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">What's your preferred communication style? *</Label>
              <RadioGroup
                value={formData.communicationStyle}
                onValueChange={(value) => setFormData({ ...formData, communicationStyle: value })}
                className="space-y-2"
              >
                <Label htmlFor="comm-visual" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="visual" id="comm-visual" />
                  <span className="flex-1">🎨 Visual (charts, graphs, infographics)</span>
                </Label>
                <Label htmlFor="comm-text" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="text-focused" id="comm-text" />
                  <span className="flex-1">📝 Text-focused (detailed explanations)</span>
                </Label>
                <Label htmlFor="comm-mixed" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="mixed" id="comm-mixed" />
                  <span className="flex-1">🔄 Mixed (both visual and text)</span>
                </Label>
              </RadioGroup>
              {errors.communicationStyle && <p className="text-sm text-destructive mt-1">{errors.communicationStyle}</p>}
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block font-space-grotesk">What's your commitment level? *</Label>
              <RadioGroup
                value={formData.commitmentLevel}
                onValueChange={(value) => setFormData({ ...formData, commitmentLevel: value })}
                className="space-y-2"
              >
                <Label htmlFor="commit-serious" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="serious" id="commit-serious" />
                  <span className="flex-1">🔥 Serious—ready to take action</span>
                </Label>
                <Label htmlFor="commit-exploring" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="exploring" id="commit-exploring" />
                  <span className="flex-1">🔍 Exploring—seeing what's possible</span>
                </Label>
                <Label htmlFor="commit-casual" className="flex items-center space-x-2 rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-accent/60 cursor-pointer">
                  <RadioGroupItem value="casual" id="commit-casual" />
                  <span className="flex-1">💭 Casual—just checking it out</span>
                </Label>
              </RadioGroup>
              {errors.commitmentLevel && <p className="text-sm text-destructive mt-1">{errors.commitmentLevel}</p>}
            </div>
          </div>
        );

      case 5: // Consent & Ready to Launch
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2 font-space-grotesk">Almost there! 🎉</h2>
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
                  . *
                </Label>
              </div>
              {errors.acceptedTerms && <p className="text-sm text-destructive mt-1">{errors.acceptedTerms}</p>}
            </div>

            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">What's next?</strong> After you complete onboarding, you'll be taken to your personalized dashboard where you can start exploring the features you selected.
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
      <Card className="rounded-2xl border border-border/60 bg-card/80 shadow-xl backdrop-blur">
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
          <div>
            {currentStep > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleBack}
                disabled={isLoading || isSigningUp}
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
              disabled={isLoading || isSigningUp}
              className="gap-2 rounded-full px-6 font-semibold shadow-sm hover:shadow-md"
              style={{ backgroundColor: currentStep === 5 ? '#32b8c6' : undefined }}
            >
              {isLoading || isSigningUp ? (
                'Loading...'
              ) : currentStep === 5 ? (
                <>
                  Get Started 🚀
                </>
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


