import React, { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  FileText,
  Loader2,
  Lock,
  Megaphone,
  Share2,
  TestTubeDiagonal,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { useCreditActions } from '@/hooks/useCreditActions';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { useUpgradePrompt } from '@/contexts/UpgradePromptContext';
import { supabase } from '@/integrations/supabase/client';
import { useBizMapProgress } from '@/hooks/useBizMapProgress';
import { useActivationJourney } from '@/hooks/useActivationJourney';
import { getToolJourneyGuide } from '@/lib/activationJourney';
import { ActivationJourneyStrip } from '@/components/activation/ActivationJourneyStrip';
import { BizMapShareDialog } from '@/components/bizmap/BizMapShareDialog';
import { useBizMapSharing } from '@/hooks/useBizMapSharing';
import { createICPSharedPayload } from '@/lib/bizmapSharing';
import ICPInputForm, { type ICPInputFormData } from './ICPInputForm';
import ICPDecisionSummary from './ICPDecisionSummary';
import ICPCustomerProfile from './ICPCustomerProfile';
import ICPPainPoints from './ICPPainPoints';
import ICPPositioning from './ICPPositioning';
import ICPValidationPlan from './ICPValidationPlan';
import { ICPAnalysis } from './types';

const RESULT_TABS = [
  { value: 'decision', icon: Compass, label: 'Decision', short: 'Decision' },
  { value: 'customer', icon: Users, label: 'Customer', short: 'Customer' },
  { value: 'painpoints', icon: AlertTriangle, label: 'Pain Points', short: 'Pain Points' },
  { value: 'positioning', icon: Megaphone, label: 'Positioning', short: 'Position' },
  { value: 'validation', icon: TestTubeDiagonal, label: 'Validation', short: 'Validate' },
];

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];

