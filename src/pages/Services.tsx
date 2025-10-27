import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ServicesHero from "@/components/ServicesHero";
import SubscriptionFeatures from "@/components/SubscriptionFeatures";
import ServicesNavigation from "@/components/ServicesNavigation";
import AnimatedBackground from "@/components/AnimatedBackground";

const Services = () => {
  return (
    <>
      <Helmet>
        <title>Creatives Takeover</title>
        <meta 
          name="description" 
          content="Transform your creative workflow with our creative subscription service. Unlimited design access, AI-powered tools, and premium features for modern creatives." 
        />
        <meta name="keywords" content="creative subscription, creative subscription service, unlimited design platform, creative tools subscription, design subscription" />
        <meta property="og:title" content="Creative Subscription Services | Unlimited Design Platform" />
        <meta property="og:description" content="Join thousands of creatives with our all-in-one creative subscription service. Unlimited design access and premium tools." />
        <link rel="canonical" href="/services" />
      </Helmet>
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10">
          <Navigation />
          <ServicesHero />
          <SubscriptionFeatures />
          <ServicesNavigation />
        </div>
        <Footer />
      </div>
    </>
  );
};

export default Services;