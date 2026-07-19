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


const PricingPage = () => {
  useEffect(() => {
    trackPricingViewed({ source: 'direct' });
  }, []);
  // Structured data for pricing tiers
  const structuredData = [
    createProductSchema({
      name: "Creatives Takeover Rookie Plan",
      description: "Clarify who to serve first with both visitor AHA previews, a customer decision workflow, and 50 monthly credits.",
      price: 0,
      currency: "USD"
    }),
    createProductSchema({
      name: "Creatives Takeover Starter Plan",
      description: "Validate demand with 100 monthly credits, Demo Studio proof workflows, PMF evidence, and structured execution.",
      price: 9,
      currency: "USD"
    }),
    createProductSchema({
      name: "Creatives Takeover Rising Plan",
      description: "Build and launch with 250 monthly credits, evidence backed MVP workflows, GTM execution, and traction measurement.",
      price: 29,
      currency: "USD"
    }),
    createProductSchema({
      name: "Creatives Takeover Pro Plan",
      description: "Accelerate and fundraise with 600 monthly credits, expert accountability within 48 hours, deeper research, and fundraising workflows.",
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