const normalizeAnalysis = (rawValue: unknown): ICPAnalysis => {
  const raw = asRecord(rawValue);
  const recommendation = asRecord(raw.recommendation);
  const customerProfile = asRecord(raw.customerProfile);
  const positioning = asRecord(raw.positioning);
  const validationPlan = asRecord(raw.validationPlan);
  const scoreBreakdown = asRecord(validationPlan.scoreBreakdown);

  return ({
  recommendation: {
    primaryIcp: typeof recommendation.primaryIcp === 'string' ? recommendation.primaryIcp : 'Unclear first ICP',
    whyThisIcp: typeof recommendation.whyThisIcp === 'string' ? recommendation.whyThisIcp : 'The current brief did not produce a strong segment recommendation.',
    problemToWin: typeof recommendation.problemToWin === 'string' ? recommendation.problemToWin : 'No clear problem anchor yet.',
    valueWedge: typeof recommendation.valueWedge === 'string' ? recommendation.valueWedge : 'No clear wedge defined yet.',
    decision: typeof recommendation.decision === 'string' ? recommendation.decision : 'Sharpen the brief and validate the first segment before expanding.',
    confidence: recommendation.confidence === 'High' || recommendation.confidence === 'Medium' || recommendation.confidence === 'Low'
      ? recommendation.confidence
      : 'Low',
    confidenceReason: typeof recommendation.confidenceReason === 'string'
      ? recommendation.confidenceReason
      : 'The available inputs were not strong enough to justify higher confidence.',
    evidenceSignals: asStringArray(recommendation.evidenceSignals),
    doNotTargetYet: asStringArray(recommendation.doNotTargetYet),
    openQuestions: asStringArray(recommendation.openQuestions),
  },
  customerProfile: {
    segmentName: typeof customerProfile.segmentName === 'string' ? customerProfile.segmentName : 'First ICP',
    whoTheyAre: typeof customerProfile.whoTheyAre === 'string' ? customerProfile.whoTheyAre : 'No customer profile generated.',
    buyer: typeof customerProfile.buyer === 'string' ? customerProfile.buyer : 'Not specified',
    user: typeof customerProfile.user === 'string' ? customerProfile.user : 'Not specified',
    organizationContext: typeof customerProfile.organizationContext === 'string' ? customerProfile.organizationContext : 'Not specified',
    triggerMoments: asStringArray(customerProfile.triggerMoments),
    urgencySignals: asStringArray(customerProfile.urgencySignals),
    currentAlternatives: asStringArray(customerProfile.currentAlternatives),
    switchingCosts: asStringArray(customerProfile.switchingCosts),
    buyingMotion: typeof customerProfile.buyingMotion === 'string' ? customerProfile.buyingMotion : 'Not specified',
    budgetOwner: typeof customerProfile.budgetOwner === 'string' ? customerProfile.budgetOwner : 'Not specified',
    channels: asStringArray(customerProfile.channels),
  },
  painPoints: Array.isArray(raw.painPoints)
    ? raw.painPoints.map((item) => {
        const pain = asRecord(item);
        return {
          painPoint: typeof pain.painPoint === 'string' ? pain.painPoint : 'Unspecified pain point',
          severity:
            pain.severity === 'Critical' || pain.severity === 'High' || pain.severity === 'Medium' || pain.severity === 'Low'
              ? pain.severity
              : 'Medium',
          whenItShowsUp: typeof pain.whenItShowsUp === 'string' ? pain.whenItShowsUp : 'Not specified',
          currentWorkaround: typeof pain.currentWorkaround === 'string' ? pain.currentWorkaround : 'Not specified',
          whyUnresolved: typeof pain.whyUnresolved === 'string' ? pain.whyUnresolved : 'Not specified',
          switchingBarrier: typeof pain.switchingBarrier === 'string' ? pain.switchingBarrier : 'Not specified',
          opportunityScore: Number(pain.opportunityScore) || 0,
        };
      })
    : [],
  positioning: {
    oneLiner: typeof positioning.oneLiner === 'string' ? positioning.oneLiner : 'No concise positioning line generated.',
    positioningStatement: typeof positioning.positioningStatement === 'string' ? positioning.positioningStatement : 'No positioning statement generated.',
    valueProposition: typeof positioning.valueProposition === 'string' ? positioning.valueProposition : 'No value proposition generated.',
    differentiators: asStringArray(positioning.differentiators),
    proofPoints: asStringArray(positioning.proofPoints),
    messagePillars: asStringArray(positioning.messagePillars),
    objections: Array.isArray(positioning.objections)
      ? positioning.objections.map((item) => {
          const objection = asRecord(item);
          return {
            objection: typeof objection.objection === 'string' ? objection.objection : 'Unspecified objection',
            response: typeof objection.response === 'string' ? objection.response : 'No response generated.',
          };
        })
      : [],
  },
  validationPlan: {
    immediateGoal: typeof validationPlan.immediateGoal === 'string' ? validationPlan.immediateGoal : 'No immediate validation goal generated.',
    verdict:
      validationPlan.verdict === 'Strong Wedge' || validationPlan.verdict === 'Worth Testing' || validationPlan.verdict === 'Needs Sharper Focus'
        ? validationPlan.verdict
        : 'Needs Sharper Focus',
    overallScore: Number(validationPlan.overallScore) || 0,
    scoreBreakdown: {
      pain: Number(scoreBreakdown.pain) || 0,
      specificity: Number(scoreBreakdown.specificity) || 0,
      differentiation: Number(scoreBreakdown.differentiation) || 0,
      reachability: Number(scoreBreakdown.reachability) || 0,
    },
    reasoning: typeof validationPlan.reasoning === 'string' ? validationPlan.reasoning : 'No reasoning generated.',
    experiments: Array.isArray(validationPlan.experiments)
      ? validationPlan.experiments.map((item) => {
          const experiment = asRecord(item);
          return {
            priority:
              experiment.priority === 'High' || experiment.priority === 'Medium' || experiment.priority === 'Low'
                ? experiment.priority
                : 'Medium',
            hypothesis: typeof experiment.hypothesis === 'string' ? experiment.hypothesis : 'Unspecified hypothesis',
            test: typeof experiment.test === 'string' ? experiment.test : 'No test generated.',
            successSignal: typeof experiment.successSignal === 'string' ? experiment.successSignal : 'No success signal generated.',
            timeToRun: typeof experiment.timeToRun === 'string' ? experiment.timeToRun : '1-2 weeks',
          };
        })
      : [],
    milestones: asStringArray(validationPlan.milestones),
  },
});
};

