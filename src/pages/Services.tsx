import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import ServicesHero from "@/components/ServicesHero";
import SubscriptionFeatures from "@/components/SubscriptionFeatures";
import ServiceBenefits from "@/components/ServiceBenefits";
import CTASection from "@/components/CTASection";

const Services = () => {
  return (
    <>
      <Helmet>
        <title>Creative Subscription Services | Unlimited Design Platform | Creatives Takeover</title>
        <meta 
          name="description" 
          content="Discover our creative subscription services offering unlimited design, AI-powered tools, and comprehensive creative platform solutions. Start your free trial today!" 
        />
        <meta name="keywords" content="creative subscription services, unlimited design, creative platform, design subscription, AI creative tools, creative services" />
        <meta property="og:title" content="Creative Subscription Services | Unlimited Design Platform" />
        <meta property="og:description" content="Transform your creative workflow with our unlimited design subscription and AI-powered creative platform." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <ServicesHero />
        <SubscriptionFeatures />
        <ServiceBenefits />
        <CTASection />
      </div>
    </>
  );
};

export default Services;