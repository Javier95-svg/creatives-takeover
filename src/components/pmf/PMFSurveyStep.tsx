import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

import { DashboardDisclosure } from '@/components/dashboard/DashboardDisclosure';
import { ToolEmptyState } from '@/components/tool-shell/ToolEmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PMFValidationEvidence } from '@/hooks/usePMFLab';
import type { PMFSurvey, PMFSurveyAggregate } from '@/hooks/usePMFSurvey';

// The Sean Ellis question: "How would you feel if you could no longer use it?"
// Only people who have used the product answer it; people who have only seen
// the idea still leave feedback, shown apart from the 40% figure.

interface PMFSurveyStepProps {
  survey: PMFSurvey | null;
  aggregate: PMFSurveyAggregate;
  shareUrl: string | null;
  evidence: PMFValidationEvidence | null;
  onSaveManualCounts: (tally: { very: number; somewhat: number; not: number }) => Promise<unknown>;
}

export async function copySurveyLink(shareUrl: string | null) {
  if (!shareUrl) return;
  try {
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Survey link copied.');
  } catch {
    toast.error('Could not copy the link. Select it and copy it by hand.');
  }
}

export function PMFSurveyStep({ survey, aggregate, shareUrl, evidence, onSaveManualCounts }: PMFSurveyStepProps) {
  const [manual, setManual] = useState({ very: 0, somewhat: 0, not: 0 });
  useEffect(() => {
    setManual({
      very: evidence?.sean_ellis_very_disappointed ?? 0,
      somewhat: evidence?.sean_ellis_somewhat_disappointed ?? 0,
      not: evidence?.sean_ellis_not_disappointed ?? 0,
    });
  }, [evidence?.sean_ellis_very_disappointed, evidence?.sean_ellis_somewhat_disappointed, evidence?.sean_ellis_not_disappointed]);

  const strong = aggregate.veryPct >= 40;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Ask people who have used it</h2>
        <p className="text-sm text-muted-foreground">
          One question: how would they feel if they could no longer use your product. If 40% or more say very disappointed, that is a strong sign.
        </p>
      </div>

      {!survey ? (
        <ToolEmptyState
          title="No survey yet"
          description="Create it once and share the link. Answers appear here as they come in."
        />
      ) : (
        <div className="space-y-4 rounded-xl border border-border/60 bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input readOnly value={shareUrl ?? ''} aria-label="Survey link" className="font-mono text-xs" />
            <Button type="button" variant="outline" onClick={() => void copySurveyLink(shareUrl)}>
              <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Copy link
            </Button>
          </div>

          {aggregate.total === 0 ? (
            <p className="text-sm text-muted-foreground">No answers yet from people who have used it.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Very disappointed</p>
                <p className="font-space-grotesk text-2xl font-semibold text-foreground">{aggregate.veryPct}%</p>
                <p className="text-xs text-muted-foreground">{strong ? 'Above the 40% line' : 'Below the 40% line'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Answers from users</p>
                <p className="font-space-grotesk text-2xl font-semibold text-foreground">{aggregate.total}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Only saw the idea</p>
                <p className="font-space-grotesk text-2xl font-semibold text-foreground">{aggregate.conceptOnly}</p>
                <p className="text-xs text-muted-foreground">Not counted in the 40%</p>
              </div>
            </div>
          )}

          {aggregate.verbatims.length > 0 && (
            <div className="space-y-2 border-t border-border/60 pt-4">
              <p className="text-sm font-medium text-foreground">What people said</p>
              <ul className="space-y-2">
                {aggregate.verbatims.slice(0, 5).map((item, index) => (
                  <li key={`${item.createdAt}-${index}`} className="text-sm text-muted-foreground">
                    “{item.mainBenefit || item.feedback}”
                    {item.role ? <span className="text-foreground/70">, {item.role}</span> : null}
                    {item.conceptOnly ? <span className="text-foreground/70"> (has not used it)</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <DashboardDisclosure title="Already asked this question elsewhere?" summary="Enter the counts by hand instead of using the hosted survey.">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              ['very', 'Very disappointed'],
              ['somewhat', 'Somewhat disappointed'],
              ['not', 'Not disappointed'],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`pmf-manual-${key}`}>{label}</Label>
                <Input
                  id={`pmf-manual-${key}`}
                  type="number"
                  min={0}
                  value={manual[key] || ''}
                  placeholder="0"
                  onChange={(e) => setManual((current) => ({ ...current, [key]: Math.max(0, Number(e.target.value || 0)) }))}
                />
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={() => void onSaveManualCounts(manual)}>Save counts</Button>
        </div>
      </DashboardDisclosure>
    </div>
  );
}
