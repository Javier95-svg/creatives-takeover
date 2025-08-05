import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Pricing from "@/components/Pricing";

const PricingPage = () => {
  return (
    <>
      <Helmet>
        <title>Pricing | Affordable Creative Platform Pricing | Creatives Takeover</title>
        <meta 
          name="description" 
          content="Affordable creative platform pricing with flexible membership tiers. Choose from Starter, Plus, or Family plans." 
        />
        <meta name="keywords" content="affordable creative platform pricing, creative subscription pricing, unlimited design pricing" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <Pricing />
      </div>
    </>
  );
};

export default PricingPage;