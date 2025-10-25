import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ResourcesHero from "@/components/ResourcesHero";
import TutorialsSection from "@/components/TutorialsSection";
import GuidesSection from "@/components/GuidesSection";
import DownloadsSection from "@/components/DownloadsSection";
import ResourcesNavigation from "@/components/ResourcesNavigation";
import AnimatedBackground from "@/components/AnimatedBackground";

const Resources = () => {
  return (
    <>
      <Helmet>
        <title>Free Resources for Creative Entrepreneurs & Solopreneurs | AI Tools & Guides</title>
        <meta 
          name="description" 
          content="Access free resources for creative entrepreneurs and solopreneurs: AI business tools, tutorials, templates, and guides. Learn creative business skills with our comprehensive resource library." 
        />
        <meta name="keywords" content="solopreneur resources, creative entrepreneur tools, AI tools for solopreneurs, creative business resources, free business templates, creative entrepreneur guides, solopreneur tutorials" />
        <meta property="og:title" content="Free Resources for Creative Entrepreneurs | AI Tools & Guides" />
        <meta property="og:description" content="Comprehensive library of free resources for creative entrepreneurs and solopreneurs—AI tools, templates, and business guides." />
        <link rel="canonical" href="/resources" />
      </Helmet>
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10">
          <Navigation />
          <ResourcesHero />
          <TutorialsSection />
          <GuidesSection />
          <DownloadsSection />
          <ResourcesNavigation />
        </div>
        <Footer />
      </div>
    </>
  );
};

export default Resources;