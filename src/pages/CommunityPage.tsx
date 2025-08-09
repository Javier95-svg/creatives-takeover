import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import CommunityFeed from "@/components/community/CommunityFeed";
import Footer from "@/components/Footer";

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
      <div className="min-h-screen bg-background">
        <Navigation />
        <CommunityFeed />
        <Footer />
      </div>
    </>
  );
};

export default CommunityPage;