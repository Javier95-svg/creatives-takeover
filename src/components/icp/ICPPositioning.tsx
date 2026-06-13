import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Shield, Sparkles, Target } from 'lucide-react';
import { ICPAnalysis } from './types';

interface ICPPositioningProps {
  positioning: ICPAnalysis['positioning'];
}

const ICPPositioning: React.FC<ICPPositioningProps> = ({ positioning }) => {
  const differentiators = positioning.differentiators.length > 0 ? positioning.differentiators : ['No differentiators were generated yet.'];
  const messagePillars = positioning.messagePillars.length > 0 ? positioning.messagePillars : ['No message pillars were generated yet.'];
  const proofPoints = positioning.proofPoints.length > 0 ? positioning.proofPoints : ['No proof points were generated yet.'];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-4xl border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.12),transparent_42%),rgba(14,165,233,0.05)] shadow-[0_20px_60px_-36px_rgba(14,165,233,0.42)]">
        <CardHeader className="space-y-5 pb-0">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-info/20 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-info dark:bg-slate-950/60 dark:text-info">
            <Megaphone className="h-3.5 w-3.5" />
            Positioning system
          </div>
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Target className="h-5 w-5 text-primary" />
            One-Line Positioning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <p className="text-2xl font-semibold leading-tight sm:text-3xl">{positioning.oneLiner}</p>
          <blockquote className="rounded-2.5xl border border-border/60 bg-background/80 px-5 py-4 text-sm italic leading-relaxed text-muted-foreground">
            {positioning.positioningStatement}
          </blockquote>
        </CardContent>
      </Card>

      <Card className="rounded-4xl border border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Value Proposition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{positioning.valueProposition}</p>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Differentiators</p>
            <div className="space-y-2">
              {differentiators.map((item, index) => (
                <div key={index} className="flex items-start gap-3 rounded-2.5xl border border-success/60 bg-success-subtle p-4 dark:border-success/40 dark:bg-success/10">
                  <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-4xl border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4 text-primary" />
              Message Pillars
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {messagePillars.map((pillar, index) => (
              <div key={index} className="flex items-start gap-3 rounded-2.5xl border border-border/50 bg-background/70 px-4 py-3 text-sm">
                <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {index + 1}
                </span>
                <span>{pillar}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-4xl border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Proof To Back The Claim</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {proofPoints.map((point, index) => (
                <Badge key={index} variant="outline" className="rounded-full border-border/60 bg-background/80 px-3 py-1 text-xs">
                  {point}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {positioning.objections.length > 0 && (
        <Card className="rounded-4xl border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Likely Objections To Handle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {positioning.objections.map((item, index) => (
              <div key={index} className="rounded-2.5xl border border-border/60 bg-background/80 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Objection</p>
                <p className="mb-3 text-sm">{item.objection}</p>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Response</p>
                <p className="text-sm text-muted-foreground">{item.response}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ICPPositioning;
