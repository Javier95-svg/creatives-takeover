import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { lazy, Suspense } from "react";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

// Lazy load the PMF Lab component
const ProductMarketFitLab = lazy(() => import("@/components/pmf/ProductMarketFitLab"));

export default function PMFLabPage() {
  const { trackPageVisit } = useReadingAnalytics();

  // Track page visit when component mounts
  useEffect(() => {
    trackPageVisit('Product Market Fit Lab');
  }, [trackPageVisit]);

  // Structured data for PMF Lab page
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Product Market Fit Lab - Validate Your Business Idea",
      "description": "Analyze your product-market fit with AI-powered insights. Validate your business concept, understand your target market, and get actionable recommendations.",
      "url": "https://creatives-takeover.com/bizmap-ai/pmf-lab",
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
      { name: 'Product Market Fit Lab', url: '/bizmap-ai/pmf-lab' }
    ])
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Product Market Fit Lab - Creatives Takeover"
        description="Analyze your product-market fit with AI-powered insights. Validate your business concept, understand your target market, and get actionable recommendations for success."
        keywords="product market fit, PMF analysis, business validation, market analysis, startup validation, product validation"
        url="/bizmap-ai/pmf-lab"
        structuredData={structuredData}
      />
      <Navigation />

      <main>
        <section className="py-20 px-4 relative overflow-hidden" data-section="pmf-lab">
          {/* Background styling */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
            <div
              className="absolute -top-40 -right-48 w-[55rem] h-[55rem] rounded-full opacity-70 blur-3xl animate-[spin_28s_linear_infinite]"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, rgba(139, 92, 246, 0.3), transparent 60%), radial-gradient(circle at 70% 70%, rgba(236, 72, 153, 0.35), transparent 55%)',
                animationDuration: '28s'
              }}
            />
          </div>

          <div className="container mx-auto max-w-5xl relative z-10">
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading Product Market Fit Lab...</p>
                </div>
              }
            >
              <ProductMarketFitLab />
            </Suspense>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
