import React, { useState } from 'react';
import { Save, Download, RefreshCw, CheckCircle2, XCircle, ArrowRight, AlertTriangle, MessageSquareWarning, Share2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import PMFScoreCircle from './PMFScoreCircle';
import PMFDimensionBars from './PMFDimensionBars';
import PMFRecommendations from './PMFRecommendations';
import PMFSegmentBreakdown from './PMFSegmentBreakdown';
import { ContextualMentorRecommendations } from '@/components/mentor-marketplace/ContextualMentorRecommendations';
import type { PMFReadinessAnalysis, PMFInterviewLog } from '@/hooks/usePMFLab';
import { Link } from 'react-router-dom';
import { PMF_REQUIRED_SIGNALS } from '@/lib/bizmapStages';
import { BizMapShareDialog } from '@/components/bizmap/BizMapShareDialog';
import { useBizMapSharing } from '@/hooks/useBizMapSharing';
import { createPMFSharedPayload } from '@/lib/bizmapSharing';

interface PMFReadinessReportProps {
  analysis: PMFReadinessAnalysis;
  analysisId: string | null;
  isSaving: boolean;
  isExporting: boolean;
  onSave: () => void;
  onExport: () => void;
  onReanalyze: () => void;
}

const PMFReadinessReport: React.FC<PMFReadinessReportProps> = ({
  analysis,
  analysisId,
  isSaving,
  isExporting,
  onSave,
  onExport,
  onReanalyze,
}) => {
  const [interviewPreviewOpen, setInterviewPreviewOpen] = useState(false);
  const isReady = analysis.verdict === 'ready';
  const meetsThreshold = analysis.overallScore >= 75;
  const decisionTitle = analysis.recommendedActionTitle ?? (meetsThreshold ? 'Move to Building' : 'Iterate Before Building');
  const scoreMeaning =
    analysis.scoreMeaning ??
    (meetsThreshold
      ? 'Your interviews show enough pain, demand, and buying intent to justify moving into Stage IV: Building.'
      : 'The evidence is not strong enough yet. You should improve the offer, landing page, or feature promise before building.');
  const missingFeatures = analysis.missingFeatures?.length ? analysis.missingFeatures : analysis.gaps.slice(0, 3);
  const commonObjections = analysis.commonObjections?.length ? analysis.commonObjections : analysis.gaps.slice(0, 3);
  const buyingSignals = analysis.buyingSignals?.length ? analysis.buyingSignals : analysis.strengths.slice(0, 3);
  const improvementsBeforeRetest = analysis.improvementsBeforeRetest?.length
    ? analysis.improvementsBeforeRetest
    : analysis.recommendations.slice(0, 3).map((item) => item.action);
  const loggedInterviews = analysis.evidenceAnswers?.interviews ?? [];
  const belowSampleThreshold = loggedInterviews.length < PMF_REQUIRED_SIGNALS;
  const interviewSegments = Array.from(new Set(
    loggedInterviews.map((item) => item.segment.trim()).filter(Boolean)
  ));
  const highIntentInterviews = loggedInterviews.filter(
    (item) => item.interestLevel >= 4 || item.buyingIntent === 'high' || item.buyingIntent === 'ready_to_pay'
  ).length;
  const landingPageCoverage = loggedInterviews.filter(
    (item) => item.landingPageShown && item.solutionPitched
  ).length;

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
  const {
    shareRecord,
    isPreparing,
    isUpdatingVisibility,
    isDialogOpen,
    setIsDialogOpen,
    openShareDialog,
    copyShareLink,
    copyLinkedInPost,
    openSharedPage,
    shareOnLinkedIn,
    updateVisibility,
    regenerateLink,
  } = useBizMapSharing({
    sourceType: 'pmf',
    sourceId: analysisId,
    getPayload: () => createPMFSharedPayload(analysis),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="grid gap-6 lg:grid-cols-[220px,1fr]">
        <div className="rounded-3xl border border-border/60 bg-background/90 p-6 text-center shadow-sm space-y-3">
          <PMFScoreCircle
            score={analysis.overallScore}
            verdict={analysis.verdict}
            verdictLabel={analysis.verdictLabel}
          />
          {belowSampleThreshold && (
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]">
              Low sample size — score reliability reduced
            </Badge>
          )}
        </div>

        <div className="rounded-3xl border border-border/60 bg-background/90 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">PMF Lab Decision</p>
              <div>
                <h2 className="text-2xl font-semibold">{decisionTitle}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{scoreMeaning}</p>
              </div>
            </div>
            <div className={cn(
              'rounded-2xl border px-4 py-3 text-sm font-medium',
              meetsThreshold
                ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
            )}>
              {meetsThreshold ? 'Recommendation unlocked' : 'Iteration required'}
            </div>
          </div>

          <blockquote className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4 text-sm italic leading-relaxed text-muted-foreground">
            "{analysis.summaryInsight}"
          </blockquote>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={onSave} disabled={isSaving} size="sm">
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving…' : 'Save Report'}
            </Button>
            <Button variant="outline" onClick={onExport} disabled={isExporting} size="sm">
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exporting…' : 'Export PDF'}
            </Button>
            <Button variant="outline" onClick={openShareDialog} disabled={!analysisId} size="sm">
              <Share2 className="mr-2 h-4 w-4" />
              Share report
            </Button>
            <Button variant="ghost" onClick={onReanalyze} size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-analyze
            </Button>
            {meetsThreshold && (
              <Button asChild variant="outline" size="sm">
                <Link to="/mvp-builder">
                  Continue to Building
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Threshold banner */}
      <div className={cn('flex items-start gap-3 rounded-lg border p-4', thresholdBanner.bg)}>
        <ThresholdIcon className={cn('w-5 h-5 shrink-0 mt-0.5', thresholdBanner.iconColor)} />
        <p className="text-sm leading-relaxed">{thresholdBanner.message}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
          <p className="text-xs text-muted-foreground">Logged interviews</p>
          <p className="mt-2 text-2xl font-semibold">{loggedInterviews.length}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
          <p className="text-xs text-muted-foreground">High-intent interviews</p>
          <p className="mt-2 text-2xl font-semibold">{highIntentInterviews}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
          <p className="text-xs text-muted-foreground">Landing page shown + pitched</p>
          <p className="mt-2 text-2xl font-semibold">{landingPageCoverage}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
          <p className="text-xs text-muted-foreground">Segments covered</p>
          <p className="mt-2 text-2xl font-semibold">{interviewSegments.length}</p>
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">What this score means</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            PMF Lab expects at least {PMF_REQUIRED_SIGNALS} interviews and a score of 75 or higher before you move from Validation to Building.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            {analysis.overallScore >= 75
              ? 'You have enough market evidence to scope the MVP around the strongest demand signals.'
              : 'You should tighten the offer and retest before committing engineering time or budget.'}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">AI next action</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {analysis.nextExperiment ?? (meetsThreshold
              ? 'Move into MVP scope definition and preserve only the features tied to the strongest buying signals.'
              : 'Run another interview round after improving the landing page, the offer, or the key missing features.')}
          </p>
        </div>
      </div>

      {/* Dimension bars */}
      <PMFDimensionBars dimensions={analysis.dimensions} />

      {/* Segment signal breakdown */}
      {loggedInterviews.length > 0 && (
        <>
          <Separator />
          <PMFSegmentBreakdown interviews={loggedInterviews} />
        </>
      )}

      <Separator />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-background/70 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Strongest buying signals</h3>
          </div>
          {buyingSignals.length > 0 ? (
            <ul className="space-y-2">
              {buyingSignals.map((signal, index) => (
                <li key={`${signal}-${index}`} className="text-sm leading-relaxed text-muted-foreground">
                  {signal}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No strong buying signals were identified from the current interview set.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/70 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquareWarning className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Most common objections</h3>
          </div>
          {commonObjections.length > 0 ? (
            <ul className="space-y-2">
              {commonObjections.map((item, index) => (
                <li key={`${item}-${index}`} className="text-sm leading-relaxed text-muted-foreground">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No major recurring objections were surfaced in the current evidence set.</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-background/70 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold">What users think is missing</h3>
          </div>
          {missingFeatures.length > 0 ? (
            <ul className="space-y-2">
              {missingFeatures.map((item, index) => (
                <li key={`${item}-${index}`} className="text-sm leading-relaxed text-muted-foreground">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No specific missing feature cluster was strong enough to stand out yet.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/70 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">What to improve before testing again</h3>
          </div>
          {improvementsBeforeRetest.length > 0 ? (
            <ul className="space-y-2">
              {improvementsBeforeRetest.map((item, index) => (
                <li key={`${item}-${index}`} className="text-sm leading-relaxed text-muted-foreground">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">The current evidence does not yet suggest a specific iteration path.</p>
          )}
        </div>
      </div>

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

      <ContextualMentorRecommendations
        track="validation"
        source="pmf-results"
        summaryInsight={analysis.summaryInsight}
        extraKeywords={[
          ...analysis.gaps,
          ...analysis.recommendations.map((item) => item.title),
          ...analysis.recommendations.map((item) => item.action),
        ]}
        title={
          meetsThreshold
            ? 'Want an expert read before you move into building?'
            : 'Need help deciding what to fix before you build?'
        }
        description={
          meetsThreshold
            ? 'These mentors can pressure-test your PMF evidence, help you hold onto the strongest signals, and keep you from overcorrecting before the MVP stage.'
            : 'These mentors are strongest when your validation is promising but still unclear. Use them to interpret objections, sharpen the offer, and decide what to test next.'
        }
      />

      {/* Collapsible interview evidence preview */}
      {loggedInterviews.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-background/70">
          <button
            type="button"
            onClick={() => setInterviewPreviewOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 p-4 text-left"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">
                Interview evidence log ({loggedInterviews.length} interviews)
              </p>
              <p className="text-xs text-muted-foreground">
                Raw interview data that fed this PMF score
              </p>
            </div>
            {interviewPreviewOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </button>
          {interviewPreviewOpen && (
            <div className="border-t border-border/60 p-4 space-y-3">
              {loggedInterviews.map((interview: PMFInterviewLog, index: number) => (
                <div
                  key={interview.id || index}
                  className="rounded-xl border border-border/40 bg-muted/10 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-[10px] font-semibold text-primary">
                      {index + 1}
                    </span>
                    <span className="font-medium text-foreground">{interview.intervieweeName}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{interview.segment}</span>
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="rounded-full border border-border/60 px-2 py-0.5">
                        Interest {interview.interestLevel}/5
                      </span>
                      <span className={cn(
                        'rounded-full border px-2 py-0.5',
                        interview.buyingIntent === 'ready_to_pay'
                          ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
                          : interview.buyingIntent === 'high'
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : 'border-border/60'
                      )}>
                        {interview.buyingIntent === 'ready_to_pay' ? 'Ready to pay' : interview.buyingIntent === 'high' ? 'High intent' : interview.buyingIntent === 'medium' ? 'Some interest' : 'Low intent'}
                      </span>
                    </span>
                  </div>
                  {interview.mainFeedback && (
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed pl-8">
                      {interview.mainFeedback}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="flex flex-wrap gap-3 pt-4 pb-8">
        <Button onClick={onSave} disabled={isSaving} className="flex-1 sm:flex-none px-6">
          {isSaving ? 'Saving…' : isReady ? 'Save Report & Lock Validation' : 'Save Report'}
        </Button>
        <Button variant="outline" onClick={onExport} disabled={isExporting} className="flex-1 sm:flex-none px-6">
          {isExporting ? 'Exporting…' : 'Export PDF'}
        </Button>
        {meetsThreshold ? (
          <Button asChild variant="outline" className="flex-1 sm:flex-none px-6">
            <Link to="/mvp-scope">Go to MVP Scope</Link>
          </Button>
        ) : (
          <Button variant="ghost" onClick={onReanalyze} className="flex-1 sm:flex-none px-6">
            Iterate and Retest
          </Button>
        )}
      </div>
      <BizMapShareDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        isPreparing={isPreparing}
        isUpdatingVisibility={isUpdatingVisibility}
        record={shareRecord}
        onCopyLink={copyShareLink}
        onOpenSharedPage={openSharedPage}
        onShareOnLinkedIn={shareOnLinkedIn}
        onCopyLinkedInPost={copyLinkedInPost}
        onUpdateVisibility={updateVisibility}
        onRegenerateLink={regenerateLink}
      />
    </div>
  );
};

export default PMFReadinessReport;
