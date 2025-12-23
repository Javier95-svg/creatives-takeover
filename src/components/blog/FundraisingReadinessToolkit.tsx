import React, { useState, useMemo, useEffect } from "react";
import { Rocket, Target, Users, DollarSign, CheckCircle2, AlertCircle, HelpCircle, ChevronDown, ChevronUp, Loader2, LogIn, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCredits } from "@/hooks/useCredits";
import { CreditGate } from "@/components/CreditGate";
import { CREDIT_COSTS } from "@/config/constants";

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
    helpText: `An MVP (Minimum Viable Product) is the simplest version of your product that still solves a real problem for customers. You don't need all features - just enough to demonstrate value.

What counts as an MVP:
• A working prototype you can show to people (even if it's basic)
• Something that solves at least one core problem
• Can be a website, app, physical product, or service
• Doesn't need to be perfect or polished

Examples:
- A simple landing page that collects emails (0-3)
- A basic prototype with core features working (4-6)
- A functional product with real users testing it (7-8)
- A polished product with multiple features and user feedback incorporated (9-10)

Remember: Investors care more about whether you've validated the problem than whether your product is perfect. A working MVP that people actually use is better than a perfect product nobody wants.`,
    icon: <Rocket className="h-5 w-5" />,
  },
  {
    id: "feedback",
    title: "Initial Customer Feedback",
    description: "Have you talked to potential customers and received feedback?",
    helpText: `Customer feedback means you've actually talked to people who might use your product and listened to what they say. This is crucial because it proves people actually want what you're building.

How to get customer feedback:
• Talk to 10-20 potential customers (people who have the problem you're solving)
• Ask open-ended questions: "What's your biggest challenge with [problem]?"
• Show them your product (even if it's just a sketch) and ask what they think
• Listen more than you talk - let them tell you what they need

What good feedback looks like:
- People say they'd use your product (0-3: No conversations yet)
- You've talked to 5-10 people and heard common themes (4-6: Getting started)
- You've talked to 15+ people and made changes based on their feedback (7-8: Strong validation)
- You have documented feedback, testimonials, and people actively using your product (9-10: Excellent validation)

Key questions to ask:
• "Would you pay for this?" (validates willingness to pay)
• "What's missing?" (identifies gaps)
• "Who else has this problem?" (finds your market)

Remember: Even negative feedback is valuable - it tells you what to fix before you waste time building the wrong thing.`,
    icon: <Target className="h-5 w-5" />,
  },
  {
    id: "team",
    title: "Team in Place",
    description: "Do you have the right people to build and grow your startup?",
    helpText: `Having the "right people" means you have the skills needed to build your product and grow your business. This could be just you, a co-founder, or a small team.

Essential skills to consider:
• Technical skills: Can someone build the product? (coding, design, manufacturing, etc.)
• Business skills: Can someone handle sales, marketing, operations?
• Domain expertise: Does someone understand the industry/problem deeply?
• Execution ability: Can the team actually get things done?

Scoring guide:
- 0-3: You're doing it alone and missing key skills (consider finding help)
- 4-6: You have some skills covered, maybe a co-founder or advisor
- 7-8: You have a solid team with complementary skills
- 9-10: You have an experienced team with proven track records

When to find a co-founder:
• You're missing critical skills (e.g., you're technical but can't sell)
• You need someone to share the workload
• You want someone to challenge your ideas and keep you accountable

What "right people" means:
• They believe in your vision
• They have skills you don't have
• They're committed and reliable
• They complement your weaknesses

Remember: A solo founder with advisors can work, but investors often prefer teams because it shows you can work with others and reduces risk.`,
    icon: <Users className="h-5 w-5" />,
  },
  {
    id: "runway",
    title: "Runway Secured",
    description: "Do you have enough money to operate while fundraising?",
    helpText: `Runway is how many months you can operate your startup without new funding. Think of it like fuel in your car - you need enough to get where you're going.

Why runway matters:
Fundraising takes time (often 3-6 months or longer). If you run out of money during fundraising, you'll be desperate and make bad decisions. Having runway gives you the power to say "no" to bad deals and wait for the right investors.

How to calculate your runway:
1. Add up all your monthly expenses (salaries, rent, software, etc.)
2. Divide your available cash by monthly expenses
3. That's your runway in months

Example:
• You have $30,000 saved
• Your monthly expenses are $5,000
• Your runway = 6 months ($30,000 ÷ $5,000)

Scoring guide:
- 0-3: Less than 3 months runway (very risky - start cutting costs or find income)
- 4-6: 3-6 months runway (decent, but try to extend it)
- 7-8: 6-12 months runway (good - gives you time to be selective)
- 9-10: 12+ months runway (excellent - you're in a strong position)

Ways to extend runway:
• Reduce costs (work from home, use free tools, delay hiring)
• Find additional income (consulting, part-time work, small revenue)
• Get a small loan or line of credit
• Ask family/friends for a bridge loan

What's a good minimum?
Most investors want to see at least 3-6 months of runway. This shows you're not desperate and gives you time to close a deal. Less than 3 months is risky because fundraising can take longer than expected.

Remember: Runway isn't just about money - it's about having time to make good decisions. The more runway you have, the better position you're in to negotiate with investors.`,
    icon: <DollarSign className="h-5 w-5" />,
  }
];

