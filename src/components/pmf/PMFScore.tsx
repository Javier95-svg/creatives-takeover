import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PMFScoreProps {
  score: {
    overall: number;
    breakdown: {
      problemClarity: number;
      solutionFit: number;
      marketSize: number;
      competitionAnalysis: number;
      validationReadiness: number;
      founderMarketFit: number;
    };
    reasoning: string;
  };
  nextSteps: Array<{
    priority: 'High' | 'Medium' | 'Low';
    action: string;
    description: string;
  }>;
}

const PMFScore: React.FC<PMFScoreProps> = ({ score, nextSteps }) => {
  const scoreColor = 
    score.overall >= 70 ? 'text-green-600' :
    score.overall >= 50 ? 'text-yellow-600' :
    'text-red-600';

  const scoreBgColor = 
    score.overall >= 70 ? 'bg-green-500' :
    score.overall >= 50 ? 'bg-yellow-500' :
    'bg-red-500';

  const getScoreLabel = (value: number) => {
    if (value >= 70) return 'Strong';
    if (value >= 50) return 'Moderate';
    return 'Weak';
  };

  const breakdownItems = [
    { label: 'Problem Clarity', value: score.breakdown.problemClarity, max: 20 },
    { label: 'Solution Fit', value: score.breakdown.solutionFit, max: 20 },
    { label: 'Market Size', value: score.breakdown.marketSize, max: 15 },
    { label: 'Competition Analysis', value: score.breakdown.competitionAnalysis, max: 15 },
    { label: 'Validation Readiness', value: score.breakdown.validationReadiness, max: 15 },
    { label: 'Founder-Market Fit', value: score.breakdown.founderMarketFit, max: 15 },
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
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className={cn(
                "w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold",
                scoreBgColor,
                "text-white"
              )}>
                {score.overall}
              </div>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <Badge className={cn("text-xs", scoreColor)}>
                  {getScoreLabel(score.overall)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">{score.reasoning}</p>
          </div>
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {breakdownItems.map((item, index) => {
            const percentage = (item.value / item.max) * 100;
            const itemColor = 
              percentage >= 70 ? 'text-green-600' :
              percentage >= 50 ? 'text-yellow-600' :
              'text-red-600';

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className={cn("font-bold", itemColor)}>
                    {item.value}/{item.max}
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Next Steps */}
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
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PMFScore;

