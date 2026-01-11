import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import VCSearchTab from "@/components/insighta/VCSearchTab";
import { VCWallpaper } from "@/components/vc-search/VCWallpaper";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useEffect } from "react";

export default function VCSearchPage() {
  const { trackPageVisit } = useReadingAnalytics();

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
      "url": "https://creatives-takeover.com/insighta/vc-search",
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
      { name: 'Insighta', url: '/insighta' },
      { name: 'VC Search', url: '/insighta/vc-search' }
    ])
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Find Your Perfect VC - Creatives Takeover"
        description="Search and filter through venture capitalists by investment stage, industry, check size, and geography. Click any VC to view their full profile and contact information."
        keywords="venture capital search, VC finder, startup funding, investment stage, venture capitalists"
        url="/insighta/vc-search"
        structuredData={structuredData}
      />
      <Navigation />

      <main>
        <section className="py-20 px-4 relative overflow-hidden" data-section="vc-search">
          <VCWallpaper />

          <div className="container mx-auto max-w-5xl relative z-10">
            {/* Page Header */}
            <div className="text-center mb-12 sm:mb-16">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 takeover-gradient creatives-font animate-fade-in leading-tight pb-2">
                VC Search
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in px-4" style={{ animationDelay: '0.3s' }}>
                Search and filter through venture capitalists by<span className="gradient-text font-semibold" style={{ lineHeight: 'inherit', marginLeft: '0.25rem' }}> investment stage, industry, and geography.</span>
              </p>
            </div>

            <VCSearchTab />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
