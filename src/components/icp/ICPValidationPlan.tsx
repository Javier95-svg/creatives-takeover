import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Flag, FlaskConical, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ICPAnalysis } from './types';

interface ICPValidationPlanProps {
  plan: ICPAnalysis['validationPlan'];
}

const verdictStyles: Record<ICPAnalysis['validationPlan']['verdict'], string> = {
  'Strong Wedge': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Worth Testing': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Needs Sharper Focus': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const priorityStyles: Record<'High' | 'Medium' | 'Low', string> = {
  High: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const ICPValidationPlan: React.FC<ICPValidationPlanProps> = ({ plan }) => {
  const scoreItems = [
    { label: 'Pain', value: plan.scoreBreakdown.pain },
    { label: 'Specificity', value: plan.scoreBreakdown.specificity },
    { label: 'Differentiation', value: plan.scoreBreakdown.differentiation },
    { label: 'Reachability', value: plan.scoreBreakdown.reachability },
  ];

  const experiments = plan.experiments.length > 0 ? plan.experiments : [{
    priority: 'Medium' as const,
    hypothesis: 'No validation experiment was generated yet.',
    test: 'Re-run the analysis with a sharper brief.',
    successSignal: 'You get a clearer next validation step.',
    timeToRun: 'Immediate',
  }];
  const milestones = plan.milestones.length > 0 ? plan.milestones : ['No milestones were generated yet.'];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-4xl border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_42%),rgba(16,185,129,0.07)] shadow-[0_20px_60px_-36px_rgba(14,165,233,0.45)]">
        <CardHeader className="space-y-5 pb-0">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-500/20 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:bg-slate-950/60 dark:text-sky-300">
            <FlaskConical className="h-3.5 w-3.5" />
            Validation plan
          </div>
          <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
            <TrendingUp className="w-5 h-5 text-primary" />
            Validation Readiness
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-24 w-24 items-center justify-center rounded-4xl bg-primary text-3xl font-bold text-primary-foreground shadow-sm">
              {plan.overallScore}
            </div>
            <div>
              <Badge className={cn('mb-2 rounded-full px-3 py-1 text-xs font-semibold', verdictStyles[plan.verdict])}>{plan.verdict}</Badge>
              <p className="text-sm font-medium">{plan.immediateGoal}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{plan.reasoning}</p>
          <div className="grid gap-3 md:grid-cols-4">
            {scoreItems.map((item) => (
              <div key={item.label} className="rounded-2.5xl border border-border/60 bg-background/85 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold">{item.value}/100</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(item.value, 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-4xl border border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="w-4 h-4 text-primary" />
            Validation Experiments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {experiments.map((experiment, index) => (
            <div key={index} className="rounded-2.5xl border border-border/60 bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Badge className={cn('rounded-full px-3 py-1 text-xs font-semibold', priorityStyles[experiment.priority])}>{experiment.priority}</Badge>
                <span className="text-xs text-muted-foreground">{experiment.timeToRun}</span>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Hypothesis</p>
                  <p className="text-sm">{experiment.hypothesis}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Test</p>
                  <p className="text-sm">{experiment.test}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Success signal</p>
                  <p className="text-sm">{experiment.successSignal}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-4xl border border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="w-4 h-4 text-primary" />
            Milestones To Hit Next
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {milestones.map((milestone, index) => (
              <li key={index} className="flex items-start gap-3 rounded-2.5xl border border-border/50 bg-background/70 px-4 py-3 text-sm">
                <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                <span>{milestone}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ICPValidationPlan;
