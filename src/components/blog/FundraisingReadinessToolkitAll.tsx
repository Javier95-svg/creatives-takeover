import React, { useState, useMemo } from "react";
import { Rocket, Target, Users, DollarSign, CheckCircle2, AlertCircle, HelpCircle, ChevronDown, ChevronUp, Loader2, LogIn, ArrowRight, ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  getVisibleQuestions,
  getRequiredQuestions,
  isQuestionOptional
} from "@/types/fundraisingAssessment";
import { ASSESSMENT_QUESTIONS, INDUSTRY_OPTIONS, BUSINESS_MODEL_OPTIONS, SCORE_LABELS } from "@/data/assessmentQuestions";

// Legacy interface kept for backwards compatibility
interface AIAnalysis extends EnhancedAIAnalysis {}

// Assessment flow steps
type AssessmentStep = 'context-stage' | 'context-business' | 'assessment' | 'results';

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
  };

  const toggleHelp = (criterionId: string) => {
    setExpandedHelp(prev => ({
      ...prev,
      [criterionId]: !prev[criterionId]
    }));
  };

  const analyzeReadiness = async () => {
    if (!isAuthenticated || !user) {
      toast.error("Please sign in to analyze your readiness");
      navigate('/login', { state: { returnTo: '/insighta/test' } });
      return;
    }

    if (!allRequiredScored) {
      toast.error("Please complete all required questions before analyzing");
      return;
    }

    // Check feature access and credits
    const requiredCredits = ensureCredits('FUNDRAISING_READINESS_ANALYSIS', { featureName: 'Insighta Test' });
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
          pitch_summary: context.pitch_summary
        }
      });

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

      setAiAnalysis(data as AIAnalysis);
      setCurrentStep('results'); // Transition to results step

      toast.success(`Analysis complete! (Used ${requiredCredits} credits)`);
      await refreshBalance();
    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze readiness. Please try again.';
      setAnalysisError(errorMessage);
      if (!errorMessage.includes('credits')) {
        toast.error(errorMessage);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div>
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
                          <div className={cn(
                            "relative",
                            !isAuthenticated && "cursor-not-allowed"
                          )}>
                            <Slider
                              value={[questionScore]}
                              onValueChange={(value) => {
                                if (isAuthenticated) {
                                  handleScoreChange(question.id, value);
                                }
                              }}
                              min={0}
                              max={10}
                              step={1}
                              disabled={!isAuthenticated}
                              className={cn(
                                "w-full",
                                !isAuthenticated && "opacity-60"
                              )}
                            />
                            {!isAuthenticated && (
                              <div className="absolute inset-0 cursor-not-allowed z-10" />
                            )}
                          </div>
                        </TooltipTrigger>
                        {!isAuthenticated && (
                          <TooltipContent>
                            <p>Sign in to adjust this score</p>
                          </TooltipContent>
                        )}
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
                      Sign in to get AI-powered analysis of your fundraising readiness
                    </p>
                    <Button
                      size="lg"
                      onClick={() => navigate('/login', { state: { returnTo: '/insighta/test' } })}
                      className="w-full md:w-auto min-w-[200px]"
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In to Get Analysis
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="lg"
                    onClick={analyzeReadiness}
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
                        Get AI Analysis
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
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
                    onClick={analyzeReadiness}
                    className="mt-3"
                  >
                    Try Again
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
            aiAnalysis.verdict === 'Ready' ? "border-green-500/50 bg-green-500/5" :
            aiAnalysis.verdict === 'Almost Ready' ? "border-yellow-500/50 bg-yellow-500/5" :
            "border-orange-500/50 bg-orange-500/5"
          )}>
            <CardHeader>
              <div className="flex items-center gap-3">
                {aiAnalysis.verdict === 'Ready' ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-orange-500" />
                )}
                <div>
                  <CardTitle className="text-2xl">
                    {aiAnalysis.verdict === 'Ready' ? "You're Ready! 🎉" :
                     aiAnalysis.verdict === 'Almost Ready' ? "Almost Ready! ⚡" :
                     "Not Quite Ready Yet"}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Confidence: {aiAnalysis.confidence}% • Average Score: {aiAnalysis.average_score?.toFixed(1) || averageScore.toFixed(1)} / 10.0
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className={cn(
                "p-4 rounded-lg",
                aiAnalysis.verdict === 'Ready' ? "bg-green-500/10 border border-green-500/20" :
                aiAnalysis.verdict === 'Almost Ready' ? "bg-yellow-500/10 border border-yellow-500/20" :
                "bg-orange-500/10 border border-orange-500/20"
              )}>
                <p className="text-sm font-medium mb-2">Summary</p>
                <p className="text-sm text-muted-foreground">{aiAnalysis.summary}</p>
              </div>

              {/* Strengths */}
              {aiAnalysis.strengths && aiAnalysis.strengths.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Strengths
                  </h4>
                  <ul className="space-y-2">
                    {aiAnalysis.strengths.map((strength, index) => (
                      <li key={index} className="flex gap-3 text-sm">
                        <span className="text-green-500 mt-1">✓</span>
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
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    Critical Gaps
                  </h4>
                  <ul className="space-y-2">
                    {aiAnalysis.critical_gaps.map((gap, index) => (
                      <li key={index} className="flex gap-3 text-sm">
                        <span className="text-orange-500 mt-1">•</span>
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
                            <div className="text-xs text-blue-600 dark:text-blue-400 flex items-start gap-1">
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
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <ul className="space-y-2">
                      {aiAnalysis.strength_leverage_opportunities.map((opportunity, index) => (
                        <li key={index} className="flex gap-3 text-sm">
                          <span className="text-blue-600 dark:text-blue-400 mt-1">→</span>
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
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-green-700 dark:text-green-300">{aiAnalysis.comparable_company.company}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Why similar:</span> {aiAnalysis.comparable_company.similar_because}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">What they did:</span> {aiAnalysis.comparable_company.what_they_did}
                    </p>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
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
              navigate('/insighta/vc-search');
            }}
          >
            <Users className="mr-2 h-5 w-5" />
            Find My Investors
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

    </div>
  );
};

export default FundraisingReadinessToolkitAll;
