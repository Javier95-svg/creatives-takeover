import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, CheckCircle2, AlertTriangle, ArrowRight, TrendingUp, Shield, Zap, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionPlanItem {
  priority: 'High' | 'Medium' | 'Low';
  action: string;
  description: string;
  channel: string;
}

interface NicheScore {
  overall: number;
  verdict: 'Highly Viable' | 'Promising' | 'Needs Refinement';
  subScores: {
    marketSize: number;
    painIntensity: number;
    accessibility: number;
    competitiveGap: number;
  };
  reasoning: string;
}

interface ICPNicheScoreProps {
  score: NicheScore;
  actionPlan?: ActionPlanItem[];
  nextGoals?: string;
}

const ICPNicheScore: React.FC<ICPNicheScoreProps> = ({ score, actionPlan = [], nextGoals }) => {
  // Animated counter: ticks from 0 → score.overall
  const [displayScore, setDisplayScore] = useState(0);
  const [barsVisible, setBarsVisible] = useState(false);

  useEffect(() => {
    setDisplayScore(0);
    setBarsVisible(false);
    let current = 0;
    const target = score.overall;
    const steps = 40;
    const increment = target / steps;
    const interval = setInterval(() => {
      current = Math.min(current + increment, target);
      setDisplayScore(Math.round(current));
      if (current >= target) {
        clearInterval(interval);
        setBarsVisible(true);
      }
    }, 25);
    return () => clearInterval(interval);
  }, [score.overall]);

  const scoreColor =
    score.overall >= 70 ? 'text-success' :
    score.overall >= 50 ? 'text-warning' :
    'text-destructive';

  const scoreBgColor =
    score.overall >= 70 ? 'bg-success' :
    score.overall >= 50 ? 'bg-warning' :
    'bg-destructive';

  const verdictBadgeColor =
    score.verdict === 'Highly Viable' ? 'bg-success-subtle text-success dark:bg-success/30 dark:text-success' :
    score.verdict === 'Promising' ? 'bg-warning-subtle text-warning dark:bg-warning/30 dark:text-warning' :
    'bg-destructive-subtle text-destructive dark:bg-destructive/30 dark:text-destructive';

  const subScoreItems = [
    { label: 'Market Size', value: score.subScores.marketSize, description: 'Size and growth potential of the niche', icon: TrendingUp },
    { label: 'Pain Intensity', value: score.subScores.painIntensity, description: 'How urgently this niche needs a solution', icon: Zap },
    { label: 'Accessibility', value: score.subScores.accessibility, description: 'How easy it is to reach and acquire these customers', icon: Target },
    { label: 'Competitive Gap', value: score.subScores.competitiveGap, description: 'Room for differentiation vs existing solutions', icon: Shield },
  ];

  const priorityColors: Record<string, string> = {
    High: 'bg-destructive-subtle text-destructive dark:bg-destructive/30 dark:text-destructive',
    Medium: 'bg-warning-subtle text-warning dark:bg-warning/30 dark:text-warning',
    Low: 'bg-info-subtle text-info dark:bg-info/30 dark:text-info',
  };

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Niche Viability Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className={cn(
                "w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold transition-all duration-300",
                scoreBgColor,
                "text-white"
              )}>
                {displayScore}
              </div>
            </div>
            <Badge className={cn("text-sm px-4 py-1", verdictBadgeColor)}>
              {score.verdict}
            </Badge>
            <div className="text-center max-w-2xl">
              <p className="text-sm text-muted-foreground">{score.reasoning}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub-Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subScoreItems.map((item, index) => {
            const Icon = item.icon;
            const itemColor =
              item.value >= 70 ? 'text-success' :
              item.value >= 50 ? 'text-warning' :
              'text-destructive';

            return (
              <div
                key={index}
                className="space-y-2 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
              >
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{item.label}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                  </div>
                  <span className={cn("font-bold text-lg", itemColor)}>
                    {item.value}/100
                  </span>
                </div>
                <Progress
                  value={barsVisible ? item.value : 0}
                  className="h-2 transition-all duration-700"
                  style={{ transitionDelay: `${index * 120}ms` }}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Verdict Summary */}
      <Card className={cn(
        "border-2",
        score.overall >= 70 ? "border-success dark:border-success bg-success-subtle dark:bg-success/10" :
        score.overall >= 50 ? "border-warning dark:border-warning bg-warning-subtle dark:bg-warning/10" :
        "border-destructive dark:border-destructive bg-destructive-subtle dark:bg-destructive/10"
      )}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            {score.overall >= 70 ? (
              <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
            ) : score.overall >= 50 ? (
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
            )}
            <div>
              <p className="font-medium mb-1">
                {score.overall >= 70
                  ? "This niche is highly viable for your product."
                  : score.overall >= 50
                  ? "This niche shows promise but needs strategic refinement."
                  : "This niche needs significant refinement before pursuing."}
              </p>
              <p className="text-sm text-muted-foreground">
                {score.overall >= 70
                  ? "Strong pain points, reachable audience, and competitive gaps create a solid opportunity. Focus on execution and market entry."
                  : score.overall >= 50
                  ? "There are opportunities here, but address the weaker areas identified in your sub-scores before going all-in."
                  : "Consider pivoting your target niche or refining your value proposition to better match market needs."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Goals */}
      {nextGoals && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Flag className="w-4 h-4 text-primary" />
              Your Next Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{nextGoals}</p>
          </CardContent>
        </Card>
      )}

      {/* Action Plan */}
      {actionPlan.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Go-to-Market Action Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {actionPlan.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <Badge className={cn("text-xs", priorityColors[step.priority])}>
                      {step.priority}
                    </Badge>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-sm">{step.action}</p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                    {step.channel && (
                      <p className="text-xs text-muted-foreground italic">Channel: {step.channel}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ICPNicheScore;
