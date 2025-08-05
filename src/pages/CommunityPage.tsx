import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import CommunityHero from "@/components/CommunityHero";
import UserCollaboration from "@/components/UserCollaboration";
import CommunityTestimonials from "@/components/CommunityTestimonials";
import CommunityEvents from "@/components/CommunityEvents";
import CommunityNavigation from "@/components/CommunityNavigation";

const CommunityPage = () => {
  return (
    <>
      <Helmet>
        <title>Creative Community | Join Our Vibrant Creative Community | Creatives Takeover</title>
        <meta 
          name="description" 
          content="Join our thriving creative community of 50,000+ designers, artists, and creators. Collaborate, learn, and grow with our supportive creative community platform." 
        />
        <meta name="keywords" content="creative community, creative community platform, design community, artist community, creative collaboration, creative networking" />
        <meta property="og:title" content="Creative Community | Connect with Fellow Creatives" />
        <meta property="og:description" content="Join thousands of creatives in our vibrant community. Share ideas, collaborate on projects, and grow together." />
        <link rel="canonical" href="/community" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navigation />
        <CommunityHero />
        <UserCollaboration />
        <CommunityTestimonials />
        <CommunityEvents />
        <CommunityNavigation />
      </div>
    </>
  );
};

export default CommunityPage;