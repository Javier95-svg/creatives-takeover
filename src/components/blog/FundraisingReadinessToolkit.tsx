import React, { useState, useMemo, useEffect } from "react";
import { Rocket, Target, Users, DollarSign, CheckCircle2, AlertCircle, HelpCircle, ChevronDown, ChevronUp, Loader2, LogIn } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Criterion {
  id: string;
  title: string;
  description: string;
  helpText: string;
  icon: React.ReactNode;
}

interface AIAnalysis {
  verdict: 'Ready' | 'Not Ready' | 'Almost Ready';
  confidence: number;
  strengths: string[];
  critical_gaps: string[];
  prioritized_actions: Array<{
    action: string;
    priority: 'High' | 'Medium' | 'Low';
    estimated_time?: string;
  }>;
  timeline_to_readiness?: string;
  risk_assessment?: string;
  summary: string;
  average_score?: number;
  scores?: {
    mvp: number;
    feedback: number;
    team: number;
    runway: number;
  };
}

const criteria: Criterion[] = [
  {
    id: "mvp",
    title: "MVP Complete",
    description: "Do you have a working version of your product that solves a real problem?",
    helpText: "This doesn't need to be perfect - just something you can show to customers",
    icon: <Rocket className="h-5 w-5" />,
  },
  {
    id: "feedback",
    title: "Initial Customer Feedback",
    description: "Have you talked to potential customers and received feedback?",
    helpText: "Even 5-10 conversations with people who might use your product counts!",
    icon: <Target className="h-5 w-5" />,
  },
  {
    id: "team",
    title: "Team in Place",
    description: "Do you have the right people to build and grow your startup?",
    helpText: "This could be just you, or a co-founder, or a small team - what matters is having the skills needed",
    icon: <Users className="h-5 w-5" />,
  },
  {
    id: "runway",
    title: "Runway Secured",
    description: "Do you have enough money to operate while fundraising?",
    helpText: "Runway = how many months you can operate without new funding. 3-6 months is a good minimum",
    icon: <DollarSign className="h-5 w-5" />,
  }
];

const scoreLabels: { [key: number]: string } = {
  0: "Not Started",
  1: "Just Beginning",
  2: "In Progress",
  3: "Almost There",
  4: "Very Close",
  5: "Complete"
};

