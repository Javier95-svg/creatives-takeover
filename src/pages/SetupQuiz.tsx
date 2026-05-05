import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowRight, ChevronLeft, ChevronRight, Loader2, Save, Sparkles, Users } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { AccountWallpaper } from '@/components/AccountWallpaper';
import {
  assignStage,
  shouldRecommendCofounder,
  STAGES,
  type QuizAnswers,
  type StageId,
} from '@/lib/stageDiagnostic';
import {
  isLegacyOnboardingExempt,
  shouldRedirectToGuidedOnboarding,
} from '@/lib/guidedOnboarding';

type PartialAnswers = Partial<QuizAnswers>;

type QuestionDef = {
  id: keyof QuizAnswers;
  question: string;
  description?: string;
  options: { value: string; label: string }[];
};

const QUESTIONS: QuestionDef[] = [
  {
    id: 'q1',
    question: 'Where are you right now with your startup?',
    options: [
      { value: 'have_idea', label: 'I have an idea but haven\'t really started' },
      { value: 'actively_building', label: 'I\'m actively building something' },
      { value: 'launched', label: 'I\'ve launched and have users or revenue' },
      { value: 'ready_to_raise', label: 'I\'m ready (or close) to raising money' },
    ],
  },
  {
    id: 'q2',
    question: 'What\'s the biggest thing slowing you down?',
    options: [
      { value: 'dont_know_customer', label: 'I don\'t know who my real customer is' },
      { value: 'not_sure_anyone_pays', label: 'I\'m not sure anyone would actually pay for this' },
      { value: 'need_build_help', label: 'I need help actually building the product' },
      { value: 'feeling_alone', label: 'I\'m doing this alone and it\'s a lot' },
    ],
  },
  {
    id: 'q3',
    question: 'Have you talked to real potential customers about your idea?',
    options: [
      { value: 'no', label: 'No, not really' },
      { value: 'yes_friends', label: 'Yes, but mostly friends and family' },
      { value: 'yes_strangers', label: 'Yes, including strangers in my target market' },
    ],
  },
  {
    id: 'q4',
    question: 'How long have you been working on this?',
    options: [
      { value: 'less_than_three', label: 'Less than 3 months' },
      { value: 'three_to_six', label: '3 to 6 months' },
      { value: 'six_to_twelve', label: '6 to 12 months' },
      { value: 'more_than_year', label: 'More than a year' },
      { value: 'already_launched', label: 'I\'ve already launched' },
    ],
  },
  {
    id: 'q5',
    question: 'Which of these feels most true today?',
    options: [
      { value: 'just_starting', label: 'I\'m just starting and trying to figure out the direction' },
      { value: 'have_clarity', label: 'I have clarity on the idea and I\'m shaping it' },
      { value: 'validating', label: 'I\'m validating demand with real people' },
      { value: 'building', label: 'I\'m heads-down building the product' },
      { value: 'post_launch', label: 'I\'m live and focused on growth' },
    ],
  },
];

const TOTAL_QUESTIONS = QUESTIONS.length;

