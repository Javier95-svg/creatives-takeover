import SEO, { createProductSchema, createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Pricing from "@/components/Pricing";
import AnimatedBackground from "@/components/AnimatedBackground";
import SubscriptionFeatures from "@/components/SubscriptionFeatures";
import PricingComparison from "@/components/PricingComparison";
import PricingFAQ from "@/components/PricingFAQ";


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
        title="Creatives Takeover"
        description="Flexible AI solopreneur pricing plans for creative professionals. Choose from Starter ($29), Elite ($99), or Teams ($299) plans with AI-powered tools and unlimited design access."
        keywords="AI solopreneur pricing, creative subscription pricing, AI tools pricing, solopreneur software plans, creative platform pricing"
        url="/pricing"
        structuredData={structuredData}
      />
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10">
          <Navigation />
          <Pricing />
          <SubscriptionFeatures />
          <PricingComparison />
          <PricingFAQ />
          <Footer />
        </div>
      </div>
    </>
  );
};

export default PricingPage;