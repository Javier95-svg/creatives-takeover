import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import AboutHero from "@/components/AboutHero";
import TeamSection from "@/components/TeamSection";
import MissionVision from "@/components/MissionVision";
import InternalLinks from "@/components/InternalLinks";

const About = () => {
  return (
    <>
      <Helmet>
        <title>About Creatives Takeover - Empowering Creators & Solopreneurs</title>
        <meta 
          name="description" 
          content="Learn about Creatives Takeover's mission to empower creators and solopreneurs with no-code solutions. Meet our team and discover how we're building the future of creative technology." 
        />
        <meta name="keywords" content="about Creatives Takeover, creator platform, no-code community, solopreneur tools" />
        <meta property="og:title" content="About Creatives Takeover - Empowering Creators & Solopreneurs" />
        <meta property="og:description" content="Learn about Creatives Takeover's mission to empower creators and solopreneurs with no-code solutions." />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <AboutHero />
        <MissionVision />
        <TeamSection />
        <InternalLinks />
      </div>
    </>
  );
};

export default About;