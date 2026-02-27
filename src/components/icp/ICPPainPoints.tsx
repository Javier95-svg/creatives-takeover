import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Zap, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PainPoint {
  painPoint: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  frequency: string;
  currentSolution: string;
  gapInCurrentSolution: string;
  opportunityScore: number;
}

interface ICPPainPointsProps {
  painPoints: PainPoint[];
}

const severityColors: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
  High: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  Low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
};

const severityBorderColors: Record<string, string> = {
  Critical: 'border-l-red-500',
  High: 'border-l-orange-500',
  Medium: 'border-l-yellow-500',
  Low: 'border-l-blue-500',
};

const opportunityColor = (score: number) => {
  if (score >= 8) return 'text-green-600';
  if (score >= 5) return 'text-yellow-600';
  return 'text-red-600';
};

const ICPPainPoints: React.FC<ICPPainPointsProps> = ({ painPoints }) => {
  if (painPoints.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Pain Points Available</h3>
          <p className="text-muted-foreground max-w-md">
            Pain points data wasn't generated. Try re-running the analysis with more detail about the problem.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...painPoints].sort((a, b) => {
    const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-primary" />
          Niche Pain Points Analysis
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Key pain points your target niche experiences, ranked by severity and opportunity
        </p>
      </div>

      <div className="space-y-4">
        {sorted.map((pain, index) => (
          <Card
            key={index}
            className={cn("border-l-4 hover-lift animate-fade-in-up", severityBorderColors[pain.severity])}
            style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
          >
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">{pain.painPoint}</h4>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge className={cn("text-xs", severityColors[pain.severity])}>
                      {pain.severity} Severity
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Frequency: {pain.frequency}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground mb-1">Opportunity</p>
                  <div className="flex items-center gap-1">
                    <Zap className={cn("w-4 h-4", opportunityColor(pain.opportunityScore))} />
                    <span className={cn("text-lg font-bold", opportunityColor(pain.opportunityScore))}>
                      {pain.opportunityScore}/10
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Current Solution</p>
                  <p className="text-sm">{pain.currentSolution}</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/10">
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-1">
                    Gap in Current Solution
                  </p>
                  <p className="text-sm">{pain.gapInCurrentSolution}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium mb-1">Top Opportunity</p>
              <p className="text-sm text-muted-foreground">
                The highest-opportunity pain point is <strong>"{sorted[0]?.painPoint}"</strong> with
                an opportunity score of {sorted[0]?.opportunityScore}/10. Focus your positioning and
                messaging around solving this pain point first.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ICPPainPoints;
