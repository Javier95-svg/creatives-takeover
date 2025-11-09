import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import CommunityFeed from "@/components/community/CommunityFeed";
import CommunityHero from "@/components/CommunityHero";
import Footer from "@/components/Footer";
import CommunityWallpaper from "@/components/wallpapers/CommunityWallpaper";


const CommunityPage = () => {
  return (
    <>
      <Helmet>
        <title>Creatives Community | Share Your Work & Get Feedback</title>
        <meta 
          name="description" 
          content="Join our vibrant community of artists, designers, musicians, writers, and filmmakers. Share your creative work, get feedback, and connect with fellow creatives." 
        />
        <meta name="keywords" content="creative community, artist community, designer network, musician collaboration, writer community, filmmaker forum, art feedback, creative showcase" />
        <meta property="og:title" content="Creatives Community | Share & Connect" />
        <meta property="og:description" content="A space for all creatives to share work, get feedback, and grow together." />
        <link rel="canonical" href="/community" />
      </Helmet>
      <div className="relative min-h-screen overflow-hidden">
        <CommunityWallpaper />
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