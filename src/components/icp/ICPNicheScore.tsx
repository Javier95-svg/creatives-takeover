import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, CheckCircle2, AlertTriangle, ArrowRight, TrendingUp, Shield, Zap } from 'lucide-react';
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
}

const ICPNicheScore: React.FC<ICPNicheScoreProps> = ({ score, actionPlan = [] }) => {
  const scoreColor =
    score.overall >= 70 ? 'text-green-600' :
    score.overall >= 50 ? 'text-yellow-600' :
    'text-red-600';

  const scoreBgColor =
    score.overall >= 70 ? 'bg-green-500' :
    score.overall >= 50 ? 'bg-yellow-500' :
    'bg-red-500';

  const verdictBadgeColor =
    score.verdict === 'Highly Viable' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
    score.verdict === 'Promising' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

  const subScoreItems = [
    { label: 'Market Size', value: score.subScores.marketSize, description: 'Size and growth potential of the niche', icon: TrendingUp },
    { label: 'Pain Intensity', value: score.subScores.painIntensity, description: 'How urgently this niche needs a solution', icon: Zap },
    { label: 'Accessibility', value: score.subScores.accessibility, description: 'How easy it is to reach and acquire these customers', icon: Target },
    { label: 'Competitive Gap', value: score.subScores.competitiveGap, description: 'Room for differentiation vs existing solutions', icon: Shield },
  ];

  const priorityColors: Record<string, string> = {
    High: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    Low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
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
                "w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold",
                scoreBgColor,
                "text-white"
              )}>
                {score.overall}
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
              item.value >= 70 ? 'text-green-600' :
              item.value >= 50 ? 'text-yellow-600' :
              'text-red-600';

            return (
              <div key={index} className="space-y-2">
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
                <Progress value={item.value} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Verdict Summary */}
      <Card className={cn(
        "border-2",
        score.overall >= 70 ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10" :
        score.overall >= 50 ? "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10" :
        "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10"
      )}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            {score.overall >= 70 ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            ) : score.overall >= 50 ? (
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
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
