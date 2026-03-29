import SEO, { createBreadcrumbSchema, createSoftwareApplicationSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import RelatedPageLinks from "@/components/seo/RelatedPageLinks";
import AcceleratorHuntTab from "@/components/insighta/AcceleratorHuntTab";
import { AcceleratorWallpaper } from "@/components/accelerator/AcceleratorWallpaper";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useEffect } from "react";

export default function AcceleratorHuntPage() {
  const { trackPageVisit } = useReadingAnalytics();
  const relatedLinks = [
    { href: "/insighta/vc-search", label: "VC Search" },
    { href: "/insighta/email-templates", label: "Email Templates" },
    { href: "/insighta/pitch-deck-analyzer", label: "Pitch Deck Analyzer" },
    { href: "/insighta/test", label: "Fundraising Assessment" },
  ];

  // Track page visit when component mounts
  useEffect(() => {
    trackPageVisit('Accelerator Hunt');
  }, [trackPageVisit]);

  // Structured data for Accelerator Hunt page
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Startup Accelerator Database",
      "description": "Search a startup accelerator database by location, focus, and funding profile to build a better shortlist.",
      "url": "https://creatives-takeover.com/insighta/accelerator-hunt",
      "publisher": {
        "@type": "Organization",
        "name": "Creatives Takeover",
        "logo": {
          "@type": "ImageObject",
          "url": "https://creatives-takeover.com/lovable-uploads/new-favicon.png"
        }
      }
    },
    createSoftwareApplicationSchema({
      name: "Accelerator Hunt",
      description: "Startup accelerator search tool for shortlisting relevant accelerators by focus, funding, and geography.",
      url: "/insighta/accelerator-hunt",
      featureList: ["accelerator discovery", "location filters", "funding filters", "program research"],
    }),
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Insighta', url: '/insighta' },
      { name: 'Accelerator Hunt', url: '/insighta/accelerator-hunt' }
    ])
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Startup Accelerator Database | Creatives Takeover"
        description="Search a startup accelerator database by location, focus area, and funding profile to shortlist the right programs faster."
        keywords="startup accelerator database, accelerator search, accelerator list, startup accelerator finder, y combinator alternatives"
        url="/insighta/accelerator-hunt"
        structuredData={structuredData}
      />
      <Navigation />

      <main>
        <section className="px-4 pt-28 pb-20 md:pt-32 lg:pt-36 relative overflow-hidden" data-section="accelerator-hunt">
          <AcceleratorWallpaper />

          <div className="container mx-auto max-w-5xl relative z-10">
            {/* Page Header */}
            <div className="text-center mb-12 sm:mb-16">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 takeover-gradient creatives-font animate-fade-in leading-tight pb-2">
                Startup Accelerator Search
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in px-4" style={{ animationDelay: '0.3s' }}>
                Search accelerator programs by<span className="gradient-text font-semibold" style={{ lineHeight: 'inherit', marginLeft: '0.25rem' }}> location, focus area, funding, and fit.</span>
              </p>
              <RelatedPageLinks title="Related fundraising tools" links={relatedLinks} />
            </div>

            <AcceleratorHuntTab />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
