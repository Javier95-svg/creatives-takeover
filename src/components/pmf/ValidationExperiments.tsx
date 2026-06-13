import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FlaskConical, Clock, DollarSign, Target, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationExperiment {
  name: string;
  type: string;
  hypothesis: string;
  successMetrics: string[];
  estimatedTime: string;
  estimatedCost: string;
  priority: 'High' | 'Medium' | 'Low';
}

interface ValidationExperimentsProps {
  experiments?: ValidationExperiment[];
}

const ValidationExperiments: React.FC<ValidationExperimentsProps> = ({ experiments = [] }) => {
  const priorityColors = {
    High: 'bg-destructive-subtle text-destructive border-destructive/30',
    Medium: 'bg-warning-subtle text-warning border-warning/30',
    Low: 'bg-info-subtle text-info border-info/30',
  };

  const typeIcons: Record<string, React.ReactNode> = {
    'MVP test': <Target className="w-4 h-4" />,
    'Landing page': <FlaskConical className="w-4 h-4" />,
    'Smoke test': <FlaskConical className="w-4 h-4" />,
    'A/B test': <FlaskConical className="w-4 h-4" />,
    'Pilot program': <Target className="w-4 h-4" />,
  };

  const sortedExperiments = [...experiments].sort((a, b) => {
    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  if (sortedExperiments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FlaskConical className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Experiments Yet</h3>
          <p className="text-muted-foreground max-w-md">
            We didn't receive experiment data yet. Try re-running the analysis after refining your inputs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <FlaskConical className="w-5 h-5 text-primary" />
          Validation Experiments
        </h3>
        <p className="text-sm text-muted-foreground">
          Prioritized experiments to validate your product-market fit
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sortedExperiments.map((experiment, index) => (
          <Card
            key={index}
            className={cn(
              "border-2 transition-all hover:shadow-md",
              priorityColors[experiment.priority]
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2 mb-2">
                    {typeIcons[experiment.type] || <FlaskConical className="w-4 h-4" />}
                    {experiment.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {experiment.type}
                    </Badge>
                    <Badge className={cn("text-xs", priorityColors[experiment.priority])}>
                      {experiment.priority} Priority
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Hypothesis</p>
                <p className="text-sm">{experiment.hypothesis}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Success Metrics</p>
                <ul className="text-sm space-y-1">
                  {experiment.successMetrics.map((metric, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3 h-3 text-muted-foreground mt-1 flex-shrink-0" />
                      <span>{metric}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-4 pt-2 border-t">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{experiment.estimatedTime}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <DollarSign className="w-3 h-3" />
                  <span>{experiment.estimatedCost}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium mb-1">Validation Strategy</p>
              <p className="text-sm text-muted-foreground">
                Start with High priority experiments to validate core assumptions quickly. 
                Track results and iterate based on what you learn. Focus on experiments that 
                test your riskiest assumptions first.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ValidationExperiments;