const SetupQuiz = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`quiz_step_draft_${user?.id}`);
      return saved ? Number(saved) : 1;
    } catch { return 1; }
  });
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<PartialAnswers>(() => {
    try {
      const saved = sessionStorage.getItem(`quiz_answers_draft_${user?.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [resultStage, setResultStage] = useState<StageId | null>(null);
  const [showCofounderCard, setShowCofounderCard] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const verifyQuizAccess = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('onboarding_completed, quiz_completed, dashboard_bootstrap_source, user_preferences')
          .eq('id', user.id)
          .maybeSingle();

        if (cancelled || error || !profile) {
          return;
        }

        if (isLegacyOnboardingExempt(profile)) {
          navigate('/dashboard', { replace: true });
          return;
        }

        if (shouldRedirectToGuidedOnboarding(profile)) {
          navigate('/onboarding', { replace: true });
          return;
        }

        if (profile.quiz_completed === true) {
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Error checking setup quiz access:', error);
      }
    };

    void verifyQuizAccess();

    return () => {
      cancelled = true;
    };
  }, [navigate, user]);

  // Persist quiz draft to sessionStorage
  useEffect(() => {
    if (!user?.id) return;
    try {
      sessionStorage.setItem(`quiz_answers_draft_${user.id}`, JSON.stringify(answers));
      sessionStorage.setItem(`quiz_step_draft_${user.id}`, String(currentStep));
    } catch { /* ignore */ }
  }, [answers, currentStep, user?.id]);

  // Auto-redirect countdown after result is shown
  useEffect(() => {
    if (resultStage === null) return;
    setRedirectCountdown(8);
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [resultStage, navigate]);

  const progress = (currentStep / TOTAL_QUESTIONS) * 100;
  const currentQuestion = QUESTIONS[currentStep - 1];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  const handleAnswerChange = (value: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value as QuizAnswers[typeof currentQuestion.id] }));
  };

  const handleNext = () => {
    if (!currentAnswer) {
      toast.error('Please select an answer to continue');
      return;
    }
    if (currentStep < TOTAL_QUESTIONS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
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

    const completeAnswers = answers as QuizAnswers;
    const stage = assignStage(completeAnswers);
    const cofounderRecommended = shouldRecommendCofounder(completeAnswers);

    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profilesTable = supabase.from('profiles') as any;
      const { error } = await profilesTable
        .update({
          quiz_answers_v2: completeAnswers,
          assigned_stage: stage,
          quiz_completed: true,
          quiz_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      try {
        sessionStorage.removeItem(`quiz_answers_draft_${user.id}`);
        sessionStorage.removeItem(`quiz_step_draft_${user.id}`);
      } catch { /* ignore */ }

      setResultStage(stage);
      setShowCofounderCard(cofounderRecommended);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error saving quiz answers:', error);
      toast.error('Failed to save your answers: ' + message);
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

  if (resultStage !== null) {
    const meta = STAGES[resultStage];
    return (
      <div className="relative min-h-screen overflow-hidden">
        <AccountWallpaper />
        <div className="relative z-10">
          <Navigation />
          <div className="container mx-auto px-6 pt-24 pb-12">
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-sm font-medium text-primary">
                  <Sparkles className="w-4 h-4" />
                  Your diagnostic is ready
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                  <span className="bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                    Stage {meta.id} — {meta.name}
                  </span>
                </h1>
                <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto">
                  {meta.description}
                </p>
                <p className="text-sm text-slate-400 max-w-xl mx-auto">
                  Your dashboard and recommended tools are now personalized for this stage. You can retake this diagnostic from Account settings at any time.
                </p>
              </div>

              <Card className="backdrop-blur-sm bg-card/80 border-border/50">
                <CardHeader>
                  <CardTitle className="text-2xl">Your top focus right now</CardTitle>
                  <CardDescription>
                    These are the two tools that will move you forward the fastest at this stage.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {meta.topFocus.map((focus) => (
                    <Button
                      key={focus.href}
                      asChild
                      variant="outline"
                      className="w-full justify-between h-auto py-4 text-base"
                    >
                      <Link to={focus.href}>
                        <span>{focus.label}</span>
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {showCofounderCard && (
                <Card className="backdrop-blur-sm bg-card/80 border-primary/40">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">You don't have to build alone</CardTitle>
                        <CardDescription>
                          Many founders at this stage find momentum by pairing up with a co-founder. Our Co-Founder Marketplace can help.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full">
                      <Link to="/community/co-founders">
                        Explore Co-Founder Marketplace
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {resultStage === 7 && (
                <Card className="backdrop-blur-sm bg-card/60 border-border/50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-slate-300">
                      Most founders started where you did. Stage 1 through Stage 6 are all available inside Creatives Takeover whenever you need to revisit an earlier part of the journey.
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-col items-center gap-2">
                <Button size="lg" onClick={() => { setRedirectCountdown(null); navigate('/dashboard'); }}>
                  Go to my dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                {redirectCountdown !== null && redirectCountdown > 0 && (
                  <p className="text-xs text-slate-400">Redirecting in {redirectCountdown}s…</p>
                )}
              </div>
            </div>
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
          <div className="text-center py-8 space-y-4">
            <p className="text-sm text-muted-foreground">
              Getting started — Step 2 of 2: Your startup diagnostic
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
              <span className="text-primary [text-shadow:0_0_22px_rgba(59,130,246,0.28)]">
                Find your stage
              </span>
            </h1>
            <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto">
              We'll tell you exactly where you are and the next move to make.
            </p>
          </div>

          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">
                Question {currentStep} of {TOTAL_QUESTIONS}
              </span>
              <span className="text-sm text-slate-400">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className="backdrop-blur-sm bg-card/80 border-border/50">
              <CardHeader>
                <CardTitle className="text-2xl">{currentQuestion.question}</CardTitle>
                <CardDescription>Pick the option that best describes you today</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <RadioGroup value={currentAnswer ?? ''} onValueChange={handleAnswerChange}>
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
                        <RadioGroupItem value={option.value} id={`${currentQuestion.id}-${option.value}`} />
                        <Label
                          htmlFor={`${currentQuestion.id}-${option.value}`}
                          className="flex-1 cursor-pointer text-base font-medium"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>

                <div className="flex items-center justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>

                  {currentStep < TOTAL_QUESTIONS ? (
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
                          See my stage
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
