import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PITCH_DECK_FRAMEWORKS } from '@/data/pitchDeckFrameworks';
import { ChevronDown, ChevronUp, TrendingUp, Lightbulb, Sparkles } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp,
  Lightbulb,
  Sparkles
};

export const FrameworkSection: React.FC = () => {
  const [expandedFramework, setExpandedFramework] = useState<string | null>(null);

  const toggleFramework = (id: string) => {
    setExpandedFramework(expandedFramework === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {PITCH_DECK_FRAMEWORKS.map(framework => {
        const IconComponent = iconMap[framework.icon] || TrendingUp;
        const isExpanded = expandedFramework === framework.id;

        return (
          <Card key={framework.id} className="overflow-hidden">
            <CardHeader
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleFramework(framework.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-3 rounded-lg bg-primary/10 shrink-0">
                    <IconComponent className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{framework.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{framework.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Best for:</span>
                      {framework.bestFor.map((item, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 pb-6">
                <div className="space-y-4">
                  <div className="border-t pt-6">
                    <h4 className="font-semibold mb-4">Framework Steps</h4>
                    {framework.steps.map(step => (
                      <div key={step.stepNumber} className="mb-6 last:mb-0">
                        <div className="flex gap-3">
                          <Badge className="shrink-0 h-6">{step.stepNumber}</Badge>
                          <div className="flex-1">
                            <h5 className="font-semibold mb-1">{step.title}</h5>
                            <p className="text-sm text-muted-foreground mb-3">{step.description}</p>

                            <div className="space-y-2">
                              <p className="text-xs font-medium">Actions:</p>
                              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                {step.actions.map((action, idx) => (
                                  <li key={idx}>{action}</li>
                                ))}
                              </ul>
                            </div>

                            {step.examples && step.examples.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs font-medium text-primary">Examples:</p>
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                  {step.examples.map((example, idx) => (
                                    <li key={idx}>{example}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};
