import React, { useState, useMemo } from "react";
import { Rocket, Target, Users, DollarSign, CheckCircle2, AlertCircle, HelpCircle, ChevronDown, ChevronUp, Loader2, ArrowRight, ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PreviewModeWrapper } from "@/components/ui/PreviewModeWrapper";
import { captureEvent } from "@/lib/analytics";
import { clearAnonymousToolState, readAnonymousToolState, saveAnonymousToolState } from "@/lib/anonymousToolState";
import { markFirstArtifactCreated, trackRetentionEvent } from "@/lib/retentionSystem";
import { useCredits } from "@/hooks/useCredits";
import { useCreditActions } from "@/hooks/useCreditActions";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { useUpgradePrompt } from "@/contexts/UpgradePromptContext";
import { type Plan } from "@/config/planPermissions";
import {
  AssessmentContext,
  AssessmentScores,
  AIAnalysis as EnhancedAIAnalysis,
  FounderStage,
  FounderExperience,
  QuestionId,
  READINESS_THRESHOLDS,
  getVisibleQuestions,
  getRequiredQuestions,
  isQuestionOptional
} from "@/types/fundraisingAssessment";
import { ASSESSMENT_QUESTIONS, INDUSTRY_OPTIONS, BUSINESS_MODEL_OPTIONS, SCORE_LABELS } from "@/data/assessmentQuestions";
import { trackActivationFunnelEvent } from "@/lib/activationEntry";
import { useActivationAbandonment } from "@/hooks/useActivationAbandonment";
import { buildInsightaPublicInsights } from "@/lib/insightaPublicInsights";

// Legacy interface kept for backwards compatibility
type AIAnalysis = EnhancedAIAnalysis;

// Assessment flow steps
type AssessmentStep = 'context-stage' | 'context-business' | 'assessment' | 'results';

interface InsightaAnonymousState {
  context: Partial<AssessmentContext>;
  scores: Partial<AssessmentScores>;
  averageScore: number;
}

interface InsightaAnalysisResponse extends AIAnalysis {
  assessmentId: string;
  creditsUsed: number;
  giftUsed: boolean;
  average_score?: number;
  error?: string;
  errorCode?: string;
  requiredCredits?: number;
}

