import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import ClientLogos from "@/components/ClientLogos";
import FeatureShowcase from "@/components/FeatureShowcase";
import Testimonials from "@/components/Testimonials";
import CTASection from "@/components/CTASection";
import StickySectionNav from "@/components/StickySectionNav";
import HowWeWork from "@/components/HowWeWork";
import Benefits from "@/components/Benefits";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <StickySectionNav />
      <main>
        <Hero />
        <ClientLogos />
        <HowWeWork />
        <FeatureShowcase />
        <Benefits />
        <Testimonials />
        <section id="get-started" className="scroll-mt-24">
          <CTASection />
        </section>
      </main>
    </div>
  );
};

export default Index;
