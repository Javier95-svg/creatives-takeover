import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import BlogHero from "@/components/blog/BlogHero";
import TrendingSection from "@/components/blog/TrendingSection";
import SignupInviteModal from "@/components/blog/SignupInviteModal";
import { useSignupInvite } from "@/hooks/useSignupInvite";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useEffect } from "react";

const Blog = () => {
  const { showInvite, closeInvite } = useSignupInvite();
  const { trackPageVisit } = useReadingAnalytics();

  // Track page visit when component mounts
  useEffect(() => {
    trackPageVisit('Insighta Blog');
  }, [trackPageVisit]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>News - Creatives Takeover | Business Tips & AI Insights</title>
        <meta name="description" content="Discover expert insights on business planning, AI tools, entrepreneurship, and creative strategies. Stay updated with the latest trends in business innovation." />
        <meta name="keywords" content="business news, entrepreneurship tips, AI business tools, startup advice, creative business strategies" />
      </Helmet>
      <Navigation />
      <main>
        <BlogHero />
        <TrendingSection />
      </main>
      <Footer />
      
      {/* Signup Invite Modal */}
      <SignupInviteModal 
        isOpen={showInvite} 
        onClose={closeInvite} 
      />
    </div>
  );
};

export default Blog;