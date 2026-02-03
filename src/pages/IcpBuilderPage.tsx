import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { lazy, Suspense, useEffect } from "react";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useLeanStartupStore } from "@/store/leanStartupStore";
import { Loader2 } from "lucide-react";

const ICPBuilder = lazy(() => import("@/components/icp/ICPBuilder"));

export default function ICPBuilderPage() {
  const { trackPageVisit } = useReadingAnalytics();
  const { markToolUsed } = useLeanStartupStore();

  useEffect(() => { markToolUsed('icp-builder'); }, [markToolUsed]);

  useEffect(() => {
    trackPageVisit('ICP Builder');
  }, [trackPageVisit]);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "ICP Builder - Identify Your Ideal Customer",
      "description": "Identify your ideal customer profile and niche market. Get detailed pain point analysis and positioning strategy to stand out.",
      "url": "https://creatives-takeover.com/icp-builder",
      "publisher": {
        "@type": "Organization",
        "name": "Creatives Takeover",
        "logo": {
          "@type": "ImageObject",
          "url": "https://creatives-takeover.com/lovable-uploads/new-favicon.png"
        }
      }
    },
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'BizMap AI', url: '/bizmap-ai' },
      { name: 'ICP Builder', url: '/icp-builder' }
    ])
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="ICP Builder - Creatives Takeover"
        description="Identify your ideal customer profile and niche market with AI-powered insights, pain point analysis, and positioning strategy."
        keywords="ICP, ideal customer profile, niche market, target market, customer persona, positioning strategy, pain points"
        url="/icp-builder"
        structuredData={structuredData}
      />
      <Navigation />

      <main>
        <section className="py-20 px-4 relative overflow-hidden" data-section="icp-builder">
          {/* Background styling */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
            <div
              className="absolute -top-40 -right-48 w-[55rem] h-[55rem] rounded-full opacity-70 blur-3xl animate-[spin_28s_linear_infinite]"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.3), transparent 60%), radial-gradient(circle at 70% 70%, rgba(16, 185, 129, 0.35), transparent 55%)',
                animationDuration: '28s'
              }}
            />
          </div>

          <div className="container mx-auto max-w-5xl relative z-10">
            {/* Page Header */}
            <div className="text-center mb-12 sm:mb-16">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 takeover-gradient creatives-font animate-fade-in leading-tight pb-2">
                ICP Builder
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in px-4" style={{ animationDelay: '0.3s' }}>
                Identify your ideal customer and specific niche market.
                <span className="gradient-text font-semibold" style={{ lineHeight: 'inherit', marginLeft: '0.25rem' }}>
                  Get a positioning strategy that makes you stand out.
                </span>
              </p>
            </div>

            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading ICP Builder...</p>
                </div>
              }
            >
              <ICPBuilder />
            </Suspense>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