const FundraisingReadinessToolkitAll = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { refreshBalance } = useCredits();
  const { ensureCredits, handleCreditError } = useCreditActions();
  const { checkFeatureAccess } = useFeatureGating();
  const { openUpgradePrompt } = useUpgradePrompt();

  // Multi-step flow state
  const [currentStep, setCurrentStep] = useState<AssessmentStep>('context-stage');

  // Context collection state
  const [context, setContext] = useState<Partial<AssessmentContext>>({
    founder_stage: 'validation', // Default
    founder_experience: 'first-time' // Default
  });

  // Expanded scores state (10 questions)
  const [scores, setScores] = useState<Partial<AssessmentScores>>({
    mvp: 0,
    feedback: 0,
    team: 0,
    runway: 0
  });

  const [expandedHelp, setExpandedHelp] = useState<{ [key: string]: boolean }>({});
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  // Logged-out visitors get a real, client-side top-line readiness score for free.
  // The full AI diagnostic stays gated behind a free account.
  const [publicResult, setPublicResult] = useState(false);
  const [hydratedForUnlock, setHydratedForUnlock] = useState(false);
  const [creditConfirmationRequired, setCreditConfirmationRequired] = useState(false);
  useActivationAbandonment({
    entry_id: 'insighta_test', tool: 'insighta_test', source: 'insighta_test',
    step: 'before_diagnostic', is_authenticated: isAuthenticated,
  }, Boolean(aiAnalysis));
  const hydrationAnalysisAttemptedRef = React.useRef(false);

  React.useEffect(() => {
    captureEvent("insighta_test_context_started", { is_authenticated: isAuthenticated });
    trackActivationFunnelEvent('activation_entry_opened', {
      entry_id: 'insighta_test', tool: 'insighta_test', source: 'insighta_test', step: 'opened',
      entry_page: '/insighta-test', is_authenticated: isAuthenticated,
    });
  }, [isAuthenticated]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('hydrate') !== '1') return;

    const stored = readAnonymousToolState<InsightaAnonymousState>('insighta_test');
    if (!stored) return;

    setContext((prev) => ({ ...prev, ...stored.context }));
    setScores((prev) => ({ ...prev, ...stored.scores }));
    setCurrentStep('assessment');
    setPublicResult(!isAuthenticated);
    setHydratedForUnlock(isAuthenticated);
    trackActivationFunnelEvent('activation_resume_succeeded', {
      entry_id: 'insighta_test', tool: 'insighta_test', source: 'signup_hydrate',
      step: 'restore_answers', is_authenticated: isAuthenticated, artifact_type: 'insighta_readiness',
    });

    if (isAuthenticated && user) {
      void trackRetentionEvent('artifact_resumed', {
        user_id: user.id,
        tool: 'insighta_test',
        source: 'insighta_test_unlock',
        resume_url: '/insighta-test?hydrate=1',
      });
    }
  }, [isAuthenticated, user]);

  // Get visible questions based on current stage
  const visibleQuestions = useMemo(() => {
    const stage = (context.founder_stage || 'validation') as FounderStage;
    return getVisibleQuestions(ASSESSMENT_QUESTIONS, stage);
  }, [context.founder_stage]);

  const averageScore = useMemo(() => {
    // Calculate average only from non-null, non-undefined scores
    const scoreValues = Object.values(scores).filter(
      score => score !== null && score !== undefined && score > 0
    ) as number[];
    if (scoreValues.length === 0) return 0;
    const sum = scoreValues.reduce((acc, val) => acc + val, 0);
    return sum / scoreValues.length;
  }, [scores]);

  const allRequiredScored = useMemo(() => {
    const stage = (context.founder_stage || 'validation') as FounderStage;
    const requiredQuestions = getRequiredQuestions(ASSESSMENT_QUESTIONS, stage);
    return requiredQuestions.every(q => {
      const score = scores[q.id as keyof AssessmentScores];
      return score !== null && score !== undefined && score > 0;
    });
  }, [scores, context.founder_stage]);

  const publicDiagnostic = useMemo(() => {
    const stage = (context.founder_stage || 'validation') as FounderStage;
    const threshold = READINESS_THRESHOLDS[stage];
    return buildInsightaPublicInsights({
      questions: visibleQuestions.flatMap((question) => {
        const score = scores[question.id as QuestionId];
        return typeof score === 'number' && score > 0
          ? [{ id: question.id, title: question.title, description: question.description, score }]
          : [];
      }),
      averageScore,
      stageLabel: stage,
      threshold: threshold.min_average,
      criticalMinimums: threshold.critical_minimums,
    });
  }, [averageScore, context.founder_stage, scores, visibleQuestions]);

  // Context step handlers
  const handleStageContextSubmit = () => {
    if (!context.founder_stage || !context.founder_experience) {
      toast.error("Please select both your journey stage and founder experience");
      return;
    }
    setCurrentStep('context-business');
  };

  const handleBusinessContextSubmit = () => {
    if (!context.industry || !context.business_model) {
      toast.error("Please select your industry and business model");
      return;
    }
    setCurrentStep('assessment');
  };

  const handleBackToContext = () => {
    if (currentStep === 'context-business') {
      setCurrentStep('context-stage');
    } else if (currentStep === 'assessment') {
      setCurrentStep('context-business');
    }
  };

  const handleScoreChange = (criterionId: string, value: number[]) => {
    const newScore = value[0];
    setScores(prev => ({
      ...prev,
      [criterionId]: newScore
    }));
    // Clear previous analysis when scores change
    if (aiAnalysis) {
      setAiAnalysis(null);
      setAnalysisError(null);
    }
    // A changed answer invalidates the free top-line score too.
    if (publicResult) {
      setPublicResult(false);
    }
  };

  // Logged-out submit: compute the readiness score on the client from the
  // visitor's own answers (real + personalized) and reveal the free partial.
  const handlePublicSubmit = () => {
    if (!allRequiredScored) {
      toast.error("Please complete all required questions to see your readiness score");
      return;
    }
    const answeredCount = Object.values(scores).filter(
      (score) => typeof score === "number" && score > 0,
    ).length;
    captureEvent("free_tool_input_submitted", {
      tool: "insighta_test",
      questions_answered: answeredCount,
    });
    saveAnonymousToolState<InsightaAnonymousState>('insighta_test', {
      context,
      scores,
      averageScore: Number(averageScore.toFixed(1)),
    });
    setPublicResult(true);
    captureEvent("free_tool_partial_result_shown", {
      tool: "insighta_test",
      readiness_score: Number(averageScore.toFixed(1)),
      strengths_revealed: publicDiagnostic.strengths.length,
      gaps_revealed: publicDiagnostic.gaps.length,
      stage_delta: publicDiagnostic.deltaFromThreshold,
    });
    captureEvent("insighta_test_result_shown", {
      tool: "insighta_test",
      is_authenticated: false,
      readiness_score: Number(averageScore.toFixed(1)),
    });
  };

  const toggleHelp = (criterionId: string) => {
    setExpandedHelp(prev => ({
      ...prev,
      [criterionId]: !prev[criterionId]
    }));
  };

  const analyzeReadiness = async (confirmCreditCharge = false) => {
    if (!isAuthenticated || !user) {
      toast.error("Please sign in to analyze your readiness");
      navigate('/login', { state: { returnTo: '/insighta-test' } });
      return;
    }

    if (!allRequiredScored) {
      toast.error("Please complete all required questions before analyzing");
      return;
    }

    await trackRetentionEvent('activation_first_input_submitted', {
      user_id: user.id,
      tool: 'insighta_test',
      source: 'insighta_test',
      questions_answered: Object.values(scores).filter((score) => typeof score === 'number' && score > 0).length,
    });

    // Check feature access and credits
    const featureAccess = checkFeatureAccess('insighta_test');
    if (!featureAccess.hasAccess) {
      openUpgradePrompt({
        reason: 'feature',
        featureName: 'Insighta Test',
        requiredTier: featureAccess.requiredTier as Plan | undefined,
        description: featureAccess.message,
      });
      return;
    }
    const requiredCredits = confirmCreditCharge
      ? ensureCredits('FUNDRAISING_READINESS_ANALYSIS', { featureName: 'Insighta Test' })
      : 0;
    if (requiredCredits === null) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const { data, error } = await supabase.functions.invoke('fundraising-readiness-analyzer', {
        body: {
          // Original 4 scores (required)
          mvp_score: scores.mvp,
          feedback_score: scores.feedback,
          team_score: scores.team,
          runway_score: scores.runway,
          // New 7 scores (optional - only send if defined)
          ...(scores.founder_market_fit !== undefined && scores.founder_market_fit !== null && { founder_market_fit_score: scores.founder_market_fit }),
          ...(scores.traction !== undefined && scores.traction !== null && { traction_score: scores.traction }),
          ...(scores.competitive_positioning !== undefined && scores.competitive_positioning !== null && { competitive_positioning_score: scores.competitive_positioning }),
          ...(scores.gtm_strategy !== undefined && scores.gtm_strategy !== null && { gtm_strategy_score: scores.gtm_strategy }),
          ...(scores.unit_economics !== undefined && scores.unit_economics !== null && { unit_economics_score: scores.unit_economics }),
          ...(scores.legal_readiness !== undefined && scores.legal_readiness !== null && { legal_readiness_score: scores.legal_readiness }),
          ...(scores.investor_network !== undefined && scores.investor_network !== null && { investor_network_score: scores.investor_network }),
          // Context fields
          founder_stage: context.founder_stage,
          founder_experience: context.founder_experience,
          industry: context.industry,
          business_model: context.business_model,
          primary_location: context.primary_location,
          funding_amount_needed: context.funding_amount_needed,
          pitch_summary: context.pitch_summary,
          allow_credit_charge: confirmCreditCharge,
        }
      });

      const response = data as InsightaAnalysisResponse | null;
      if (response?.errorCode === 'CREDIT_CONFIRMATION_REQUIRED') {
        setCreditConfirmationRequired(true);
        captureEvent('activation_gate_shown', {
          entry_id: 'insighta_test',
          tool: 'insighta_test',
          source: hydratedForUnlock ? 'insighta_hydrate' : 'insighta_test',
          step: 'credit_confirmation',
          is_authenticated: true,
          credits_required: response.requiredCredits ?? 8,
        });
        return;
      }

      if (error) {
        if (handleCreditError(error, data, 'FUNDRAISING_READINESS_ANALYSIS', { featureName: 'Insighta Test' })) {
          throw new Error('Insufficient credits');
        }
        throw error;
      }

      if (data?.error) {
        if (handleCreditError(null, data, 'FUNDRAISING_READINESS_ANALYSIS', { featureName: 'Insighta Test' })) {
          throw new Error('Insufficient credits');
        }
        throw new Error(data.error);
      }

      if (!response?.assessmentId) throw new Error('The diagnostic was generated but could not be saved. Please retry.');
      setAiAnalysis(response);
      trackActivationFunnelEvent('activation_step_completed', {
        entry_id: 'insighta_test', tool: 'insighta_test', source: hydratedForUnlock ? 'insighta_hydrate' : 'insighta_test',
        step: 'diagnostic_saved', is_authenticated: true, artifact_type: 'insighta_readiness',
      });
      setCreditConfirmationRequired(false);
      clearAnonymousToolState('insighta_test');
      setCurrentStep('results'); // Transition to results step
      await trackRetentionEvent('activation_first_output_generated', {
        user_id: user.id,
        tool: 'insighta_test',
        source: 'insighta_test',
        artifact_type: 'insighta_readiness',
      });
      await markFirstArtifactCreated({
        userId: user.id,
        artifactType: 'insighta_readiness',
        artifactId: response.assessmentId,
        label: `Insighta readiness: ${data?.verdict ?? 'Diagnostic'}`,
        resumeUrl: '/insighta-test',
        source: 'insighta_test',
      });
      captureEvent("insighta_test_result_shown", {
        tool: "insighta_test",
        is_authenticated: true,
        readiness_score: data?.average_score ?? Number(averageScore.toFixed(1)),
      });

      toast.success(response.giftUsed
        ? 'Your first Insighta diagnostic is unlocked and saved.'
        : `Analysis complete! (Used ${response.creditsUsed ?? requiredCredits} credits)`);
      await refreshBalance();
    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze readiness. Please try again.';
      setAnalysisError(errorMessage);
      trackActivationFunnelEvent('activation_generation_failed', {
        entry_id: 'insighta_test', tool: 'insighta_test', source: hydratedForUnlock ? 'insighta_hydrate' : 'insighta_test',
        step: 'analyze', is_authenticated: true, reason: errorMessage,
      });
      if (!errorMessage.includes('credits')) {
        toast.error(errorMessage);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  React.useEffect(() => {
    if (
      !hydratedForUnlock ||
      !isAuthenticated ||
      !user ||
      !allRequiredScored ||
      hydrationAnalysisAttemptedRef.current
    ) return;
    hydrationAnalysisAttemptedRef.current = true;
    void analyzeReadiness(false);
  // This transition must run once after the restored answers become valid.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRequiredScored, hydratedForUnlock, isAuthenticated, user?.id]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 pt-6 text-sm">
          {[
            { id: 'context-stage', label: 'Founder context' },
            { id: 'context-business', label: 'Business context' },
            { id: 'assessment', label: 'Readiness score' },
            { id: 'results', label: 'Diagnostic' },
          ].map((step, index) => (
            <Badge
              key={step.id}
              variant={currentStep === step.id ? 'default' : 'outline'}
              className="font-normal"
            >
              {index + 1}. {step.label}
            </Badge>
          ))}
        </CardContent>
      </Card>

      {currentStep === 'context-stage' && (
        <Card>
          <CardHeader>
            <CardTitle>Tell us where you are in the journey</CardTitle>
            <CardDescription>
              This makes the readiness score compare you against the right stage instead of a generic fundraising checklist.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Startup stage</Label>
              <RadioGroup
                value={context.founder_stage}
                onValueChange={(value) => setContext((prev) => ({ ...prev, founder_stage: value as FounderStage }))}
                className="grid gap-3 sm:grid-cols-2"
              >
                {[
                  ['ideation', 'Ideation'],
                  ['validation', 'Validation'],
                  ['building', 'Building'],
                  ['launching', 'Launching'],
                  ['scaling', 'Scaling'],
                ].map(([value, label]) => (
                  <Label key={value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 p-3">
                    <RadioGroupItem value={value} />
                    <span>{label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label>Founder experience</Label>
              <RadioGroup
                value={context.founder_experience}
                onValueChange={(value) => setContext((prev) => ({ ...prev, founder_experience: value as FounderExperience }))}
                className="grid gap-3 sm:grid-cols-3"
              >
                {[
                  ['first-time', 'First-time founder'],
                  ['second-time', 'Second-time founder'],
                  ['experienced', 'Experienced founder'],
                ].map(([value, label]) => (
                  <Label key={value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 p-3">
                    <RadioGroupItem value={value} />
                    <span>{label}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleStageContextSubmit}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 'context-business' && (
        <Card>
          <CardHeader>
            <CardTitle>Add your business context</CardTitle>
            <CardDescription>
              These details help the diagnostic explain what matters for your market, model, and fundraising path.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Industry</Label>
                <Select
                  value={context.industry}
                  onValueChange={(value) => setContext((prev) => ({ ...prev, industry: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_OPTIONS.map((industry) => (
                      <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Business model</Label>
                <Select
                  value={context.business_model}
                  onValueChange={(value) => setContext((prev) => ({ ...prev, business_model: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select business model" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_MODEL_OPTIONS.map((model) => (
                      <SelectItem key={model} value={model}>{model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Primary market or location</Label>
                <Input
                  value={context.primary_location ?? ''}
                  onChange={(event) => setContext((prev) => ({ ...prev, primary_location: event.target.value }))}
                  placeholder="Example: US, Colombia, LatAm, remote-first"
                />
              </div>
              <div className="space-y-2">
                <Label>Funding needed</Label>
                <Input
                  type="number"
                  min={0}
                  value={context.funding_amount_needed ?? ''}
                  onChange={(event) => setContext((prev) => ({
                    ...prev,
                    funding_amount_needed: event.target.value ? Number(event.target.value) : undefined,
                  }))}
                  placeholder="Example: 250000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>One sentence pitch</Label>
              <Textarea
                value={context.pitch_summary ?? ''}
                onChange={(event) => setContext((prev) => ({ ...prev, pitch_summary: event.target.value }))}
                placeholder="What are you building, for whom, and why now?"
                rows={3}
              />
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={handleBackToContext}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleBusinessContextSubmit}>
                Start assessment
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(currentStep === 'assessment' || currentStep === 'results') && (
      <>
      {/* All Questions in Vertical List */}
        <div className="space-y-6 mb-8">
          <TooltipProvider>
            {visibleQuestions.map((question, index) => {
              const questionScore = scores[question.id] || 0;

              return (
                <Card key={question.id} className="border-l-4 border-l-primary">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary mt-1">
                        {question.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-semibold">{index + 1}. {question.title}</h3>
                          {questionScore > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {SCORE_LABELS[questionScore]}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {question.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Help Text */}
                    <Collapsible
                      open={expandedHelp[question.id]}
                      onOpenChange={() => toggleHelp(question.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <HelpCircle className="h-3 w-3 mr-1" />
                          {expandedHelp[question.id] ? "Hide help" : "What does this mean?"}
                          {expandedHelp[question.id] ? (
                            <ChevronUp className="h-3 w-3 ml-1" />
                          ) : (
                            <ChevronDown className="h-3 w-3 ml-1" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="text-sm text-muted-foreground mt-2 pl-4 border-l-2 border-primary/20 space-y-2 whitespace-pre-line">
                        {question.helpText}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Slider */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Score: {questionScore} / 10</span>
                        <span className="text-xs text-muted-foreground">{SCORE_LABELS[questionScore]}</span>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            <Slider
                              value={[questionScore]}
                              onValueChange={(value) => handleScoreChange(question.id, value)}
                              min={0}
                              max={10}
                              step={1}
                              className="w-full"
                            />
                          </div>
                        </TooltipTrigger>
                      </Tooltip>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0</span>
                        <span>2</span>
                        <span>4</span>
                        <span>6</span>
                        <span>8</span>
                        <span>10</span>
                      </div>

                      {/* Progress Bar */}
                      {questionScore > 0 && (
                        <div className="space-y-1">
                          <Progress value={(questionScore / 10) * 100} className="h-2" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TooltipProvider>
        </div>

        {/* Analyze Button */}
        {(allRequiredScored || !isAuthenticated) && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                {allRequiredScored && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Average Score</p>
                    <p className="text-3xl font-bold">{averageScore.toFixed(1)} / 10.0</p>
                  </div>
                )}
                {!isAuthenticated ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Answer the questions above to get your free fundraising readiness score
                    </p>
                    <Button
                      size="lg"
                      onClick={handlePublicSubmit}
                      disabled={!allRequiredScored}
                      className="w-full md:w-auto min-w-[200px]"
                    >
                      <Rocket className="h-4 w-4 mr-2" />
                      Get My Readiness Score
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => void analyzeReadiness(creditConfirmationRequired)}
                    disabled={isAnalyzing || !allRequiredScored}
                    className="w-full md:w-auto min-w-[200px]"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4 mr-2" />
                        {creditConfirmationRequired ? 'Generate full diagnostic — 8 credits' : 'Get AI Analysis'}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Logged-out free partial: real top-line readiness score + gated full diagnostic */}
        {!isAuthenticated && publicResult && (
          <>
            <Card className="mb-6 border-2 border-primary/30">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Rocket className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle className="text-2xl">Your Fundraising Readiness</CardTitle>
                    <CardDescription className="mt-1">
                      Your free top-line score, based on your answers.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center text-center gap-3 py-2">
                  <p className="text-5xl font-bold text-foreground">
                    {Math.round(averageScore * 10)}
                    <span className="text-2xl text-muted-foreground">/100</span>
                  </p>
                  <Badge variant="secondary" className="text-sm">
                    {averageScore >= 7 ? "Ready" : averageScore >= 4 ? "Almost Ready" : "Not Ready Yet"}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Average score {averageScore.toFixed(1)} / 10 across the factors you rated.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6 border-2 border-accent-teal/30 bg-accent-teal/5">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-accent-teal">Free diagnostic snapshot</p>
                    <CardTitle className="mt-2 text-xl">What your score is really saying</CardTitle>
                    <CardDescription className="mt-1">This is based on your answers and calibrated to your current startup stage.</CardDescription>
                  </div>
                  <Badge variant={publicDiagnostic.deltaFromThreshold >= 0 ? 'default' : 'secondary'}>
                    {publicDiagnostic.deltaFromThreshold > 0
                      ? 'Above stage threshold'
                      : publicDiagnostic.deltaFromThreshold < 0
                        ? 'Below stage threshold'
                        : 'Meets stage threshold'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm font-medium text-foreground">{publicDiagnostic.stageComparison}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3 rounded-2xl border border-success/30 bg-success/5 p-4">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-success" /> Strongest signals
                    </h3>
                    {publicDiagnostic.strengths.map((signal) => (
                      <div key={`strength-${signal.id}`} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium">{signal.title}</span>
                          <span className="font-semibold text-success">{signal.score}/10</span>
                        </div>
                        <Progress value={signal.score * 10} className="h-1.5" />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 rounded-2xl border border-warning/30 bg-warning/5 p-4">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <AlertCircle className="h-4 w-4 text-warning" /> Highest-impact gaps
                    </h3>
                    {publicDiagnostic.gaps.map((signal) => (
                      <div key={`gap-${signal.id}`} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium">{signal.title}</span>
                          <span className="font-semibold text-warning">{signal.score}/10</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{signal.label} for your current stage.</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Your next best action</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{publicDiagnostic.nextAction}</p>
                </div>
              </CardContent>
            </Card>

            <PreviewModeWrapper
              featureName="Full diagnostic"
              headline="Turn this snapshot into your investor-readiness plan"
              description="Create a free account to unlock why each gap matters, how to use your strongest signals in the pitch, stage-specific benchmarks, a prioritized action plan, and your estimated timeline to readiness."
              ctaLabel="Create free account"
              signupSource="insighta-test"
              signupReturnPath="/insighta-test?hydrate=1"
              analyticsTool="insighta_test"
              onCtaClick={() => {
                saveAnonymousToolState<InsightaAnonymousState>('insighta_test', {
                  context,
                  scores,
                  averageScore: Number(averageScore.toFixed(1)),
                });
                captureEvent("free_tool_signup_gate_cta_clicked", { tool: "insighta_test" });
              }}
            >
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" /> Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>Your strongest readiness factors and how to leverage them with investors.</p>
                    <p>Where your current traction already beats the bar for your stage.</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-warning" /> Critical gaps &amp; prioritized actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>The specific gaps most likely to stall your raise, ranked by impact.</p>
                    <p>A prioritized action plan with estimated effort and a timeline to readiness.</p>
                  </CardContent>
                </Card>
              </div>
            </PreviewModeWrapper>
          </>
        )}

        {/* Error Message */}
        {analysisError && (
          <Card className="mb-8 border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Analysis Error</p>
                  <p className="text-sm text-muted-foreground mt-1">{analysisError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void analyzeReadiness(creditConfirmationRequired)}
                    className="mt-3"
                  >
                    Try Again
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/dashboard')}
                    className="ml-2 mt-3"
                  >
                    Return to dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Analysis Results */}
        {aiAnalysis && (
          <Card className={cn(
            "border-2",
            aiAnalysis.verdict === 'Ready' ? "border-success/50 bg-success/5" :
            aiAnalysis.verdict === 'Almost Ready' ? "border-warning/50 bg-warning/5" :
            "border-warning/50 bg-warning/5"
          )}>
            <CardHeader>
              <div className="flex items-center gap-3">
                {aiAnalysis.verdict === 'Ready' ? (
                  <CheckCircle2 className="h-6 w-6 text-success" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-warning" />
                )}
                <div>
                  <CardTitle className="text-2xl">
                    {aiAnalysis.verdict === 'Ready' ? "You're Ready" :
                     aiAnalysis.verdict === 'Almost Ready' ? "Almost Ready" :
                     "Not Quite Ready Yet"}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Confidence: {aiAnalysis.confidence}% - Average Score: {aiAnalysis.average_score?.toFixed(1) || averageScore.toFixed(1)} / 10.0
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className={cn(
                "p-4 rounded-lg",
                aiAnalysis.verdict === 'Ready' ? "bg-success/10 border border-success/20" :
                aiAnalysis.verdict === 'Almost Ready' ? "bg-warning/10 border border-warning/20" :
                "bg-warning/10 border border-warning/20"
              )}>
                <p className="text-sm font-medium mb-2">Summary</p>
                <p className="text-sm text-muted-foreground">{aiAnalysis.summary}</p>
              </div>

              {/* Strengths */}
              {aiAnalysis.strengths && aiAnalysis.strengths.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Strengths
                  </h4>
                  <ul className="space-y-2">
                    {aiAnalysis.strengths.map((strength, index) => (
                      <li key={index} className="flex gap-3 text-sm">
                        <span className="text-success mt-1">✓</span>
                        <span className="text-muted-foreground">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Critical Gaps */}
              {aiAnalysis.critical_gaps && aiAnalysis.critical_gaps.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    Critical Gaps
                  </h4>
                  <ul className="space-y-2">
                    {aiAnalysis.critical_gaps.map((gap, index) => (
                      <li key={index} className="flex gap-3 text-sm">
                        <span className="text-warning mt-1">•</span>
                        <span className="text-muted-foreground">{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Prioritized Actions */}
              {aiAnalysis.prioritized_actions && aiAnalysis.prioritized_actions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Prioritized Action Items
                  </h4>
                  <ul className="space-y-3">
                    {aiAnalysis.prioritized_actions.map((action, index) => (
                      <li key={index} className="flex gap-3 text-sm">
                        <Badge
                          variant={action.priority === 'High' ? 'destructive' : action.priority === 'Medium' ? 'default' : 'secondary'}
                          className="h-fit"
                        >
                          {action.priority}
                        </Badge>
                        <div className="flex-1 space-y-1">
                          <div>
                            <span className="text-foreground font-medium">{action.action}</span>
                            {action.estimated_time && (
                              <span className="text-xs text-muted-foreground ml-2">({action.estimated_time})</span>
                            )}
                          </div>
                          {action.leverage_strength && (
                            <div className="text-xs text-info dark:text-info flex items-start gap-1">
                              <span>💡</span>
                              <span>{action.leverage_strength}</span>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Strength Leverage Opportunities - NEW! */}
              {aiAnalysis.strength_leverage_opportunities && aiAnalysis.strength_leverage_opportunities.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <span className="text-xl">💡</span>
                    Leverage Your Strengths
                  </h4>
                  <div className="bg-info-subtle dark:bg-info/20 border border-info dark:border-info rounded-lg p-4">
                    <ul className="space-y-2">
                      {aiAnalysis.strength_leverage_opportunities.map((opportunity, index) => (
                        <li key={index} className="flex gap-3 text-sm">
                          <span className="text-info dark:text-info mt-1">→</span>
                          <span className="text-foreground">{opportunity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Comparable Company Example - NEW! */}
              {aiAnalysis.comparable_company && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <span className="text-xl">🏢</span>
                    Success Story: Company Like You
                  </h4>
                  <div className="bg-success-subtle dark:bg-success/20 border border-success dark:border-success rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-success dark:text-success">{aiAnalysis.comparable_company.company}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Why similar:</span> {aiAnalysis.comparable_company.similar_because}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">What they did:</span> {aiAnalysis.comparable_company.what_they_did}
                    </p>
                    <p className="text-sm font-medium text-success dark:text-success">
                      {aiAnalysis.comparable_company.outcome}
                    </p>
                  </div>
                </div>
              )}

              {/* Timeline & Risk Assessment */}
              {(aiAnalysis.timeline_to_readiness || aiAnalysis.risk_assessment) && (
                <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                  {aiAnalysis.timeline_to_readiness && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Timeline to Readiness</h4>
                      <p className="text-sm text-muted-foreground">{aiAnalysis.timeline_to_readiness}</p>
                    </div>
                  )}
                  {aiAnalysis.risk_assessment && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Risk Assessment</h4>
                      <p className="text-sm text-muted-foreground">{aiAnalysis.risk_assessment}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

      {/* Find My Investors Button - appears after analysis */}
      {aiAnalysis && (
        <div className="mt-6 text-center">
          <Button
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => {
              navigate('/vc-search');
            }}
          >
            <Users className="mr-2 h-5 w-5" />
            Find My Investors
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      </>
      )}

    </div>
  );
};

export default FundraisingReadinessToolkitAll;
