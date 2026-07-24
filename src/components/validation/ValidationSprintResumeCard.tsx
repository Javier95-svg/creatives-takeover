import { ArrowRight, FlaskConical } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useFounderOutcomeSnapshot } from '@/hooks/useFounderOutcomeSnapshot';

const STEP_LABELS = ['Choose the customer', 'Find people', 'Add evidence', 'Make the decision'];

export function ValidationSprintResumeCard() {
  const { snapshot, loading } = useFounderOutcomeSnapshot();
  const sprint = snapshot?.validationSprint;
  if (loading || !sprint || ['completed', 'abandoned'].includes(sprint.status)) return null;

  const currentStep = Math.max(1, Math.min(4, Number(sprint.current_step || 1)));

  return (
    <Card className="mb-6 overflow-hidden border-primary/30 bg-primary/[0.06]">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <FlaskConical className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Validation Sprint · Step {currentStep} of 4
          </p>
          <p className="mt-1 font-semibold text-foreground">{STEP_LABELS[currentStep - 1]}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {sprint.primary_segment || sprint.hypothesis || 'Turn customer evidence into your next decision.'}
          </p>
          <Progress value={currentStep * 25} className="mt-3 h-1.5" />
        </div>
        <Button asChild className="min-h-11 shrink-0">
          <Link to="/validation-sprint">
            Resume sprint <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
