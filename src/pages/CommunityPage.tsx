import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AnimatedBackground from "@/components/AnimatedBackground";
import ChatbotWidget from "@/components/ChatbotWidget";
import SkoolStyleCommunityFeed from "@/components/community/SkoolStyleCommunityFeed";

const CommunityPage = () => {
  return (
    <>
      <Helmet>
        <title>Community | Creatives Takeover</title>
        <meta 
          name="description" 
          content="Join our entrepreneurial community. Share your journey, get feedback, and connect with fellow creators and entrepreneurs." 
        />
        <meta name="keywords" content="entrepreneur community, startup network, business community, creator community" />
        <meta property="og:title" content="Entrepreneur Community" />
        <meta property="og:description" content="Connect with fellow entrepreneurs, share your journey, and grow together." />
        <link rel="canonical" href="/community" />
      </Helmet>
      <div className="relative min-h-screen overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10">
          <Navigation />
          <SkoolStyleCommunityFeed />
          <Footer />
          <ChatbotWidget />
        </div>
      </div>
    </>
  );
};

export default CommunityPage;