import SEO, { createFAQSchema, createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import FAQHero from "@/components/FAQHero";
import SearchableFAQ from "@/components/SearchableFAQ";
import FAQNavigation from "@/components/FAQNavigation";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import PageFAQSection from "@/components/seo/PageFAQSection";
import { PLATFORM_FAQS } from "@/config/platformFaq";

const FAQPage = () => {
  // Structured data for FAQ page
  const structuredData = [
    createFAQSchema(PLATFORM_FAQS),
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'FAQ', url: '/faq' }
    ])
  ];

  return (
    <>
      <SEO
        title="FAQ | Creatives Takeover"
        description="Answers to common questions about Creatives Takeover's AI startup tools, pricing, credits, BizMap AI, PMF Lab, Insighta, and community features."
        keywords="FAQ, frequently asked questions, startup platform help, BizMap AI, PMF Lab, pricing, credits, VC Search, Pitch Deck Analyzer"
        url="/faq"
        canonical="https://creatives-takeover.com/faq"
        structuredData={structuredData}
      />
      <div className="relative min-h-screen overflow-hidden">
        <HomeWallpaper />
        <div className="relative z-10">
          <Navigation />
          <FAQHero />
          <div className="container mx-auto px-4 py-10 sm:px-6">
            <PageFAQSection
              title="Platform essentials"
              description="Direct, citable answers to the questions founders ask before choosing a plan or starting a workflow."
              faqs={PLATFORM_FAQS}
            />
          </div>
          <ScrollReveal>
            <SearchableFAQ />
          </ScrollReveal>
          <ScrollReveal>
            <FAQNavigation />
          </ScrollReveal>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default FAQPage;
