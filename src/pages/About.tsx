import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import AboutHero from "@/components/AboutHero";

import MissionVision from "@/components/MissionVision";

import HowWeWork from "@/components/HowWeWork";
import InternalLinks from "@/components/InternalLinks";

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
      <div className="min-h-screen bg-background">
        <Navigation />
        <AboutHero />
        <MissionVision />
        
        <HowWeWork />
        <InternalLinks />
      </div>
    </>
  );
};

export default About;