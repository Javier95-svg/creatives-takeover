import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AcceleratorHuntTab from "@/components/insighta/AcceleratorHuntTab";
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
        <section className="container mx-auto px-4 py-12">
          <AcceleratorHuntTab />
        </section>
      </main>

      <Footer />
    </div>
  );
}
