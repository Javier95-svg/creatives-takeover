import { ClipboardCheck, Gauge, MessageSquareText, Search, Target, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { PMFValidationEvidence } from '@/hooks/usePMFLab';
import type { PMFSurvey, PMFSurveyAggregate } from '@/hooks/usePMFSurvey';

interface PMFEvidenceHubProps {
  evidence: PMFValidationEvidence | null;
  requiredSignals: number;
  survey: PMFSurvey | null;
  surveyAggregate: PMFSurveyAggregate;
  customerDiscoverySignals: number;
  onLogInterviews: () => void;
  onCreateOrReviewSurvey: () => void;
  onFindCustomers: () => void;
  onRunScore: () => void;
}

const statusTone = (ready: boolean) =>
  ready
    ? 'border-success/25 bg-success/10 text-success'
    : 'border-border/60 bg-background/70 text-muted-foreground';

const PMFEvidenceHub = ({
  evidence,
  requiredSignals,
  survey,
  surveyAggregate,
  customerDiscoverySignals,
  onLogInterviews,
  onCreateOrReviewSurvey,
  onFindCustomers,
  onRunScore,
}: PMFEvidenceHubProps) => {
  const savedInterviews = evidence?.interview_notes_count ?? 0;
  const surveyResponses = surveyAggregate.total || evidence?.survey_results_count || 0;
  const totalSignals = savedInterviews + surveyResponses;
  const progress = requiredSignals > 0 ? Math.min(100, Math.round((totalSignals / requiredSignals) * 100)) : 0;
  const checklistCount = evidence?.validation_checklist?.length ?? 0;
  const hasSurvey = Boolean(survey);
  const hasDiscovery = customerDiscoverySignals > 0;

  const cards = [
    {
      label: 'Interview evidence',
      value: `${savedInterviews}/${requiredSignals}`,
      description: savedInterviews > 0 ? 'Saved interview signals' : 'Log the conversations behind the score',
      icon: UsersRound,
      ready: savedInterviews > 0,
    },
    {
      label: 'Sean Ellis test',
      value: surveyResponses > 0 ? `${surveyAggregate.veryPct || 0}%` : hasSurvey ? 'Link ready' : 'Not created',
      description: surveyResponses > 0 ? `${surveyResponses} hosted response${surveyResponses === 1 ? '' : 's'}` : 'Collect the canonical 40% PMF metric',
      icon: Gauge,
      ready: surveyResponses > 0,
    },
    {
      label: 'Checklist',
      value: `${checklistCount}/6`,
      description: checklistCount > 0 ? 'Validation milestones saved' : 'Save proof that the process is real',
      icon: ClipboardCheck,
      ready: checklistCount > 0,
    },
    {
      label: 'Discovery',
      value: hasDiscovery ? `${customerDiscoverySignals}` : 'Not run',
      description: hasDiscovery ? 'Customer discovery signals saved' : 'Find people and communities to validate with',
      icon: Search,
      ready: hasDiscovery,
    },
  ];

  return (
    <section className="rounded-3xl border border-border/60 bg-background/90 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
            Evidence hub
          </Badge>
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Build proof before the score</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              PMF Lab works best when the AI is interpreting interviews, survey responses, and live customer discovery instead of judging an idea in isolation.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 lg:min-w-64">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Evidence signals</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">{totalSignals}/{requiredSignals}</p>
            </div>
            <Target className="h-6 w-6 text-primary" />
          </div>
          <Progress value={progress} className="mt-3 h-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            You can score early, but build decisions stay conservative until the evidence target is reached.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, description, icon: Icon, ready }) => (
          <div key={label} className={cn('rounded-2xl border p-4', statusTone(ready))}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
              <Icon className="h-4 w-4" />
            </div>
            <p className="mt-3 text-xl font-semibold text-foreground">{value}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button size="sm" onClick={onLogInterviews}>
          <MessageSquareText className="mr-2 h-4 w-4" />
          Log interviews
        </Button>
        <Button size="sm" variant={hasSurvey ? 'outline' : 'secondary'} onClick={onCreateOrReviewSurvey}>
          <Gauge className="mr-2 h-4 w-4" />
          {hasSurvey ? 'Review survey' : 'Create Sean Ellis survey'}
        </Button>
        <Button size="sm" variant="outline" onClick={onFindCustomers}>
          <Search className="mr-2 h-4 w-4" />
          Find customers to talk to
        </Button>
        <Button size="sm" variant="ghost" onClick={onRunScore}>
          Run PMF score
        </Button>
      </div>
    </section>
  );
};

export default PMFEvidenceHub;
