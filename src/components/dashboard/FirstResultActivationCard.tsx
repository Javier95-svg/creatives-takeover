import { ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
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
    <div className="mb-6 rounded-2xl border border-primary/25 bg-primary/8 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              First result
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              Finish your first result
            </p>
            <p className="mt-0.5 max-w-3xl text-sm leading-6 text-muted-foreground">
              {summary.description}
            </p>
          </div>
        </div>
        <Button type="button" onClick={handleContinue} className="w-full shrink-0 gap-2 sm:w-auto">
          {summary.title}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
