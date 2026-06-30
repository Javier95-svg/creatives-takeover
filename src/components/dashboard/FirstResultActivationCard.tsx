import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { trackActivationFunnelEvent } from '@/lib/analytics';
import { buildActivationSummary, trackRetentionEvent, type ActivationIntent } from '@/lib/retentionSystem';

interface FirstResultActivationCardProps {
  activationIntent: ActivationIntent;
  userId?: string | null;
  daysSinceSignup?: number | null;
  plan?: string | null;
}

export function FirstResultActivationCard({
  activationIntent,
  userId,
  daysSinceSignup,
  plan,
}: FirstResultActivationCardProps) {
  const navigate = useNavigate();
  const summary = buildActivationSummary(activationIntent);

  const handleContinue = () => {
    trackActivationFunnelEvent('first_action_opened', {
      user_id: userId ?? null,
      activation_intent: activationIntent,
      selected_path: summary.actionUrl,
      source: 'first_run_dashboard',
      plan: plan ?? null,
      days_since_signup: daysSinceSignup ?? null,
    });
    if (userId) {
      void trackRetentionEvent('activation_first_action_opened', {
        user_id: userId,
        activation_intent: activationIntent,
        selected_path: summary.actionUrl,
        source: 'first_run_dashboard',
        plan: plan ?? null,
        days_since_signup: daysSinceSignup ?? null,
      });
    }
    navigate(summary.actionUrl);
  };

  return (
    <Card className="overflow-hidden border-primary/25 bg-card/95 shadow-sm">
      <CardContent className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            First result
          </div>
          <div className="space-y-2">
            <h1 className="font-space-grotesk text-2xl font-semibold tracking-tight md:text-3xl">
              Finish your first result
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              {summary.description}
            </p>
          </div>
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            {['Open the tool', 'Create one useful artifact', 'Return here with your next step ready'].map((step) => (
              <div key={step} className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
        <Button type="button" size="lg" onClick={handleContinue} className="w-full gap-2 md:w-auto">
          {summary.title}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
