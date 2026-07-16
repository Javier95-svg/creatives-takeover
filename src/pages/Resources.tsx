import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ResourcesHero from "@/components/ResourcesHero";
import TutorialsSection from "@/components/TutorialsSection";
import GuidesSection from "@/components/GuidesSection";
import DownloadsSection from "@/components/DownloadsSection";
import ResourcesNavigation from "@/components/ResourcesNavigation";
import AnimatedBackground from "@/components/AnimatedBackground";
import FounderAnswerLibraryTeaser from "@/components/seo/FounderAnswerLibraryTeaser";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

const Resources = () => {
  return (
    <>
      <Helmet>
        <title>Resources | Creatives Takeover</title>
        <meta 
          name="description" 
          content="Access free creative resources including tutorials, design guides, templates, and downloads. Learn creative skills with our comprehensive resource library." 
        />
        <meta name="keywords" content="creative resources, free tutorials, design guides, creative downloads, design templates, creative learning resources, free design assets" />
        <meta property="og:title" content="Free Creative Resources | Tutorials, Guides & Downloads" />
        <meta property="og:description" content="Discover our comprehensive library of free creative resources, tutorials, and guides to enhance your creative skills." />
        <link rel="canonical" href="https://creatives-takeover.com/resources" />
      </Helmet>
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10">
          <Navigation />
          <ResourcesHero />
          <ScrollReveal>
            <FounderAnswerLibraryTeaser />
          </ScrollReveal>
          <ScrollReveal>
            <TutorialsSection />
          </ScrollReveal>
          <ScrollReveal>
            <GuidesSection />
          </ScrollReveal>
          <ScrollReveal>
            <DownloadsSection />
          </ScrollReveal>
          <ScrollReveal>
            <ResourcesNavigation />
          </ScrollReveal>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default Resources;
