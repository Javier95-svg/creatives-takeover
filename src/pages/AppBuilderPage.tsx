import SEO, { createSoftwareApplicationSchema } from '@/components/SEO';
import { PreviewModeWrapper } from '@/components/ui/PreviewModeWrapper';
import { BlurredToolPreview } from '@/components/ui/BlurredToolPreview';
import { MVPBuilder } from '@/components/mvp-builder/MVPBuilder';
import { getPublicTabConfig } from '@/config/publicTabVisibility';
import { useAuth } from '@/contexts/AuthContext';
import { usePlanAccess } from '@/hooks/usePlanAccess';

export default function AppBuilderPage() {
  const { user } = useAuth();
  const publicTab = getPublicTabConfig('/mvp-builder');
  const { hasAccess, upgradeTarget } = usePlanAccess('mvp_builder');
  const structuredData = [
    createSoftwareApplicationSchema({
      name: 'MVP Builder',
      description: 'AI MVP builder for founders who want to turn product ideas into working prototypes with live preview.',
      url: '/mvp-builder',
      featureList: ['prompt-based app generation', 'live preview', 'iterative code updates'],
    }),
  ];

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <SEO
        title="AI MVP Builder | Creatives Takeover"
        description="Describe your product, generate a working MVP, and iterate with live preview and code updates inside an AI MVP builder."
        keywords="ai mvp builder, app builder ai, startup prototype builder, mvp generator, prompt to app"
        url="/mvp-builder"
        structuredData={structuredData}
      />
      {!user && publicTab ? (
        <PreviewModeWrapper
          featureName={publicTab.featureName}
          description={publicTab.description || ''}
          showPricingCta={publicTab.showPricingCta}
        >
          <MVPBuilder />
        </PreviewModeWrapper>
      ) : !hasAccess ? (
        <BlurredToolPreview
          featureName="MVP Builder"
          unlockCondition="MVP Builder is available on every plan and uses credits per build action."
          requiredPlan={upgradeTarget}
          locked
        >
          <div />
        </BlurredToolPreview>
      ) : (
        <MVPBuilder />
      )}
    </div>
  );
}
