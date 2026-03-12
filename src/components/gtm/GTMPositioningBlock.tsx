import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Target } from 'lucide-react';
import { GTMAnalysis } from '@/hooks/useGTMStrategist';

interface GTMPositioningBlockProps {
  positioning: GTMAnalysis['positioning'];
}

const GTMPositioningBlock: React.FC<GTMPositioningBlockProps> = ({ positioning }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Positioning</h2>
      </div>

      {/* Positioning statement */}
      <blockquote className="border-l-4 border-primary pl-4 py-2">
        <p className="text-base font-medium italic leading-relaxed">{positioning.positioningStatement}</p>
      </blockquote>

      {/* UVP */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Unique Value Proposition</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-base">{positioning.uniqueValueProposition}</p>
        </CardContent>
      </Card>

      {/* Key differentiators */}
      <div>
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Key Differentiators</p>
        <ul className="space-y-2">
          {positioning.keyDifferentiators.map((d, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default GTMPositioningBlock;
