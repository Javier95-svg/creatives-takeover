import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { PMFReadinessAnalysis } from '@/hooks/usePMFLab';
import { formatPmfDecision, getPmfConfidence, getPmfDecision, type PmfDecision } from '@/lib/pmfConfidence';
import { getPmfDecisionAction } from '@/lib/pmfDecisionAction';

// The top of the results screen: the verdict, why, what changed since the last
// round, and one next action. The full report stays available below, collapsed.

const DECISION_MEANING: Record<PmfDecision, string> = {
  build: 'The evidence supports building a first version.',
  narrow: 'There is demand, but for a narrower group or problem than you described.',
  pivot: 'The evidence points to a different problem or customer.',
  stop: 'The evidence does not support this idea yet.',
};

interface PMFVerdictSummaryProps {
  analysis: PMFReadinessAnalysis;
  analysisId: string | null;
  validationContextId: string | null;
  icpAnalysisId: string | null;
  pathwayEnabled: boolean;
  isSaving: boolean;
  isExporting: boolean;
  onBackToEvidence: () => void;
  onSave: () => void;
  onExport: () => void;
}

const firstItems = (items: string[] | undefined, count = 3) => (items ?? []).map((item) => item.trim()).filter(Boolean).slice(0, count);

export function PMFVerdictSummary({
  analysis,
  analysisId,
  validationContextId,
  icpAnalysisId,
  pathwayEnabled,
  isSaving,
  isExporting,
  onBackToEvidence,
  onSave,
  onExport,
}: PMFVerdictSummaryProps) {
  const decision = analysis.decision ?? getPmfDecision(analysis.overallScore);
  const confidence = getPmfConfidence(analysis.evidenceSignalCount ?? 0);
  const provisional = analysis.decisionProvisional ?? confidence.grade !== 'decision_grade';
  const action = getPmfDecisionAction({
    analysisId: analysisId ?? 'unsaved',
    decision,
    evidenceGrade: analysis.evidenceGrade ?? confidence.grade,
    nextExperiment: analysis.nextExperiment,
    validationContextId,
    icpAnalysisId,
    pathwayEnabled,
  });
  const supports = firstItems(analysis.buyingSignals?.length ? analysis.buyingSignals : analysis.strengths);
  const holdsBack = firstItems(analysis.commonObjections?.length ? analysis.commonObjections : analysis.gaps);
  const change = analysis.decisionChange;
  const gtmLink = validationContextId ? `/go-to-market?context=${encodeURIComponent(validationContextId)}` : '/go-to-market';

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border/60 bg-card p-5 sm:p-6">
        <p className="text-sm text-muted-foreground">Your verdict</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="font-space-grotesk text-3xl font-semibold text-primary">{formatPmfDecision(decision)}</h2>
          <span className="text-lg text-muted-foreground">{Math.round(analysis.overallScore)} / 100</span>
        </div>
        <p className="mt-2 text-base text-foreground">{DECISION_MEANING[decision]}</p>
        {analysis.summaryInsight ? <p className="mt-2 text-sm text-muted-foreground">{analysis.summaryInsight}</p> : null}
        {provisional && (
          <p className="mt-3 text-sm text-muted-foreground">
            Early read: based on {analysis.evidenceSignalCount ?? 0} of 25 signals. More conversations and survey answers make it firmer.
          </p>
        )}

        {change && (
          <p className="mt-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">
            Last round: {formatPmfDecision(change.previousDecision as PmfDecision)} at {Math.round(change.previousScore)}.
            {' '}{change.scoreDelta === 0 ? 'No change in score.' : `Score ${change.scoreDelta > 0 ? 'up' : 'down'} ${Math.abs(Math.round(change.scoreDelta))}.`}
            {change.explanation ? ` ${change.explanation}` : ''}
          </p>
        )}
      </div>

      {(supports.length > 0 || holdsBack.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">What supports it</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {supports.length ? supports.map((item) => <li key={item}>{item}</li>) : <li>Nothing strong yet.</li>}
            </ul>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">What holds it back</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {holdsBack.length ? holdsBack.map((item) => <li key={item}>{item}</li>) : <li>No repeated objections.</li>}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-primary/30 bg-card p-5 sm:p-6">
        <p className="text-sm font-medium text-primary">Next step</p>
        <h3 className="mt-1 text-xl font-semibold text-foreground">{action.title}</h3>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{action.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button asChild>
            <Link to={action.route}>
              {action.ctaLabel}
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          {(decision === 'build' || decision === 'narrow') && (
            <Link to={gtmLink} className="text-sm font-medium text-primary hover:underline">
              Plan how to reach customers in GTM Strategist
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onBackToEvidence}>Add more evidence</Button>
        <Button type="button" variant="ghost" onClick={onSave} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save report'}</Button>
        <Button type="button" variant="ghost" onClick={onExport} disabled={isExporting}>{isExporting ? 'Exporting…' : 'Download PDF'}</Button>
      </div>
    </div>
  );
}
