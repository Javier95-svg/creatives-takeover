import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import VCSearchTab from "@/components/insighta/VCSearchTab";
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
          {/* Background styling */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
            <div
              className="absolute -top-40 -right-48 w-[55rem] h-[55rem] rounded-full opacity-70 blur-3xl animate-[spin_28s_linear_infinite]"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, rgba(56, 189, 248, 0.3), transparent 60%), radial-gradient(circle at 70% 70%, rgba(192, 132, 252, 0.35), transparent 55%)',
                animationDuration: '28s'
              }}
            />
          </div>

          <div className="container mx-auto max-w-5xl relative z-10">
            <VCSearchTab />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
