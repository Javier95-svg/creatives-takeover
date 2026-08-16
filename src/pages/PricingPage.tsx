import { useEffect } from "react";
import SEO, { createProductSchema, createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Pricing from "@/components/Pricing";
import SubscriptionFeatures from "@/components/SubscriptionFeatures";
import PricingComparison from "@/components/PricingComparison";
import PricingFAQ from "@/components/PricingFAQ";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { trackPricingViewed } from "@/lib/analytics";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import PricingWorkloadExamples from "@/components/PricingWorkloadExamples";
import { PLAN_CATALOG } from "@/config/planCatalog";


const PricingPage = () => {
  useEffect(() => {
    trackPricingViewed({ source: 'direct' });
  }, []);
  // Structured data for pricing tiers
  const structuredData = [
    ...PLAN_CATALOG.map((plan) => createProductSchema({ name: `Creatives Takeover ${plan.name} Plan`, description: `${plan.description} Includes ${plan.monthlyCredits} monthly credits.`, price: plan.monthlyPrice, currency: "USD" })),
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Pricing', url: '/pricing' }
    ])
  ];

  return (
    <>
      <SEO
        title="Founder Outcomes and Pricing | Creatives Takeover"
        description="Compare Rookie, Starter, Rising, and Pro by the founder outcome each plan enables, from customer clarity to expert backed fundraising."
        keywords="ai startup tools pricing, founder software pricing, startup platform pricing, fundraising tools pricing, mvp builder pricing"
        url="/pricing"
        structuredData={structuredData}
      />
      <div className="relative min-h-screen overflow-hidden">
        <HomeWallpaper />
        <div className="relative z-10">
          <Navigation />
          <Pricing />
          <ScrollReveal><PricingWorkloadExamples /></ScrollReveal>
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
