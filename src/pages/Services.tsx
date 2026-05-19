import SEO, { createServiceSchema, createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ServicesHero from "@/components/ServicesHero";
import SubscriptionFeatures from "@/components/SubscriptionFeatures";
import ServicesNavigation from "@/components/ServicesNavigation";
import AnimatedBackground from "@/components/AnimatedBackground";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

const Services = () => {
  // Structured data for Services page
  const structuredData = [
    createServiceSchema(),
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Services', url: '/services' }
    ])
  ];

  return (
    <>
      <SEO
        title="Creative Subscription Services | Unlimited Design Platform"
        description="Transform your creative workflow with our creative subscription service. Unlimited design access, AI-powered tools, and premium features for modern creatives."
        keywords="creative subscription, creative subscription service, unlimited design platform, creative tools subscription, design subscription, AI-powered creative tools"
        url="/services"
        canonical="https://creatives-takeover.com/services"
        image="/og-image.png"
        structuredData={structuredData}
      />
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10">
          <Navigation />
          <ServicesHero />
          <ScrollReveal>
            <SubscriptionFeatures />
          </ScrollReveal>
          <ScrollReveal>
            <ServicesNavigation />
          </ScrollReveal>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default Services;
