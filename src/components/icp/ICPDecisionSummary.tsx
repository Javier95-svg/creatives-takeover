import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Compass, HelpCircle, ShieldAlert, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ICPAnalysis } from './types';

interface ICPDecisionSummaryProps {
  recommendation: ICPAnalysis['recommendation'];
}

const confidenceStyles: Record<ICPAnalysis['recommendation']['confidence'], string> = {
  High: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Low: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const ICPDecisionSummary: React.FC<ICPDecisionSummaryProps> = ({ recommendation }) => {
  const evidenceSignals = recommendation.evidenceSignals.length > 0 ? recommendation.evidenceSignals : ['No strong evidence signals surfaced yet.'];
  const doNotTargetYet = recommendation.doNotTargetYet.length > 0 ? recommendation.doNotTargetYet : ['No deprioritized segments identified yet.'];
  const openQuestions = recommendation.openQuestions.length > 0 ? recommendation.openQuestions : ['No explicit open questions were generated.'];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-4xl border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_42%),rgba(14,165,233,0.06)] shadow-[0_20px_60px_-36px_rgba(14,165,233,0.55)]">
        <CardHeader className="space-y-5 pb-0">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-500/20 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:bg-slate-950/60 dark:text-sky-300">
            <Compass className="h-3.5 w-3.5" />
            Recommended path
          </div>
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <Target className="h-5 w-5 text-primary" />
            Recommended First ICP
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-2xl font-semibold leading-tight sm:text-3xl">{recommendation.primaryIcp}</p>
              <p className="max-w-3xl text-sm leading-relaxed text-foreground/75">{recommendation.whyThisIcp}</p>
            </div>
            <Badge className={cn('w-fit rounded-full px-3 py-1.5 text-xs font-semibold', confidenceStyles[recommendation.confidence])}>
              {recommendation.confidence} confidence
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2.5xl border border-border/60 bg-background/85 p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Problem to win</p>
              <p className="text-sm">{recommendation.problemToWin}</p>
            </div>
            <div className="rounded-2.5xl border border-border/60 bg-background/85 p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Value wedge</p>
              <p className="text-sm">{recommendation.valueWedge}</p>
            </div>
            <div className="rounded-2.5xl border border-border/60 bg-background/85 p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Decision</p>
              <p className="text-sm">{recommendation.decision}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-4xl border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Compass className="w-4 h-4 text-primary" />
              Why this call makes sense
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-relaxed">{recommendation.decision}</p>
            <div className="rounded-2.5xl border border-border/60 bg-muted/40 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Why this confidence level</p>
              <p className="text-sm text-muted-foreground">{recommendation.confidenceReason}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-4xl border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Evidence Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {evidenceSignals.map((signal, index) => (
                <li key={index} className="flex items-start gap-3 rounded-2.5xl border border-border/50 bg-background/70 px-4 py-3 text-sm">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-4xl border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="w-4 h-4 text-primary" />
              Not Worth Targeting Yet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {doNotTargetYet.map((segment, index) => (
                <li key={index} className="flex items-start gap-3 rounded-2.5xl border border-border/50 bg-background/70 px-4 py-3 text-sm">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                  <span>{segment}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="rounded-4xl border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="w-4 h-4 text-primary" />
              Open Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {openQuestions.map((question, index) => (
                <li key={index} className="flex items-start gap-3 rounded-2.5xl border border-border/50 bg-background/70 px-4 py-3 text-sm">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  <span>{question}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ICPDecisionSummary;
