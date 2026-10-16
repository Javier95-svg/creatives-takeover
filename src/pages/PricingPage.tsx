import { useEffect } from "react";
import SEO, { createProductSchema, createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Pricing from "@/components/Pricing";
import SubscriptionFeatures from "@/components/SubscriptionFeatures";
import PricingComparison from "@/components/PricingComparison";
import PricingFAQ from "@/components/PricingFAQ";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { trackPricingViewed } from "@/lib/analytics";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

// The plans above are for founders. Programs and sponsors get a quote per
// cohort, so the band sends them to the form instead of showing a price.
const ProgramsPricingBand = () => (
  <section className="container mx-auto px-4 pb-4 sm:px-6">
    <div className="surface-panel trust-outline mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 rounded-3xl px-6 py-5 sm:flex-row sm:items-center sm:px-8">
      <div>
        <p className="font-space-grotesk text-lg font-semibold text-foreground">Running a program or a fund?</p>
        <p className="text-sm text-muted-foreground">
          Cohort pricing for incubators, accelerators, universities and sponsors depends on the size of the cohort.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
        <Link to="/for-programs#talk" className="inline-flex items-center gap-1 text-primary hover:underline">
          For programs <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link to="/for-investors#talk" className="inline-flex items-center gap-1 text-primary hover:underline">
          For investors <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  </section>
);


const PricingPage = () => {
  useEffect(() => {
    trackPricingViewed({ source: 'direct' });
  }, []);
  // Structured data for pricing tiers
  const structuredData = [
    createProductSchema({
      name: "Creatives Takeover Rookie Plan",
      description: "Start building and testing for free with 50 monthly credits and standard AI models.",
      price: 0,
      currency: "USD"
    }),
    createProductSchema({
      name: "Creatives Takeover Starter Plan",
      description: "Validate faster with 100 monthly credits, the PROVE workspace, and five VC Search and five Accelerator Hunt profiles each month.",
      price: 9,
      currency: "USD"
    }),
    createProductSchema({
      name: "Creatives Takeover Rising Plan",
      description: "Turn evidence into products and customer acquisition with 250 monthly credits and advanced MVP models.",
      price: 29,
      currency: "USD"
    }),
    createProductSchema({
      name: "Creatives Takeover Pro Plan",
      description: "Gain maximum execution runway with 600 monthly credits, Find Your Angel, and unlimited research.",
      price: 65,
      currency: "USD"
    }),
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Pricing', url: '/pricing' }
    ])
  ];

  return (
    <>
      <SEO
        title="Founder Software Plans and Pricing | Creatives Takeover"
        description="Compare Creatives Takeover plans for evidence-backed validation, MVP building, customer acquisition, and startup research."
        keywords="ai startup tools pricing, founder software pricing, startup platform pricing, fundraising tools pricing, mvp builder pricing"
        url="/pricing"
        structuredData={structuredData}
      />
      <div className="relative min-h-screen overflow-hidden">
        <HomeWallpaper />
        <div className="relative z-10">
          <Navigation />
          <Pricing />
          <ProgramsPricingBand />
          <ScrollReveal>
            <PricingComparison />
          </ScrollReveal>
          <ScrollReveal>
            <SubscriptionFeatures />
          </ScrollReveal>
          <ScrollReveal>
            <PricingFAQ />
          </ScrollReveal>
          <Footer />
        </div>
      </div>
    </>
  );
};

export default PricingPage;
