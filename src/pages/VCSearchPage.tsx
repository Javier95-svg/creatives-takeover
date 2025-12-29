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
        <section className="container mx-auto px-4 py-12">
          <VCSearchTab />
        </section>
      </main>

      <Footer />
    </div>
  );
}