const scoreLabels: { [key: number]: string } = {
  0: "Not Started",
  1: "Just Beginning",
  2: "Early Stage",
  3: "Making Progress",
  4: "Getting There",
  5: "Halfway There",
  6: "Strong Progress",
  7: "Almost Ready",
  8: "Very Close",
  9: "Nearly Complete",
  10: "Complete"
};

const FundraisingReadinessToolkit = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { hasCredits, balance } = useCredits();
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
  const [creditGateOpen, setCreditGateOpen] = useState(false);

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

    // Check credits before proceeding
    const requiredCredits = CREDIT_COSTS.FUNDRAISING_READINESS_ANALYSIS;
    if (!hasCredits(requiredCredits)) {
      setCreditGateOpen(true);
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
        // Handle credit errors specifically
        if (error.status === 402 || (error.message && error.message.includes('credits'))) {
          setCreditGateOpen(true);
          throw new Error('Insufficient credits');
        }
        throw error;
      }

      if (data?.error) {
        if (data.error.includes('credits') || data.required) {
          setCreditGateOpen(true);
          throw new Error('Insufficient credits');
        }
        throw new Error(data.error);
      }

      setAiAnalysis(data as AIAnalysis);
      toast.success(`Analysis complete! (Used ${requiredCredits} credits)`);
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
              Insighta Test
            </h2>
          </div>
          <p className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto">
            Take our comprehensive self-assessment to evaluate your startup's fundraising readiness, identify gaps, and understand exactly what you need to improve before approaching investors.
          </p>
        </div>

        {/* Main Card */}
        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl text-primary animate-pulse">How ready are you?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <TooltipProvider>
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
                        <CollapsibleContent className="text-sm text-muted-foreground mt-2 pl-4 border-l-2 border-primary/20 space-y-2 whitespace-pre-line">
                          {criterion.helpText}
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </div>

                  {/* Slider */}
                  <div className="space-y-3 pl-12">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Score: {currentScore} / 10</span>
                      <span className="text-xs text-muted-foreground">{scoreLabels[currentScore]}</span>
                    </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn(
                            "relative",
                            !isAuthenticated && "cursor-not-allowed"
                          )}>
                            <Slider
                              value={[currentScore]}
                              onValueChange={(value) => {
                                if (isAuthenticated) {
                                  handleScoreChange(criterion.id, value);
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
                    {currentScore > 0 && (
                      <div className="space-y-1">
                        <Progress value={(currentScore / 10) * 100} className="h-2" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </TooltipProvider>
          </CardContent>
        </Card>

        {/* Analyze Button */}
        {(allScored || !isAuthenticated) && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                {allScored && (
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
                      onClick={() => navigate('/login', { state: { returnTo: '/insighta' } })}
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
                    disabled={isAnalyzing || !allScored}
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

        {/* Find My Investors Button - appears after analysis */}
        {aiAnalysis && (
          <div className="mt-6 text-center">
            <Button 
              size="lg" 
              className="w-full sm:w-auto"
              onClick={() => {
                // Scroll to investor matching section
                const section = document.getElementById('investor-matching-section');
                if (section) {
                  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  // Store assessment data for the matching tool
                  if (window.localStorage) {
                    localStorage.setItem('ct_assessment_data', JSON.stringify({
                      scores: scores,
                      analysis: aiAnalysis,
                      averageScore: averageScore
                    }));
                  }
                }
              }}
            >
              <Users className="mr-2 h-5 w-5" />
              Find My Investors
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <CreditGate
        isOpen={creditGateOpen}
        onClose={() => setCreditGateOpen(false)}
        requiredCredits={CREDIT_COSTS.FUNDRAISING_READINESS_ANALYSIS}
        feature="Fundraising Readiness Analysis"
      />
    </section>
  );
};

export default FundraisingReadinessToolkit;
