import SEO from "@/components/SEO";
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
      <SEO
        title="Startup Resources for Founders | Creatives Takeover"
        description="Explore founder resources, startup guides, templates, and practical learning materials for validation, MVP planning, launch, and fundraising."
        keywords="startup resources, founder guides, startup templates, idea validation, MVP planning, fundraising resources"
        url="/resources"
      />
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
