import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PMFScoreProps {
  score: {
    overall: number;
    verdict: 'Strong Fit' | 'Moderate Fit' | 'Weak Fit';
    subScores: {
      demand: number;
      differentiation: number;
      timing: number;
      executionRisk: number;
    };
    reasoning: string;
  };
  nextSteps?: Array<{
    priority: 'High' | 'Medium' | 'Low';
    action: string;
    description: string;
    estimatedTime?: string;
  }>;
}

const PMFScore: React.FC<PMFScoreProps> = ({ score, nextSteps = [] }) => {
  const verdict = score.verdict || (score.overall >= 70 ? 'Strong Fit' : score.overall >= 50 ? 'Moderate Fit' : 'Weak Fit');
  
  const scoreColor = 
    score.overall >= 70 ? 'text-green-600' :
    score.overall >= 50 ? 'text-yellow-600' :
    'text-red-600';

  const scoreBgColor = 
    score.overall >= 70 ? 'bg-green-500' :
    score.overall >= 50 ? 'bg-yellow-500' :
    'bg-red-500';

  const verdictBadgeColor = 
    verdict === 'Strong Fit' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
    verdict === 'Moderate Fit' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

  const subScoreItems = [
    { label: 'Demand', value: score.subScores?.demand || 0, description: 'Market demand strength for 2026' },
    { label: 'Differentiation', value: score.subScores?.differentiation || 0, description: 'Competitive uniqueness and defensibility' },
    { label: 'Timing', value: score.subScores?.timing || 0, description: 'Market timing and readiness' },
    { label: 'Execution Risk', value: score.subScores?.executionRisk || 0, description: 'Execution feasibility (higher = lower risk)' },
  ];

  const priorityColors = {
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
            Product-Market Fit Score
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
              {verdict}
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
            const percentage = item.value;
            const itemColor = 
              percentage >= 70 ? 'text-green-600' :
              percentage >= 50 ? 'text-yellow-600' :
              'text-red-600';

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{item.label}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                  <span className={cn("font-bold text-lg", itemColor)}>
                    {item.value}/100
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Next Steps */}
      {nextSteps && nextSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Recommended Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {nextSteps.map((step, index) => (
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
                    {step.estimatedTime && (
                      <p className="text-xs text-muted-foreground italic">Estimated time: {step.estimatedTime}</p>
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

export default PMFScore;

