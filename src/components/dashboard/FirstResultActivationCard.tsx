import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { DASHBOARD_CARD } from '@/components/dashboard/DashboardPanel';
import { cn } from '@/lib/utils';
import { buildActivationSummary, trackRetentionEvent, type ActivationIntent } from '@/lib/retentionSystem';
import { RecommendationFeedback } from '@/components/dashboard/RecommendationFeedback';
import { recordRecommendationOutcome } from '@/lib/recommendationLearning';

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
    void recordRecommendationOutcome({
      recommendationKey: `first_action:${activationIntent}`,
      surface: 'first_action',
      outcomeType: 'opened',
    }).catch(() => {
      // Navigation remains available while collective learning rolls out.
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
    <div className={cn(DASHBOARD_CARD, 'mb-10 p-6 sm:p-8')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              First result
            </p>
            <p className="mt-2 font-space-grotesk text-xl font-semibold tracking-tight text-foreground">
              Finish your first result
            </p>
            <p className="mt-0.5 max-w-3xl text-sm leading-6 text-muted-foreground">
              {summary.description}
            </p>
            <RecommendationFeedback
              surface="first_action"
              recommendationKey={`first_action:${activationIntent}`}
              metadata={{ activation_intent: activationIntent, plan: plan ?? null }}
            />
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
