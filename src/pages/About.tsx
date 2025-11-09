import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AboutHero from "@/components/AboutHero";

import MissionVision from "@/components/MissionVision";

import HowWeWork from "@/components/HowWeWork";
import AboutWallpaper from "@/components/wallpapers/AboutWallpaper";
import TeamSection from "@/components/TeamSection";

const About = () => {
  return (
    <>
      <Helmet>
        <title>Creatives Takeover</title>
        <meta 
          name="description" 
          content="Learn about Creatives Takeover's mission and vision to empower creators and solopreneurs with AI and no-code solutions. See how we work and what we do." 
        />
        <meta name="keywords" content="about Creatives Takeover, creator platform, no-code community, solopreneur tools" />
        <meta property="og:title" content="About Creatives Takeover - Empowering Creators & Solopreneurs" />
        <meta property="og:description" content="Learn about Creatives Takeover's mission and vision to empower creators and solopreneurs with AI and no-code solutions." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={typeof window !== 'undefined' ? `${window.location.origin}/about` : '/about'} />
      </Helmet>
      <div className="relative min-h-screen overflow-hidden">
        <AboutWallpaper />
        <div className="relative z-10">
          <Navigation />
          <AboutHero />
          <MissionVision />
          <TeamSection />
          <HowWeWork />
        </div>
      </div>
      <Footer />
    </>
  );
};

export default About;