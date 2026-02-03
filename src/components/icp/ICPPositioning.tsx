import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Megaphone, Shield, ChevronDown, ChevronUp, Sparkles, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompetitivePosition {
  competitor: string;
  theirPositioning: string;
  yourAdvantage: string;
  differentiationAngle: string;
}

interface MessagingFramework {
  headline: string;
  subheadline: string;
  keyMessages: string[];
  toneOfVoice: string;
}

interface PositioningStrategy {
  positioningStatement: string;
  uniqueValueProposition: string;
  keyDifferentiators: string[];
  messagingFramework: MessagingFramework;
  competitivePositioning: CompetitivePosition[];
  brandPersonality: string[];
}

interface ICPPositioningProps {
  positioning: PositioningStrategy;
}

const ICPPositioning: React.FC<ICPPositioningProps> = ({ positioning }) => {
  const [expandedCompetitor, setExpandedCompetitor] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* Positioning Statement */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-primary" />
            Positioning Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <blockquote className="text-base italic border-l-4 border-primary pl-4 py-2">
            "{positioning.positioningStatement}"
          </blockquote>
        </CardContent>
      </Card>

      {/* Unique Value Proposition */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Unique Value Proposition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{positioning.uniqueValueProposition}</p>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Key Differentiators</p>
            <div className="space-y-2">
              {positioning.keyDifferentiators.map((diff, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/10">
                  <Shield className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{diff}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messaging Framework */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            Messaging Framework
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Headline</p>
              <p className="text-lg font-bold">{positioning.messagingFramework.headline}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Subheadline</p>
              <p className="text-sm text-muted-foreground">{positioning.messagingFramework.subheadline}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Key Messages</p>
            <div className="space-y-2">
              {positioning.messagingFramework.keyMessages.map((msg, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium mt-0.5">
                    {i + 1}
                  </span>
                  <span>{msg}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs font-medium text-muted-foreground mb-1">Tone of Voice</p>
            <p className="text-sm">{positioning.messagingFramework.toneOfVoice}</p>
          </div>
        </CardContent>
      </Card>

      {/* Competitive Positioning */}
      {positioning.competitivePositioning && positioning.competitivePositioning.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Competitive Positioning Map
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {positioning.competitivePositioning.map((comp, index) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedCompetitor(expandedCompetitor === index ? null : index)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{comp.competitor}</span>
                    <Badge variant="outline" className="text-xs">vs You</Badge>
                  </div>
                  {expandedCompetitor === index ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                {expandedCompetitor === index && (
                  <div className="p-3 pt-0 space-y-3 border-t">
                    <div className="grid gap-3 sm:grid-cols-2 mt-3">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Their Positioning</p>
                        <p className="text-sm">{comp.theirPositioning}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/10">
                        <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Your Advantage</p>
                        <p className="text-sm">{comp.yourAdvantage}</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-primary/5">
                      <p className="text-xs font-medium text-primary mb-1">Differentiation Angle</p>
                      <p className="text-sm">{comp.differentiationAngle}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Brand Personality */}
      {positioning.brandPersonality && positioning.brandPersonality.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Recommended Brand Personality
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {positioning.brandPersonality.map((trait, i) => (
                <Badge key={i} variant="secondary" className="text-sm px-3 py-1">
                  {trait}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ICPPositioning;