const ICPBuilder: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshBalance } = useCredits();
  const { ensureCredits, handleCreditError } = useCreditActions();
  const { checkFeatureAccess } = useFeatureGating();
  const { openUpgradePrompt } = useUpgradePrompt();
  const { refreshProgress } = useBizMapProgress();
  const { refreshActivation } = useActivationJourney();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ICPAnalysis | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('input');
  const [analysisKey, setAnalysisKey] = useState(0);

  const hasAnalysis = analysis !== null;
  const getSharePayload = useCallback(
    () => createICPSharedPayload(
      analysis ?? normalizeAnalysis({}),
    ),
    [analysis],
  );
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
    sourceType: 'icp',
    sourceId: analysisId,
    getPayload: getSharePayload,
  });

  const handleFormSubmit = async (formData: ICPInputFormData) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to use ICP Builder',
        variant: 'destructive',
      });
      return;
    }

    const featureAccess = checkFeatureAccess('icp_analysis');
    if (!featureAccess.hasAccess) {
      openUpgradePrompt({
        reason: 'feature',
        featureName: 'ICP Builder',
        requiredTier: featureAccess.requiredTier as 'creator' | 'professional' | undefined,
        description: featureAccess.message || 'Upgrade to Creator tier to run full ICP analysis.',
      });
      return;
    }

    const requiredCredits = ensureCredits('ICP_ANALYSIS', { featureName: 'ICP Builder' });
    if (requiredCredits === null) return;

    try {
      setIsAnalyzing(true);

      const descriptionParts: string[] = [
        `Problem: ${formData.problemStatement}`,
        `Target Customer: ${formData.targetAudience}`,
        `Current Customer Behavior / Workaround: ${formData.currentBehavior}`,
        `Solution Differentiator: ${formData.solutionDifferentiator}`,
        `Market Timing / Why Now: ${formData.marketTiming}`,
      ];

      if (formData.painCost) descriptionParts.push(`Cost of Problem to Customer: ${formData.painCost}`);
      if (formData.founderEdge) descriptionParts.push(`Founder Edge: ${formData.founderEdge}`);
      if (formData.nextGoals) descriptionParts.push(`Next Goals: ${formData.nextGoals}`);
      if (formData.industry) descriptionParts.push(`Industry: ${formData.industry}`);
      if (formData.revenueModel) descriptionParts.push(`Revenue Model: ${formData.revenueModel}`);
      if (formData.mainCompetitors) descriptionParts.push(`Named Competitors: ${formData.mainCompetitors}`);
      if (formData.currentTraction) descriptionParts.push(`Current Traction: ${formData.currentTraction}`);

      const businessDescription = descriptionParts.join('\n\n');

      const { data, error } = await supabase.functions.invoke('icp-analyzer', {
        body: {
          businessDescription,
          targetAudience: formData.targetAudience,
          industry: formData.industry || undefined,
          competitors: formData.mainCompetitors || undefined,
          unfairAdvantage: formData.founderEdge || undefined,
        },
      });

      if (error) {
        if (handleCreditError(error, data, 'ICP_ANALYSIS', { featureName: 'ICP Builder' })) return;
        throw error;
      }

      if (data?.creditError) {
        if (handleCreditError(null, data, 'ICP_ANALYSIS', { featureName: 'ICP Builder' })) return;
      }

      if (data?.success && data?.analysis) {
        setAnalysis(normalizeAnalysis(data.analysis));
        setAnalysisId(data.analysisId ?? null);
        setAnalysisKey((value) => value + 1);
        setActiveTab('decision');
        await refreshProgress();
        await refreshActivation();
        toast({
          title: 'ICP Decision Ready',
          description: `Recommendation: ${data.analysis.recommendation?.primaryIcp || 'Review your decision tab for the recommended first ICP.'}`,
        });
        await refreshBalance();
      } else {
        throw new Error(data?.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Error analyzing ICP:', error);
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'Failed to analyze ICP. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const activationGuide = getToolJourneyGuide('/icp-builder');

  const EmptyState = ({ message }: { message: string }) => (
    <div className="animate-fade-in-up py-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-border/60 bg-white/80 shadow-sm dark:bg-slate-950/70">
        <Lock className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-base font-semibold">Run your analysis first</h3>
      <p className="mx-auto mb-5 max-w-xs text-sm text-muted-foreground">{message}</p>
      <Button size="sm" onClick={() => setActiveTab('input')}>
        Go to Foundation
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {activationGuide ? (
        <ActivationJourneyStrip
          stageLabel={activationGuide.stageLabel}
          title={activationGuide.title}
          description={activationGuide.description}
          doneLabel={activationGuide.doneLabel}
          completedLabel={activationGuide.completedLabel}
          nextRoute={activationGuide.nextRoute}
          nextLabel={activationGuide.nextLabel}
          isComplete={hasAnalysis}
        />
      ) : null}
      <Card className="overflow-hidden rounded-[2rem] border border-border/70 bg-white/80 shadow-[0_28px_90px_-40px_rgba(15,23,42,0.4)] backdrop-blur dark:bg-slate-950/75">
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="adaptive-tabs icp-tabs-shell grid h-auto min-h-0 w-full grid-cols-2 items-stretch gap-2 overflow-visible rounded-[1.5rem] border border-border/60 bg-muted/40 p-2 lg:grid-cols-6">
              <TabsTrigger
                value="input"
                className="icp-tab-trigger gap-2 rounded-[1.1rem] px-3 py-3 text-center leading-tight whitespace-normal min-h-[3.25rem] data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {hasAnalysis ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0" />
                )}
                <span className="hidden sm:inline">Foundation</span>
                <span className="sm:hidden">Brief</span>
              </TabsTrigger>

              {RESULT_TABS.map(({ value, icon: Icon, label, short }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  disabled={!hasAnalysis}
                  className={cn(
                    'icp-tab-trigger gap-2 rounded-[1.1rem] px-3 py-3 text-center leading-tight whitespace-normal min-h-[3.25rem] transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm',
                    !hasAnalysis && 'opacity-45'
                  )}
                >
                  {!hasAnalysis ? <Lock className="h-3.5 w-3.5 shrink-0" /> : <Icon className="h-4 w-4 shrink-0" />}
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{short}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {hasAnalysis && !isAnalyzing && analysis?.recommendation && (
              <div className="icp-recommendation-strip mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-sky-500/15 bg-sky-500/[0.07] px-4 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Current recommendation</p>
                  <p className="mt-1 text-sm font-semibold">{analysis.recommendation.primaryIcp}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-xs text-foreground/70">
                    {analysis.recommendation.confidence} confidence
                    <ArrowRight className="h-3.5 w-3.5 text-sky-600" />
                  </div>
                  <Button size="sm" variant="outline" onClick={openShareDialog} className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Share output
                  </Button>
                </div>
              </div>
            )}

            {isAnalyzing && (
              <div className="animate-fade-in-up py-20">
                <div className="flex flex-col items-center justify-center gap-5 rounded-[1.75rem] border border-border/60 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_38%),rgba(255,255,255,0.72)] px-6 py-16 shadow-sm dark:bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_36%),rgba(2,6,23,0.72)]">
                  <div className="relative">
                    <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-sky-500/20 bg-sky-500/10">
                      <Loader2 className="h-9 w-9 animate-spin text-primary" />
                    </div>
                    <div className="absolute inset-0 rounded-[1.75rem] border border-sky-400/20 animate-ping" />
                  </div>
                  <div className="space-y-2 text-center">
                    <p className="text-lg font-semibold">Turning your brief into an ICP decision...</p>
                    <p className="max-w-md text-sm text-muted-foreground">
                      Ranking the best first segment, checking the strength of your wedge, and generating validation experiments.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isAnalyzing && (
              <>
                <TabsContent value="input" className="mt-6">
                  <ICPInputForm onSubmit={handleFormSubmit} isSubmitting={isAnalyzing} />
                </TabsContent>

                <TabsContent value="decision" className="mt-6">
                  {analysis?.recommendation ? (
                    <div key={analysisKey} className="animate-fade-in-up icp-result-panel">
                      <ICPDecisionSummary recommendation={analysis.recommendation} />
                    </div>
                  ) : (
                    <EmptyState message="Complete the foundation brief to get a recommended first ICP and the decision behind it." />
                  )}
                </TabsContent>

                <TabsContent value="customer" className="mt-6">
                  {analysis?.customerProfile ? (
                    <div key={analysisKey} className="animate-fade-in-up icp-result-panel">
                      <ICPCustomerProfile profile={analysis.customerProfile} />
                    </div>
                  ) : (
                    <EmptyState message="Run the analysis to see the buyer, user, triggers, channels, and switching context for your first ICP." />
                  )}
                </TabsContent>

                <TabsContent value="painpoints" className="mt-6">
                  {analysis?.painPoints ? (
                    <div key={analysisKey} className="animate-fade-in-up icp-result-panel">
                      <ICPPainPoints painPoints={analysis.painPoints} />
                    </div>
                  ) : (
                    <EmptyState message="Run the analysis to identify the pains most likely to create urgency and switching behavior." />
                  )}
                </TabsContent>

                <TabsContent value="positioning" className="mt-6">
                  {analysis?.positioning ? (
                    <div key={analysisKey} className="animate-fade-in-up icp-result-panel">
                      <ICPPositioning positioning={analysis.positioning} />
                    </div>
                  ) : (
                    <EmptyState message="Run the analysis to get your one-line positioning, proof points, and objection handling." />
                  )}
                </TabsContent>

                <TabsContent value="validation" className="mt-6">
                  {analysis?.validationPlan ? (
                    <div key={analysisKey} className="animate-fade-in-up icp-result-panel">
                      <ICPValidationPlan plan={analysis.validationPlan} />
                    </div>
                  ) : (
                    <EmptyState message="Run the analysis to get a validation score, concrete experiments, and milestones for the next few weeks." />
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>
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

export default ICPBuilder;
