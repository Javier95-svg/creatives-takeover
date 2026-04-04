import SEO, { createSoftwareApplicationSchema } from '@/components/SEO';
import Footer from '@/components/Footer';
import Navigation from '@/components/Navigation';
import { SignedOutFeaturePreview } from '@/components/ui/SignedOutFeaturePreview';
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

  if (!user && publicTab) {
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
          <div className="container mx-auto max-w-5xl space-y-8">
            <div className="space-y-3 text-center">
              <h1 className="pb-2 text-3xl font-bold leading-tight creatives-font takeover-gradient sm:text-4xl md:text-5xl lg:text-6xl">
                MVP Builder
              </h1>
              <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Turn your product brief into a working prototype with a live build workflow.
              </p>
            </div>
            <SignedOutFeaturePreview
              featureName={publicTab.featureName}
              description={publicTab.description || ''}
              previewItems={publicTab.previewItems}
              showPricingCta={publicTab.showPricingCta}
            />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <SEO
        title="AI MVP Builder | Creatives Takeover"
        description="Describe your product, generate a working MVP, and iterate with live preview and code updates inside an AI MVP builder."
        keywords="ai mvp builder, app builder ai, startup prototype builder, mvp generator, prompt to app"
        url="/mvp-builder"
        structuredData={structuredData}
      />
      <MVPBuilder />
    </>
  );
}
