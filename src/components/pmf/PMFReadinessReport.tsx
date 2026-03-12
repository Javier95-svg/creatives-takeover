import React from 'react';
import { Save, Download, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import PMFScoreCircle from './PMFScoreCircle';
import PMFDimensionBars from './PMFDimensionBars';
import PMFRecommendations from './PMFRecommendations';
import type { PMFReadinessAnalysis } from '@/hooks/usePMFLab';

interface PMFReadinessReportProps {
  analysis: PMFReadinessAnalysis;
  isSaving: boolean;
  isExporting: boolean;
  onSave: () => void;
  onExport: () => void;
  onReanalyze: () => void;
}

const PMFReadinessReport: React.FC<PMFReadinessReportProps> = ({
  analysis,
  isSaving,
  isExporting,
  onSave,
  onExport,
  onReanalyze,
}) => {
  const isReady = analysis.verdict === 'ready';

  const thresholdBanner = isReady
    ? {
        bg: 'bg-green-500/10 border-green-500/30',
        icon: CheckCircle2,
        iconColor: 'text-green-600 dark:text-green-400',
        message: "You've crossed the threshold. You have enough evidence to start scoping your MVP.",
      }
    : {
        bg: 'bg-amber-500/10 border-amber-500/30',
        icon: XCircle,
        iconColor: 'text-amber-600 dark:text-amber-400',
        message: `You need a score of 75 to proceed. You're at ${analysis.overallScore}. Here's what's holding you back:`,
      };

  const ThresholdIcon = thresholdBanner.icon;

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* Score + action buttons */}
      <div className="flex flex-col items-center gap-6">
        <PMFScoreCircle
          score={analysis.overallScore}
          verdict={analysis.verdict}
          verdictLabel={analysis.verdictLabel}
        />

        {/* Summary insight */}
        <blockquote className="w-full text-sm text-muted-foreground italic bg-primary/5 border border-primary/15 rounded-lg px-5 py-4 text-center leading-relaxed">
          "{analysis.summaryInsight}"
        </blockquote>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Button onClick={onSave} disabled={isSaving} size="sm">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving…' : 'Save Report'}
          </Button>
          <Button variant="outline" onClick={onExport} disabled={isExporting} size="sm">
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting…' : 'Export PDF'}
          </Button>
          <Button variant="ghost" onClick={onReanalyze} size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Re-analyze
          </Button>
        </div>
      </div>

      {/* Threshold banner */}
      <div className={cn('flex items-start gap-3 rounded-lg border p-4', thresholdBanner.bg)}>
        <ThresholdIcon className={cn('w-5 h-5 shrink-0 mt-0.5', thresholdBanner.iconColor)} />
        <p className="text-sm leading-relaxed">{thresholdBanner.message}</p>
      </div>

      <Separator />

      {/* Dimension bars */}
      <PMFDimensionBars dimensions={analysis.dimensions} />

      <Separator />

      {/* Strengths & Gaps */}
      <div className="grid gap-4 sm:grid-cols-2">
        {analysis.strengths?.length > 0 && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 space-y-2">
            <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">
              What's working
            </p>
            <ul className="space-y-1.5">
              {analysis.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-green-500" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {analysis.gaps?.length > 0 && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 space-y-2">
            <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
              What's missing
            </p>
            <ul className="space-y-1.5">
              {analysis.gaps.map((g, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                  {g}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Separator />

      {/* Recommendations */}
      <PMFRecommendations
        recommendations={analysis.recommendations}
        nextExperiment={analysis.nextExperiment}
      />

      {/* Bottom CTA */}
      <div className="flex flex-wrap gap-3 pt-4 pb-8">
        <Button onClick={onSave} disabled={isSaving} className="flex-1 sm:flex-none px-6">
          {isSaving ? 'Saving…' : isReady ? 'Save Report & Continue to MVP Builder' : 'Save Report'}
        </Button>
        <Button variant="outline" onClick={onExport} disabled={isExporting} className="flex-1 sm:flex-none px-6">
          {isExporting ? 'Exporting…' : 'Export PDF'}
        </Button>
      </div>
    </div>
  );
};

export default PMFReadinessReport;
