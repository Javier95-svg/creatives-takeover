import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import PricingHero from "@/components/PricingHero";
import Pricing from "@/components/Pricing";
import FeatureComparison from "@/components/FeatureComparison";
import TrustBadges from "@/components/TrustBadges";
import PricingCTA from "@/components/PricingCTA";

const PricingPage = () => {
  return (
    <>
      <Helmet>
        <title>Pricing | Affordable Creative Platform Pricing | Creatives Takeover</title>
        <meta 
          name="description" 
          content="Affordable creative platform pricing with flexible membership tiers. Choose from Starter, Plus, or Family plans with unlimited design access and premium features." 
        />
        <meta name="keywords" content="affordable creative platform pricing, creative subscription pricing, unlimited design pricing, creative membership plans" />
        <meta property="og:title" content="Affordable Creative Platform Pricing | Creatives Takeover" />
        <meta property="og:description" content="Flexible pricing plans for every creative. Start with our affordable membership tiers and unlock unlimited design potential." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <PricingHero />
        <Pricing />
        <FeatureComparison />
        <TrustBadges />
        <PricingCTA />
      </div>
    </>
  );
};

export default PricingPage;