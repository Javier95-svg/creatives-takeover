import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { AccountWallpaper } from '@/components/AccountWallpaper';

interface QuizAnswers {
  isFirstStartup: string;
  currentStage: string;
  biggestChallenge: string;
  launchTimeline: string;
  lookingForCofounder: string;
}

const SetupQuiz = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<QuizAnswers>({
    isFirstStartup: '',
    currentStage: '',
    biggestChallenge: '',
    launchTimeline: '',
    lookingForCofounder: '',
  });

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  const questions = [
    {
      id: 'isFirstStartup',
      question: 'Is this your first startup?',
      options: [
        { value: 'yes', label: 'Yes, this is my first one' },
        { value: 'no', label: "No, I've built before" },
      ],
    },
    {
      id: 'currentStage',
      question: "What best describes your current stage?",
      options: [
        { value: 'idea', label: 'Just an idea' },
        { value: 'building-mvp', label: 'Building an MVP' },
        { value: 'mvp-ready', label: 'MVP is ready' },
        { value: 'early-users', label: 'Already have early users' },
      ],
    },
    {
      id: 'biggestChallenge',
      question: "What's your biggest challenge right now?",
      options: [
        { value: 'idea-to-product', label: 'Turning an idea into a real product' },
        { value: 'users-validation', label: 'Finding users or validation' },
        { value: 'focus-accountability', label: 'Staying focused and accountable' },
        { value: 'find-team', label: 'Find the right people (team)' },
        { value: 'not-sure', label: 'Not sure yet' },
      ],
    },
    {
      id: 'launchTimeline',
      question: 'When do you want to launch or validate publicly?',
      options: [
        { value: '30-days', label: 'Within 30 days' },
        { value: '60-days', label: 'Within 60 days' },
        { value: '90-plus-days', label: 'Within 90+ days' },
        { value: 'not-sure', label: 'Not sure yet' },
      ],
    },
    {
      id: 'lookingForCofounder',
      question: 'Are you currently looking for a co-founder?',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ],
    },
  ];

  const currentQuestion = questions[currentStep - 1];
  const currentAnswer = answers[currentQuestion.id as keyof QuizAnswers];

  const handleAnswerChange = (value: string) => {
    setAnswers({
      ...answers,
      [currentQuestion.id]: value,
    });
  };

  const handleNext = () => {
    if (!currentAnswer) {
      toast.error('Please select an answer to continue');
      return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!currentAnswer) {
      toast.error('Please select an answer to continue');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to save your answers');
      return;
    }

    setLoading(true);
    try {
      // Save quiz answers to database
      const { error } = await supabase
        .from('profiles')
        .update({
          quiz_is_first_startup: answers.isFirstStartup,
          quiz_current_stage: answers.currentStage,
          quiz_biggest_challenge: answers.biggestChallenge,
          quiz_launch_timeline: answers.launchTimeline,
          quiz_looking_for_cofounder: answers.lookingForCofounder,
          quiz_completed: true,
          quiz_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Setup complete! Redirecting to your dashboard...');

      // Redirect to dashboard after 1 second
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (error: any) {
      console.error('Error saving quiz answers:', error);
      toast.error('Failed to save your answers: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <AccountWallpaper />
        <div className="relative z-10">
          <Navigation />
          <div className="container mx-auto px-6 pt-24">
            <Card className="max-w-md mx-auto backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>
                  Please log in to complete the setup quiz.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AccountWallpaper />
      <div className="relative z-10">
        <Navigation />
        <div className="container mx-auto px-6 pt-24 pb-12">
          {/* Header */}
          <div className="text-center py-8 space-y-4">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                Let's Get Started
              </span>
            </h1>
            <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto">
              Answer a few quick questions so we can personalize your experience
            </p>
          </div>

          {/* Progress Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">
                Question {currentStep} of {totalSteps}
              </span>
              <span className="text-sm text-slate-400">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Question Card */}
          <div className="max-w-2xl mx-auto">
            <Card className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle className="text-2xl">{currentQuestion.question}</CardTitle>
                <CardDescription>Select the option that best describes you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <RadioGroup value={currentAnswer} onValueChange={handleAnswerChange}>
                  <div className="space-y-3">
                    {currentQuestion.options.map((option) => (
                      <div
                        key={option.value}
                        className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          currentAnswer === option.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50 hover:bg-primary/5'
                        }`}
                        onClick={() => handleAnswerChange(option.value)}
                      >
                        <RadioGroupItem value={option.value} id={option.value} />
                        <Label
                          htmlFor={option.value}
                          className="flex-1 cursor-pointer text-base font-medium"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>

                  {currentStep < totalSteps ? (
                    <Button onClick={handleNext} disabled={!currentAnswer}>
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button onClick={handleSubmit} disabled={loading || !currentAnswer}>
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupQuiz;
