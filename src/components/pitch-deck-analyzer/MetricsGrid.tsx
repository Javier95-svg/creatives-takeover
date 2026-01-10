import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { PitchDeckAnalysis, METRIC_DEFINITIONS } from '@/types/pitchDeckAnalyzer';
import { BookOpen, TrendingUp, BarChart3, DollarSign, Users, Target } from 'lucide-react';

interface MetricsGridProps {
  subScores: PitchDeckAnalysis['subScores'];
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  TrendingUp,
  BarChart3,
  DollarSign,
  Users,
  Target
};

export const MetricsGrid: React.FC<MetricsGridProps> = ({ subScores }) => {
  const metricsWithScores = METRIC_DEFINITIONS.map(metric => ({
    ...metric,
    score: subScores[metric.key as keyof typeof subScores]
  }));

  const getScoreColor = (score: number): string => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 55) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number): string => {
    if (score >= 85) return 'bg-green-50 text-green-700 border-green-200';
    if (score >= 70) return 'bg-blue-50 text-blue-700 border-border-blue-200';
    if (score >= 55) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metricsWithScores.map((metric) => {
        const IconComponent = iconMap[metric.icon || 'BarChart3'];

        return (
          <Card key={metric.key} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg bg-primary/10`}>
                      <IconComponent className={`h-4 w-4 ${metric.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm leading-tight">
                        {metric.name}
                      </h3>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 font-bold ${getScoreBadge(metric.score)}`}
                  >
                    {metric.score}
                  </Badge>
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground">
                  {metric.description}
                </p>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <Progress
                    value={metric.score}
                    className="h-2"
                  />
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">
                      Weight: {(metric.weight * 100).toFixed(0)}%
                    </span>
                    <span className={`font-semibold ${getScoreColor(metric.score)}`}>
                      {metric.score >= 85 ? 'Excellent' :
                       metric.score >= 70 ? 'Strong' :
                       metric.score >= 55 ? 'Good' : 'Needs Work'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
