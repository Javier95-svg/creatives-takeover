import SEO, { createAboutPageSchema, createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AboutHero from "@/components/AboutHero";

import MissionVision from "@/components/MissionVision";
import MeetTheTeam from "@/components/MeetTheTeam";

import ContactUs from "@/components/ContactUs";
import AboutWallpaper from "@/components/wallpapers/AboutWallpaper";

const About = () => {
  // Structured data for About page
  const structuredData = [
    createAboutPageSchema(),
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'About', url: '/about' }
    ])
  ];

  return (
    <>
      <SEO
        title="About Creatives Takeover - Empowering Creators & Solopreneurs"
        description="Learn about Creatives Takeover's mission and vision to empower creators and solopreneurs with AI and no-code solutions. See how we work and what we do."
        keywords="about Creatives Takeover, creator platform, no-code community, solopreneur tools, AI co-founder, creative business platform"
        url="/about"
        canonical="https://creatives-takeover.com/about"
        image="/lovable-uploads/new-favicon.png"
        structuredData={structuredData}
      />
      <div className="relative min-h-screen overflow-hidden">
        <AboutWallpaper />
        <div className="relative z-10">
          <Navigation />
          <AboutHero />
          <MissionVision />
          <MeetTheTeam />
          <ContactUs />
        </div>
      </div>
      <Footer />
    </>
  );
};

export default About;