import { useCallback, useEffect, useState } from 'react';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import SEO, { createBreadcrumbSchema, createFAQSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import PageFAQSection from '@/components/seo/PageFAQSection';
import RelatedToolsSection from '@/components/seo/RelatedToolsSection';
import { PreviewModeWrapper } from '@/components/ui/PreviewModeWrapper';
import { BlurredToolPreview } from '@/components/ui/BlurredToolPreview';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useGTMStrategist } from '@/hooks/useGTMStrategist';
import { useLeanStartupStore } from '@/store/leanStartupStore';
import GTMIntakeForm from '@/components/gtm/GTMIntakeForm';
import GTMWorkspaceIntake from '@/components/gtm/GTMWorkspaceIntake';
import GTMWorkspace from '@/components/gtm/GTMWorkspace';
import GTMAnalysisLoader from '@/components/gtm/GTMAnalysisLoader';
import GTMBriefHeader from '@/components/gtm/GTMBriefHeader';
import GTMBriefSidebar from '@/components/gtm/GTMBriefSidebar';
import GTMChannelCard from '@/components/gtm/GTMChannelCard';
import GTMPositioningBlock from '@/components/gtm/GTMPositioningBlock';
import GTMMessagingBlock from '@/components/gtm/GTMMessagingBlock';
import GTMActionPlan from '@/components/gtm/GTMActionPlan';
import GTMLaunchChecklist from '@/components/gtm/GTMLaunchChecklist';
import GTMMetricsBlock from '@/components/gtm/GTMMetricsBlock';
import GTMStrategistWallpaper from '@/components/wallpapers/GTMStrategistWallpaper';
import { ContextualMentorRecommendations } from '@/components/mentor-marketplace/ContextualMentorRecommendations';
import { BizMapShareDialog } from '@/components/bizmap/BizMapShareDialog';
import { useBizMapSharing } from '@/hooks/useBizMapSharing';
import { createGTMSharedPayload } from '@/lib/bizmapSharing';
import { Share2 } from 'lucide-react';
import { getPublicTabConfig } from '@/config/publicTabVisibility';
import { useAuth } from '@/contexts/AuthContext';
import { trackGTMOpened, trackGTMPlanShared, trackToolOpened } from '@/lib/analytics';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { isGTMPlanV2 } from '@/lib/gtmV2';
import { isGTMStrategistV2Enabled } from '@/lib/gtmRollout';
import {
  fetchMeasuredChannelPerformance,
  type MeasuredPerformanceMap,
} from '@/lib/gtmMeasuredPerformance';

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'GTM Strategist',
    description: 'An adaptive go-to-market workspace with researched positioning, focused channel plays, activation, and weekly evidence reviews.',
    url: 'https://creatives-takeover.com/go-to-market',
  },
  createBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'BizMap AI', url: '/bizmap-ai' },
    { name: 'GTM Strategist', url: '/go-to-market' },
  ]),
];

