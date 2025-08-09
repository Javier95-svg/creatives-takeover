import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import ClientLogos from "@/components/ClientLogos";
import FeatureShowcase from "@/components/FeatureShowcase";
import Testimonials from "@/components/Testimonials";

import StickySectionNav from "@/components/StickySectionNav";
import HowWeWork from "@/components/HowWeWork";
import Benefits from "@/components/Benefits";
import { Helmet } from "react-helmet-async";
import Footer from "@/components/Footer";

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
      </main>
      <Footer />
    </div>
  );
};

export default Index;
