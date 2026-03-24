import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AcceleratorHuntTab from "@/components/insighta/AcceleratorHuntTab";
import { AcceleratorWallpaper } from "@/components/accelerator/AcceleratorWallpaper";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useEffect } from "react";

export default function AcceleratorHuntPage() {
  const { trackPageVisit } = useReadingAnalytics();

  // Track page visit when component mounts
  useEffect(() => {
    trackPageVisit('Accelerator Hunt');
  }, [trackPageVisit]);

  // Structured data for Accelerator Hunt page
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Find Your Perfect Accelerator - Accelerator Programs Search",
      "description": "Discover accelerator programs offering funding, mentorship, and resources. Filter by location, industry focus, and funding amount to find the best fit.",
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
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Insighta', url: '/insighta' },
      { name: 'Accelerator Hunt', url: '/insighta/accelerator-hunt' }
    ])
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Find Your Perfect Accelerator - Creatives Takeover"
        description="Discover accelerator programs offering funding, mentorship, and resources. Filter by location, industry focus, and funding amount to find the best fit."
        keywords="startup accelerator, accelerator programs, startup funding, mentorship, Y Combinator, Techstars"
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
                Accelerator Hunt
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed animate-fade-in px-4" style={{ animationDelay: '0.3s' }}>
                Discover accelerator programs offering<span className="gradient-text font-semibold" style={{ lineHeight: 'inherit', marginLeft: '0.25rem' }}> funding, mentorship, and resources.</span>
              </p>
            </div>

            <AcceleratorHuntTab />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