export default function GTMStrategistPage() {
  const { user } = useAuth();
  const v2Flag = useFeatureFlagEnabled('gtm-strategist-v2');
  const v2Enabled = isGTMStrategistV2Enabled(user?.id, v2Flag);
  const publicTab = getPublicTabConfig('/go-to-market');
  const { hasAccess, upgradeTarget } = usePlanAccess('gtm_strategist');
  const markToolUsed = useLeanStartupStore(s => s.markToolUsed);
  const faqs = [
    {
      question: 'What is a go-to-market strategy for an early-stage startup?',
      answer:
        'A go-to-market strategy is the practical plan for reaching the right customers, explaining the offer clearly, choosing channels, and turning launch activity into early traction.',
    },
    {
      question: 'Does GTM Strategist recommend startup acquisition channels?',
      answer:
        'Yes. It is designed to recommend channels based on your product, audience, and stage so you can focus on the tactics most likely to work first.',
    },
    {
      question: 'When should founders use GTM Strategist?',
      answer:
        'Use it when your product is launch-ready or already live. It turns launch context into a focused six-week motion, then adapts the plan from measured evidence.',
    },
  ];
  const pageStructuredData = [
    ...structuredData,
    createFAQSchema(faqs),
  ];

  useEffect(() => {
    markToolUsed('gtm-strategist');
    trackGTMOpened();
    trackToolOpened('gtm_strategist');
  }, [markToolUsed]);

  // Measured channel performance from the founder's Traction Engine logs —
  // shown next to each channel's predicted fit score so the brief reads as
  // predicted vs. measured rather than a one-shot document.
  const [measuredPerformance, setMeasuredPerformance] = useState<MeasuredPerformanceMap>(new Map());
  useEffect(() => {
    if (!user) return;
    let active = true;
    void fetchMeasuredChannelPerformance(user.id).then((map) => {
      if (active) setMeasuredPerformance(map);
    });
    return () => {
      active = false;
    };
  }, [user]);

  const {
    phase,
    analysis,
    planId,
    isSaving,
    isExporting,
    prefillData,
    prefillV2,
    prefillSource,
    weeklyReview,
    isReviewing,
    runAnalysis,
    runV2Analysis,
    updatePlay,
    runWeeklyReview,
    savePlan,
    exportPlan,
    openDiagnose,
    resetToIntake,
  } = useGTMStrategist();
  const v2Analysis = analysis && isGTMPlanV2(analysis) ? analysis : null;
  const legacyAnalysis = analysis && !isGTMPlanV2(analysis) ? analysis : null;
  const getSharePayload = useCallback(
    () => createGTMSharedPayload(
      analysis ?? {
        planTitle: 'GTM Strategy Brief',
        summaryInsight: '',
        channels: [],
        positioning: {
          positioningStatement: '',
          uniqueValueProposition: '',
          keyDifferentiators: [],
        },
        messaging: {
          headline: '',
          hookLine: '',
          proofPoint: '',
          ctaCopy: '',
          toneOfVoice: [],
        },
        actionPlan: {
          week1: [],
          week2: [],
          weeks3to4: [],
        },
        launchChecklist: {
          prelaunch: [],
          launchDay: [],
          postlaunch: [],
        },
        metrics: {
          primary: [],
          laggingIndicators: [],
        },
        intakeAnswers: {
          businessType: '',
          targetAudience: '',
          audienceOnlineHabits: [],
          problemAndSolution: '',
          currentTraction: '',
          weeklyTimeForMarketing: '',
        },
        generatedAt: new Date().toISOString(),
      },
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
    sourceType: 'gtm',
    sourceId: planId,
    getPayload: getSharePayload,
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <SEO
        title="GTM Strategist — Adaptive Founder GTM System"
        description="Build a researched six-week go-to-market plan, activate focused plays through Directories and Traction Engine, and adapt through weekly evidence reviews."
        keywords="go to market strategy, gtm channels, startup marketing, first customers, founder marketing"
        url="/go-to-market"
        structuredData={pageStructuredData}
      />
      <GTMStrategistWallpaper />
      <div className="relative z-10">
        <Navigation />

        <main className="px-4 pt-28 pb-20 md:pt-32 lg:pt-36">
          <div className="container mx-auto max-w-5xl space-y-8">

	          {!user ? (
	            publicTab && (
	              <PreviewModeWrapper
	                featureName={publicTab.featureName}
	                description={publicTab.description || ''}
	                showPricingCta={publicTab.showPricingCta}
	              >
	                <GTMWorkspaceIntake prefill={{}} onSubmit={() => {}} />
	              </PreviewModeWrapper>
	            )
	          ) : hasAccess ? (
	            <>
	              {/* Phase A — Intake Wizard */}
	              {phase === 'intake' && v2Enabled && (
	                <GTMWorkspaceIntake
	                  prefill={v2Analysis?.intake ?? prefillV2}
	                  isRegeneration={Boolean(planId)}
	                  onSubmit={(intake) => void runV2Analysis(intake, Boolean(planId))}
	                />
	              )}
	              {phase === 'intake' && !v2Enabled && (
	                <GTMIntakeForm
	                  prefillData={prefillData}
	                  prefillSource={prefillSource}
	                  onSubmit={runAnalysis}
	                  isSubmitting={false}
	                />
	              )}

	              {/* Phase B — Analysis Loading */}
	              {phase === 'analyzing' && <GTMAnalysisLoader />}

	              {/* Phase C — GTM Brief Results */}
	              {phase === 'results' && v2Analysis && planId && (
	                <GTMWorkspace
	                  plan={v2Analysis}
	                  planId={planId}
	                  weeklyReview={weeklyReview}
	                  isSaving={isSaving}
	                  isExporting={isExporting}
	                  isReviewing={isReviewing}
	                  onSave={() => void savePlan('saved')}
	                  onExport={() => void exportPlan()}
	                  onRegenerate={openDiagnose}
	                  onUpdatePlay={updatePlay}
	                  onWeeklyReview={runWeeklyReview}
	                />
	              )}

	              {phase === 'results' && legacyAnalysis && (
	                <div className="space-y-8">
	                  {v2Enabled && (
	                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-primary/25 bg-primary/5 p-5">
	                      <div><p className="font-semibold">Upgrade this brief to the adaptive GTM system</p><p className="text-sm text-muted-foreground">Add research, durable plays, activation, and weekly reviews. Full regeneration costs 5 credits.</p></div>
	                      <Button onClick={openDiagnose}>Upgrade plan</Button>
	                    </div>
	                  )}
	                  <GTMBriefHeader
	                    planTitle={legacyAnalysis.planTitle}
	                    summaryInsight={legacyAnalysis.summaryInsight}
	                    isSaving={isSaving}
	                    isExporting={isExporting}
	                    onSave={() => savePlan('saved')}
	                    onExport={exportPlan}
	                    onRegenerate={resetToIntake}
	                  />

	                  <div className="flex flex-wrap gap-3 rounded-3xl border border-border/60 bg-background/80 px-4 py-4 shadow-sm">
	                    <Button variant="outline" onClick={() => { trackGTMPlanShared(); void openShareDialog(); }} disabled={!planId} className="gap-2">
	                      <Share2 className="h-4 w-4" />
	                      Share strategy brief
	                    </Button>
	                    <p className="text-sm text-muted-foreground">
	                      Create a public link you can send to a co-founder, advisor, or LinkedIn audience.
	                    </p>
	                  </div>

	                  <ContextualMentorRecommendations
	                    track="gtm"
	                    source="gtm-results"
	                    targetAudience={legacyAnalysis.intakeAnswers?.targetAudience}
	                    summaryInsight={legacyAnalysis.summaryInsight}
	                    extraKeywords={[
	                      legacyAnalysis.positioning?.positioningStatement,
	                      legacyAnalysis.messaging?.headline,
	                      ...legacyAnalysis.channels.map((channel) => channel.channel),
	                      ...legacyAnalysis.channels.flatMap((channel) => channel.weekOneActions),
	                    ].filter(Boolean)}
	                  />

	                  <div className="flex gap-8 items-start">
	                    {/* Sticky sidebar (desktop only) */}
	                    <GTMBriefSidebar />

	                    {/* Main content */}
	                    <div className="flex-1 min-w-0 space-y-12">

	                      <section id="channels" className="space-y-4 scroll-mt-6">
	                        <h2 className="text-lg font-bold text-muted-foreground uppercase tracking-wider text-xs">
	                          Recommended Channels ({legacyAnalysis.channels.length})
	                        </h2>
	                        <div className="space-y-4">
	                          {legacyAnalysis.channels.map((ch, i) => (
	                            <GTMChannelCard
	                              key={ch.channel}
	                              channel={ch}
	                              rank={i + 1}
	                              measuredPerformance={measuredPerformance}
	                            />
	                          ))}
	                        </div>
	                      </section>

	                      <Separator />

	                      <section id="positioning" className="scroll-mt-6">
	                        <GTMPositioningBlock positioning={legacyAnalysis.positioning} />
	                      </section>

	                      <Separator />

	                      <section id="messaging" className="scroll-mt-6">
	                        <GTMMessagingBlock messaging={legacyAnalysis.messaging} />
	                      </section>

	                      <Separator />

	                      <section id="action-plan" className="scroll-mt-6">
	                        <GTMActionPlan actionPlan={legacyAnalysis.actionPlan} />
	                      </section>

	                      <Separator />

	                      <section id="checklist" className="scroll-mt-6">
	                        <GTMLaunchChecklist checklist={legacyAnalysis.launchChecklist} />
	                      </section>

	                      <Separator />

	                      <section id="metrics" className="scroll-mt-6">
	                        <GTMMetricsBlock metrics={legacyAnalysis.metrics} />
	                      </section>

	                      {/* Bottom save CTA */}
	                      <div className="flex flex-wrap gap-3 pt-4 pb-8">
	                        <button
	                          onClick={() => savePlan('saved')}
	                          disabled={isSaving}
	                          className="flex-1 sm:flex-none px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
	                        >
	                          {isSaving ? 'Saving...' : 'Save Plan & Complete Stage V'}
	                        </button>
	                        <button
	                          onClick={exportPlan}
	                          disabled={isExporting}
	                          className="flex-1 sm:flex-none px-6 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
	                        >
	                          {isExporting ? 'Exporting...' : 'Export PDF'}
	                        </button>
	                      </div>
	                    </div>
	                  </div>
	                </div>
	              )}
	            </>
	          ) : (
	            <BlurredToolPreview
	              featureName="GTM Strategist"
	              unlockCondition="GTM Strategist is available on the Rising plan and above."
	              requiredPlan={upgradeTarget}
	              locked
	            >
	              <div />
	            </BlurredToolPreview>
	          )}
	            <PageFAQSection
	              title="Frequent Questions"
              faqs={faqs}
            />
            <RelatedToolsSection
              tools={[
                { name: "Traction Engine", description: "Track distribution experiments and measure repeatable traction.", url: "/traction-engine" },
                { name: "Directories", description: "Activate the launch surfaces recommended for your selected GTM play.", url: "/directories" },
                { name: "ICP Builder", description: "Sharpen your target customer before executing your GTM.", url: "/icp-builder" },
              ]}
            />
          </div>
        </main>

        <Footer />
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
    </div>
  );
}
