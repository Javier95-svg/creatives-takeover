import { useCallback, useEffect } from 'react';
import SEO, { createBreadcrumbSchema, createFAQSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import PageFAQSection from '@/components/seo/PageFAQSection';
import { SignedOutFeaturePreview } from '@/components/ui/SignedOutFeaturePreview';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useGTMStrategist } from '@/hooks/useGTMStrategist';
import { useLeanStartupStore } from '@/store/leanStartupStore';
import GTMIntakeForm from '@/components/gtm/GTMIntakeForm';
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

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'GTM Strategist',
    description: 'AI-powered go-to-market strategy tool for early-stage founders. Get opinionated channel recommendations, positioning, messaging, and a 30-day action plan.',
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
  const publicTab = getPublicTabConfig('/go-to-market');
  const { markToolUsed } = useLeanStartupStore();
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
      question: 'Can founders use GTM Strategist before launch?',
      answer:
        'Yes. Pre-launch and first-launch planning are core use cases because the tool helps structure outreach, messaging, and execution before you waste effort on scattered tactics.',
    },
  ];
  const pageStructuredData = [
    ...structuredData,
    createFAQSchema(faqs),
  ];

  useEffect(() => {
    markToolUsed('gtm-strategist');
  }, [markToolUsed]);

  const {
    phase,
    analysis,
    planId,
    isSaving,
    isExporting,
    prefillData,
    runAnalysis,
    savePlan,
    exportPlan,
    resetToIntake,
  } = useGTMStrategist();
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
        title="GTM Strategist — Creatives Takeover"
        description="Get an opinionated go-to-market strategy with channel recommendations, positioning, messaging, and a 30-day action plan tailored to your business."
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
	              <SignedOutFeaturePreview
	                featureName={publicTab.featureName}
	                description={publicTab.description || ''}
	                previewItems={publicTab.previewItems}
	                showPricingCta={publicTab.showPricingCta}
	              />
	            )
	          ) : (
	            <>
	              {/* Phase A — Intake Wizard */}
	              {phase === 'intake' && (
	                <GTMIntakeForm
	                  prefillData={prefillData}
	                  onSubmit={runAnalysis}
	                  isSubmitting={false}
	                />
	              )}

	              {/* Phase B — Analysis Loading */}
	              {phase === 'analyzing' && <GTMAnalysisLoader />}

	              {/* Phase C — GTM Brief Results */}
	              {phase === 'results' && analysis && (
	                <div className="space-y-8">
	                  <GTMBriefHeader
	                    planTitle={analysis.planTitle}
	                    summaryInsight={analysis.summaryInsight}
	                    isSaving={isSaving}
	                    isExporting={isExporting}
	                    onSave={() => savePlan('saved')}
	                    onExport={exportPlan}
	                    onRegenerate={resetToIntake}
	                  />

	                  <div className="flex flex-wrap gap-3 rounded-[1.5rem] border border-border/60 bg-background/80 px-4 py-4 shadow-sm">
	                    <Button variant="outline" onClick={openShareDialog} disabled={!planId} className="gap-2">
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
	                    targetAudience={analysis.intakeAnswers?.targetAudience}
	                    summaryInsight={analysis.summaryInsight}
	                    extraKeywords={[
	                      analysis.positioning?.positioningStatement,
	                      analysis.messaging?.headline,
	                      ...analysis.channels.map((channel) => channel.channel),
	                      ...analysis.channels.flatMap((channel) => channel.weekOneActions),
	                    ].filter(Boolean)}
	                  />

	                  <div className="flex gap-8 items-start">
	                    {/* Sticky sidebar (desktop only) */}
	                    <GTMBriefSidebar />

	                    {/* Main content */}
	                    <div className="flex-1 min-w-0 space-y-12">

	                      <section id="channels" className="space-y-4 scroll-mt-6">
	                        <h2 className="text-lg font-bold text-muted-foreground uppercase tracking-wider text-xs">
	                          Recommended Channels ({analysis.channels.length})
	                        </h2>
	                        <div className="space-y-4">
	                          {analysis.channels.map((ch, i) => (
	                            <GTMChannelCard key={ch.channel} channel={ch} rank={i + 1} />
	                          ))}
	                        </div>
	                      </section>

	                      <Separator />

	                      <section id="positioning" className="scroll-mt-6">
	                        <GTMPositioningBlock positioning={analysis.positioning} />
	                      </section>

	                      <Separator />

	                      <section id="messaging" className="scroll-mt-6">
	                        <GTMMessagingBlock messaging={analysis.messaging} />
	                      </section>

	                      <Separator />

	                      <section id="action-plan" className="scroll-mt-6">
	                        <GTMActionPlan actionPlan={analysis.actionPlan} />
	                      </section>

	                      <Separator />

	                      <section id="checklist" className="scroll-mt-6">
	                        <GTMLaunchChecklist checklist={analysis.launchChecklist} />
	                      </section>

	                      <Separator />

	                      <section id="metrics" className="scroll-mt-6">
	                        <GTMMetricsBlock metrics={analysis.metrics} />
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
	          )}
	            <PageFAQSection
	              title="Frequent Questions"
              faqs={faqs}
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
