import SEO, { createSoftwareApplicationSchema } from '@/components/SEO';
import Footer from '@/components/Footer';
import Navigation from '@/components/Navigation';
import { PreviewModeWrapper } from '@/components/ui/PreviewModeWrapper';
import { MVPBuilder } from '@/components/mvp-builder/MVPBuilder';
import { getPublicTabConfig } from '@/config/publicTabVisibility';
import { useAuth } from '@/contexts/AuthContext';

export default function AppBuilderPage() {
  const { user } = useAuth();
  const publicTab = getPublicTabConfig('/mvp-builder');
  const structuredData = [
    createSoftwareApplicationSchema({
      name: 'MVP Builder',
      description: 'AI MVP builder for founders who want to turn product ideas into working prototypes with live preview.',
      url: '/mvp-builder',
      featureList: ['prompt-based app generation', 'live preview', 'iterative code updates'],
    }),
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="AI MVP Builder | Creatives Takeover"
        description="Describe your product, generate a working MVP, and iterate with live preview and code updates inside an AI MVP builder."
        keywords="ai mvp builder, app builder ai, startup prototype builder, mvp generator, prompt to app"
        url="/mvp-builder"
        structuredData={structuredData}
      />
      <Navigation />
      <main className="px-4 pt-28 pb-20 md:pt-32 lg:pt-36">
        <div className="container mx-auto max-w-5xl">
          {!user && publicTab ? (
            <PreviewModeWrapper
              featureName={publicTab.featureName}
              description={publicTab.description || ''}
              showPricingCta={publicTab.showPricingCta}
            >
              <MVPBuilder />
            </PreviewModeWrapper>
          ) : (
            <MVPBuilder />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
