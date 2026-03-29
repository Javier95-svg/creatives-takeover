import SEO, { createProductSchema, createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Pricing from "@/components/Pricing";
import SubscriptionFeatures from "@/components/SubscriptionFeatures";
import PricingComparison from "@/components/PricingComparison";
import PricingFAQ from "@/components/PricingFAQ";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";


const PricingPage = () => {
  // Structured data for pricing tiers
  const structuredData = [
    createProductSchema({
      name: "Creatives Takeover Starter Plan",
      description: "AI-powered business planning and creative tools for solopreneurs starting their journey.",
      price: 29,
      currency: "USD"
    }),
    createProductSchema({
      name: "Creatives Takeover Elite Plan",
      description: "Advanced AI tools, unlimited design access, and priority support for growing creative businesses.",
      price: 99,
      currency: "USD"
    }),
    createProductSchema({
      name: "Creatives Takeover Teams Plan",
      description: "Complete creative business platform with collaboration tools for creative teams and agencies.",
      price: 299,
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
