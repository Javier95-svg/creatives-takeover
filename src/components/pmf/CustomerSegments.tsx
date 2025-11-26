import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerSegment {
  name: string;
  demographics: string;
  psychographics: string;
  painPoints: string[];
  marketSize: string;
  accessibilityScore: number;
}

interface CustomerSegmentsProps {
  segments: CustomerSegment[];
  selectedSegment: string | null;
  onSelectSegment: (segmentName: string) => void;
}

const CustomerSegments: React.FC<CustomerSegmentsProps> = ({
  segments,
  selectedSegment,
  onSelectSegment,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Ideal Customer Segments
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            AI-proposed customer segments based on your business idea
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {segments.map((segment, index) => {
          const isSelected = selectedSegment === segment.name;
          const accessibilityColor = 
            segment.accessibilityScore >= 7 ? 'text-green-600' :
            segment.accessibilityScore >= 4 ? 'text-yellow-600' :
            'text-red-600';

          return (
            <Card
              key={index}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isSelected && "ring-2 ring-primary"
              )}
              onClick={() => onSelectSegment(segment.name)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {segment.name}
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    )}
                  </CardTitle>
                  <Badge variant={isSelected ? "default" : "outline"}>
                    {isSelected ? "Selected" : "Select"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Demographics</p>
                  <p className="text-sm">{segment.demographics}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Psychographics</p>
                  <p className="text-sm">{segment.psychographics}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Key Pain Points</p>
                  <ul className="text-sm space-y-1">
                    {segment.painPoints.map((pain, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-muted-foreground mt-1">•</span>
                        <span>{pain}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Market Size</p>
                    <p className="text-sm font-medium">{segment.marketSize}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Accessibility</p>
                    <div className="flex items-center gap-1">
                      <TrendingUp className={cn("w-4 h-4", accessibilityColor)} />
                      <span className={cn("text-sm font-medium", accessibilityColor)}>
                        {segment.accessibilityScore}/10
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedSegment && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium mb-1">Primary Segment Selected</p>
                <p className="text-sm text-muted-foreground">
                  You've selected <strong>{selectedSegment}</strong> as your primary target segment. 
                  This will be used for surveys, interviews, and validation experiments.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomerSegments;

