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


const PricingPage = () => {
  useEffect(() => {
    trackPricingViewed({ source: 'direct' });
  }, []);
  // Structured data for pricing tiers
  const structuredData = [
    createProductSchema({
      name: "Creatives Takeover Rookie Plan",
      description: "Free founder plan with 50 monthly credits, free ICP Builder access, and early-stage startup validation tools.",
      price: 0,
      currency: "USD"
    }),
    createProductSchema({
      name: "Creatives Takeover Starter Plan",
      description: "Validation-focused founder plan with 50 monthly credits, Waitlist Maker, PMF Lab, and light fundraising access.",
      price: 9,
      currency: "USD"
    }),
    createProductSchema({
      name: "Creatives Takeover Rising Plan",
      description: "The default build plan with 100 monthly credits, full startup tool access, and fundraising workflows for active founders.",
      price: 29,
      currency: "USD"
    }),
    createProductSchema({
      name: "Creatives Takeover Pro Plan",
      description: "Scaling and fundraising plan with 300 monthly credits, unlimited investor research views, office hours, and priority support.",
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
        title="Pricing For AI Startup Tools | Creatives Takeover"
        description="Compare pricing for Creatives Takeover's AI startup tools, founder workflows, fundraising resources, and MVP planning features."
        keywords="ai startup tools pricing, founder software pricing, startup platform pricing, fundraising tools pricing, mvp builder pricing"
        url="/pricing"
        structuredData={structuredData}
      />
      <div className="relative min-h-screen overflow-hidden">
        <HomeWallpaper />
        <div className="relative z-10">
          <Navigation />
          <Pricing />
          <PricingComparison />
          <SubscriptionFeatures />
          <PricingFAQ />
          <Footer />
        </div>
      </div>
    </>
  );
};

export default PricingPage;
