import React, { useState, useMemo } from "react";
import { Rocket, Target, Users, DollarSign, CheckCircle2, AlertCircle, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface Criterion {
  id: string;
  title: string;
  description: string;
  helpText: string;
  icon: React.ReactNode;
  recommendations: {
    [key: number]: string; // score -> recommendation
  };
}

const criteria: Criterion[] = [
  {
    id: "mvp",
    title: "MVP Complete",
    description: "Do you have a working version of your product that solves a real problem?",
    helpText: "This doesn't need to be perfect - just something you can show to customers",
    icon: <Rocket className="h-5 w-5" />,
    recommendations: {
      1: "Start by building a simple prototype that solves one core problem. You don't need all features - just enough to show value.",
      2: "Focus on getting your MVP to a point where you can demonstrate it to potential customers. Polish can come later.",
      3: "Great progress! Consider adding one or two key features that make your MVP more compelling to investors.",
      4: "You're almost there! Make sure your MVP is stable and can handle real user testing before fundraising.",
      5: "Excellent! Your MVP is ready. Make sure you have metrics and user feedback to share with investors."
    }
  },
  {
    id: "feedback",
    title: "Initial Customer Feedback",
    description: "Have you talked to potential customers and received feedback?",
    helpText: "Even 5-10 conversations with people who might use your product counts!",
    icon: <Target className="h-5 w-5" />,
    recommendations: {
      1: "Start talking to potential customers today! Reach out to 5-10 people who might use your product and ask for their honest feedback.",
      2: "You've started the conversation - keep going! Aim for at least 10-15 customer interviews to validate your idea.",
      3: "Good work! You're getting feedback. Now focus on addressing the most common concerns or suggestions you're hearing.",
      4: "You're doing great! Make sure you've documented this feedback and can show investors how you've improved based on it.",
      5: "Perfect! You have solid customer validation. Prepare a summary of key feedback and how you've addressed it for investors."
    }
  },
  {
    id: "team",
    title: "Team in Place",
    description: "Do you have the right people to build and grow your startup?",
    helpText: "This could be just you, or a co-founder, or a small team - what matters is having the skills needed",
    icon: <Users className="h-5 w-5" />,
    recommendations: {
      1: "Identify what skills are missing. Consider finding a co-founder or advisor who complements your strengths.",
      2: "You're building your team! Focus on finding people who share your vision and bring essential skills you don't have.",
      3: "You have a solid foundation. Consider adding advisors or part-time help in areas where you need support.",
      4: "Great team setup! Make sure everyone is aligned on the vision and ready to commit to the fundraising process.",
      5: "Excellent! Your team is ready. Ensure everyone understands their role in the fundraising process and can speak to investors."
    }
  },
  {
    id: "runway",
    title: "Runway Secured",
    description: "Do you have enough money to operate while fundraising?",
    helpText: "Runway = how many months you can operate without new funding. 3-6 months is a good minimum",
    icon: <DollarSign className="h-5 w-5" />,
    recommendations: {
      1: "Fundraising takes time (often 3-6 months). Start cutting costs and securing personal savings or a small loan to give yourself at least 3 months of runway.",
      2: "You have some runway, but it's tight. Focus on extending it to at least 3-4 months before starting serious fundraising conversations.",
      3: "You have a decent runway. Consider ways to extend it further (reduce costs, find additional income) to give yourself more time.",
      4: "Good runway! This gives you time to be selective with investors and not rush into bad deals. Maintain this buffer.",
      5: "Perfect! You have enough runway to fundraise without pressure. This puts you in a strong negotiating position with investors."
    }
  }
];

const scoreLabels: { [key: number]: string } = {
  1: "Not Started",
  2: "Just Beginning",
  3: "In Progress",
  4: "Almost There",
  5: "Complete"
};

const FundraisingReadinessToolkit = () => {
  const [scores, setScores] = useState<{ [key: string]: number }>({});
  const [expandedHelp, setExpandedHelp] = useState<{ [key: string]: boolean }>({});

  const averageScore = useMemo(() => {
    const scoreValues = Object.values(scores);
    if (scoreValues.length === 0) return 0;
    const sum = scoreValues.reduce((acc, val) => acc + val, 0);
    return sum / scoreValues.length;
  }, [scores]);

  const isReady = averageScore >= 3.5;
  const allScored = Object.keys(scores).length === criteria.length;

  const handleScoreChange = (criterionId: string, score: number) => {
    setScores(prev => ({
      ...prev,
      [criterionId]: score
    }));
  };

  const toggleHelp = (criterionId: string) => {
    setExpandedHelp(prev => ({
      ...prev,
      [criterionId]: !prev[criterionId]
    }));
  };

  const getRecommendations = () => {
    const recommendations: string[] = [];
    criteria.forEach(criterion => {
      const score = scores[criterion.id];
      if (score && score < 3) {
        recommendations.push(criterion.recommendations[score] || criterion.recommendations[1]);
      }
    });
    return recommendations;
  };

  const recommendations = getRecommendations();

  return (
    <section className="py-20 px-4 relative overflow-hidden" data-section="fundraising-readiness">
      {/* Background styling similar to FundingOpportunitiesSection */}
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
            Assess your readiness for pre-seed fundraising. Answer honestly - this helps you identify what to work on next!
          </p>
        </div>

        {/* Main Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">How ready are you?</CardTitle>
            <CardDescription>
              Rate each area below from 1 (Not Started) to 5 (Complete). Be honest with yourself!
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

                  {/* Score Buttons */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <Button
                          key={score}
                          type="button"
                          variant={currentScore === score ? "default" : "outline"}
                          size="lg"
                          onClick={() => handleScoreChange(criterion.id, score)}
                          className={cn(
                            "min-w-[100px] flex-1 md:flex-none",
                            currentScore === score && "ring-2 ring-primary ring-offset-2"
                          )}
                        >
                          <span className="text-lg mr-2">{score}</span>
                          <span className="text-xs">{scoreLabels[score]}</span>
                        </Button>
                      ))}
                    </div>
                    
                    {/* Progress Bar */}
                    {currentScore > 0 && (
                      <div className="space-y-1">
                        <Progress value={(currentScore / 5) * 100} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {currentScore === 5 ? "🎉 Perfect!" : currentScore >= 3 ? "👍 Good progress!" : "💪 Keep working on this!"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Results Card */}
        {allScored && (
          <Card className={cn(
            "border-2",
            isReady ? "border-green-500/50 bg-green-500/5" : "border-orange-500/50 bg-orange-500/5"
          )}>
            <CardHeader>
              <div className="flex items-center gap-3">
                {isReady ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-orange-500" />
                )}
                <div>
                  <CardTitle className="text-2xl">
                    {isReady ? "You're Ready! 🎉" : "Not Quite Ready Yet"}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Your average score: <strong>{averageScore.toFixed(1)}</strong> / 5.0
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Overall Readiness</span>
                  <span className="text-muted-foreground">
                    {Math.round((averageScore / 5) * 100)}%
                  </span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      isReady ? "bg-green-500" : "bg-orange-500"
                    )}
                    style={{ width: `${(averageScore / 5) * 100}%` }}
                  />
                </div>
              </div>

              {/* Status Message */}
              <div className={cn(
                "p-4 rounded-lg",
                isReady ? "bg-green-500/10 border border-green-500/20" : "bg-orange-500/10 border border-orange-500/20"
              )}>
                <p className="text-sm font-medium mb-2">
                  {isReady ? (
                    <>
                      <strong>Congratulations!</strong> You're in a good position to start fundraising. 
                      You have the key foundations in place. Now focus on preparing your pitch deck and 
                      identifying the right investors for your startup.
                    </>
                  ) : (
                    <>
                      <strong>You're on the right track!</strong> Fundraising is a journey, and you're 
                      making progress. Focus on the areas below to strengthen your position before 
                      approaching investors.
                    </>
                  )}
                </p>
              </div>

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Focus Areas to Improve
                  </h4>
                  <ul className="space-y-2">
                    {recommendations.map((rec, index) => (
                      <li key={index} className="flex gap-3 text-sm">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-muted-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next Steps */}
              <div className="pt-4 border-t">
                <h4 className="font-semibold text-sm mb-2">Next Steps</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {isReady ? (
                    <>
                      <li className="flex gap-2">
                        <span>✓</span>
                        <span>Prepare a compelling pitch deck highlighting your MVP and customer feedback</span>
                      </li>
                      <li className="flex gap-2">
                        <span>✓</span>
                        <span>Research and identify investors who fund companies at your stage</span>
                      </li>
                      <li className="flex gap-2">
                        <span>✓</span>
                        <span>Practice your pitch with advisors or other founders</span>
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex gap-2">
                        <span>→</span>
                        <span>Work on the focus areas above - even small improvements make a difference</span>
                      </li>
                      <li className="flex gap-2">
                        <span>→</span>
                        <span>Reassess in a few weeks as you make progress</span>
                      </li>
                      <li className="flex gap-2">
                        <span>→</span>
                        <span>Consider finding a mentor or advisor to help guide you</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
};

export default FundraisingReadinessToolkit;
