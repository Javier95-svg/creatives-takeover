import { useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileDown, Loader2, RefreshCw, Save, Share2 } from 'lucide-react';

import SEO, { createBreadcrumbSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { PreviewModeWrapper } from '@/components/ui/PreviewModeWrapper';
import { BlurredToolPreview } from '@/components/ui/BlurredToolPreview';
import { ToolPageShell } from '@/components/tool-shell/ToolPageShell';
import GTMWorkspaceIntake from '@/components/gtm/GTMWorkspaceIntake';
import GTMWorkspace from '@/components/gtm/GTMWorkspace';
import { FirstCustomerProofWorkspace } from '@/pages/FirstCustomerSprintPage';
import GTMAnalysisLoader from '@/components/gtm/GTMAnalysisLoader';
import GTMRouteWallpaper, { GTMRouteChart } from '@/components/wallpapers/GTMRouteWallpaper';
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

const PURPOSE = 'Pick the channel to reach your first customers, run it for six weeks, and adjust each week from real results.';

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'GTM Strategist',
    description: 'A six-week go-to-market plan: one channel at a time, weekly tasks, and a weekly review based on real results.',
    url: 'https://creatives-takeover.com/go-to-market',
  },
  createBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'BizMap AI', url: '/bizmap-ai' },
    { name: 'GTM Strategist', url: '/go-to-market' },
  ]),
];

export default function GTMStrategistPage() {
  const [searchParams] = useSearchParams();
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
    reviewProposal,
    runV2Analysis,
    updatePlay,
    updateV2Plan,
    startPlaySprint,
    previewWeeklyReview,
    applyWeeklyReview,
    dismissWeeklyReview,
    savePlan,
    exportPlan,
    importMvpProject,
    openDiagnose,
    resumeWorkspace,
  } = useGTMStrategist();
  const v2Analysis = analysis && isGTMPlanV2(analysis) ? analysis : null;
  const isFirstCustomerProofWorkspace = searchParams.get('workspace') === 'first-customer-proof';
  const showWorkspace = Boolean(user && hasAccess && !isRestoringPlan && !isFirstCustomerProofWorkspace && phase === 'results' && v2Analysis && planId);

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

  const planActions = showWorkspace ? (
    <>
      <Button type="button" size="sm" variant="outline" disabled={isSaving} onClick={() => void savePlan('saved')}>
        {isSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Save className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}Save
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => { trackGTMPlanShared(); void sharing.openShareDialog(); }}>
        <Share2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Share
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={isExporting} onClick={() => void exportPlan()}>
        {isExporting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <FileDown className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}PDF
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={openDiagnose}>
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Edit answers
      </Button>
    </>
  ) : undefined;

  const context = showWorkspace && v2Analysis
    ? <>For {v2Analysis.intake.productName}{v2Analysis.intake.targetSegment ? `, reaching ${v2Analysis.intake.targetSegment}` : ''}</>
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="GTM Strategist | Creatives Takeover"
        description="Pick the channel to reach your first customers, run it for six weeks, and adjust each week from real results in Traction Engine."
        keywords="go to market strategy, gtm channels, startup marketing, first customers, founder marketing"
        url="/go-to-market"
        structuredData={structuredData}
      />
      <Navigation />
      <main>
        <ToolPageShell
          title="GTM Strategist"
          purpose={PURPOSE}
          context={context}
          actions={planActions}
          theme="gtm"
          wallpaper={<GTMRouteWallpaper />}
          headerArt={<GTMRouteChart />}
        >
          {!user ? (
            publicTab ? (
              <PreviewModeWrapper featureName={publicTab.featureName} description={publicTab.description || ''} showPricingCta={publicTab.showPricingCta}>
                <GTMWorkspaceIntake prefill={{}} onSubmit={() => undefined} />
              </PreviewModeWrapper>
            ) : null
          ) : hasAccess ? (
            <>
              {isRestoringPlan ? <GTMAnalysisLoader mode="restoring" /> : null}
              {!isRestoringPlan && isFirstCustomerProofWorkspace ? (
                <div className="space-y-4">
                  {v2Analysis && planId ? (
                    <Link to="/go-to-market" className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">Back to your plan</Link>
                  ) : null}
                  <FirstCustomerProofWorkspace embedded {...(v2Analysis && planId ? { gtmPlanId: planId } : {})} />
                </div>
              ) : null}
              {!isRestoringPlan && phase === 'intake' && !isFirstCustomerProofWorkspace ? (
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
              {!isRestoringPlan && phase === 'analyzing' && !isFirstCustomerProofWorkspace ? <GTMAnalysisLoader /> : null}
              {showWorkspace && v2Analysis && planId ? (
                <GTMWorkspace
                  plan={v2Analysis}
                  planId={planId}
                  weeklyReview={weeklyReview}
                  reviewProposal={reviewProposal}
                  isReviewing={isReviewing}
                  onUpdatePlay={updatePlay}
                  onUpdatePlan={updateV2Plan}
                  onStartSprint={startPlaySprint}
                  onPreviewReview={previewWeeklyReview}
                  onApplyReview={applyWeeklyReview}
                  onDismissReview={dismissWeeklyReview}
                />
              ) : null}
            </>
          ) : (
            <BlurredToolPreview featureName="GTM Strategist" unlockCondition="GTM Strategist is credit-metered on every plan. Add credits or choose a plan with more monthly credits." requiredPlan={upgradeTarget} locked>
              <div />
            </BlurredToolPreview>
          )}
        </ToolPageShell>
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
  );
}