const FundraisingReadinessToolkit = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [scores, setScores] = useState<{ [key: string]: number }>({
    mvp: 0,
    feedback: 0,
    team: 0,
    runway: 0
  });
  const [expandedHelp, setExpandedHelp] = useState<{ [key: string]: boolean }>({});
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const averageScore = useMemo(() => {
    const scoreValues = Object.values(scores);
    if (scoreValues.length === 0) return 0;
    const sum = scoreValues.reduce((acc, val) => acc + val, 0);
    return sum / scoreValues.length;
  }, [scores]);

  const allScored = useMemo(() => {
    return Object.values(scores).every(score => score > 0);
  }, [scores]);

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
      navigate('/login', { state: { returnTo: '/insighta' } });
      return;
    }

    if (!allScored) {
      toast.error("Please set all scores before analyzing");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const { data, error } = await supabase.functions.invoke('fundraising-readiness-analyzer', {
        body: {
          mvp_score: scores.mvp,
          feedback_score: scores.feedback,
          team_score: scores.team,
          runway_score: scores.runway
        }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAiAnalysis(data as AIAnalysis);
      toast.success("Analysis complete!");
    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze readiness. Please try again.';
      setAnalysisError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <section className="py-20 px-4 relative overflow-hidden" data-section="fundraising-readiness">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        </div>

        <div className="container mx-auto max-w-5xl relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-6">
              <Rocket className="h-6 w-6 text-primary" />
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight pb-2">
                Fundraising Readiness Toolkit
              </h2>
              <span className="text-4xl md:text-5xl">🎯</span>
            </div>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10 w-fit">
                <LogIn className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Sign In Required</CardTitle>
              <CardDescription className="text-base mt-2">
                Sign in to assess your fundraising readiness and get personalized AI-powered insights
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Our AI-powered toolkit will analyze your startup's readiness and provide actionable recommendations.
              </p>
              <Button 
                size="lg" 
                onClick={() => navigate('/login', { state: { returnTo: '/insighta' } })}
                className="mt-4"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Sign In to Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4 relative overflow-hidden" data-section="fundraising-readiness">
      {/* Background styling */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        <div
          className="absolute -top-40 -right-48 w-[55rem] h-[55rem] rounded-full opacity-70 blur-3xl animate-[spin_28s_linear_infinite]"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(56, 189, 248, 0.3), transparent 60%), radial-gradient(circle at 70% 70%, rgba(192, 132, 252, 0.35), transparent 55%)',
            animationDuration: '28s'
          }}
        />
      </div>

      <div className="container mx-auto max-w-5xl relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-6">
            <Rocket className="h-6 w-6 text-primary" />
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight pb-2">
              Fundraising Readiness Toolkit
            </h2>
            <span className="text-4xl md:text-5xl">🎯</span>
          </div>
          <p className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto">
            Assess your readiness for pre-seed fundraising. Move the sliders to rate each area, then get AI-powered insights!
          </p>
        </div>

        {/* Main Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">How ready are you?</CardTitle>
            <CardDescription>
              Move each slider from 0 (Not Started) to 5 (Complete). Be honest with yourself!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {criteria.map((criterion) => {
              const currentScore = scores[criterion.id] || 0;
              const isHelpExpanded = expandedHelp[criterion.id];

              return (
                <div key={criterion.id} className="space-y-4">
                  {/* Criterion Header */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary mt-1">
                      {criterion.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold">{criterion.title}</h3>
                        {currentScore > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {scoreLabels[currentScore]}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {criterion.description}
                      </p>
                      
                      {/* Help Text */}
                      <Collapsible open={isHelpExpanded} onOpenChange={() => toggleHelp(criterion.id)}>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <HelpCircle className="h-3 w-3 mr-1" />
                            {isHelpExpanded ? "Hide help" : "What does this mean?"}
                            {isHelpExpanded ? (
                              <ChevronUp className="h-3 w-3 ml-1" />
                            ) : (
                              <ChevronDown className="h-3 w-3 ml-1" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="text-xs text-muted-foreground mt-1 pl-4 border-l-2 border-primary/20">
                          {criterion.helpText}
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </div>

                  {/* Slider */}
                  <div className="space-y-3 pl-12">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Score: {currentScore} / 5</span>
                      <span className="text-xs text-muted-foreground">{scoreLabels[currentScore]}</span>
                    </div>
                    <Slider
                      value={[currentScore]}
                      onValueChange={(value) => handleScoreChange(criterion.id, value)}
                      min={0}
                      max={5}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0</span>
                      <span>1</span>
                      <span>2</span>
                      <span>3</span>
                      <span>4</span>
                      <span>5</span>
                    </div>
                    
                    {/* Progress Bar */}
                    {currentScore > 0 && (
                      <div className="space-y-1">
                        <Progress value={(currentScore / 5) * 100} className="h-2" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Analyze Button */}
        {allScored && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className="text-3xl font-bold">{averageScore.toFixed(1)} / 5.0</p>
                </div>
                <Button
                  size="lg"
                  onClick={analyzeReadiness}
                  disabled={isAnalyzing}
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
                    Confidence: {aiAnalysis.confidence}% • Average Score: {aiAnalysis.average_score?.toFixed(1) || averageScore.toFixed(1)} / 5.0
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
                        <div className="flex-1">
                          <span className="text-foreground">{action.action}</span>
                          {action.estimated_time && (
                            <span className="text-xs text-muted-foreground ml-2">({action.estimated_time})</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
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
      </div>
    </section>
  );
};

export default FundraisingReadinessToolkit;
