import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { GTMAnalysis } from '@/hooks/useGTMStrategist';

interface GTMMetricsBlockProps {
  metrics: GTMAnalysis['metrics'];
}

const GTMMetricsBlock: React.FC<GTMMetricsBlockProps> = ({ metrics }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Success Metrics</h2>
      </div>
      <p className="text-sm text-muted-foreground">Track these in a simple spreadsheet. Leading indicators tell you if you're on track before revenue arrives.</p>

      <div className="space-y-3">
        {metrics.primary.map((metric, i) => (
          <Card key={i} className="border-border/60">
            <CardContent className="pt-4 pb-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold">{metric.name}</p>
                <p className="text-lg font-bold text-primary shrink-0">{metric.target}</p>
              </div>
              <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground/70">Why:</span> {metric.why}</p>
              <p className="text-xs text-muted-foreground italic"><span className="font-medium not-italic text-foreground/70">How to measure:</span> {metric.howToMeasure}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {metrics.laggingIndicators && metrics.laggingIndicators.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Lagging Indicators (watch later)</p>
          <ul className="space-y-1">
            {metrics.laggingIndicators.map((indicator, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                {indicator}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default GTMMetricsBlock;
