import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Pricing from "@/components/Pricing";
import PricingComparison from "@/components/PricingComparison";
import PricingCTA from "@/components/PricingCTA";
import AnimatedBackground from "@/components/AnimatedBackground";

const PricingPage = () => {
  return (
    <>
      <Helmet>
        <title>AI Solopreneur Pricing Plans | Choose Your Creative Journey | Creatives Takeover</title>
        <meta 
          name="description" 
          content="Discover AI solopreneur pricing plans designed for creative professionals. Choose from Starter, Elite, or Teams plans with AI-powered tools and unlimited design access." 
        />
        <meta name="keywords" content="AI solopreneur pricing plans, creative subscription pricing, AI tools pricing, solopreneur software plans, creative platform pricing" />
        <meta property="og:title" content="AI Solopreneur Pricing Plans | Creative Platform" />
        <meta property="og:description" content="Flexible AI solopreneur pricing plans for creative professionals. Start your journey with our affordable subscription tiers." />
      </Helmet>
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10">
          <Navigation />
          <Pricing />
          <PricingComparison />
          <PricingCTA />
        </div>
      </div>
    </>
  );
};

export default PricingPage;