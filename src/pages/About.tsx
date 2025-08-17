import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import AboutHero from "@/components/AboutHero";

import MissionVision from "@/components/MissionVision";

import HowWeWork from "@/components/HowWeWork";
import AnimatedBackground from "@/components/AnimatedBackground";

const About = () => {
  return (
    <>
      <Helmet>
        <title>About Creatives Takeover - Empowering Creators & Solopreneurs</title>
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
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background/95" />
        <AnimatedBackground />
        <div className="relative z-10">
          <Navigation />
          <AboutHero />
          <MissionVision />
          
          <HowWeWork />
        </div>
      </div>
    </>
  );
};

export default About;