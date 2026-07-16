import { useCallback, useEffect } from 'react';

import SEO, { createBreadcrumbSchema, createFAQSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import PageFAQSection from '@/components/seo/PageFAQSection';
import { PreviewModeWrapper } from '@/components/ui/PreviewModeWrapper';
import { BlurredToolPreview } from '@/components/ui/BlurredToolPreview';
import GTMWorkspaceIntake from '@/components/gtm/GTMWorkspaceIntake';
import GTMWorkspace from '@/components/gtm/GTMWorkspace';
import GTMAnalysisLoader from '@/components/gtm/GTMAnalysisLoader';
import GTMStrategistWallpaper from '@/components/wallpapers/GTMStrategistWallpaper';
import { BizMapShareDialog } from '@/components/bizmap/BizMapShareDialog';
import { useGTMStrategist } from '@/hooks/useGTMStrategist';
import { useBizMapSharing } from '@/hooks/useBizMapSharing';
import { useLeanStartupStore } from '@/store/leanStartupStore';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { createGTMSharedPayload } from '@/lib/bizmapSharing';
import { getPublicTabConfig } from '@/config/publicTabVisibility';
import { isGTMPlanV2 } from '@/lib/gtmV2';
import { trackGTMOpened, trackGTMPlanShared, trackToolOpened } from '@/lib/analytics';

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

const faqs = [
  {
    question: 'What is a go-to-market strategy for an early-stage startup?',
    answer: 'A go-to-market strategy is the practical plan for reaching the right customers, explaining the offer clearly, choosing channels, and turning launch activity into early traction.',
  },
  {
    question: 'Does GTM Strategist recommend startup acquisition channels?',
    answer: 'Yes. It applies eligibility rules and transparent scoring to choose one primary channel, one secondary channel, and one deferred bet.',
  },
  {
    question: 'When should founders use GTM Strategist?',
    answer: 'Use it when your product is launch-ready or already live. It turns existing founder evidence into a six-week motion and adapts the next week from measured results.',
  },
];

export default function GTMStrategistPage() {
  const { user } = useAuth();
  const publicTab = getPublicTabConfig('/go-to-market');
  const { hasAccess, upgradeTarget } = usePlanAccess('gtm_strategist');
  const markToolUsed = useLeanStartupStore((state) => state.markToolUsed);
  const {
    phase,
    analysis,
    planId,
    isSaving,
    isExporting,
    isReviewing,
    isRestoringPlan,
    prefillV2,
    selectedMvpProjectId,
    mvpProjects,
    isLoadingMvpProjects,
    weeklyReview,
    runV2Analysis,
    updatePlay,
    updateV2Plan,
    startPlaySprint,
    runWeeklyReview,
    savePlan,
    exportPlan,
    importMvpProject,
    openDiagnose,
    resumeWorkspace,
  } = useGTMStrategist();
  const v2Analysis = analysis && isGTMPlanV2(analysis) ? analysis : null;

  useEffect(() => {
    markToolUsed('gtm-strategist');
    trackGTMOpened();
    trackToolOpened('gtm_strategist');
  }, [markToolUsed]);

  const getSharePayload = useCallback(() => {
    if (!analysis) throw new Error('Generate a GTM plan before sharing it.');
    return createGTMSharedPayload(analysis);
  }, [analysis]);
  const sharing = useBizMapSharing({ sourceType: 'gtm', sourceId: planId, getPayload: getSharePayload });

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <SEO
        title="GTM Strategist — Adaptive Founder GTM System"
        description="Build a researched six-week go-to-market plan, activate focused plays through Directories and Traction Engine, and adapt through weekly evidence reviews."
        keywords="go to market strategy, gtm channels, startup marketing, first customers, founder marketing"
        url="/go-to-market"
        structuredData={[...structuredData, createFAQSchema(faqs)]}
      />
      <GTMStrategistWallpaper />
      <div className="relative z-10">
        <Navigation />
        <main className="px-4 pb-20 pt-28 md:pt-32 lg:pt-36">
          <div className="container mx-auto max-w-6xl space-y-8">
            {!user ? (
              publicTab ? (
                <PreviewModeWrapper featureName={publicTab.featureName} description={publicTab.description || ''} showPricingCta={publicTab.showPricingCta}>
                  <GTMWorkspaceIntake prefill={{}} onSubmit={() => undefined} />
                </PreviewModeWrapper>
              ) : null
            ) : hasAccess ? (
              <>
                {isRestoringPlan ? <GTMAnalysisLoader /> : null}
                {!isRestoringPlan && phase === 'intake' ? (
                  <GTMWorkspaceIntake
                    prefill={v2Analysis?.intake ?? prefillV2}
                    draftScope={selectedMvpProjectId ? `mvp-${selectedMvpProjectId}` : planId ? `plan-${planId}` : 'manual'}
                    isRegeneration={Boolean(v2Analysis && planId)}
                    onSubmit={(intake) => void runV2Analysis(intake, Boolean(planId))}
                    onCancel={v2Analysis && planId ? resumeWorkspace : undefined}
                    mvpProjects={mvpProjects}
                    isLoadingMvpProjects={isLoadingMvpProjects}
                    selectedMvpProjectId={selectedMvpProjectId}
                    onImportProject={importMvpProject}
                  />
                ) : null}
                {!isRestoringPlan && phase === 'analyzing' ? <GTMAnalysisLoader /> : null}
                {!isRestoringPlan && phase === 'results' && v2Analysis && planId ? (
                  <GTMWorkspace
                    plan={v2Analysis}
                    planId={planId}
                    weeklyReview={weeklyReview}
                    isSaving={isSaving}
                    isExporting={isExporting}
                    isReviewing={isReviewing}
                    onSave={() => void savePlan('saved')}
                    onExport={() => void exportPlan()}
                    onShare={() => { trackGTMPlanShared(); void sharing.openShareDialog(); }}
                    onRegenerate={openDiagnose}
                    onUpdatePlay={updatePlay}
                    onUpdatePlan={updateV2Plan}
                    onStartSprint={startPlaySprint}
                    onWeeklyReview={runWeeklyReview}
                  />
                ) : null}
              </>
            ) : (
              <BlurredToolPreview featureName="GTM Strategist" unlockCondition="GTM Strategist is credit-metered on every plan. Add credits or choose a plan with more monthly credits." requiredPlan={upgradeTarget} locked>
                <div />
              </BlurredToolPreview>
            )}
            <div className="pt-8 md:pt-12">
              <PageFAQSection title="Frequent Questions" faqs={faqs} />
            </div>
          </div>
        </main>
        <Footer />
        <BizMapShareDialog
          open={sharing.isDialogOpen}
          onOpenChange={sharing.setIsDialogOpen}
          isPreparing={sharing.isPreparing}
          isUpdatingVisibility={sharing.isUpdatingVisibility}
          record={sharing.shareRecord}
          onCopyLink={sharing.copyShareLink}
          onOpenSharedPage={sharing.openSharedPage}
          onShareOnLinkedIn={sharing.shareOnLinkedIn}
          onCopyLinkedInPost={sharing.copyLinkedInPost}
          onUpdateVisibility={sharing.updateVisibility}
          onRegenerateLink={sharing.regenerateLink}
        />
      </div>
    </div>
  );
}
