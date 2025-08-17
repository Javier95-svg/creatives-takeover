import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import AboutHero from "@/components/AboutHero";
import MissionVision from "@/components/MissionVision";
import AnimatedBackground from "@/components/AnimatedBackground";
import Footer from "@/components/Footer";

const About = () => {
  return (
    <>
      <Helmet>
        <title>About BizMap AI - Empowering Creators & Entrepreneurs</title>
        <meta 
          name="description" 
          content="Learn about BizMap AI's mission to democratize entrepreneurship with AI-powered tools. Transform your business ideas into reality with our platform." 
        />
        <meta name="keywords" content="about BizMap AI, AI business tools, startup platform, entrepreneurship, business automation" />
        <meta property="og:title" content="About BizMap AI - Empowering Creators & Entrepreneurs" />
        <meta property="og:description" content="Discover how BizMap AI is revolutionizing entrepreneurship with AI-powered automation tools and accessible startup solutions." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={typeof window !== 'undefined' ? `${window.location.origin}/about` : '/about'} />
      </Helmet>
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10">
          <Navigation />
          <AboutHero />
          <MissionVision />
        </div>
      </div>
      <Footer />
    </>
  );
};

export default About;