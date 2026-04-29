import SEO, { createBreadcrumbSchema, createSoftwareApplicationSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnswerSummary from "@/components/seo/AnswerSummary";
import RelatedPageLinks from "@/components/seo/RelatedPageLinks";
import { PreviewModeWrapper } from '@/components/ui/PreviewModeWrapper';
import VCSearchTab from "@/components/insighta/VCSearchTab";
import { VCWallpaper } from "@/components/vc-search/VCWallpaper";
import { insightaPageContent } from "@/data/insightaPageContent";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useEffect } from "react";
import { getPublicTabConfig } from "@/config/publicTabVisibility";
import { useAuth } from "@/contexts/AuthContext";

export default function VCSearchPage() {
  const { user } = useAuth();
  const publicTab = getPublicTabConfig('/vc-search');
  const { trackPageVisit } = useReadingAnalytics();
  const { relatedLinks, answerSummary } = insightaPageContent.vcSearch;

  // Track page visit when component mounts
  useEffect(() => {
    trackPageVisit('VC Search');
  }, [trackPageVisit]);

  // Structured data for VC Search page
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Find Your Perfect VC - Venture Capital Search",
      "description": "Search and filter through venture capitalists by investment stage, industry, check size, and geography",
      "url": "https://creatives-takeover.com/vc-search",
      "publisher": {
        "@type": "Organization",
        "name": "Creatives Takeover",
        "logo": {
          "@type": "ImageObject",
          "url": "https://creatives-takeover.com/favicon.png"
        }
      }
    },
    createSoftwareApplicationSchema({
      name: "VC Search",
      description: "Venture capital database and search tool for founders building investor target lists.",
      url: "/vc-search",
      featureList: ["investor filters", "vc firm discovery", "stage and geography search"],
    }),
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'VC Search', url: '/vc-search' }
    ])
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Find Your Perfect VC - Creatives Takeover"
        description="Search and filter through venture capitalists by investment stage, industry, check size, and geography. Click any VC to view their full profile and contact information."
        keywords="venture capital database, vc search tool, investor database, venture capital firms list, startup investor research"
        url="/vc-search"
        structuredData={structuredData}
      />
      <Navigation />

      <main>
        <section className="px-4 pt-28 pb-20 md:pt-32 lg:pt-36 relative overflow-hidden" data-section="vc-search">
          <VCWallpaper />

          <div className="container mx-auto max-w-5xl relative z-10">
            {/* Page Header */}
            <div className="text-center mb-12 sm:mb-16">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 takeover-gradient creatives-font animate-fade-in leading-tight pb-2">
                VC Search
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in px-4" style={{ animationDelay: '0.3s' }}>
                Search and filter venture capitalist firms by<span className="gradient-text font-semibold" style={{ lineHeight: 'inherit', marginLeft: '0.25rem' }}> investment stage, industry, and geography.</span>
              </p>
              <RelatedPageLinks title="Related fundraising tools" links={relatedLinks} />
            </div>

            {user ? (
              <VCSearchTab />
            ) : (
              publicTab && (
                <PreviewModeWrapper
                  featureName={publicTab.featureName}
                  description={publicTab.description || ''}
                  showPricingCta={publicTab.showPricingCta}
                >
                  <VCSearchTab />
                </PreviewModeWrapper>
              )
            )}

            <div className="mt-10 space-y-8">
              <AnswerSummary
                title={answerSummary.title}
                description={answerSummary.description}
                updatedLabel={answerSummary.updatedLabel}
                items={answerSummary.items}
              />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
