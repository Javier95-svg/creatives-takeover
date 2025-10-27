import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import CommunityFeed from "@/components/community/CommunityFeed";
import CommunityHero from "@/components/CommunityHero";
import Footer from "@/components/Footer";
import AnimatedBackground from "@/components/AnimatedBackground";


const CommunityPage = () => {
  return (
    <>
      <Helmet>
        <title>Entrepreneur Stories Community | Creatives Takeover</title>
        <meta 
          name="description" 
          content="Reddit-style community to share entrepreneurial journeys: wins, failures, and lessons. Post stories, discuss, and learn together." 
        />
        <meta name="keywords" content="entrepreneur stories, startup lessons, founder community, reddit-style forum, share your journey" />
        <meta property="og:title" content="Entrepreneur Stories Community" />
        <meta property="og:description" content="Share your journey. Learn from others. A Reddit-style hub for entrepreneurs." />
        <link rel="canonical" href="/community" />
      </Helmet>
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10">
          <Navigation />
          <div className="pt-16">
            <CommunityHero />
            <CommunityFeed />
            <Footer />
          </div>
        </div>
      </div>
    </>
  );
};

export default CommunityPage;